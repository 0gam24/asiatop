# docs/04 — PageSpeed Insights 100점 달성 전략

본 프로젝트의 **가장 중요한 목표**다. 모바일·데스크톱 모두 100점 또는 사용자 합의된 최저 95점 이상.

> 출처: https://developers.google.com/speed/docs/insights/v5/about (Lighthouse 기반)

---

## 1. PageSpeed 100점의 의미

PageSpeed Insights는 Lighthouse를 실행하여 다음 4개 카테고리 점수를 계산한다:

- **Performance** (가장 중요, 실측 + 시뮬레이션)
- **Accessibility**
- **Best Practices**
- **SEO**

100점 = 모든 가중치 항목 만점. 단 하나라도 실패하면 점수가 깎인다. **단일 지표만 좋다고 통과하지 않는다 — 모든 지표가 "Good" 임계값 이내여야 한다.**

---

## 2. 통합 Core Web Vitals 임계값 (2026)

2026년 3월 코어 업데이트 이후 LCP·INP·CLS는 **합산 통합 점수**로 평가된다.

| 지표 | 2026 Good 임계값 | 비고 |
|---|---|---|
| LCP (Largest Contentful Paint) | **≤ 2.5s** | 75th percentile |
| **INP (Interaction to Next Paint)** | **≤ 150ms** | **2026년 200→150ms 강화** |
| CLS (Cumulative Layout Shift) | **≤ 0.1** | |
| TTFB (Time to First Byte) | ≤ 600ms | |
| FCP (First Contentful Paint) | ≤ 1.8s | |

PageSpeed 100점을 위해서는 위 임계값을 **여유 있게** 통과해야 한다 (예: LCP 2.0s 이하, INP 100ms 이하).

---

## 3. LCP 최적화 (Largest Contentful Paint)

LCP는 보통 hero 이미지 또는 hero 텍스트 블록.

### 3-1. 체크리스트

- [ ] LCP 요소 식별 (Lighthouse 또는 `web-vitals` 라이브러리로)
- [ ] LCP 이미지에 `fetchpriority="high"` 부여
- [ ] LCP 이미지 `<link rel="preload" as="image">` 적용
- [ ] LCP 영역 외부 폰트 의존 제거 또는 `font-display: optional`
- [ ] hero 영역 above-the-fold 콘텐츠는 SSR/SSG로 즉시 렌더 (CSR 금지)
- [ ] CDN 엣지 캐싱으로 TTFB ≤ 200ms 단축
- [ ] 이미지는 AVIF → WebP → JPEG 순으로 `<picture>` 폴백
- [ ] 이미지 크기를 LCP 영역 크기에 정확히 맞춤 (과다 해상도 금지)
- [ ] hero 이미지 모바일·데스크톱 별도 크롭

### 3-2. Astro에서 LCP 이미지 처리

```astro
---
import { Image } from 'astro:assets';
import heroImg from '../assets/hero.jpg';
---
<Image
  src={heroImg}
  alt="..."
  widths={[480, 800, 1200, 1600]}
  sizes="(min-width: 768px) 1200px, 100vw"
  loading="eager"
  fetchpriority="high"
  format="avif"
  quality={80}
/>

<!-- <head>에 preload 추가 -->
<link rel="preload" as="image" href={heroImg.src} fetchpriority="high">
```

### 3-3. 텍스트 LCP인 경우

- 폰트는 `<link rel="preload" as="font" type="font/woff2" crossorigin>`
- `font-display: optional`로 FOIT 시간 단축
- LCP 텍스트는 인라인 CSS로 폰트 패밀리 명시 (외부 CSS 대기 금지)

---

## 4. INP 최적화 (2026 핵심) — 가장 어려움

### 4-1. 체크리스트

- [ ] 메인 스레드 long task **50ms 초과 0건** 목표
- [ ] 무거운 자바스크립트는 Web Worker로 오프로드
- [ ] 이벤트 핸들러 내부에 `requestIdleCallback` 또는 `scheduler.yield()` 활용
- [ ] React 사용 시 — concurrent rendering, `useTransition`, `useDeferredValue`
- [ ] Hydration 비용 최소화 — Astro Islands 적극 활용
- [ ] 서드파티 스크립트는 유휴 시점(requestIdleCallback) 주입 — ~~Partytown 워커 격리~~ (2026-06-12 폐기, §4-3)
- [ ] 폼 입력, 드롭다운, 모달 오픈 등 자주 발생하는 인터랙션 INP 측정
- [ ] CSS 애니메이션은 GPU accelerated property(`transform`, `opacity`)만 사용
- [ ] `setTimeout` 0ms 트릭으로 작업 분할
- [ ] 디바운스·쓰로틀로 빈번한 이벤트 처리

