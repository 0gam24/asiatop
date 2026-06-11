# docs/17 — 성능 예산 (Performance Budget)

PR마다 자동 검증, 초과 시 머지 차단. 회귀 방지의 핵심.

---

## 1. 핵심 원칙

- ✅ 모든 PR에서 자동 측정
- ✅ 임계값 초과 시 머지 차단 (warning이 아닌 error)
- ✅ 정기적으로 임계값 재검토 (분기별)
- ❌ "다음에 고치겠다"는 약속 → 빚이 쌓임

---

## 2. 자원별 한도

### 2-1. 페이지당 한도 (gzipped)

| 자원 | 한도 |
|---|---|
| 초기 HTML | ≤ 50 KB |
| 초기 JS (실행되는) | ≤ 100 KB |
| 초기 CSS | ≤ 30 KB |
| 초기 폰트 | ≤ 100 KB |
| LCP 이미지 | ≤ 200 KB |
| 페이지 above-the-fold 전체 | ≤ 1 MB |

### 2-2. 라이브러리별 한도

| 라이브러리 | 한도 (gzipped) |
|---|---|
| React (선택 사용) | ≤ 50 KB |
| 단일 컴포넌트 | ≤ 30 KB |
| 폴리필 | ≤ 10 KB |

---

## 3. Lighthouse CI 임계값

`lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:4321/",
        "http://localhost:4321/blog",
        "http://localhost:4321/about"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1.0 }],

        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "interaction-to-next-paint": ["error", { "maxNumericValue": 150 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "server-response-time": ["error", { "maxNumericValue": 600 }],

        "unused-javascript": ["warn", { "maxNumericValue": 50000 }],
        "unused-css-rules": ["warn", { "maxNumericValue": 20000 }],
        "render-blocking-resources": ["error", { "maxNumericValue": 0 }],
        "uses-optimized-images": ["error", { "minScore": 1 }],
        "uses-webp-images": ["error", { "minScore": 1 }],
        "uses-text-compression": ["error", { "minScore": 1 }],
        "efficient-animated-content": ["error", { "minScore": 1 }],
        "modern-image-formats": ["error", { "minScore": 1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 3-1. 모바일·데스크톱 별도 검증

```bash
# Desktop
pnpm dlx @lhci/cli autorun --collect.settings.preset=desktop

# Mobile
pnpm dlx @lhci/cli autorun --collect.settings.preset=mobile
```

GitHub Actions에서 두 가지 모두 실행. 자세한 워크플로는 `templates/github-actions/lighthouse-ci.yml`.

---

## 4. 번들 크기 예산 — size-limit

`package.json`:

```json
{
  "scripts": {
    "size": "size-limit"
  },
  "size-limit": [
    {
      "name": "Main JS bundle",
      "path": "dist/_astro/*.js",
      "limit": "100 KB",
      "gzip": true
    },
    {
      "name": "Main CSS",
      "path": "dist/_astro/*.css",
      "limit": "30 KB",
      "gzip": true
    },
    {
      "name": "All fonts",
      "path": "dist/fonts/*.woff2",
      "limit": "150 KB"
    }
  ]
}
```

```yaml
# GitHub Actions에서
- name: Check size limit
  run: pnpm size
```

---

## 5. 번들 분석

### 5-1. source-map-explorer

```bash
pnpm build
pnpm dlx source-map-explorer 'dist/_astro/**/*.js'
```

번들 안에서 어떤 라이브러리가 얼마나 차지하는지 시각화.

### 5-2. rollup-plugin-visualizer

```bash
pnpm add -D rollup-plugin-visualizer
```

```js
// astro.config.mjs
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  vite: {
    plugins: [
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  },
});
```

빌드 후 `dist/stats.html` 열면 트리맵.

---

## 6. 미사용 코드 검출

### 6-1. knip

```bash
pnpm dlx knip
```

미사용 파일, 익스포트, 의존성 검출.

`knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": ["src/pages/**/*.astro", "src/content.config.ts"],
  "project": ["src/**/*.{astro,ts,tsx,js,jsx}"],
  "ignoreDependencies": ["@types/*"]
}
```

CI 통합:

```yaml
- name: Knip
  run: pnpm dlx knip --reporter compact
```

### 6-2. depcheck

```bash
pnpm dlx depcheck
```

미사용 의존성만.

---

## 7. 회귀 감지

### 7-1. 기준선 비교

PR이 main 대비 얼마나 더 무거운지:

```yaml
- name: Bundle size diff
  uses: andresz1/size-limit-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

PR 코멘트로 "+5KB (+3%)" 형식 자동 게시.

### 7-2. PageSpeed 회귀

이전 빌드 대비 점수 떨어지면 PR에 경고:

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    configPath: ./lighthouserc.json
    uploadArtifacts: true
    temporaryPublicStorage: true
```

---

## 8. 임계값 위반 처리

### 8-1. 차단(error) — 머지 불가

- Performance 95 미만
- LCP 2.5s 초과
- INP 150ms 초과
- CLS 0.1 초과
- 초기 JS 100KB 초과
- SEO 카테고리 100 미만

### 8-2. 경고(warn) — 머지 가능, 알림

- 미사용 JS 50KB 초과
- 미사용 CSS 20KB 초과
- 라이브러리 단일 30KB 초과

### 8-3. 예외 처리

정당한 사유로 임계값 초과해야 한다면:

1. PR description에 사유 명시
2. `lighthouserc.json` 일시 수정 (해당 PR에 한해)
3. 사용자 명시적 승인
4. 후속 작업 항목으로 등록

---

## 9. 측정 환경 표준화

### 9-1. CI 환경

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- uses: pnpm/action-setup@v3

- run: pnpm install --frozen-lockfile
- run: pnpm build
- run: pnpm dlx serve dist -p 4321 &
- run: sleep 3  # 서버 시작 대기

- run: pnpm dlx @lhci/cli autorun
```

