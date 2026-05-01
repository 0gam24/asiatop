# 키 발급 워크스루 — 헷갈리지 않게 단계별

`.env.local`에 어떤 값을 어떻게 넣어야 하는지 **하나씩 따라하면 끝**나도록 정리.

> 📍 작업 디렉토리: `c:\Users\kjh79\Downloads\00 Bibe_Coding\00 Website\05 moneylook`
> 📍 편집할 파일: `.env.local` (이 파일은 git에 절대 안 올라감)

---

## 0. 시작 전 — `.env.local` 열기

### 옵션 A: 메모장으로 열기 (가장 간단)
```cmd
notepad ".env.local"
```

### 옵션 B: VS Code로 열기 (권장 — 색상·자동완성)
```cmd
code .env.local
```

### 옵션 C: 탐색기에서 열기
1. 작업 폴더 열기
2. `.env.local` 파일 우클릭 → "다른 프로그램으로 열기" → "메모장"

> 💡 처음 열면 `.env.example`을 복사한 템플릿이 보입니다. 키 이름은 다 들어있고, `=` 뒤가 비어있습니다. 발급받은 값을 `=` 뒤에 붙여넣기만 하면 됩니다.

---

## 1. 🔴 PUBLIC_GA4_ID — Google Analytics 4 측정 ID

> **소요시간**: 5분 / **비용**: 무료 / **즉시 발급**

### 1-1. 발급처 접속
🔗 https://analytics.google.com → 본인 Google 계정으로 로그인 (kjh791213@gmail.com)

### 1-2. 클릭 순서

```
좌측 하단 ⚙️ "관리" 클릭
   ↓
"속성 만들기" 버튼 클릭
   ↓
─────────────────────────────────────────
속성 이름:     머니룩
보고 시간대:    (GMT+09:00) 대한민국
통화:          대한민국 원 (KRW)
─────────────────────────────────────────
   ↓
"다음" 클릭
   ↓
업종:          전자상거래·금융 (또는 정보·뉴스)
규모:          소규모 (직원 1명)
   ↓
"다음" → "만들기"
   ↓
약관 동의 (한국 + 미국)
   ↓
"데이터 스트림 만들기" → "웹" 선택
   ↓
─────────────────────────────────────────
웹사이트 URL:   https://asiatop.co.kr
스트림 이름:   머니룩 메인
─────────────────────────────────────────
   ↓
"스트림 만들기" 클릭
```

### 1-3. 키 찾기 — 어떻게 생겼나

스트림 만들기 직후 화면 우측에 보이는:

```
┌────────────────────────────────────────────────┐
│ 측정 ID                                          │
│ ┌──────────────────────────────┐  [📋 복사]      │
│ │ G-XXXXXXXXXX                 │                │
│ └──────────────────────────────┘                │
└────────────────────────────────────────────────┘
```

**키 모양**: `G-` + 영숫자 10자 = 총 12자
**예시**: `G-1A2B3C4D5E`, `G-Z9Y8X7W6V5`

### 1-4. `.env.local` 입력

파일을 열고 이 줄을 찾기:
```
PUBLIC_GA4_ID=
```

`=` 뒤에 복사한 값 붙여넣기 (따옴표·공백 X):
```
PUBLIC_GA4_ID=G-1A2B3C4D5E
```

저장 (Ctrl+S).

### 1-5. ✅ 잘 들어갔는지 확인
```cmd
findstr "PUBLIC_GA4_ID" .env.local
```
→ `PUBLIC_GA4_ID=G-1A2B3C4D5E` 형태로 출력되면 OK.

### 1-6. ⚠️ 흔한 실수
- ❌ `PUBLIC_GA4_ID="G-1A2B3C4D5E"` (따옴표 X)
- ❌ `PUBLIC_GA4_ID = G-1A2B3C4D5E` (= 양쪽 공백 X)
- ❌ `PUBLIC_GA4_ID=g-1a2b3c4d5e` (소문자 X — 대문자 그대로)
- ❌ `MEASUREMENT_ID=...` (변수 이름 변경 X)

---

## 2. 🔴 BOK_API_KEY — 한국은행 ECOS API

> **소요시간**: 5분 / **비용**: 무료 / **즉시 발급**