### 4-2. scheduler.yield() 패턴

긴 작업을 여러 청크로 분할:

```js
async function processLargeList(items) {
  for (const item of items) {
    process(item);
    if ('scheduler' in window && 'yield' in window.scheduler) {
      await window.scheduler.yield();
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}
```

### 4-3. ~~서드파티 스크립트 격리 (Partytown)~~ (2026-06-12 전면 폐기 — 사용 금지)

> AdSense(2026-06-12, docs/23 R3)에 이어 GA4 도 같은 날 제거 — gtag 는 Partytown
> 공식 미지원 조합이며, 실측에서 config 호출이 포워딩 스니펫보다 먼저 실행돼
> GA4 수신 0건이었다. astro.config.mjs 에서 통합 자체를 제거함.

현행 표준: **메인스레드 + 유휴 시점 주입**.
- 분석·에러추적(gtag·Sentry): `requestIdleCallback(load, { timeout: 3000 })` 주입
  (`src/components/Analytics.astro` 참조)
- 광고(AdSense 수동 유닛): 뷰포트 근접 lazy-init (`src/lib/ads-lazy.ts`, docs/17)

### 4-4. INP 측정

```js
// src/lib/web-vitals.ts
import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log('INP:', metric.value, metric);
  // RUM 서비스로 전송
});
```

---

## 5. CLS 최적화 (Cumulative Layout Shift)

### 5-1. 체크리스트

- [ ] 모든 `<img>`에 명시적 `width`/`height` 또는 `aspect-ratio` 지정
- [ ] 광고/임베드 슬롯 사전 공간 예약 (`min-height`)
- [ ] 폰트 로딩으로 인한 텍스트 시프트 방지: `size-adjust`, `ascent-override`, `descent-override` 활용
- [ ] 동적으로 삽입되는 배너/쿠키 동의는 viewport 상단 고정 (콘텐츠 밀어내지 않기)
- [ ] 스켈레톤 UI는 실제 콘텐츠와 동일한 크기로
- [ ] 동적 import 컴포넌트도 placeholder 크기 예약

### 5-2. 폰트 fallback 메트릭 매칭 — 미세 CLS 0 달성

`docs/07-fonts.md` 참조. Pretendard 사용 시:

```css
@font-face {
  font-family: 'Pretendard Fallback';
  src: local('Apple SD Gothic Neo'), local('Malgun Gothic'), local('sans-serif');
  size-adjust: 96.5%;
  ascent-override: 87%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'Pretendard Variable', 'Pretendard Fallback', sans-serif;
}
```

---

## 6. 자바스크립트 최소화

### 6-1. 번들 한도

| 자원 | 페이지당 한도 (gzip) |
|---|---|
| 초기 HTML | ≤ 50 KB |
| 초기 JS (실행되는) | ≤ 100 KB |
| 초기 CSS | ≤ 30 KB |
| 초기 폰트 | ≤ 100 KB |
| LCP 이미지 | ≤ 200 KB |
| 페이지 전체 above-the-fold | ≤ 1 MB |

### 6-2. Astro의 강점 활용

- 기본은 **JS 0 KB** (정적 HTML만)
- 인터랙션 필요한 컴포넌트만 `client:*` 디렉티브
- `client:visible`, `client:idle` 적극 활용 → `client:load` 최소화

### 6-3. 코드 스플리팅

- 라우트 단위 자동 스플리팅 (Astro 기본)
- 비핵심 컴포넌트는 동적 `import()`로 지연 로드

자세한 내용은 `docs/06-javascript.md`.

---

## 7. 캐싱 (CF Pages 엣지)

### 7-1. 정적 자산

```
# public/_headers
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
```

### 7-2. HTML

```
/*.html
  Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=604800
```

자세한 내용은 `docs/09-caching.md`.

---

## 8. 100점 달성을 위한 추가 디테일

### 8-1. SEO 카테고리 만점

