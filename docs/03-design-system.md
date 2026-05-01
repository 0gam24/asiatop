# docs/03 — 디자인 시스템

디자인 토큰, 반응형 브레이크포인트, 컴포넌트 라이브러리 표준. 일관성과 확장성을 보장하면서 PageSpeed 100점에 영향을 주지 않도록 설계한다.

---

## 1. 디자인 토큰

토큰은 **CSS 커스텀 속성**으로 정의하여 런타임 비용 0. Tailwind CSS 4의 `@theme` 디렉티브 활용.

### 1-1. 컬러 토큰

```css
/* src/styles/tokens.css */
@theme {
  /* Primary scale 0-950 */
  --color-primary-50: oklch(0.97 0.02 240);
  --color-primary-100: oklch(0.93 0.04 240);
  --color-primary-200: oklch(0.86 0.08 240);
  --color-primary-300: oklch(0.78 0.12 240);
  --color-primary-400: oklch(0.68 0.16 240);
  --color-primary-500: oklch(0.58 0.20 240);  /* 기본 브랜드 컬러 */
  --color-primary-600: oklch(0.50 0.18 240);
  --color-primary-700: oklch(0.42 0.15 240);
  --color-primary-800: oklch(0.34 0.12 240);
  --color-primary-900: oklch(0.26 0.08 240);
  --color-primary-950: oklch(0.18 0.04 240);

  /* Neutral scale 0-950 */
  --color-neutral-0: oklch(1 0 0);     /* 흰색 */
  --color-neutral-50: oklch(0.98 0 0);
  /* ... 950까지 */

  /* Semantic */
  --color-success: oklch(0.65 0.18 145);
  --color-warning: oklch(0.78 0.18 75);
  --color-error: oklch(0.62 0.22 25);
  --color-info: oklch(0.65 0.15 220);
}
```

- **OKLCH 사용 권장** — 인지적 균일성, 다크 모드 페어링 용이
- HEX/RGB는 가능하나 OKLCH가 더 유연

### 1-2. 타이포그래피 토큰