### 9-2. 결과 일관성

- Lighthouse `numberOfRuns: 3` (3회 실행 후 중앙값)
- 같은 URL을 같은 환경에서 측정
- 외부 요인(네트워크 변동) 제거

---

## 10. CrUX 데이터 (실측 모니터링)

### 10-1. Search Console

매주 Search Console → Core Web Vitals 리포트 확인.

- 모바일·데스크톱 별 "Good" 비율
- "Needs improvement" / "Poor" 페이지 식별

### 10-2. PageSpeed Insights API

자동화 가능:

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance" \
  | jq '.lighthouseResult.categories.performance.score'
```

GitHub Actions cron으로 일간 모니터링 + Slack 알림 자동화 가능.

---

## 11. 검증 체크리스트

- [ ] `lighthouserc.json` 작성, 임계값 명시
- [ ] `package.json`에 `size-limit` 설정
- [ ] GitHub Actions에 Lighthouse CI 워크플로
- [ ] PR 코멘트에 번들 크기 diff 자동 게시
- [ ] 모바일·데스크톱 모두 측정
- [ ] knip / depcheck CI 통합
- [ ] 임계값 위반 시 머지 차단 동작 확인
- [ ] CrUX 주간 모니터링 시작
- [ ] 분기별 임계값 재검토 일정

---

## 12. AdSense INP/CLS 사전 budget (R53 #9)

AdSense 활성 시 광고 스크립트가 CWV 에 큰 영향. 신청·승인 전 다음 규칙을 코드/정책으로 박아 회귀 방어.

### 12-1. 광고 표시 정책 (코드 강제)

| 항목 | 규칙 | 이유 |
|---|---|---|
| **Auto Ads** | ❌ 금지 — 수동 슬롯만 사용. (이행기 예외: docs/23 R3 — 수동 유닛 프로덕션 확인 후 OFF) | DOM 자동 삽입 → CLS 폭증 |
| **Above-the-fold 광고** | ≤ 1개 (홈·calculator) / 0개 (글 상세 첫 화면) | LCP 위협 |
| **광고 슬롯 height 예약** | **래퍼 `.ad-wrap` `min-height` 만** — ins 자체 `aspect-ratio` 금지 (adsbygoogle 가 inline height 로 덮어씀, docs/23 §3-1 (4)) | CLS = 0 유지 |
| **광고 로드 전략** | **뷰포트 근접 lazy-init** (`src/lib/ads-lazy.ts` IO, rootMargin 200px). ~~Partytown lazy~~ — AdSense 공식 미지원 조합으로 2026-06-12 금지 전환 | below-fold 슬롯 lab 측정 미로드 → PSI 100 양립 |
| **광고 reload·refresh** | ❌ 금지 | LCP·INP 회귀 + 사용자 신뢰성 ↓ |

### 12-2. 측정 임계 (광고 활성 후)

| 메트릭 | 광고 OFF | 광고 ON 임계 |
|---|---|---|
| LCP (mobile) | ≤ 2.0s | ≤ 2.5s (필드·CrUX 기준) |
| INP (mobile) | ≤ 100ms | ≤ 150ms (필드·CrUX 기준) |
| CLS (sitewide) | < 0.05 | < 0.1 (필드·CrUX 기준) |
| Lighthouse Performance | 100 | **100 — 완화 없음** (docs/23 결정 #3: lazy-init 으로 lab 측정 중 광고 미로드. 기존 ≥85/≥80 완화 기준은 2026-06-12 폐기) |

### 12-3. 활성 절차 (운영자 권장)

1. `PUBLIC_ADSENSE_CLIENT=` 채우기 전:
   - 위 12-1 규칙으로 [`src/components/AdSlot.astro`](../src/components/AdSlot.astro) 의 `format` 별 `min-height` 검증
   - 광고 슬롯 1개 시범 페이지에 inline 한 더미 placeholder 로 LCP·CLS 측정
2. AdSense 승인 후 환경변수 채우기 → CF Pages Retry deployment
3. 24h 후 PSI 재측정, 위 12-2 임계 모두 통과 확인
4. 임계 초과 시:
   - 즉시 `PUBLIC_ADSENSE_CLIENT` 비우기 (CF Pages env 만 변경 + Retry deployment, 코드 변경 X)
   - 광고 슬롯 위치·크기·timing 조정 후 재시도

### 12-4. 회귀 차단 게이트

- 본 PR(R53 #3) 의 `bundle-size` CI 게이트 (JS raw 350KB / gz 120KB / CSS 80KB) 가 광고 chunk 폭증 사전 차단
- AdSense SDK 는 외부 스크립트(번들 외) — 메인 번들 영향 X. 메인스레드 실행 비용은
  lazy-init 으로 lab 측정 밖에 있으나 **필드 영향은 CrUX 로 주간 감시** (docs/23 §8-4)
  (기존 "Partytown 이라 영향 X" 서술은 2026-06-12 폐기 — 공식 미지원 조합)
- 다만 광고 iframe 의 폰트·이미지 로드는 viewport 진입 시 발생 — `loading="lazy"` 확인
- CI Lighthouse 는 ADSENSE env 부재로 **광고 없는 페이지만 측정** — 광고 포함 측정은
  CF Pages 프리뷰(`data-adtest="on"`) 수동 1회가 광고 PR 머지 게이트 (docs/23 §3-1 (12))

---

**다음 작업**: `docs/18-testing.md` — Lighthouse CI, Playwright, axe.
