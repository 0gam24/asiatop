# docs/18 — 테스트 및 품질 보증

자동화 테스트 + 수동 검증 + SEO·GEO 회귀 테스트.

---

## 1. 테스트 피라미드

```
        ┌─────────┐
        │  E2E    │ Playwright (소수, 핵심 플로우)
        ├─────────┤
        │  통합   │ Vitest + Astro Container API
        ├─────────┤
        │  단위   │ Vitest (가장 많음)
        └─────────┘
```

---

## 2. 단위 테스트 — Vitest

### 2-1. 설치·설정

```bash
pnpm add -D vitest @vitest/coverage-v8
```

`vitest.config.ts`:

```ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx,astro}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/pages/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### 2-2. 비즈니스 로직 테스트

```ts
// src/lib/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice, slugify } from './format';

describe('formatPrice', () => {
  it('formats KRW with comma separator', () => {
    expect(formatPrice(29900)).toBe('29,900원');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0원');
  });
});

describe('slugify', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });
});
```

### 2-3. 커버리지 목표

- 비즈니스 로직: ≥ 80%
- UI 컴포넌트: ≥ 60% (스냅샷 + 핵심 동작)
- 페이지 파일: 0% (E2E로 커버)

---

## 3. 컴포넌트 테스트 — Astro Container API

```ts
// src/components/Button.test.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import Button from './Button.astro';

describe('Button', () => {
  it('renders with default props', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Button, {
      slots: { default: '클릭' },
    });
    expect(result).toContain('<button');
    expect(result).toContain('클릭');
    expect(result).toContain('btn-primary');
  });

  it('applies variant class', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Button, {
      props: { variant: 'secondary' },
      slots: { default: '클릭' },
    });
    expect(result).toContain('btn-secondary');
  });
});
```

React/Vue 컴포넌트는 Testing Library:

```ts
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button', () => {
  render(<Button>클릭</Button>);
  expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument();
});
```

---

## 4. E2E 테스트 — Playwright

### 4-1. 설치

```bash
pnpm add -D @playwright/test
pnpm dlx playwright install --with-deps
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4-2. 핵심 사용자 플로우

```ts
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('home page loads with key content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/사이트명/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /주 메뉴/ })).toBeVisible();
});

test('search functionality works', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('검색').fill('test query');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=test/);
});

test('contact form submission', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('이름').fill('홍길동');
  await page.getByLabel('이메일').fill('test@example.com');
  await page.getByLabel('메시지').fill('문의 내용');
  await page.getByRole('button', { name: '제출' }).click();
  await expect(page.getByText('감사합니다')).toBeVisible();
});
```

### 4-3. 핵심 플로우 목록

각 사이트 유형별로 다음을 반드시 E2E 커버:

- **모든 사이트**: 홈 로드, 주요 페이지 도달, 404 처리
- **블로그**: 글 목록 → 글 상세 → 다음 글
- **이커머스**: 상품 → 장바구니 → 결제
- **SaaS**: 회원가입 → 로그인 → 핵심 기능 사용
- **리드 생성**: 폼 제출 성공·실패

---

## 5. 접근성 테스트 — axe-core

### 5-1. Playwright 통합

```bash
pnpm add -D @axe-core/playwright
```

