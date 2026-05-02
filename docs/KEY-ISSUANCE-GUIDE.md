# 머니룩 API 키 발급 가이드

이 문서는 외부에서 발급받아야 하는 키와 발급처·절차를 정리합니다.
**실제 키 값은 절대 이 파일에 적지 마세요.** 키는 `.env.local`에만 보관합니다.

---

## 빠른 셋업 절차

```bash
# 1. .env.local 자동 생성 (.env.example을 복사)
pnpm setup:env

# 2. .env.local 편집 — 발급받은 키 값 입력
# Windows: notepad .env.local
# macOS:   open -e .env.local
# 또는 에디터로 직접 열기

# 3. 로컬 dev 서버에 자동 반영
pnpm dev
```

> ⚠️ `.env.local`은 `.gitignore`로 차단되어 있어 git에 절대 올라가지 않습니다. pre-commit hook도 추가로 차단합니다.

---

## 키 보관 위치 매트릭스

| 키 | `.env.local` (로컬) | CF Pages Env (배포) | GitHub Secrets (워크플로) |
|---|:---:|:---:|:---:|
| `PUBLIC_GA4_ID` | ✅ | ✅ Plaintext | ❌ |
| `PUBLIC_ADSENSE_CLIENT` | ✅ | ✅ Plaintext | ❌ |
| `PUBLIC_SENTRY_DSN` | ✅ | ✅ Plaintext | ❌ |
| `DATA_GO_KR_KEY` | ✅ | ✅ **Encrypted** | ❌ |
| `LAW_GO_KR_OC` | ✅ | ✅ **Encrypted** | ❌ |
| `BOK_API_KEY` | ✅ | ✅ **Encrypted** | ❌ |
| `GA4_PROPERTY_ID` | ✅ | ✅ Plaintext | ❌ |
| `GA4_SERVICE_ACCOUNT_JSON` | ✅ | ✅ **Encrypted** | ❌ |
| `INDEXNOW_KEY` | ❌ | ❌ | ✅ |
| `CF_DEPLOY_HOOK` | ❌ | ❌ | ✅ |

> **PUBLIC_** prefix = 빌드 후 브라우저에 노출되는 공개 키. 비밀 키엔 절대 사용 금지.

---

## 1. Google Analytics 4 — `PUBLIC_GA4_ID`

> **우선순위 🔴 1** · 5분 · 무료 · 즉시 발급

### 발급 절차
1. https://analytics.google.com 접속 (구글 계정 필요)
2. 좌측 하단 ⚙️ "관리" 클릭
3. **속성 만들기** → 속성 이름: `머니룩` / 시간대: 한국 / 통화: KRW
4. 비즈니스 정보 입력 → "만들기"
5. **데이터 스트림 만들기** → 웹 → URL: `https://asiatop.co.kr` → "스트림 만들기"
6. **측정 ID** 복사 (`G-`로 시작하는 10자, 예: `G-XXXXXXXXXX`)

### CF Pages 등록
```
dash.cloudflare.com → moneylook → Settings → Variables and Secrets
  Production 탭 → "Add" 클릭
  Name:  PUBLIC_GA4_ID
  Value: G-XXXXXXXXXX
  Type:  Plaintext (공개 ID)
```

### .env.local
```
PUBLIC_GA4_ID=G-XXXXXXXXXX
```

---

## 2. 한국은행 ECOS API — `BOK_API_KEY`

> **우선순위 🔴 2** · 5분 · 무료 · 즉시 발급

### 발급 절차
1. https://ecos.bok.or.kr/api 접속
2. 우측 상단 "회원가입" (이메일 인증)
3. 로그인 → 좌측 메뉴 **"OPEN API 인증키 신청"**
4. 신청 사유: `정보 사이트(머니룩) 금리·환율 데이터 인용`
5. "신청" 클릭 → **즉시 발급** (24자 영숫자 키)

### CF Pages 등록
```
Name:  BOK_API_KEY
Value: (24자 키)
Type:  Encrypted ★
```

### .env.local
```
BOK_API_KEY=발급받은_24자_키
```

---

## 3. 공공데이터포털 — `DATA_GO_KR_KEY`

> **우선순위 🟡 3** · 5분(일반) ~ 1~2일(운영) · 무료