- 모든 페이지 `<title>`, `<meta name="description">`, `<link rel="canonical">`
- `<html lang="ko">` (또는 적절한 언어)
- viewport 메타
- 모든 이미지 `alt` 속성
- `robots.txt` 게시
- 200 OK 응답 (5xx, 4xx 없음)

### 8-2. Best Practices 카테고리 만점

- HTTPS 사용
- 콘솔 에러 0건
- 이미지 displayed/intrinsic ratio 일치
- `document.write()` 사용 금지
- 사용 중단된 API 사용 금지
- CSP 헤더 적용

### 8-3. Accessibility 카테고리 만점

- 컬러 대비 통과 (`docs/13`)
- 모든 폼 컨트롤에 label
- 의미적 마크업
- 페이지당 `<h1>` 1개
- 헤딩 계층 건너뛰기 없음
- `aria-*` 속성 올바르게 사용

자세한 내용은 `docs/13-accessibility.md`.

---

## 9. 측정·검증

### 9-1. 로컬 측정

```bash
# Lighthouse CLI
pnpm dlx @lhci/cli autorun

# 단일 페이지 직접 실행
pnpm dlx lighthouse https://localhost:4321 --view --preset=desktop
pnpm dlx lighthouse https://localhost:4321 --view  # 모바일
```

### 9-2. PageSpeed Insights

배포 후 https://pagespeed.web.dev/ 에서 직접 측정. 모바일·데스크톱 모두 100점 또는 합의된 최저 기준 통과해야 함.

### 9-3. 실측 (CrUX 데이터)

- Search Console → Core Web Vitals 리포트 주간 확인
- Cloudflare Web Analytics 또는 자체 RUM으로 실측 수집

### 9-4. WebPageTest

- Slow 4G + Moto G4 환경 테스트
- waterfall 분석으로 병목 지점 파악

### 9-5. CI 검증 (Lighthouse CI)

`templates/github-actions/lighthouse-ci.yml` 참조. PR마다 자동 실행, 임계값 미달 시 머지 차단.

`lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4321/"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1.0 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 150 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

---

## 10. 100점 달성 우선순위 작업 순서

기본기를 빼먹으면 다른 최적화는 의미 없다. 다음 순서로 진행:

1. **Astro SSG 모드 + Cloudflare 엣지** → TTFB·FCP 자동 통과
2. **이미지 최적화** (`docs/08`) → LCP 1차 통과
3. **폰트 셀프 호스팅 + size-adjust** (`docs/07`) → CLS·LCP 통과
4. **Hydration 디렉티브 정리** (Islands) → INP 1차 통과
5. **서드파티 스크립트 유휴 시점 주입** (~~Partytown 격리~~ 2026-06-12 폐기) → INP 2차 통과
6. **HTTP 캐싱·preload** (`docs/09`) → LCP 2차 통과
7. **JS 번들 분석·미사용 제거** → INP 3차 통과
8. **접근성·SEO 메타** → 다른 카테고리 만점
9. **Lighthouse CI 도입** → 회귀 방지

---

## 11. 100점이 안 나올 때 디버깅 순서

1. Lighthouse 리포트의 "Opportunities" 섹션 확인 — 가장 점수 깎인 항목 우선
2. "Diagnostics" 섹션의 long task 확인
3. "Treemap" 으로 큰 JS 번들 식별
4. Network 탭에서 폰트·이미지·third-party 로드 시점 확인
5. Performance 탭에서 hydration·hydration·이벤트 핸들러 분석
6. INP는 실제 사용자 인터랙션 시뮬레이션 필요 (수동 클릭/입력)

---

## 12. 검증 체크리스트

- [ ] PageSpeed Insights 모바일 점수 100 (또는 95+)
- [ ] PageSpeed Insights 데스크톱 점수 100 (또는 95+)
- [ ] LCP ≤ 2.0s (여유 있게)
- [ ] INP ≤ 100ms (여유 있게)
- [ ] CLS ≤ 0.05 (여유 있게)
- [ ] TTFB ≤ 200ms (CF 엣지로 자동 달성)
- [ ] 메인 스레드 long task 0건
- [ ] 초기 JS 번들 100KB 이하 (gzip)
- [ ] Lighthouse CI PR 검증 도입
- [ ] CrUX 데이터 주간 모니터링 시작

---

**다음 작업**: `docs/05-rendering.md` — 페이지별 렌더링 전략 결정.