### 2-1. 발급처 접속
🔗 https://ecos.bok.or.kr/api → 회원가입 (이메일 인증)

### 2-2. 클릭 순서

```
로그인
   ↓
좌측 메뉴 "OPEN API" → "인증키 신청"
   ↓
─────────────────────────────────────────
이름:          김준혁
이메일:        kjh791213@gmail.com
신청 사유:     정보 사이트(머니룩) 금리·환율 데이터 인용
신청 기관:     스마트데이터샵 (또는 개인)
─────────────────────────────────────────
   ↓
"신청" 버튼 클릭
   ↓
화면에 즉시 인증키 발급
```

### 2-3. 키 찾기 — 어떻게 생겼나

```
┌────────────────────────────────────────────────┐
│ 인증키:                                         │
│ ┌──────────────────────────────────┐ [복사]     │
│ │ ABCD1234EFGH5678IJKL90MNOP12      │            │
│ └──────────────────────────────────┘            │
└────────────────────────────────────────────────┘
```

**키 모양**: 영숫자 24~40자 (특수문자 없음)
**예시**: `ABCD1234EFGH5678IJKL90MNOP12`

### 2-4. `.env.local` 입력

```
BOK_API_KEY=ABCD1234EFGH5678IJKL90MNOP12
```

### 2-5. 메일로도 발송됨
ECOS는 발급 후 이메일로도 키를 보내주니 분실 시 메일함 검색.

### 2-6. ⚠️ 흔한 실수
- 키 앞뒤 공백·줄바꿈 포함 (복사 시 주의)
- 따옴표 추가 X

---

## 3. 🟡 DATA_GO_KR_KEY — 공공데이터포털

> **소요시간**: 5분(일반) ~ 1~2일(운영) / **비용**: 무료

### 3-1. 발급처 접속
🔗 https://www.data.go.kr → 회원가입 (이메일 인증)

### 3-2. 클릭 순서

```
로그인
   ↓
검색창에 "청년정책 통합조회" 또는 "청년월세지원" 입력
   ↓
검색 결과 → 데이터셋 클릭
   ↓
"활용신청" 버튼 클릭
   ↓
─────────────────────────────────────────
활용 목적:     미디어 사이트 머니룩(asiatop.co.kr)
              청년정책·복지 데이터 인용
시스템 유형:    웹사이트 개발
서비스 정보:   https://asiatop.co.kr (자동 입력 가능)
약관 동의:     ✓
─────────────────────────────────────────
   ↓
"활용신청" 클릭
   ↓
일반 인증키: 즉시 발급 / 운영 인증키: 1~2일 심사
```

### 3-3. 키 찾기 — ⭐ Decoding 키 복사 (중요!)

발급 후 마이페이지 → 마이페이지 → 인증키 페이지:

```
┌─────────────────────────────────────────────────┐
│ 인증키                                           │
│                                                  │
│ Encoding:                                        │
│   aBcD%2BeFgH%2FiJkL%3DmNoP...     [복사] ← ❌  │
│                                                  │
│ Decoding:                                        │
│   aBcD+eFgH/iJkL=mNoP...           [복사] ← ⭐  │
└─────────────────────────────────────────────────┘
```

**반드시 "Decoding" 줄을 복사**. Encoding 줄을 복사하면 인증 실패합니다.

**Decoding 키 모양**: 영숫자 + `+`, `/`, `=` 포함된 약 80~100자 문자열
**예시**: `aBcD+eFgH/iJkL=mNoPqRsTuVwXyZ1234567890aBcDeFgHiJkL=`

### 3-4. `.env.local` 입력

```
DATA_GO_KR_KEY=aBcD+eFgH/iJkL=mNoPqRsTuVwXyZ1234567890aBcDeFgHiJkL=
```

> 💡 키에 `+`, `/`, `=`가 있어도 따옴표 없이 그대로 붙여넣으세요. 줄바꿈만 없으면 됩니다.

### 3-5. ⚠️ 흔한 실수 (가장 많이 헷갈리는 키)
- ❌ Encoding 키 복사 → 인증 실패 (이중 인코딩)
- ❌ 키 중간에 줄바꿈 → 부분만 인식
- ❌ 활용신청 승인 안 받고 키 사용 → 거부됨 (마이페이지에서 "신청 완료" 상태 확인)

