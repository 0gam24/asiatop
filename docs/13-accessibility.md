# docs/13 — 접근성 (WCAG 2.2 AA)

PageSpeed Insights Accessibility 카테고리 100점 + 실제 사용자 접근성 보장. axe 위반 0건이 게이트.

---

## 1. 핵심 원칙 (POUR)

- **Perceivable** (인지 가능) — 모든 사용자가 정보를 인지할 수 있도록
- **Operable** (조작 가능) — 키보드만으로도 모든 기능 사용 가능
- **Understandable** (이해 가능) — 콘텐츠와 UI가 명확
- **Robust** (견고) — 보조 기술과 호환

---

## 2. 의미적 마크업

### 2-1. 페이지 구조

```html
<!doctype html>
<html lang="ko">
<head>...</head>
<body>
  <a href="#main" class="skip-link">본문으로 건너뛰기</a>

  <header>
    <nav aria-label="주 메뉴">...</nav>
  </header>

  <main id="main">
    <article>
      <h1>...</h1>
      ...
    </article>

    <aside aria-label="관련 글">...</aside>
  </main>

  <footer>...</footer>
</body>
</html>
```

### 2-2. 헤딩 계층

- 페이지당 `<h1>` **정확히 1개**
- 헤딩 계층 **건너뛰지 않음** (h1 → h2 → h3 순)
- 시각적 크기 ≠ 의미적 레벨 (시각만 키우려면 CSS class 사용)

```html
<!-- ❌ 나쁨 -->
<h1>제목</h1>
<h3>건너뜀</h3>

<!-- ✅ 좋음 -->
<h1>제목</h1>
<h2>섹션</h2>
<h3>하위 섹션</h3>
```

### 2-3. 인터랙티브 요소

- 버튼은 `<button>` (절대 `<div onClick>` 금지)
- 링크는 `<a href>` (네비게이션용)
- 폼 컨트롤은 `<input>`, `<textarea>`, `<select>` + `<label>`

```html
<!-- ❌ 절대 금지 -->
<div onclick="...">클릭</div>

<!-- ✅ 좋음 -->
<button type="button" onclick="...">클릭</button>
```

### 2-4. 폼 라벨

```html
<label for="email">이메일</label>
<input type="email" id="email" name="email" required autocomplete="email" />
```

또는 wrapping:

```html
<label>
  이메일
  <input type="email" name="email" required />
</label>
```

`aria-label`은 시각적 라벨 없을 때만 (검색 아이콘 등):

```html
<button aria-label="검색">
  <svg aria-hidden="true">...</svg>
</button>
```

---

## 3. 키보드·포커스

### 3-1. 모든 인터랙티브 요소 키보드 도달 가능

- `Tab` / `Shift+Tab`으로 순회
- `Enter` / `Space`로 활성화
- `Esc`로 모달·메뉴 닫기

### 3-2. 포커스 인디케이터

- 명확하게 보여야 함 — 절대 `outline: none` 단독 금지
- 대비 3:1 이상
- 두께 2px 이상

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* outline:none을 쓰려면 반드시 대체 표시 */
button:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-300);
}
```

### 3-3. Skip link

첫 포커스 가능 요소로 "본문으로 건너뛰기":

```html
<a href="#main" class="skip-link">본문으로 건너뛰기</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary-700);
  color: white;
  padding: 8px 16px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
</style>
```

### 3-4. 모달·다이얼로그

- 오픈 시 포커스를 모달 내부로 이동
- 닫을 때 트리거(예: 열었던 버튼)로 포커스 복귀
- 모달 내부에서 포커스 트랩 (Tab 순환)
- `Esc`로 닫기

→ Radix UI / React Aria의 `Dialog` 컴포넌트 사용 강력 권장.

### 3-5. 탭 순서

`tabindex` 사용 가이드:

- `0`: 자연 흐름에 추가 (필요 시만)
- `-1`: 키보드로 도달 불가, JS로만 포커스
- 양수(`1`, `2`...) **사용 금지** — 자연 흐름 깨짐

---

## 4. 색상·대비

### 4-1. 대비 임계값

| 콘텐츠 | 임계값 |
|---|---|
| 본문 텍스트 (18px 미만) | **4.5:1** |
| 큰 텍스트 (18px 이상 또는 14px+ 굵게) | **3:1** |
| UI 컴포넌트 (버튼 보더, 폼 인풋 등) | **3:1** |
| 그래픽 객체 (아이콘, 차트 요소) | **3:1** |

### 4-2. 검사 도구

- Chrome DevTools → Lighthouse Accessibility
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- axe-core 자동 검사

### 4-3. 색상 단독 금지

색상으로만 정보 전달 → 색맹 사용자 인지 불가:

```html
<!-- ❌ 빨강만으로 에러 표시 -->
<input class="error" />

