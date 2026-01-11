# Card Tree MVP - 진행 상황

## 완료된 작업 (2026-01-10)

### Phase 1: 프로젝트 초기화 ✅ (100% 완료)
- [x] Next.js 15 프로젝트 생성 (TypeScript + Tailwind CSS + App Router)
- [x] 필수 의존성 설치 완료:
  - `@prisma/client` - Prisma ORM (v5.22.0)
  - `bcryptjs` - 토큰 해싱
  - `nanoid` - 짧은 ID 생성
  - `zod` - 스키마 검증
  - `@xyflow/react` - React Flow (트리 시각화)
  - `prisma`, `tsx`, `@types/bcryptjs` (dev dependencies)
- [x] shadcn/ui 초기화 및 컴포넌트 설치:
  - button, card, dialog, input, select, textarea, alert, badge, label
- [x] **next.config.ts 수정 완료**
  - `/card` basePath 및 assetPrefix 설정
  - 프로덕션 최적화 설정 (reactStrictMode, swcMinify)
- [x] **Prisma 스키마 생성 완료**
  - `prisma/schema.prisma` 파일 생성
  - 4개 핵심 모델: Card, CardTree, CardNode, AdminReferral
  - SQLite datasource 설정
- [x] **Prisma 마이그레이션 실행 완료**
  - 초기 마이그레이션 생성 및 적용
  - dev.db 데이터베이스 생성
  - Prisma Client 생성
- [x] **Seed 데이터 생성 및 실행 완료**
  - `prisma/seed.ts` 작성
  - 14개 카드 마스터 데이터 추가 (Chase, Amex, Citi, Capital One)
  - 3개 Admin Referral 예제 추가
  - package.json에 seed 스크립트 추가

### Phase 2: 핵심 라이브러리 함수 구현 ✅ (100% 완료)
- [x] **lib/prisma.ts** - Prisma client singleton
  - 개발 환경에서 인스턴스 재사용
  - 쿼리 로깅 설정
- [x] **lib/auth/token.ts** - edit_token 생성/해싱/검증
  - `generateEditToken()` - 32자 랜덤 토큰 생성
  - `hashToken()` - bcrypt 해싱 (10 rounds)
  - `verifyToken()` - 토큰 검증
  - `createEditToken()` - 토큰 생성 및 해싱 통합
- [x] **lib/auth/admin.ts** - admin API key 검증
  - `verifyAdminKey()` - X-Admin-Key 헤더 검증
  - `extractAdminKey()` - 헤더에서 API 키 추출
  - Timing-safe 비교로 타이밍 공격 방지
- [x] **lib/ratelimit/index.ts** - Rate limiting 구현
  - In-memory 저장소 (MVP용, 향후 Redis 전환)
  - IP 기반 제한: 트리 생성 (시간당 5, 일 10), 조회 (시간당 100), 편집 (시간당 30)
  - `checkRateLimit()` - 단일 액션 제한 체크
  - `checkMultipleRateLimits()` - 복수 제한 체크 (시간/일)
  - `getClientIp()` - X-Forwarded-For 지원
- [x] **lib/templates/index.ts** - 트리 템플릿 생성 로직
  - `generateTemplate()` - 사용자 프로필 기반 템플릿 생성
  - `getThinFileTemplate()` - 초보자용 템플릿
  - `getUnder524Template()` - Chase 5/24 미만 전략
  - `getOver524Template()` - Chase 5/24 초과 전략
  - `validateTemplate()` - 카드 존재 검증
  - `resolveCardIds()` - slug → id 변환

### Phase 3: API 엔드포인트 구현 ✅ (100% 완료)

#### 공개 API (인증 불필요)
- [x] **GET /api/cards** - 카드 목록 조회
  - 활성 카드만 반환
  - Tags JSON 파싱
  - Issuer/Annual Fee/Name 순으로 정렬

- [x] **GET /api/referrals?card_id=xxx** - 레퍼럴 조회
  - 특정 카드의 활성 레퍼럴만 반환
  - card_id 파라미터 필수