### 3-6. 키 사용 가능 여부 확인 (선택)
브라우저 주소창에 직접:
```
https://api.odcloud.kr/api/15083323/v1/uddi:youth-housing-support?serviceKey=발급받은_Decoding_키&page=1&perPage=5&returnType=JSON
```
→ JSON 응답 = 정상 / 401·403 = 키 문제 / 404 = 활용신청 미승인

---

## 4. 🟢 PUBLIC_SENTRY_DSN — Sentry 에러 추적

> **소요시간**: 10분 / **비용**: 무료 5K 에러/월

### 4-1. 발급처 접속
🔗 https://sentry.io/signup → Google·GitHub 로그인 가능

### 4-2. 클릭 순서

```
가입 직후 Onboarding 화면
   ↓
"Create Project" 또는 좌측 메뉴 "Projects" → "Create Project"
   ↓
─────────────────────────────────────────
플랫폼:        JavaScript → Browser (또는 Astro)
알람 설정:     기본값 OK (skip 가능)
프로젝트 이름:  moneylook
팀:            #sentry (기본)
─────────────────────────────────────────
   ↓
"Create Project" 클릭
   ↓
다음 화면에 SDK 설치 안내 + DSN 표시
```

### 4-3. 키 찾기 — 어떻게 생겼나

프로젝트 생성 직후 화면 또는 **Settings → Client Keys (DSN)**:

```
┌──────────────────────────────────────────────────────────┐
│ DSN                                                       │
│ ┌─────────────────────────────────────────────┐ [복사]    │
│ │ https://abc123def456@o000000.ingest.us.     │            │
│ │ sentry.io/4500000000000                     │            │
│ └─────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

**키 모양**: `https://랜덤32자@o숫자.ingest.지역.sentry.io/숫자`
**예시**: `https://abc123def456789012345678901234@o123456.ingest.us.sentry.io/4500000000`

### 4-4. `.env.local` 입력

```
PUBLIC_SENTRY_DSN=https://abc123def456789012345678901234@o123456.ingest.us.sentry.io/4500000000
PUBLIC_SENTRY_ENV=production
```

### 4-5. ⚠️ 흔한 실수
- DSN은 공개 키라서 클라이언트(브라우저)에 노출돼도 안전 — `PUBLIC_` prefix가 맞음
- 끝에 `/4500000000` 같은 숫자까지 모두 복사 (잘리면 인증 실패)

---

## 5. 🟢 PUBLIC_ADSENSE_CLIENT — 나중에 (현재 X)

> **신청 시점**: 트래픽 누적 + 콘텐츠 깊이 후 (보통 발행 후 6개월)
> 머니룩 권장 신청 시점: **2026년 11월** 이후

승인 받으면 `ca-pub-` + 16자 숫자 형태:
```
PUBLIC_ADSENSE_CLIENT=ca-pub-1234567890123456
```

지금은 **빈 칸으로 두세요**. 미설정 시 광고 슬롯 자체가 비활성이라 사이트 정상 작동.

---

## 6. ⚪ GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON — 선택

> 인기글 자동 추출용 (현재 코드 미구현). 처음엔 **빈 칸으로 두세요**.