<!-- ✅ 색상 + 아이콘 + 텍스트 -->
<div role="alert">
  <svg aria-hidden="true">⚠️</svg>
  <strong>에러:</strong> 이메일 형식이 잘못되었습니다.
</div>
```

폼 필드도 보더 색상만이 아니라 텍스트 메시지로:

```html
<input id="email" aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" class="error-text">올바른 이메일을 입력하세요</p>
```

---

## 5. ARIA — 가능하면 안 쓰기

### 5-1. 첫 번째 규칙: 네이티브 우선

ARIA보다 네이티브 HTML이 항상 우선. `<button>` 한 줄이면 끝나는 걸 ARIA로 해결하지 말 것.

```html
<!-- ❌ 나쁨 -->
<div role="button" tabindex="0" aria-pressed="false">...</div>

<!-- ✅ 좋음 -->
<button type="button" aria-pressed="false">...</button>
```

### 5-2. 자주 쓰는 ARIA

```html
<!-- 라이브 영역 (동적 업데이트) -->
<div aria-live="polite">검색 결과: 12개</div>
<div aria-live="assertive">에러: ...</div>  <!-- 즉시 알림 -->

<!-- 라벨 -->
<button aria-label="메뉴 열기">☰</button>

<!-- 설명 -->
<input aria-describedby="pw-help" />
<p id="pw-help">8자 이상, 숫자 포함</p>

<!-- 현재 페이지 -->
<a href="/blog" aria-current="page">블로그</a>

<!-- 확장 상태 -->
<button aria-expanded="false" aria-controls="menu">메뉴</button>
<ul id="menu" hidden>...</ul>

<!-- 숨김 (시각만) -->
<svg aria-hidden="true">...</svg>
```

### 5-3. 복잡한 위젯은 라이브러리

탭, 콤보박스, 메뉴, 트리, 슬라이더 등은 직접 구현하지 말고:

- **Radix UI** (React)
- **React Aria Components**
- **Headless UI**
- **Ark UI**

ARIA Authoring Practices Guide(APG) 준수 보장.

---

## 6. 미디어

### 6-1. 이미지

- 의미 전달 → `alt` 필수
- 장식 → `alt=""`
- 자세한 내용은 `docs/08-images.md`

### 6-2. 동영상

- 자막(VTT) 필수 (모든 음성 콘텐츠)
- 음성 트랜스크립트 제공
- 자동 재생 금지 (또는 음소거 + 사용자 시작)
- 키보드 컨트롤 가능

```html
<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="ko" label="한국어" default>
</video>
```

### 6-3. 음성

- 자동 재생 금지
- 음성 트랜스크립트 제공

### 6-4. prefers-reduced-motion

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

JS도:

```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  // 부드러운 스크롤 애니메이션 등
}
```

---

## 7. WCAG 2.2 신규 항목 (2.1 대비)

### 7-1. Focus Not Obscured (2.4.11, 2.4.12)

포커스된 요소가 다른 콘텐츠(고정 헤더 등)에 가려지면 안 됨.

```css
/* 고정 헤더가 가리지 않도록 스크롤 마진 */
:target, :focus-visible {
  scroll-margin-top: 80px;
}
```

### 7-2. Dragging Movements (2.5.7)

드래그로만 가능한 동작 → 단일 포인터 대안 제공.

예: 슬라이더에 +/- 버튼 추가, 칸반 카드는 드롭다운으로도 이동 가능.

### 7-3. Target Size Minimum (2.5.8)

인터랙티브 요소 최소 24×24 px (예외 있음).

```css
button {
  min-width: 44px;  /* 권장 (48px 더 좋음) */
  min-height: 44px;
}
```

### 7-4. Consistent Help (3.2.6)

도움말·연락처가 여러 페이지에 있다면 같은 위치에.

### 7-5. Redundant Entry (3.3.7)

같은 정보 두 번 입력 요구하지 말 것 (자동 채우기 또는 이전 단계 값 표시).

### 7-6. Accessible Authentication (3.3.8, 3.3.9)

CAPTCHA, 비밀번호 외우기 등 인지 부하 큰 인증을 강요하지 말 것.

- 비밀번호 매니저 자동 채우기 허용 (`autocomplete="current-password"`)
- 이메일 매직 링크, OAuth 등 대안 제공

---

## 8. Astro·React에서의 패턴

### 8-1. Astro 컴포넌트

순수 HTML 가까워서 접근성 자연스러움. semantic HTML만 잘 쓰면 됨.

### 8-2. React 컴포넌트

```tsx
// 모달 예시 — Radix UI 사용
import * as Dialog from '@radix-ui/react-dialog';