- [x] **GET /api/trees/[id]** - 트리 조회
  - 공개 읽기 전용
  - 노드 + 카드 정보 포함
  - 조회수 자동 증가
  - edit_token_hash 노출 안함

#### 사용자 API (edit_token 필요)
- [x] **POST /api/trees** - 트리 생성
  - Rate limiting: 시간당 5회, 일 10회
  - 템플릿 자동 생성 (사용자 프로필 기반)
  - edit_token 반환 (한 번만 표시!)
  - Zod validation

- [x] **PUT /api/trees/[id]** - 트리 메타데이터 수정
  - title, note 수정 가능
  - edit_token 검증

- [x] **POST /api/trees/[id]/nodes** - 노드 추가
  - 카드 존재 여부 검증
  - 부모 노드 검증
  - edit_token 검증

- [x] **PUT /api/trees/[id]/nodes/[node_id]** - 노드 수정
  - parentNodeId, position, note 수정
  - 순환 참조 방지
  - edit_token 검증

- [x] **DELETE /api/trees/[id]/nodes/[node_id]** - 노드 삭제
  - CASCADE로 자식 노드도 삭제
  - edit_token 검증

#### 주요 기능
- ✅ Next.js 16 async params 지원
- ✅ Rate limiting (IP 기반, in-memory)
- ✅ Token 기반 인증 (bcrypt)
- ✅ Zod 스키마 검증
- ✅ 템플릿 자동 생성
- ✅ 에러 처리 및 로깅

#### 테스트 결과
- ✅ 카드 목록 조회: 14개 카드 반환
- ✅ 트리 생성: 템플릿 자동 적용 (2개 노드)
- ✅ 트리 조회: 노드 + 카드 정보 포함
- ✅ 레퍼럴 조회: 활성 레퍼럴 반환

### Phase 4: 공개 페이지 UI 구현 ✅ (100% 완료)

#### 페이지 구조
- [x] **/card/tree/[id]** - 공개 트리 조회 페이지
  - SSR (Server-Side Rendering)
  - 동적 메타데이터 (SEO, OG 태그)
  - 트리 정보 헤더 (제목, 목표, 5/24 상태, 조회수)
  - 반응형 레이아웃

#### 컴포넌트
- [x] **TreeViewer** - React Flow 트리 시각화
  - 자동 레이아웃 (top-to-bottom)
  - 부모-자식 관계 시각화
  - Zoom/Pan 컨트롤
  - 읽기 전용 모드

- [x] **CardNode** - 카드 노드 컴포넌트
  - 카드 정보 표시 (이름, 발급사, 연회비, 리워드 타입)
  - Tags 배지
  - 사용자 메모 표시
  - 레퍼럴 버튼 (API 연동)
  - hover 효과

- [x] **Disclaimers** - 필수 경고 문구 (3가지)
  - ⚠️ Offer Warning: 최신 오퍼 반영 안될 수 있음
  - ⚠️ Approval Disclaimer: 승인 보장 안함
  - ⚠️ Not Financial Advice: 금융 자문 아님

#### 주요 기능
- ✅ React Flow 트리 시각화
- ✅ 자동 레이아웃 알고리즘
- ✅ 레퍼럴 버튼 동적 로딩
- ✅ SEO 최적화 (title, description, OG tags)
- ✅ 반응형 디자인
- ✅ Tailwind CSS 스타일링

### Phase 5: 트리 생성 UI 구현 ✅ (100% 완료)

#### 메인 페이지 (/card)
- [x] **홈페이지 디자인**
  - 프로젝트 소개 및 설명
  - "How It Works" 섹션 (3단계)
  - 필수 경고 문구 3가지 표시
  - 반응형 레이아웃

#### 컴포넌트
- [x] **CreateTreeForm** - 트리 생성 폼
  - Title 입력 (최대 100자)
  - Goal 선택 (cashback/airline/hotel/status)
  - Chase 5/24 상태 선택 (under/over/unknown)
  - Credit Profile 선택 (thin/1-3yr/3+yr)
  - Note 입력 (선택, 최대 1000자)
  - 폼 검증 (Zod)
  - 로딩 상태 표시
  - 에러 처리

