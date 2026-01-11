# Card Tree MVP

신용카드 추천 트리 구축 및 관리 플랫폼

## 빠른 시작 (Docker)

### 1. docker-compose.yml 다운로드

```bash
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/card-tree-mvp/main/docker-compose.yml
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```env
NEXTAUTH_SECRET=your-secret-key-here
ADMIN_TOKEN=your-admin-token-here
```

**NEXTAUTH_SECRET 생성 (Linux/Mac):**

```bash
openssl rand -base64 32
```

**NEXTAUTH_SECRET 생성 (Windows PowerShell):**

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 3. 실행

```bash
# GHCR 로그인 (처음 한 번만)
docker login ghcr.io
# Username: YOUR_USERNAME
# Password: YOUR_GITHUB_TOKEN

# 컨테이너 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 접속

http://localhost:3000

---

## 개발 환경 설정

### 사전 요구사항

- Node.js 20+
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 시드 데이터 추가
npx prisma db seed

# 개발 서버 실행
npm run dev
```

### 빌드

```bash
npm run build
npm start
```

---

## 기술 스택

- **Framework**: Next.js 16
- **Database**: SQLite + Prisma ORM
- **UI**: React + Tailwind CSS + shadcn/ui
- **Flow Diagram**: XYFlow (React Flow)
- **Deployment**: Docker + GitHub Actions + GHCR

---

## 주요 기능

- 카드 추천 트리 생성 및 편집
- 토큰 기반 접근 제어
- 관리자 패널
- 리퍼럴 추적
- 템플릿 시스템

---

## 프로젝트 구조

```
card-tree-mvp/
├── app/                  # Next.js App Router
├── components/           # React 컴포넌트
├── lib/                  # 유틸리티 및 라이브러리
├── prisma/              # 데이터베이스 스키마
├── public/              # 정적 파일
└── docker-compose.yml   # Docker 설정
```

---

## 문서

- 📦 [Docker 배포 가이드](../DOCKER_DEPLOYMENT.md)
- 🚀 [빠른 시작 가이드](../DOCKER_QUICKSTART.md)
- ✅ [배포 체크리스트](../DEPLOYMENT_CHECKLIST.md)

---

## 라이선스

Private
