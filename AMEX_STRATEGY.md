# 카드 정보 수집 파이프라인 분석 및 아멕스(Amex) 수집/운영 전략

본 문서는 **Card Tree MVP** 플랫폼의 신용카드 정보 수집 파이프라인의 현황을 점검하고, 특히 **American Express(Amex)** 카드의 수집 및 관리 전략을 체계적으로 수립하기 위한 문서입니다.

---

## 1. 카드 수집 파이프라인 현황 점검

### 1.1 전체 시스템 구조 및 흐름
```
[관리자 요청 (POST /api/dashboard/cards/sync)]
            │
            ├──> [Chase Scraper (lib/scraper/chase.ts)]
            │       └─> Cheerio 기반 HTML 웹 스크래핑
            │
            └──> [Amex Scraper (lib/scraper/amex.ts)]
                    └─> Amex 공식 JSON API 직접 호출 (REST API)
            │
            ▼
[Data Normalization & Slug Mapping]
            │
            ▼
[Prisma DB Upsert (Card Table)]
```

- **관리자 동기화 엔드포인트**: `POST /api/dashboard/cards/sync`
  - `X-Admin-Key` 헤더를 통한 인증 후 작동
  - `issuer` 쿼리 파라미터(`chase`, `amex` 등)를 이용한 개별/전체 동기화 지원
  - 스크래핑된 카드 데이터를 기반으로 DB의 `Card` 테이블에 `upsert` (slug 기준)

---

## 2. 아멕스(Amex) 카드 수집 전략 파악 및 비교

### 2.1 기존 HTML 스크래핑 vs Amex 공식 API 방식 비교

| 구분 | 일반 HTML 크롤링 (Chase 방식) | Amex 공식 API 활용 (현 Amex 방식) |
| :--- | :--- | :--- |
| **수집 방식** | HTML 페이지 요청 후 Cheerio/DOM 파싱 | 공식 JSON API (`daconsumershop.americanexpress.com`) 호출 |
| **안정성/차단 위험** | WAF, Cloudflare, IP 차단 및 DOM 구조 변경에 취약 | 상대적으로 봇 탐지 및 IP 차단 위험이 낮고 데이터 구조 안정적 |
| **데이터 정확도** | 텍스트 추출 중 광고/메뉴 항목 혼입 위험 | 카드명, 연회비, 혜택, 웰컴 오퍼 등 구조화된 JSON 데이터 제공 |
| **수집 속도** | 각 카드 상세 페이지 개별 파싱 필요 (상대적으로 느림) | 단일 API 호출로 전체 개인 카드 정보 일괄 수집 |

### 2.2 현재 Amex 수집 구현 상의 특징
1. **Endpoint**: `https://daconsumershop.americanexpress.com/us/cardshop-api/api/v1/cps/content/vac/pageType/25330/` (개인 카드 카드숍 API)
2. **수집 필드**:
   - `cardTitle` / `productName`: 카드 이름 및 제품 식별자
   - `fee.text`: 연회비 (`$895`, `$325`, `$0`, "First year free" 인트로 오퍼 감지 포함)
   - `welcomeOffer`: 웰컴 보너스 (예: "175,000 Membership Rewards® points")
   - `keyProductFeatures`: 주요 카테고리 혜택 (상위 3~4개)
   - `filters`: 리워드 유형 매핑 (`Travel Points`, `Cashback`, `Miles`, `Hotel Points`)

---

## 3. 핵심 문제점 및 개선 전략

### 3.1 [문제 1] Slug (식별자) 불일치 문제 및 Canonical Slug 매핑
- **현상**:
  - Seed 데이터 및 추천 템플릿 알고리즘에서는 `amex-platinum`, `amex-gold`, `amex-blue-cash-preferred` 등 간결한 canonical slug를 사용.
  - 기존 동기화 코드에서는 `amex-american-express-platinum-card` 형태로 원본 제목 기반 슬러그가 생성되어 기존 데이터와 매핑되지 않고 중복 레코드가 생성될 위험.
- **해결 전략**:
  - 대표 Amex 카드에 대해 **Canonical Slug 매핑 테이블** 구축.
  - 신규 카드 또는 알려지지 않은 카드는 자동 정규화 알고리즘(`amex-` 접두사 정제) 적용.

### 3.2 [문제 2] 비즈니스 카드(Business Cards) 수집 누락
- **현상**:
  - 현재 사용하는 API Endpoint는 개인 카드(`pageType/25330/`)만 반환하여 Amex Business Platinum, Business Gold, Blue Business Plus 등이 수집되지 않음.
- **해결 전략**:
  - Amex Business Card 전용 API Endpoint(`pageType/25331` 등) 추가 또는 비즈니스 카드 크롤링 로직 병합.
  - 비즈니스 카드의 경우 `cardType = 'business'`, `countsToward524 = false`로 자동 설정.

### 3.3 [문제 3] HTML 엔티티 및 특수문자 정제
- **현상**:
  - API 수집 혜택 텍스트에 `&reg;`, `&amp;`, `®`, `™` 등 특수 HTML 엔티티 및 포맷팅 문자가 남아 UI 노출 시 매끄럽지 않음.
- **해결 전략**:
  - `cleanHtmlText` 함수를 고도화하여 모든 HTML 엔티티 및 포맷팅 이스케이프 문자 완전히 제거.

### 3.4 [문제 4] 웰컴 오퍼(Welcome Offer) 및 연회비 변동 실시간 반영
- **현상**:
  - 타겟팅 오퍼나 한시적 프로모션(Limited Time Offer)이 빈번하게 변경됨.
- **해결 전략**:
  - DB의 `tags` 필드 및 `externalUrls`에 웰컴 오퍼 정보와 수집 시점(`lastCrawledAt`)을 동적으로 동기화하여 UI에서 "최신 오퍼" 배지로 활용.

---

## 4. 파이프라인 단계별 구현 가이드

1. **`lib/scraper/amex.ts` 개선**:
   - `cleanHtmlText` 정제 강화 (`&reg;`, `®`, `™`, 불필요한 공백 제거).
   - 개인 카드 API + 비즈니스 카드 API 지원 (또는 멀티 페이지 Fetching).
   - Canonical slug 매핑 헬퍼 함수 제공 (`getCanonicalAmexSlug`).

2. **`app/api/dashboard/cards/sync/route.ts` 개선**:
   - Amex 크롤링 결과 적용 시 Canonical Slug 반영.
   - `cardType` 및 `countsToward524` 자동 결정 로직 정교화.
   - DB upsert 시 태그(`tags`) 리스트 중복 제거 및 깔끔한 변환.
   - 크롤링 성공/실패 메타데이터(`crawlStatus`, `lastCrawledAt`, `crawlError`)를 DB에 세밀하게 업데이트.

---

## 5. 결론 및 향후 로드맵

- **단기 (Phase 1)**: Amex API 크롤러의 텍스트 정제, Canonical Slug 매핑, DB sync 엔드포인트 고도화 완료.
- **중기 (Phase 2)**: Capital One, Citi 등 타 발급사 수집기 추가 및 정기 자동 크롤링 (Cron/GitHub Actions) 스케줄러 구축.
- **장기 (Phase 3)**: 타겟별 웰컴 오퍼(예: 175k MR vs 80k MR) 변동 내역 히스토리 추적 기능 도입.