### 발급 절차
1. https://www.data.go.kr 접속 → 회원가입 (이메일 인증)
2. 검색창에 "**청년정책 통합조회**" 또는 사용할 데이터셋 검색
3. 결과 페이지 → "활용신청" 버튼
4. 활용 목적: `미디어 사이트 머니룩(asiatop.co.kr) — 청년정책·복지 데이터 인용`
5. **일반 인증키**: 즉시 발급 (호출 한도 일 1,000회)
   **운영 인증키**: 1~2일 심사 (호출 한도 일 10,000회) — 권장
6. 마이페이지 → 인증키 → **"Decoding 키" 복사** ⭐

> ⚠️ **반드시 "Decoding 키"를 복사하세요. "Encoding 키"는 안 됩니다.**
>
> 머니룩 코드 [src/lib/api/data-go-kr.ts](../src/lib/api/data-go-kr.ts)는 `URLSearchParams`로 자동 URL 인코딩을 처리합니다. Encoding 키를 넣으면 이중 인코딩(`%2B` → `%252B`)으로 인증 실패합니다.
>
> | 키 형태 | 모양 (예시) | 머니룩 |
> |---|---|---|
> | **Decoding 키** | `aBcD+eFgH/iJkL=mNoP...` (원본 `+`, `/`, `=` 그대로) | ✅ 사용 |
> | Encoding 키 | `aBcD%2BeFgH%2FiJkL%3D...` (이미 인코딩됨) | ❌ 이중 인코딩 발생 |

> 💡 한 번 발급받으면 다른 정부 데이터(복지로·고용24·통계청 등)에도 같은 키 사용 가능. 새 데이터셋은 활용신청만 별도.

### CF Pages 등록
```
Name:  DATA_GO_KR_KEY
Value: (Encoding 키)
Type:  Encrypted ★
```

### .env.local
```
DATA_GO_KR_KEY=발급받은_인증키
```

---

## 4. Sentry DSN — `PUBLIC_SENTRY_DSN`

> **우선순위 🟢 4** · 10분 · 무료 5K 에러/월

### 발급 절차
1. https://sentry.io 가입 (Google·GitHub 로그인 가능)
2. **Create Project** → Platform: **Browser JavaScript** (또는 Astro)
3. 프로젝트 이름: `moneylook`
4. 생성 후 **Settings → Client Keys (DSN)** 페이지로 이동
5. **DSN** 복사 (`https://abc@o000.ingest.us.sentry.io/000` 형태)

### CF Pages 등록
```
Name:  PUBLIC_SENTRY_DSN
Value: https://abc@o000.ingest.us.sentry.io/000
Type:  Plaintext (DSN은 공개 키)

Name:  PUBLIC_SENTRY_ENV
Value: production
Type:  Plaintext
```

### .env.local
```
PUBLIC_SENTRY_DSN=https://abc@o000.ingest.us.sentry.io/000
PUBLIC_SENTRY_ENV=production
```

---

## 5. Google AdSense — `PUBLIC_ADSENSE_CLIENT`

> **우선순위 🟢 5** · 신청 즉시 / 승인 1~14일 · 무료

⚠️ **신청 시점**: 사이트 트래픽 누적 + 콘텐츠 깊이 확보 후 (보통 발행 후 6개월).
머니룩은 `2026년 11월` 이후 신청 권장 (현재는 X).

### 발급 절차 (시점 도래 후)
1. https://www.google.com/adsense 접속 → 가입
2. 사이트 추가: `asiatop.co.kr`
3. 광고 코드 자동 발급
4. **게시자 ID** 복사 (`ca-pub-` + 16자 숫자)
5. AdSense 검토 (1~14일) → 승인 후 광고 게재 시작

### CF Pages 등록 (승인 후)
```
Name:  PUBLIC_ADSENSE_CLIENT
Value: ca-pub-XXXXXXXXXXXXXXXX
Type:  Plaintext (공개 ID)
```

---

## 6. GA4 Reporting API — `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON`

> **우선순위 ⚪ 선택** · 30분 · 무료 · 인기글 자동 추출용

⚠️ 현재 코드 미구현 ([src/lib/popularity.ts](src/lib/popularity.ts) 주석 처리). 인기글 자동 추출 기능 활성화 시 발급.

