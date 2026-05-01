# docs/14 — 보안

securityheaders.com A+ 등급, OWASP Top 10 점검, 비밀 관리. PageSpeed Best Practices 카테고리 100점의 핵심.

---

## 1. 핵심 원칙

- ✅ HTTPS 전체 강제
- ✅ 보안 헤더 모두 적용 (`docs/09` 참조)
- ✅ 비밀(secrets)은 환경변수, 절대 커밋 금지
- ✅ 의존성 취약점 자동 점검
- ✅ OWASP Top 10 점검
- ❌ 자체 인증/암호화 구현 (검증된 라이브러리 사용)

---

## 2. 전송 보안

### 2-1. HTTPS 강제

Cloudflare Pages는 자동 HTTPS. 추가 설정 불필요.

`http://` 접근 시 자동 308 리다이렉트.

### 2-2. HSTS (HTTP Strict Transport Security)

```
# public/_headers
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- `max-age=63072000` — 2년
- `includeSubDomains` — 서브도메인 포함
- `preload` — 브라우저 HSTS preload 리스트 등록 가능

### 2-3. HSTS Preload 등록

https://hstspreload.org/ 에서 도메인 등록.

요건:
- 유효한 인증서
- HTTP → HTTPS 리다이렉트
- 모든 서브도메인 HTTPS
- HSTS 헤더에 `max-age ≥ 31536000` + `includeSubDomains` + `preload`

등록되면 브라우저가 처음부터 HTTPS만 사용 → MITM 공격 차단.

⚠️ 등록은 신중히 — 제거 시 몇 달 걸림.

### 2-4. TLS 1.3

Cloudflare Pages는 TLS 1.3 자동. 별도 설정 불필요.

---

## 3. HTTP 보안 헤더

### 3-1. 전체 셋

`public/_headers`:

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
```

### 3-2. 헤더별 의미

| 헤더 | 효과 |
|---|---|
| `Strict-Transport-Security` | HTTPS 강제, MITM 차단 |
| `X-Content-Type-Options: nosniff` | MIME 스니핑 방지 |
| `X-Frame-Options: SAMEORIGIN` | 클릭재킹 방지 (CSP frame-ancestors가 더 강력) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Referrer 누출 제한 |
| `Permissions-Policy` | 사용 안 하는 기능(카메라, 마이크 등) 비활성 |
| `Content-Security-Policy` | XSS 방어 (가장 중요) |
| `Cross-Origin-Opener-Policy` | 다른 origin 윈도우와 격리 |

### 3-3. CSP 상세

#### 안전한 기본 정책

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

#### 인라인 스크립트가 필요한 경우

`'unsafe-inline'`은 XSS 방어 무력화 → **사용 금지**. 대안:

**Nonce 방식**:

```
script-src 'self' 'nonce-RANDOM_NONCE';
```

```html
<script nonce="RANDOM_NONCE">
  // 인라인 스크립트
</script>
```

각 응답마다 새 nonce 생성. Cloudflare Pages Functions 또는 Astro middleware로 구현.

**Hash 방식** (정적이라 nonce 못 만드는 경우):

```
script-src 'self' 'sha256-HASH_OF_INLINE_SCRIPT';
```

#### GA4·외부 스크립트 허용

```
script-src 'self' 'nonce-XXX' https://www.googletagmanager.com https://www.google-analytics.com;
img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com;
connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com;
```

#### CSP Report-Only (테스트)

```
Content-Security-Policy-Report-Only: ...; report-uri /csp-report;
```

위반 보고만, 차단은 안 함. 정책 튜닝 시 사용.

### 3-4. 검증

```bash
# Mozilla Observatory
https://observatory.mozilla.org/analyze/example.com

# Security Headers
https://securityheaders.com/?q=example.com

# 목표: A+ 등급
```

---

## 4. 비밀(Secrets) 관리

### 4-1. 환경변수

Cloudflare Pages 대시보드 → Settings → Environment variables에 등록:

- `API_KEY` — 빌드 시 사용
- `DATABASE_URL` — 런타임 사용 (Functions)

빌드 시 사용:

```ts
// astro.config.mjs 또는 .astro 파일
const apiKey = import.meta.env.API_KEY;
// ✅ 빌드 결과에 키 자체는 없음 (서버에서 호출되어 응답만 인라인)
```

런타임 사용 (Cloudflare Functions):

```ts
// functions/api/data.ts
export const onRequest = async (ctx) => {
  const apiKey = ctx.env.API_KEY;
  // ...
};
```

### 4-2. 절대 금지

```ts
// ❌ 클라이언트에 노출됨
const PUBLIC_API_KEY = import.meta.env.PUBLIC_API_KEY;
const VITE_API_KEY = import.meta.env.VITE_API_KEY;

// ❌ 코드에 하드코딩
const API_KEY = 'sk-1234567890';
```

### 4-3. .env 파일 정책

```
# .gitignore
.env
.env.local
.env.*.local

# 커밋 가능
.env.example  ← 키 목록만, 값 없음
```

`.env.example`:

```
API_KEY=
DATABASE_URL=
SITE_URL=https://example.com
```

### 4-4. 비밀 누출 방지 도구

```bash
# 커밋 전 검사
pnpm dlx git-secrets --install
pnpm dlx git-secrets --register-aws  # AWS 키 패턴
pnpm dlx git-secrets --add 'sk-[a-zA-Z0-9]{32,}'  # OpenAI 등

# CI에서
pnpm dlx trufflehog filesystem .
```

GitHub Push Protection 활성화 (저장소 설정 → Code security → Secret scanning).

---

## 5. 인증·인가 (있는 경우)

### 5-1. 비밀번호

- ✅ bcrypt / scrypt / argon2id로 해시
- ❌ MD5, SHA-1, SHA-256 단독 (느린 해시 필요)
- ❌ 평문 저장

### 5-2. OAuth/OIDC

자체 구현 금지. 검증된 라이브러리:

- Auth.js (NextAuth) — Astro도 지원
- Clerk
- Supabase Auth
- Auth0 / Okta

### 5-3. 세션 쿠키

```
Set-Cookie: session=xxx; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400
```

- `Secure` — HTTPS만
- `HttpOnly` — JS 접근 불가 (XSS 시 탈취 방지)
- `SameSite=Lax` — CSRF 방어 (또는 `Strict`)

### 5-4. CSRF 토큰

state-changing 요청 (POST, PUT, DELETE)에 CSRF 토큰 필수. SameSite=Lax/Strict와 함께 사용.

### 5-5. Rate Limiting

로그인, 비밀번호 재설정, 폼 제출, API에 rate limit:

- Cloudflare Rate Limiting Rules (대시보드에서 설정)
- 또는 Cloudflare Workers + KV로 자체 구현

```
로그인: IP당 10회/분
폼 제출: IP당 30회/분
API: 사용자당 1000회/시간
```

---

## 6. 입력 검증·출력 인코딩

### 6-1. 모든 입력 검증

서버에서 받은 데이터:

- 길이 제한
- 형식 검증 (이메일, URL 등)
- 화이트리스트 방식 (블랙리스트 X)

```ts
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
});

const data = schema.parse(input);  // 실패 시 throw
```

### 6-2. 출력 인코딩

HTML로 출력 시 사용자 입력은 escape. Astro/React는 기본 escape — `dangerouslySetInnerHTML`나 `set:html`만 주의.

```astro
<!-- ✅ 자동 escape -->
<p>{userInput}</p>

<!-- ⚠️ 위험 - DOMPurify로 sanitize 필수 -->
<div set:html={DOMPurify.sanitize(userHtml)} />
```

### 6-3. SQL Injection

ORM 사용 (Prisma, Drizzle 등). 직접 SQL 작성 시 prepared statement만.

```ts
// ❌ 절대 금지
db.exec(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ Prepared
db.prepare('SELECT * FROM users WHERE email = ?').get(email);
```

---

## 7. 의존성 보안

