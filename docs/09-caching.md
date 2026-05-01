# docs/09 — 캐싱 및 전송 최적화

Cloudflare Pages 엣지를 최대한 활용. TTFB 200ms 이하, LCP 단축, 반복 방문 시 0 대기.

---

## 1. 핵심 원칙

- ✅ HTML도 엣지 캐시 (s-maxage + stale-while-revalidate)
- ✅ 정적 자산은 immutable + 1년 캐시
- ✅ Brotli 압축 (CF Pages 자동)
- ✅ HTTP/3 (CF Pages 자동)
- ✅ Early Hints (103) 활용
- ❌ 잘못된 캐시 헤더로 stale 콘텐츠 노출

---

## 2. Cloudflare Pages `_headers` 파일

`public/_headers` 파일에 작성. 빌드 시 그대로 복사되어 적용.

### 2-1. 전체 템플릿

```
# public/_headers

# === 정적 자산: 영구 캐시 ===
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/_image/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/*.woff2
  Cache-Control: public, max-age=31536000, immutable

/*.avif
  Cache-Control: public, max-age=31536000, immutable

/*.webp
  Cache-Control: public, max-age=31536000, immutable

/*.svg
  Cache-Control: public, max-age=31536000, immutable

# === HTML: 짧은 브라우저 캐시 + 긴 엣지 캐시 ===
/*
  Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=604800
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://www.google-analytics.com; frame-ancestors 'self'

# === robots.txt, sitemap, llms.txt: 짧은 캐시 ===
/robots.txt
  Cache-Control: public, max-age=3600

/sitemap.xml
  Cache-Control: public, max-age=3600

/llms.txt
  Cache-Control: public, max-age=3600

/llms-full.txt
  Cache-Control: public, max-age=3600

# === 보안 ===
/.well-known/security.txt
  Cache-Control: public, max-age=3600
```

### 2-2. 헤더 의미

**Cache-Control 분해:**
- `public` — 모든 캐시(브라우저, CDN)에서 저장 가능
- `max-age=N` — 브라우저 캐시 유효 시간(초)
- `s-maxage=N` — CDN(공유) 캐시 유효 시간(초). max-age보다 우선.
- `immutable` — 절대 안 바뀐다는 약속 → 브라우저가 재검증 안 함
- `stale-while-revalidate=N` — 만료 후에도 N초 동안 stale 응답 허용 + 백그라운드 재검증

**HTML 헤더 의미**:
- `max-age=0`: 브라우저는 매번 검증
- `s-maxage=86400`: CF 엣지는 24시간 캐시
- `stale-while-revalidate=604800`: 만료 후 7일간 stale 허용 → 빌드 중에도 빠른 응답

---

## 3. Brotli 압축

### 3-1. 자동 활성화

Cloudflare Pages는 다음을 자동 압축:
- HTML, CSS, JS, JSON, XML, SVG, woff2 (Brotli 또는 gzip)
- 이미지(AVIF, WebP, JPEG, PNG)는 이미 압축 — 재압축 안 함

별도 설정 불필요.

### 3-2. 검증

```bash
curl -H "Accept-Encoding: br" -I https://example.com/index.html | grep -i encoding
# Content-Encoding: br
```

---

## 4. HTTP/3 (QUIC)

Cloudflare Pages는 HTTP/3 자동 활성화. 별도 설정 불필요.

검증:
```bash
curl --http3 -I https://example.com
```

장점:
- 0-RTT 핸드셰이크 (재방문 시)
- 패킷 손실 시 head-of-line blocking 없음
- 모바일 네트워크 변경 시 끊김 없음

---

## 5. Early Hints (103)

### 5-1. 개념

서버가 200 응답 보내기 전에 103 Early Hints를 먼저 보내 핵심 자원 preload 시작.

→ LCP 50~200ms 단축 가능.

### 5-2. Cloudflare Pages 활성화

CF Pages는 `Link: <...>; rel=preload` 헤더를 자동으로 103 Early Hints로 변환.

`public/_headers`:

```
/
  Link: </fonts/PretendardVariable.subset.woff2>; rel=preload; as=font; type=font/woff2; crossorigin
  Link: </_astro/hero.avif>; rel=preload; as=image; fetchpriority=high
```

또는 페이지별 `<head>`의 `<link rel="preload">`도 자동으로 103으로 변환됨.

### 5-3. 검증

```bash
curl -I https://example.com -H "Connection: keep-alive" --http2
# 응답 중 103 Early Hints가 보이면 성공
```

Chrome DevTools → Network → 페이지 선택 → Timing → "Initial connection" 항목 확인.

---

## 6. preload / preconnect / dns-prefetch

### 6-1. preload — 핵심 자원

이 페이지에서 **반드시 사용되는** 자원:

```html
<link rel="preload" as="font" type="font/woff2" href="/fonts/Pretendard.woff2" crossorigin>
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
```

⚠️ 너무 많이 preload 하면 오히려 느려짐 — 페이지당 2~4개 정도.

### 6-2. preconnect — 외부 도메인

GA, CDN 등 다른 도메인에 곧 연결할 거면:

```html
<link rel="preconnect" href="https://www.googletagmanager.com">
```

### 6-3. dns-prefetch — 가능성만 있는 도메인

```html
<link rel="dns-prefetch" href="https://images.unsplash.com">
```

`preconnect`가 더 강력 (TCP + TLS 미리 수행). `dns-prefetch`는 폴백.

---

## 7. 페이지별 캐시 무효화

### 7-1. 자산 파일명 hash

Astro 빌드 시 자동:

```
dist/_astro/index.abc123.js
dist/_astro/style.def456.css
```

→ 내용 바뀌면 hash 바뀜 → 새 URL → 캐시 무효화 자동.

### 7-2. HTML 캐시 퍼지

빌드/배포 시 CF Pages가 자동으로 HTML 캐시 무효화. 수동 작업 불필요.

수동 퍼지 필요 시 (드물게):
```bash
# Cloudflare API로 캐시 퍼지
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE}/purge_cache" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 8. ETag / Last-Modified

CF Pages가 자동 처리. 별도 설정 불필요. 조건부 요청(`If-None-Match`, `If-Modified-Since`) 자동 응답.

---

## 9. 서비스 워커 정책

PWA가 목적이 아니라면 **사용 자제**. 잘못 쓰면:

- 캐시 정책 충돌 → stale 콘텐츠
- INP 악화 (메시지 전달 비용)
- 디버깅 어려움

PWA가 정말 필요한 경우만 도입. Workbox 등 검증된 도구 사용.

---

## 10. API 응답 캐시

빌드 타임 호출 → 결과는 정적 HTML에 인라인 (캐시 자동 적용).

런타임 호출(Cloudflare Functions 등)인 경우:

```ts
// functions/api/data.ts
export const onRequest = async (ctx) => {
  const data = await fetch('https://api.example.com/data');
  const json = await data.json();

  return new Response(JSON.stringify(json), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
```

---

## 11. CORS (필요 시)

API를 다른 도메인에서 호출해야 하는 경우:

```
/api/*
  Access-Control-Allow-Origin: https://allowed.example.com
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Max-Age: 86400
```

`*`는 비밀 데이터 노출 위험 → 화이트리스트 사용.

---

## 12. 검증 체크리스트

- [ ] `public/_headers` 파일 작성 완료
- [ ] 정적 자산 `Cache-Control: public, max-age=31536000, immutable`
- [ ] HTML `s-maxage` + `stale-while-revalidate`
- [ ] Brotli 적용 확인 (`Content-Encoding: br`)
- [ ] HTTP/3 적용 확인
- [ ] LCP 자원 preload 적용 (Early Hints로 변환됨)
- [ ] 페이지당 preload 2~4개 (남발 금지)
- [ ] 외부 도메인 preconnect 적용 (GA 등)
- [ ] 보안 헤더 모두 적용 (`docs/14` 참조)
- [ ] Lighthouse "Use efficient cache lifetimes" 통과
- [ ] securityheaders.com A+ 등급

---

**다음 작업**: `docs/10-structured-data.md` — Schema.org JSON-LD 페이지 유형별.
