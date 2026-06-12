# docs/06 — 자바스크립트 최적화

JS는 INP·LCP·번들 크기 모두에 직접적인 영향을 준다. **덜 보낼수록 빠르다**가 원칙.

---

## 1. 번들 크기 한도 (PR 자동 검증)

| 자원 | 페이지당 한도 (gzipped) |
|---|---|
| 초기 JS (실행되는) | **≤ 100 KB** |
| 라우트별 추가 JS | ≤ 50 KB |
| 동적 import 청크 | ≤ 30 KB |

PR마다 `size-limit` 또는 `bundlewatch`로 검증, 초과 시 머지 차단.

```json
// package.json
{
  "scripts": {
    "size": "size-limit"
  },
  "size-limit": [
    {
      "path": "dist/_astro/*.js",
      "limit": "100 KB"
    }
  ]
}
```

---

## 2. Astro Islands — 핵심 전략

Astro의 가장 큰 장점. 페이지 99%는 정적 HTML, 인터랙션 영역만 JS.

### 2-1. Hydration 디렉티브 우선순위

```
정적 (디렉티브 없음)        ← 기본값, JS 0KB
   ↓
client:visible              ← 뷰포트 진입 시
   ↓
client:idle                 ← 메인 스레드 idle 시
   ↓
client:media="..."          ← 특정 미디어 쿼리
   ↓
client:load                 ← 즉시 (꼭 필요한 경우만)
   ↓
client:only="react"         ← 클라이언트 전용 (지도, 차트 등)
```

**규칙**: 위에서부터 가능한 것을 먼저 사용. `client:load`는 정말 필요한 경우만 (예: 히어로 검색바).

### 2-2. 좋은 예 vs 나쁜 예

```astro
<!-- ❌ 나쁨: 푸터 뉴스레터 폼이 즉시 hydrate -->
<NewsletterForm client:load />

<!-- ✅ 좋음: 뷰포트 진입 시에만 -->
<NewsletterForm client:visible />

<!-- ❌ 나쁨: 댓글이 즉시 hydrate -->
<CommentSection client:load />

<!-- ✅ 좋음: idle 시간에 hydrate -->
<CommentSection client:idle />

<!-- ❌ 나쁨: 모바일에서도 무거운 데스크톱 위젯 hydrate -->
<DesktopChart client:load />

<!-- ✅ 좋음: 데스크톱에서만 hydrate -->
<DesktopChart client:media="(min-width: 1024px)" />
```

---

## 3. 코드 스플리팅

### 3-1. 라우트 단위 (Astro 자동)

각 페이지 파일(`src/pages/*.astro`)은 자동으로 별도 번들. 별도 설정 불필요.

### 3-2. 컴포넌트 동적 import

비핵심 컴포넌트는 동적 import로 지연 로드:

```ts
// 클릭 시에만 로드되는 모달
async function openModal() {
  const { Modal } = await import('./Modal.tsx');
  // ...
}
```

### 3-3. 라이브러리 동적 import

```ts
// 차트 페이지 진입 시에만 chart.js 로드
async function renderChart() {
  const { Chart } = await import('chart.js');
  new Chart(ctx, config);
}
```

---

## 4. Tree Shaking

### 4-1. ES Modules 사용

- `import { x } from 'lib'` ← 가능
- `const lib = require('lib')` ← 트리쉐이킹 안 됨

### 4-2. `sideEffects` 명시

```json
// package.json
{
  "sideEffects": false
}
```

CSS·폴리필 import가 있는 경우만 명시:

```json
{
  "sideEffects": [
    "*.css",
    "./src/polyfills.ts"
  ]
}
```

### 4-3. Named import

```ts
// ❌ 전체 번들 포함될 수 있음
import _ from 'lodash';

// ✅ 필요한 것만
import debounce from 'lodash-es/debounce';
// 또는
import { debounce } from 'lodash-es';
```

---

## 5. 폴리필 전략

### 5-1. modern/legacy 분기 빌드 (드물게 필요)

대부분의 사용자는 modern 브라우저. legacy 브라우저는 별도 번들로 처리.

Astro 기본 빌드는 `baseline-widely-available` 타겟. 추가 폴리필이 필요한 경우만 명시.

### 5-2. core-js 자동 주입 금지

```js
// vite.config.ts
export default {
  build: {
    target: 'es2022',  // 모던 브라우저
  }
};
```

ES2022까지는 폴리필 없이 가능 (2026년 기준 충분).

---

## 6. 미사용 코드 제거

### 6-1. 정기 검사

```bash
# 미사용 export, 파일, 의존성
pnpm dlx knip

# 미사용 의존성
pnpm dlx depcheck

# 번들 분석
pnpm build && pnpm dlx source-map-explorer 'dist/_astro/**/*.js'
```

분기별 1회 실행, 미사용은 제거.

### 6-2. dev 의존성 분리

```json
{
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "vitest": "^2"
  }
}
```

런타임에 필요 없는 것은 `devDependencies`로.

---

## 7. 서드파티 스크립트 — INP의 주범