### 7-1. 자동 점검

```bash
pnpm audit --audit-level=moderate
```

CI에서:

```yaml
- name: Security audit
  run: pnpm audit --audit-level=moderate
```

### 7-2. 자동 업데이트

- Renovate 또는 Dependabot
- patch는 auto-merge, minor/major는 사람 검토

### 7-3. SBOM (Software Bill of Materials)

```bash
pnpm dlx @cyclonedx/bom -o bom.json
```

공급망 추적, 라이선스 검증.

---

## 8. 봇 보호 (폼·로그인)

### 8-1. Cloudflare Turnstile (권장)

reCAPTCHA보다 가볍고 프라이버시 친화적. 무료.

```html
<div class="cf-turnstile" data-sitekey="0xXXXX"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

서버 검증:

```ts
const formData = new FormData();
formData.append('secret', SECRET);
formData.append('response', token);

const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  body: formData,
});
```

### 8-2. AI 크롤러는 차단 금지

GPTBot, ClaudeBot 등 검색·AI 크롤러는 봇 보호 적용 금지 → GEO 가시성 저하. User-Agent로 분기.

---

## 9. OWASP Top 10 (2021)

배포 전 점검:

1. **Broken Access Control** — 권한 검증 모든 엔드포인트
2. **Cryptographic Failures** — 비밀번호 해시, TLS, 비밀 관리
3. **Injection** — SQL/XSS/Command Injection
4. **Insecure Design** — Threat Modeling
5. **Security Misconfiguration** — 보안 헤더, 기본 비밀번호 변경
6. **Vulnerable Components** — `pnpm audit`
7. **Identification & Authentication Failures** — Auth 라이브러리 사용
8. **Software & Data Integrity Failures** — SRI, signed updates
9. **Security Logging & Monitoring Failures** — 로그·알림
10. **Server-Side Request Forgery** — 외부 URL 호출 시 화이트리스트

---

## 10. 모니터링·대응

### 10-1. 에러 추적

Sentry 또는 동급:

```bash
pnpm add @sentry/astro
```

### 10-2. 침해 사고 대응 절차

문서화 필수:

- 감지 → 분류 → 격리 → 복구 → 사후 분석
- 연락 체인 (DPO, 법무, CTO)
- 사용자 통지 의무 (한국 개보법: 72시간 이내)

### 10-3. 정기 보안 점검

- 분기별 의존성 audit
- 반기별 OWASP Top 10 점검
- 연간 침투 테스트 (대규모 사이트)

---

## 11. 검증 체크리스트

- [ ] HTTPS 전체 강제 (HTTP → 308 리다이렉트)
- [ ] HSTS 적용 + preload 검토
- [ ] CSP 적용 (`unsafe-inline` 0건)
- [ ] 모든 보안 헤더 적용
- [ ] securityheaders.com A+ 등급
- [ ] Mozilla Observatory A+ 등급
- [ ] `.env` gitignore, `.env.example`만 커밋
- [ ] 비밀 클라이언트 노출 0건 (`PUBLIC_*` 키 검증)
- [ ] git-secrets 또는 trufflehog CI 통합
- [ ] GitHub Secret Scanning 활성화
- [ ] 비밀번호 argon2id 또는 bcrypt
- [ ] OAuth 라이브러리 사용 (자체 구현 0건)
- [ ] 세션 쿠키 Secure + HttpOnly + SameSite
- [ ] CSRF 토큰 (state-changing 요청)
- [ ] Rate limiting (로그인, 폼, API)
- [ ] Turnstile 또는 동급 (폼·로그인)
- [ ] AI 크롤러는 차단하지 않음
- [ ] Zod 또는 동급 입력 검증
- [ ] `pnpm audit --audit-level=moderate` 통과
- [ ] Renovate / Dependabot 활성화
- [ ] Sentry 또는 동급 에러 추적
- [ ] OWASP Top 10 점검 완료

---

**다음 작업**: `docs/15-analytics-consent.md` — GA4 + Consent Mode v2.