export function MyModal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>열기</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <Dialog.Title>제목</Dialog.Title>
          <Dialog.Description>설명</Dialog.Description>
          {/* 자동: 포커스 트랩, Esc 닫기, 외부 클릭 닫기, 포커스 복귀 */}
          <Dialog.Close asChild>
            <button aria-label="닫기">×</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 9. 검증

### 9-1. 자동 검사

```bash
# axe-core를 Playwright와 통합
pnpm add -D @axe-core/playwright

# 단일 페이지 axe 실행
pnpm dlx @axe-core/cli https://localhost:4321
```

E2E 테스트에 포함:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

CI에서 **위반 0건 강제**.

### 9-2. Lighthouse Accessibility

PageSpeed Insights / Lighthouse → 95+ (목표 100).

### 9-3. 수동 검증

자동 도구로 잡지 못하는 것 (50% 이상이 자동 검사 사각지대):

- **스크린 리더 테스트** (NVDA Windows / VoiceOver Mac)
  - 페이지 진입부터 모든 콘텐츠 읽힘
  - 폼 라벨·에러 정확히 읽힘
  - 모달·동적 영역 변화 인지

- **키보드만 사용**
  - Tab으로 모든 인터랙션 도달
  - 포커스 인디케이터 항상 보임
  - 모달 트랩·닫기 정상

- **돋보기**
  - 200% 확대 시 가로 스크롤 없음
  - 텍스트 잘림 없음

- **고대비 모드**
  - Windows 고대비 모드에서 깨짐 없음
  - `prefers-contrast: more` 대응

---

## 10. 검증 체크리스트

- [ ] 페이지당 `<h1>` 1개, 헤딩 계층 정상
- [ ] 모든 인터랙티브 `<button>` / `<a>` (div onClick 0건)
- [ ] 모든 폼 컨트롤 `<label>` 연결
- [ ] 모든 이미지 `alt` (장식은 빈 alt)
- [ ] 모든 동영상 자막
- [ ] Skip link 존재
- [ ] `:focus-visible` 명확
- [ ] `outline: none` 단독 0건
- [ ] 색상 대비 본문 4.5:1, UI 3:1
- [ ] 색상 단독 정보 전달 0건
- [ ] 모달·드롭다운 라이브러리 사용
- [ ] `prefers-reduced-motion` 대응
- [ ] WCAG 2.2 신규 항목 적용
- [ ] axe-core CI 통합, 위반 0건
- [ ] Lighthouse Accessibility 95+ (목표 100)
- [ ] NVDA 또는 VoiceOver 수동 테스트 통과
- [ ] 키보드 전체 플로우 통과
- [ ] 200% 확대 시 정상

---

**다음 작업**: `docs/14-security.md` — HTTPS, CSP, 보안 헤더, API 키 관리.