### 7-1. ~~Partytown 격리~~ (2026-06-12 전면 폐기 — 사용 금지)

> AdSense·GA4 모두 Partytown 워커 주입에서 실측 고장 확인 후 제거
> (AdSense: iframe·viewability 깨짐 / GA4: config 미전달로 수신 0건 —
> docs/04 §4-3, docs/15 §4-3, docs/23 R3). astro.config.mjs 통합도 제거됨.

현행 표준 — **메인스레드 + 유휴 시점 주입**:

```js
// 인라인 큐를 먼저 깔고 (consent·config 는 즉시 dataLayer 에 쌓임)
const load = () => { /* <script async> 동적 주입 */ };
if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(load, { timeout: 3000 });
} else {
  setTimeout(load, 1500);
}
```

### 7-2. Astro `is:inline` + `script` 전략

```astro
<!-- 빌드 시 처리 -->
<script>
  // 작은 인라인 스크립트
</script>

<!-- defer 또는 async -->
<script src="/external.js" defer is:inline></script>
```

### 7-3. 사용 정책

서드파티 스크립트 추가 시 다음 검토:

- 정말 필요한가? (대안 있나?)
- 동의 후에만 로드 가능한가? (`docs/15` 참조)
- 유휴 시점 주입(rIC) 또는 lazy-init 가능한가? (Partytown 은 폐기 — §7-1)
- 번들 크기·INP 영향 측정했는가?

---

## 8. React/Vue/Svelte 컴포넌트 사용 시

Astro는 React/Vue/Svelte 등을 부분적으로 사용 가능. 주의 사항:

### 8-1. React (가장 흔함)

```bash
pnpm astro add react
```

```astro
---
import InteractiveWidget from '../components/Widget.tsx';
---
<InteractiveWidget client:visible />
```

- React 18+ 권장 (concurrent features 활용)
- `useTransition`, `useDeferredValue`로 INP 최적화
- 무거운 상태관리 라이브러리(Redux 등) 신규 도입 자제 — Zustand, Jotai 등 가벼운 것 권장

### 8-2. 정적 React 컴포넌트는 Astro로 변환

인터랙션 없는 React 컴포넌트는 `.astro`로 다시 작성. JS 0KB.

```astro
<!-- React 대신 Astro로 -->
---
const { title, description } = Astro.props;
---
<article>
  <h2>{title}</h2>
  <p>{description}</p>
</article>
```

### 8-3. 가벼운 인터랙션은 바닐라 JS 또는 Alpine.js

작은 토글, 드롭다운은 React 대신:

```astro
<button id="toggle">메뉴</button>
<nav id="menu" hidden>...</nav>

<script>
  const btn = document.getElementById('toggle');
  const menu = document.getElementById('menu');
  btn?.addEventListener('click', () => menu?.toggleAttribute('hidden'));
</script>
```

---

## 9. INP 최적화 패턴

### 9-1. Long task 분할

```ts
// ❌ 메인 스레드 블록
function processItems(items) {
  for (const item of items) {
    expensiveWork(item);  // 100ms+ 걸림
  }
}

// ✅ scheduler.yield()로 분할
async function processItems(items) {
  for (const item of items) {
    expensiveWork(item);
    if ('scheduler' in window && 'yield' in window.scheduler) {
      await window.scheduler.yield();
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}
```

### 9-2. 이벤트 핸들러 디바운스/쓰로틀

```ts
import { debounce } from 'lodash-es';

const onSearch = debounce((query) => {
  performSearch(query);
}, 200);

input.addEventListener('input', (e) => onSearch(e.target.value));
```

### 9-3. requestIdleCallback

비핵심 작업은 idle 시간에:

```ts
requestIdleCallback(() => {
  trackAnalytics();
  preloadNextPage();
}, { timeout: 2000 });
```

### 9-4. Web Worker 오프로드

CPU 집약적 작업(이미지 처리, 큰 데이터 정렬, 암호화)은 Web Worker로:

```ts
const worker = new Worker(new URL('./heavy-worker.ts', import.meta.url), { type: 'module' });
worker.postMessage(largeData);
worker.onmessage = (e) => render(e.data);
```

---

## 10. 검증 체크리스트

- [ ] 초기 JS 번들 ≤ 100KB (gzip)
- [ ] `client:load` 사용 컴포넌트 5개 이하 (또는 정당화 가능)
- [ ] 모든 서드파티 스크립트 유휴 시점 주입(rIC) 또는 defer (~~Partytown~~ 폐기 — §7-1)
- [ ] `pnpm dlx knip` 위반 0건
- [ ] 메인 스레드 long task 50ms 초과 0건 (Lighthouse Diagnostics)
- [ ] React/Vue 사용 시 정당한 사유 (정적은 Astro 우선)
- [ ] `import.meta.env.SECRET_*` 외 클라이언트 번들에 비밀 없음
- [ ] PR마다 size-limit 검증 통과

---

**다음 작업**: `docs/07-fonts.md` — 폰트 로딩·서브셋팅·CLS 0.