### 발급 절차
1. https://console.cloud.google.com 접속
2. 프로젝트 만들기: `moneylook`
3. **API 및 서비스 → 라이브러리 → "Google Analytics Data API"** 검색 → 사용 설정
4. **사용자 인증 정보 → 서비스 계정 만들기**
   - 이름: `moneylook-ga4-reader`
   - 역할: 없음 (속성 단위로 별도 권한)
5. 생성 후 → 서비스 계정 클릭 → **키 → 키 추가 → JSON** → 다운로드
6. JSON 파일을 한 줄로 변환 (Stringify) — 또는 Base64 인코딩
7. GA4 속성 → 관리 → **속성 액세스 관리 → 사용자 추가** → 위 service account 이메일 추가 (뷰어 권한)

### CF Pages 등록
```
Name:  GA4_PROPERTY_ID
Value: 123456789 (10자 숫자, GA4 속성 설정에서 확인)
Type:  Plaintext

Name:  GA4_SERVICE_ACCOUNT_JSON
Value: {"type":"service_account",...} (한 줄 JSON 전체)
Type:  Encrypted ★
```

---

## 추가 권장 — 법제처 OpenAPI (자동 발행 미션 피벗 후)

### 법제처 OpenAPI (`LAW_GO_KR_OC`) — V2 운영 권장 ⚠️ V1은 정적 fixture

> **2026-05-02 미션 피벗 반영**: 자동 Q&A 검증 사이트로 운영 모드 변경 후
> 법제처가 unemployment·tax·insurance-labor·office-tips 4개 cluster 검증의
> 핵심 권위 소스가 됨. 기존 "발급 불필요"는 옛 운영 모드 기준이라 V2에서
> 발급 필수로 갱신.

### V1 (현재) — 정적 fixture 처리
- 법제처는 **호출 IP 사전 등록** 정책 운영 (CF Pages·GitHub Actions 동적 IP 환경 부적합)
- V1에서는 핵심 법령(고용보험법 제40·46조·근로기준법 제55·60조·소득세법 제59조 등)을
  `tests/fixtures/authority-mock/law-go-kr/` 정적 JSON으로 사전 캐시
- 분기 1회 수동 갱신 (법령 개정 빈도 낮음)

### V2 (운영 1~2개월+) — 별도 VPS 프록시
- 발급: https://open.law.go.kr (또는 https://www.law.go.kr/DRF) 회원가입
- OC = 가입 시 입력한 이메일의 @ 앞부분 (예: `kjh791213`)
- 별도 VPS ($5/월)에 프록시 띄우고 그 정적 IP를 법제처에 등록
- 머니룩 코드는 프록시 경유로 호출
- 환경변수: `LAW_GO_KR_OC` (변수명 단일화 — `LAW_GO_KR_KEY` 사용 금지)

### Naver Search Advisor 토큰 (`NAVER_SEARCH_ADVISOR_TOKEN`)
- IndexNow가 이미 Naver 색인 처리 중
- 별도 등록 효과 ↓
- **발급 불필요**

### Bing Webmaster API (`BING_API_KEY`)
- IndexNow가 이미 Bing 색인 처리 중
- **발급 불필요**

---

## 등록 후 동작 흐름

```
.env.local 키 입력 + 저장
    ↓
로컬 dev 서버에서 import.meta.env로 자동 로드
    ↓
같은 키를 CF Pages Env에 등록 (Production)
    ↓
git push 또는 CF Pages Save → 자동 재빌드 (1~3분)
    ↓
asiatop.co.kr 라이브에서 활성
```

---

## 보안 체크리스트

- [ ] `.env.local`이 `.gitignore`에 의해 차단되는지 (`git check-ignore .env.local` → `.env.local` 출력되면 OK)
- [ ] pre-commit hook이 작동하는지 (`pnpm install` 시 자동 설치)
- [ ] CF Pages Env에서 비밀 키는 **Encrypted** 타입인지
- [ ] PUBLIC_ prefix에 **공개 가능한 값**만 들어갔는지

문제 발생·노출 시 즉시 키 폐기·재발급 → [SECURITY.md](../SECURITY.md) 참조.