```css
@theme {
  /* Font families */
  --font-sans: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;

  /* Font sizes (rem 기반, modular scale 1.25 = Major Third) */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5625rem;  /* 25px */
  --text-3xl: 1.953rem;   /* 31.25px */
  --text-4xl: 2.441rem;   /* 39.06px */
  --text-5xl: 3.052rem;   /* 48.83px */

  /* Line heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;

  /* Font weights (가변 폰트 활용) */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### 1-3. 간격 토큰 (4px 그리드)

```css
@theme {
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
  --spacing-24: 6rem;     /* 96px */
  --spacing-32: 8rem;     /* 128px */
}
```

### 1-4. 라운딩·그림자·보더

```css
@theme {
  /* Border radius */
  --radius-sm: 0.125rem;
  --radius-md: 0.25rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1);

  /* Borders */
  --border-width-thin: 1px;
  --border-width-medium: 2px;
  --border-width-thick: 4px;
}
```

### 1-5. 모션 토큰

```css
@theme {
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;

  --easing-linear: linear;
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 1-6. 다크 모드

`prefers-color-scheme` 대응. 사용자 선택 가능 토글 지원.

```css
:root {
  color-scheme: light;
  --bg: var(--color-neutral-0);
  --fg: var(--color-neutral-950);
}

[data-theme='dark'] {
  color-scheme: dark;
  --bg: var(--color-neutral-950);
  --fg: var(--color-neutral-50);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --bg: var(--color-neutral-950);
    --fg: var(--color-neutral-50);
  }
}
```

---

## 2. 반응형 브레이크포인트

### 2-1. 표준 브레이크포인트

| 이름 | 픽셀 | 디바이스 |
|---|---|---|
| `sm` | 360px | 작은 모바일 |
| `md` | 480px | 큰 모바일 |
| `lg` | 768px | 태블릿 |
| `xl` | 1024px | 작은 데스크톱 |
| `2xl` | 1280px | 데스크톱 |
| `3xl` | 1536px | 큰 데스크톱 |

### 2-2. 모바일 우선

- 기본 스타일은 모바일 (`sm` 이하)
- 큰 화면은 `min-width` 미디어 쿼리로 추가
- ❌ `max-width` 베이스 금지

```css
/* ✅ 모바일 우선 */
.container {
  padding: var(--spacing-4);
}
@media (min-width: 768px) {
  .container { padding: var(--spacing-8); }
}
```

### 2-3. 컨테이너 쿼리 활용

컴포넌트 단위 반응형이 필요하면 `@container` 사용. 부모 컨테이너 크기에 반응 → 재사용성 ↑.

```css
.card-grid {
  container-type: inline-size;
}
.card { display: block; }

@container (min-width: 600px) {
  .card { display: flex; }
}
```

---

## 3. 컴포넌트 라이브러리 (Atomic Design)

### 3-1. 5단계 분리

```
src/components/
├── atoms/        # Button, Input, Icon, Tag, ...
├── molecules/    # FormField, SearchBar, Card, ...
├── organisms/    # Header, Footer, ArticleList, ...
├── templates/    # PageLayout, BlogPostLayout, ...
└── pages/        # 실제로는 src/pages/에 위치
```

### 3-2. 컴포넌트 작성 규칙

- **모든 컴포넌트는 props 타입 정의**
- 기본값(default props) 명시
- `class:list` 패턴으로 외부 클래스 머지 가능하게
- Astro 컴포넌트는 정적, 인터랙션이 필요한 부분만 React/Vue/Svelte 사용 + `client:*` 디렉티브

```astro
---
// src/components/atoms/Button.astro
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  class?: string;
}

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  class: className,
  ...rest
} = Astro.props;
---
<button
  type={type}
  class:list={['btn', `btn-${variant}`, `btn-${size}`, className]}
  {...rest}
>
  <slot />
</button>
```

### 3-3. Hydration 전략 (중요 — INP 직결)

| 디렉티브 | 사용 시점 |
|---|---|
| (없음) | 정적 콘텐츠 (대부분) |
| `client:idle` | 비핵심 인터랙션 (idle 시 hydrate) |
| `client:visible` | 뷰포트 진입 시 (이미지 캐러셀, 댓글) |
| `client:media="(min-width: 768px)"` | 특정 미디어 매치 시 |
| `client:load` | 즉시 hydrate (히어로 CTA 등 — **꼭 필요한 경우만**) |
| `client:only` | 클라이언트 전용 (지도, 차트 등) |

**기본값**: 인터랙션 없으면 정적, 있으면 `client:visible` 또는 `client:idle` 우선.

### 3-4. 접근성 우선 라이브러리

복잡한 위젯(드롭다운, 모달, 탭, 콤보박스)은 직접 만들지 말고 검증된 라이브러리 사용:

- **Radix UI** (React) — primitives, 무스타일
- **React Aria** (React Aria Components) — Adobe
- **Headless UI** (React/Vue) — Tailwind Labs
- **Ark UI** (React/Vue/Solid) — Chakra 후속

`docs/13-accessibility.md` 참조.

---

## 4. Storybook (또는 Ladle)

대규모 프로젝트나 디자이너 협업 시 권장. 소규모는 생략 가능.

```bash
pnpm dlx storybook@latest init
# 또는
pnpm add -D @ladle/react
```

---

## 5. 유틸리티 패턴

### 5-1. 콘텐츠 폭 제한

```css
.prose {
  max-width: 65ch;  /* 가독성 황금 비율 */
}
```

### 5-2. 시각적으로만 숨기기 (스크린 리더는 읽음)

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 5-3. 모션 비활성 사용자 존중

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. 검증 체크리스트

- [ ] 모든 컬러는 토큰을 통해 사용 (인라인 hex 금지)
- [ ] 4px 또는 8px 그리드 준수
- [ ] 다크 모드 동작 확인 (시스템 + 토글)
- [ ] 모바일 우선 작성 (`min-width` 베이스)
- [ ] 모든 컴포넌트 props 타입 정의
- [ ] Hydration 디렉티브 적절히 사용 (불필요한 `client:load` 0건)
- [ ] `prefers-reduced-motion` 대응
- [ ] 컬러 대비 4.5:1 (본문), 3:1 (큰 텍스트, UI) — `docs/13` 참조
- [ ] Tailwind 미사용 클래스 빌드 시 자동 제거됨

---

**다음 작업**: `docs/04-pagespeed-100.md` — PageSpeed 100점 달성 전략.