```ts
// tests/e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagesToTest = ['/', '/about', '/blog', '/contact'];

for (const path of pagesToTest) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

CI에서 위반 0건 강제.

### 5-2. CLI 단독 사용

```bash
pnpm dlx @axe-core/cli https://localhost:4321 --tags wcag2aa
```

---

## 6. 시각 회귀 테스트 (선택)

### 6-1. Playwright 스냅샷

```ts
test('home looks correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixels: 100,
  });
});
```

### 6-2. Chromatic / Percy (Storybook 사용 시)

```bash
pnpm dlx chromatic --project-token=...
```

브랜드 일관성 큰 사이트만 도입. 작은 사이트는 오버킬.

---

## 7. 타입 체크

```bash
pnpm tsc --noEmit
```

CI에서 PR마다 실행.

---

## 8. SEO·GEO 회귀 테스트

### 8-1. 빌드 후 자동 크롤링

```ts
// tests/seo/crawl.test.ts
import { test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { JSDOM } from 'jsdom';

const htmlFiles = await glob('dist/**/*.html');

for (const file of htmlFiles) {
  test(`${file} has required SEO tags`, () => {
    const html = readFileSync(file, 'utf-8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // <title>
    expect(doc.title).toBeTruthy();
    expect(doc.title.length).toBeGreaterThan(10);
    expect(doc.title.length).toBeLessThanOrEqual(70);

    // meta description
    const desc = doc.querySelector('meta[name="description"]');
    expect(desc).toBeTruthy();
    expect(desc?.getAttribute('content')?.length).toBeGreaterThan(50);

    // canonical
    expect(doc.querySelector('link[rel="canonical"]')).toBeTruthy();

    // <h1> 정확히 1개
    const h1s = doc.querySelectorAll('h1');
    expect(h1s.length).toBe(1);

    // 모든 이미지 alt
    const imgs = doc.querySelectorAll('img');
    for (const img of imgs) {
      expect(img.hasAttribute('alt')).toBe(true);
    }

    // OG 태그
    expect(doc.querySelector('meta[property="og:title"]')).toBeTruthy();
    expect(doc.querySelector('meta[property="og:image"]')).toBeTruthy();
  });
}
```

### 8-2. AI 크롤러 시뮬레이션

```ts
test('GPTBot can see core content', async () => {
  const response = await fetch('http://localhost:4321/blog/article', {
    headers: { 'User-Agent': 'GPTBot/1.0' },
  });
  const html = await response.text();
  expect(html).toContain('<h1>');
  expect(html).toContain('<main>');
  // 핵심 콘텐츠 텍스트 확인
  expect(html).toMatch(/실제 본문 내용 포함되어야 할 키워드/);
});
```

### 8-3. 깨진 링크 검출

```bash
pnpm dlx linkinator http://localhost:4321 --recurse --silent
```

CI에 통합:

```yaml
- name: Check broken links
  run: pnpm dlx linkinator http://localhost:4321 --recurse --silent
```

### 8-4. 구조화된 데이터 검증

```ts
import { test, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

for (const file of await glob('dist/**/*.html')) {
  test(`${file} has valid JSON-LD`, () => {
    const html = readFileSync(file, 'utf-8');
    const dom = new JSDOM(html);
    const scripts = dom.window.document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    for (const script of scripts) {
      expect(() => JSON.parse(script.textContent || '')).not.toThrow();
    }
  });
}
```

---

## 9. 수동 검증 체크리스트

자동화로 잡지 못하는 것:

### 9-1. 디바이스 테스트

- [ ] 실기기 모바일 3종 (저가 안드로이드 포함)
- [ ] iPhone Safari (실제 기기 권장)
- [ ] 데스크톱 Chrome / Firefox / Safari / Edge
- [ ] 태블릿 (iPad 등)

### 9-2. 네트워크 테스트

- [ ] Slow 3G 시뮬레이션
- [ ] 4G 정상 환경
- [ ] WiFi → 모바일 데이터 전환

### 9-3. 시각·인지

- [ ] 다크 모드 / 라이트 모드
- [ ] 200% 확대
- [ ] 고대비 모드
- [ ] 색맹 시뮬레이션

### 9-4. 기능

- [ ] JavaScript 비활성 시 핵심 콘텐츠 접근 가능
- [ ] 인쇄 스타일시트 (`@media print`)
- [ ] 스크린 리더 (NVDA / VoiceOver)
- [ ] 키보드만 사용 전체 플로우

---

## 10. CI 워크플로 통합

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm dlx @biomejs/biome ci .

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Unit tests
        run: pnpm vitest run --coverage

      - name: Build
        run: pnpm build

      - name: SEO regression tests
        run: pnpm vitest run tests/seo

      - name: Install Playwright
        run: pnpm dlx playwright install --with-deps

      - name: E2E tests
        run: pnpm playwright test

      - name: Knip
        run: pnpm dlx knip --reporter compact

      - name: Security audit
        run: pnpm audit --audit-level=moderate

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

Lighthouse CI는 별도 워크플로 (`templates/github-actions/lighthouse-ci.yml`).

---

## 11. 검증 체크리스트

- [ ] Vitest 단위 테스트 ≥ 80% 커버리지 (비즈니스 로직)
- [ ] Astro Container API 컴포넌트 테스트
- [ ] Playwright E2E 핵심 플로우 커버
- [ ] axe-core 접근성 테스트, 위반 0건
- [ ] 빌드 후 SEO 회귀 테스트 자동 실행
- [ ] AI 크롤러 시뮬레이션 자동 실행
- [ ] 깨진 링크 0건 자동 검증
- [ ] JSON-LD 유효성 자동 검증
- [ ] 타입 체크 PR 마다
- [ ] 보안 audit PR 마다
- [ ] 수동 검증 (디바이스·네트워크·접근성) 출시 전 1회

---

**다음 작업**: `docs/19-deployment.md` — CF Pages + GitHub Actions 구체 배포 워크플로.