활성화하려면 GCP 가입·service account JSON 발급 필요. 자세한 절차는 [KEY-ISSUANCE-GUIDE.md](KEY-ISSUANCE-GUIDE.md#6-ga4-reporting-api---ga4_property_id--ga4_service_account_json) 참조.

---

## 7. 작성 후 `.env.local` 최종 모양

위 1~4를 모두 발급받고 입력하면 `.env.local`이 이런 모양:

```dotenv
# (앞부분 주석 생략)

DATA_GO_KR_KEY=aBcD+eFgH/iJkL=mNoPqRsTuVwXyZ1234567890aBcDeFgHiJkL=
LAW_GO_KR_KEY=                                  # 빈 칸 OK
BOK_API_KEY=ABCD1234EFGH5678IJKL90MNOP12
GA4_PROPERTY_ID=                                # 빈 칸 OK
GA4_SERVICE_ACCOUNT_JSON=                       # 빈 칸 OK

PUBLIC_GA4_ID=G-1A2B3C4D5E
PUBLIC_ADSENSE_CLIENT=                          # 빈 칸 OK (6개월 후)
PUBLIC_SENTRY_DSN=https://abc123@o123.ingest.us.sentry.io/4500000000
PUBLIC_SENTRY_ENV=production

INDEXNOW_KEY=6dc788531320b8af1f0844684208d55d  # 이미 채워져 있음
```

빈 칸은 **빈 칸 그대로 OK**. 사이트는 미설정 키만 비활성화하고 정상 작동합니다.

---

## 8. 작성 후 검증

### 8-1. .env.local 형식 검증
```cmd
node -e "const env = require('fs').readFileSync('.env.local','utf-8'); console.log(env.split('\n').filter(l => /^[A-Z_]+=/.test(l) && !l.endsWith('=')).map(l => l.split('=')[0]).join(', '))"
```
→ 채워진 키 이름 목록 출력 (예: `PUBLIC_GA4_ID, BOK_API_KEY, DATA_GO_KR_KEY`)

### 8-2. git에서 차단 확인 (보안)
```cmd
git check-ignore .env.local
```
→ `.env.local` 출력되면 차단됨 (안전 ✅)
→ 아무 출력 없으면 → 즉시 알려주세요 (위험)

### 8-3. dev 서버에서 키 사용 확인
```cmd
pnpm dev
```
브라우저에서 http://localhost:4322/ 열고:
- F12 (개발자도구) → Console 탭
- `console.log(import.meta.env.PUBLIC_GA4_ID)` 입력해도 됨 (빌드 타임만 가능, 클라이언트 X)
- 또는 페이지 소스 보기 → `<script>`에 GA4 ID가 박혀있는지 확인

---

## 9. CF Pages Env에도 같은 값 등록 (라이브 배포용)

`.env.local`은 **로컬 dev**, CF Pages Env는 **asiatop.co.kr 라이브**.

```
dash.cloudflare.com → moneylook → Settings → Variables and Secrets
  Production 탭 → "Add" 클릭
```

각 키마다:

| 변수명 | 값 | Type |
|---|---|---|
| `PUBLIC_GA4_ID` | `G-1A2B3C4D5E` | Plaintext |
| `BOK_API_KEY` | `ABCD1234...` | **Encrypted** ★ |
| `DATA_GO_KR_KEY` | `aBcD+eFgH/...` | **Encrypted** ★ |
| `PUBLIC_SENTRY_DSN` | `https://...` | Plaintext |
| `PUBLIC_SENTRY_ENV` | `production` | Plaintext |

저장하면 자동으로 새 빌드 트리거 → 1~3분 후 라이브 반영.

---

## 10. 트러블슈팅

### "GA4가 트래킹 안 돼요"
1. `.env.local`에 `PUBLIC_GA4_ID=G-...` 형태로 들어갔는지
2. CF Pages Env에도 같은 값 등록됐는지
3. 사이트 첫 방문 시 동의 배너 → "동의" 클릭해야 GA4가 로드됨 (Consent Mode v2)
4. 동의 후 Google Analytics 실시간 보고서에 본인 IP 보이는지 확인

### "data.go.kr API가 401·403 반환"
1. Decoding 키 사용했는지 (Encoding 키 X)
2. data.go.kr 마이페이지 → 활용 신청 상태가 "승인" 상태인지 (심사 중이면 X)
3. `.env.local` 줄에 줄바꿈·공백 없는지

### "Sentry 에러가 안 들어와요"
1. DSN URL 끝 숫자(`/4500...`)까지 모두 복사됐는지
2. CF Pages Env에 등록됐는지 (로컬만 등록 시 라이브 X)
3. 첫 에러 발생까지 시간 걸림 — F12 Console에서 일부러 `throw new Error('test')` 실행

### "키를 잘못 commit했어요!"
즉시 [SECURITY.md](../SECURITY.md) 참조 — 키 폐기·재발급 + git history 제거.

---

## 핵심 요약

```
1. notepad ".env.local"
2. 발급받은 키를 = 뒤에 붙여넣기 (따옴표 X, 공백 X)
3. 저장 (Ctrl+S)
4. 같은 값을 CF Pages Env에도 등록
5. pnpm dev → 동작 확인
```

`.env.local`은 **git에 절대 안 올라갑니다** (4중 방어선). 안심하고 키 적으세요.