- [x] **TokenDisplay** - edit_token 표시
  - edit_token 복사 버튼
  - localStorage 자동 저장
  - 공개 링크 복사
  - 보안 경고 (토큰은 한 번만 표시)
  - "What's Next" 가이드
  - View Tree 버튼

#### API 연동
- ✅ POST /api/trees → 트리 생성
- ✅ edit_token 수신 및 저장
- ✅ 공개 링크 생성
- ✅ 트리 페이지로 리디렉션

#### 주요 기능
- ✅ 로그인 없이 트리 생성
- ✅ 실시간 폼 검증
- ✅ Rate limiting 처리
- ✅ edit_token localStorage 자동 저장
- ✅ 클립보드 복사 기능
- ✅ 반응형 UI

### Phase 6: 트리 편집 기능 구현 ✅ (100% 완료)

#### 편집 모드 시스템
- [x] **useEditToken Hook**
  - localStorage에서 edit_token 로드
  - token 저장/삭제 기능

- [x] **TreePageClient** - Client 컴포넌트 래퍼
  - Edit/View 모드 토글
  - Token 보유자만 Edit 버튼 표시
  - SEO를 위해 Server Component와 분리

#### 트리 편집 컴포넌트
- [x] **TreeEditor** - 편집 모드 메인 컴포넌트
  - React Flow 기반 편집 가능한 트리
  - "Edit Details" 버튼 (제목, 노트 수정)
  - "Add Card" 버튼
  - 자동 레이아웃 유지

- [x] **TreeMetadataEditor** - 트리 정보 편집
  - Title 수정 (최대 100자)
  - Note 수정 (최대 1000자)
  - PUT /api/trees/[id] API 연동
  - X-Edit-Token 헤더 검증

#### 노드 관리 UI
- [x] **AddNodeDialog** - 노드 추가 다이얼로그
  - 카드 선택 (전체 카드 목록)
  - 부모 노드 선택 (optional)
  - 노트 입력
  - POST /api/trees/[id]/nodes API 연동

- [x] **EditableCardNode** - 편집 가능한 카드 노드
  - Edit 버튼 (노트 수정)
  - Delete 버튼 (삭제 확인 다이얼로그)
  - CardNode 스타일 기반
  - 파란색 테두리로 편집 모드 표시

- [x] **EditNodeDialog** - 노드 노트 편집
  - Note 수정 (최대 500자)
  - PUT /api/trees/[id]/nodes/[node_id] API 연동

#### 삭제 기능
- [x] **AlertDialog** - 삭제 확인
  - 노드 삭제 시 경고 메시지
  - CASCADE 설명 (하위 노드도 삭제)
  - DELETE /api/trees/[id]/nodes/[node_id] API 연동

#### 주요 기능
- ✅ Edit/View 모드 실시간 토글
- ✅ 트리 메타데이터 수정
- ✅ 노드 추가 (부모 선택 가능)
- ✅ 노드 노트 수정
- ✅ 노드 삭제 (확인 다이얼로그)
- ✅ 자동 트리 새로고침
- ✅ edit_token 검증
- ✅ 에러 처리

## 다음 단계

### Phase 7: 관리자 기능 구현

## 참고 문서
- 상세 구현 계획: `C:\Users\pc\.claude\plans\steady-splashing-moore.md`
- 요구사항 정의서: `card_tree_mvp_requirements_v0_1_1.md`
- 프로젝트 가이드: `CLAUDE.md`

## 프로젝트 위치
`C:\Dev\Card Blueprint\card-tree-mvp`

## 예상 전체 일정
- **Phase 1 (프로젝트 기반)**: 1-2일 - 50% 완료
- **Phase 2 (핵심 라이브러리)**: 1일
- **Phase 3 (공개 페이지)**: 2-3일
- **Phase 4 (트리 생성)**: 2일
- **Phase 5 (트리 편집)**: 3-4일
- **Phase 6 (관리자 기능)**: 1-2일
- **Phase 7 (최적화 및 배포)**: 2-3일

**총 예상: 2-3주**
