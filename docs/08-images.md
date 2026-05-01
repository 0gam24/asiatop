# docs/08 — 이미지 최적화

LCP의 가장 큰 변수. 이미지 처리만 잘해도 PageSpeed 점수가 크게 오른다. Astro의 `astro:assets`와 Cloudflare Images를 조합해서 자동화한다.

---

## 1. 핵심 원칙

- ✅ 프레임워크 내장 이미지 컴포넌트 사용 (`astro:assets`의 `<Image>` / `<Picture>`)
- ✅ AVIF → WebP → JPEG/PNG 순 자동 협상
- ✅ 모든 이미지에 명시적 `width`/`height` 또는 `aspect-ratio` (CLS 방지)
- ✅ LCP 이미지: `loading="eager"` + `fetchpriority="high"` + `<link rel="preload">`
- ✅ 그 외: `loading="lazy"` + `decoding="async"`
- ❌ 수동 `<img>` 태그 직접 작성 (단, 외부 URL 이미지는 예외)
- ❌ 원본 그대로 사용 (반드시 압축·리사이즈)

---

## 2. astro:assets 사용법

### 2-1. 기본

```astro
---
import { Image } from 'astro:assets';
import heroImg from '../assets/hero.jpg';
---
<Image
  src={heroImg}
  alt="명확한 alt 텍스트"
  widths={[480, 800, 1200, 1600]}
  sizes="(min-width: 768px) 1200px, 100vw"
  format="avif"
  quality={80}
/>
```

빌드 시 자동으로:
- 여러 해상도(srcset) 생성
- AVIF로 변환
- 메타데이터에서 width/height 자동 추출 → CLS 방지
- 파일명에 hash 추가 → 영구 캐시 가능

### 2-2. Picture (다중 포맷 폴백)

브라우저별 최적 포맷 자동 협상:

```astro
---
import { Picture } from 'astro:assets';
import heroImg from '../assets/hero.jpg';
---
<Picture
  src={heroImg}
  alt="..."
  widths={[480, 800, 1200, 1600]}
  sizes="(min-width: 768px) 1200px, 100vw"
  formats={['avif', 'webp']}
  fallbackFormat="jpg"
/>
```

생성 결과:
```html
<picture>
  <source type="image/avif" srcset="...">
  <source type="image/webp" srcset="...">
  <img src="..." alt="..." width="..." height="..." loading="lazy" decoding="async">
</picture>
```

---

## 3. LCP 이미지 처리 (가장 중요)

페이지의 LCP 요소가 이미지인 경우, 다음을 모두 적용한다.

### 3-1. eager + fetchpriority

```astro
<Image
  src={heroImg}
  alt="..."
  loading="eager"
  fetchpriority="high"
  ...
/>
```

### 3-2. preload

`<head>`에 명시적으로 preload — Astro `astro:assets`는 자동 안 해줌.

```astro
---
import { getImage } from 'astro:assets';
import heroImg from '../assets/hero.jpg';

const optimized = await getImage({
  src: heroImg,
  width: 1600,
  format: 'avif',
});
---
<head>
  <link
    rel="preload"
    as="image"
    href={optimized.src}
    fetchpriority="high"
  />
</head>
<body>
  <Image src={heroImg} alt="..." widths={[...]} sizes="..." loading="eager" fetchpriority="high" />
</body>
```

### 3-3. 모바일·데스크톱 별도 크롭

hero 이미지는 보통 모바일과 데스크톱에서 비율이 다름 → 다른 크롭 사용:

```astro
---
import { Picture } from 'astro:assets';
import heroDesktop from '../assets/hero-desktop.jpg';
import heroMobile from '../assets/hero-mobile.jpg';
---
<picture>
  <source media="(min-width: 768px)" srcset={heroDesktop.src} />
  <source media="(max-width: 767px)" srcset={heroMobile.src} />
  <img src={heroDesktop.src} alt="..." width="1600" height="900" loading="eager" fetchpriority="high" />
</picture>
```

### 3-4. 크기 정확히 맞추기

LCP 이미지는 **표시 크기보다 크게 생성하지 않는다**. 1200px 영역에 4000px 이미지 로드는 낭비.

- 모바일 hero: 800px 너비 충분
- 데스크톱 hero: 1600px 너비 (Retina 고려)

---

## 4. 일반 이미지 (LCP 아닌 것)

```astro
<Image
  src={img}
  alt="..."
  widths={[400, 800]}
  sizes="(min-width: 768px) 800px, 100vw"
  loading="lazy"
  decoding="async"
  format="avif"
  quality={75}
/>
```

- `loading="lazy"` — 뷰포트 진입 시 로드
- `decoding="async"` — 디코딩 비동기 → 메인 스레드 막지 않음
- `quality`: AVIF 70~80, WebP 75~85, JPEG 80~85

---

## 5. 외부 이미지 (CMS, API 등)

빌드 시 알 수 없는 외부 URL 이미지는 `astro:assets`로 처리할 수 없음.

### 5-1. 정의된 도메인만 허용

```js
// astro.config.mjs
export default defineConfig({
  image: {
    domains: ['cdn.example.com', 'images.unsplash.com'],
    remotePatterns: [{ protocol: 'https' }],
  },
});
```

### 5-2. 원격 이미지도 최적화

```astro
---
import { Image } from 'astro:assets';
const remoteUrl = 'https://cdn.example.com/photo.jpg';
---
<Image
  src={remoteUrl}
  alt="..."
  width={800}
  height={600}
  loading="lazy"
/>
```

원격 이미지는 width/height **명시 필수**.

### 5-3. Cloudflare Images 활용 (권장)

대량의 사용자 업로드 이미지를 다루는 경우 Cloudflare Images가 가장 효율적.

- 자동 AVIF/WebP 변환
- URL 기반 변형 (`?width=800&format=auto`)
- 글로벌 CDN
- 비용: 월 $5/100k 이미지

```html
<img
  src="https://imagedelivery.net/<account>/<image-id>/w=800,format=auto"
  alt="..."
  width="800" height="600"
  loading="lazy" decoding="async"
/>
```

---

## 6. 이미지 압축 가이드

### 6-1. 포맷 선택

| 콘텐츠 유형 | 1순위 | 폴백 |
|---|---|---|
| 사진 | AVIF | WebP → JPEG |
| 그래픽 (단순 색상) | AVIF | WebP → PNG |
| 로고·아이콘 (벡터) | SVG | — |
| 투명도 + 사진 | AVIF | WebP → PNG |
| 애니메이션 | AVIF | WebP (작음) / `<video>` (큼) |

### 6-2. 품질·크기 가이드

| 용도 | 너비 | 품질 (AVIF) | 예상 크기 |
|---|---|---|---|
| Hero (모바일) | 800px | 75 | 30~80 KB |
| Hero (데스크톱) | 1600px | 75 | 80~200 KB |
| 썸네일 | 400px | 70 | 10~30 KB |
| 본문 삽입 | 800px | 75 | 30~80 KB |
| OG 이미지 | 1200×630 | 80 | 60~120 KB |

LCP 이미지 200KB 초과 시 압축 다시 검토.

### 6-3. 수동 압축 도구

원본 이미지를 미리 줄여두면 빌드 속도 ↑:

- **Squoosh** (Google) — 웹 GUI: https://squoosh.app/
- **sharp-cli**: `pnpm dlx sharp-cli ...`
- **ImageMagick**: `magick input.jpg -quality 80 -resize 1600x output.avif`

---

## 7. SVG 처리

### 7-1. 인라인 SVG (권장)

작은 아이콘은 인라인 — 추가 HTTP 요청 없음.

```astro
---
import IconArrow from '../assets/icons/arrow.svg?raw';
---
<span class="icon" aria-hidden="true" set:html={IconArrow}></span>
```

### 7-2. SVG 컴포넌트 라이브러리

- `lucide-react`, `lucide-vue-next` — Tree-shakable
- `@iconify/svelte` 등

```astro
---
import { Search } from 'lucide-react';
---
<Search size={20} aria-hidden="true" />
```

### 7-3. SVG 최적화

`SVGO`로 메타데이터 제거:

```bash
pnpm dlx svgo public/icons/*.svg
```

빌드 통합: `astro-icon`, `vite-plugin-svg-icons` 등.

### 7-4. SVG 보안

외부에서 받은 SVG는 `<script>` 태그를 포함할 수 있음 → DOMPurify로 sanitize:

```ts
import DOMPurify from 'isomorphic-dompurify';
const safe = DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } });
```

---

## 8. alt 텍스트 작성

### 8-1. 의미 전달 이미지

- 무엇이 보이는지 + 왜 거기 있는지
- 6~12 단어, 마침표로 끝
- 키워드 자연스럽게 포함 (남용 금지)

```html
<!-- ✅ 좋음 -->
<img alt="2026년 봄 컬렉션 트위드 자켓을 입은 모델, 프로필 측면">

<!-- ❌ 나쁨 -->
<img alt="image1">
<img alt="자켓 자켓 트위드 자켓 봄 자켓">  <!-- 키워드 스팸 -->
```

### 8-2. 장식 이미지

순수 장식 (배경 패턴, 구분선 등) → 빈 alt:

```html
<img src="divider.svg" alt="" />
<!-- 또는 -->
<div role="img" aria-hidden="true" style="background-image: url(...)"></div>
```

### 8-3. 본문 보충 이미지

전후 텍스트로 이미 설명됐다면 alt를 짧게.

---

## 9. lazy loading 전략

### 9-1. 기본

```html
<img loading="lazy" decoding="async" ...>
```

브라우저가 viewport 근처일 때만 로드.

### 9-2. fetchpriority="low" (선택)

푸터·footer 영역의 작은 이미지는:

```html
<img loading="lazy" fetchpriority="low" ...>
```

### 9-3. 첫 화면 (above-the-fold) 이미지

`loading="lazy"` 절대 금지 — LCP에 영향. `loading="eager"`.

---

## 10. CLS 방지

### 10-1. 명시적 width/height

`astro:assets`는 자동 처리하지만, 외부 이미지는 직접:

```html
<img src="..." width="800" height="600" alt="...">
```

### 10-2. aspect-ratio

응답형 이미지에는:

```css
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
```

### 10-3. 동적 삽입 이미지

광고, 임베드, 댓글 아바타 등 → 컨테이너에 `min-height` 예약:

```css
.ad-slot {
  min-height: 250px;
  background: var(--color-neutral-100);
}
```

---

## 11. 검증 체크리스트

- [ ] 모든 페이지 이미지 `astro:assets` 컴포넌트 사용 (외부 URL 제외)
- [ ] LCP 이미지 `fetchpriority="high"` + `<link rel="preload">`
- [ ] LCP 외 이미지 `loading="lazy"` + `decoding="async"`
- [ ] 모든 이미지 `width`/`height` 또는 `aspect-ratio`
- [ ] 모든 이미지 `alt` (장식은 `alt=""`)
- [ ] AVIF 포맷 우선, WebP/JPEG 폴백
- [ ] LCP 이미지 200KB 이하
- [ ] 모바일·데스크톱 hero 별도 크롭
- [ ] 외부 이미지 도메인 화이트리스트
- [ ] SVG SVGO 최적화
- [ ] Lighthouse "Properly size images" 위반 0건
- [ ] Lighthouse "Defer offscreen images" 위반 0건
- [ ] Lighthouse "Image elements have explicit width and height" 위반 0건

---

**다음 작업**: `docs/09-caching.md` — Cloudflare 엣지·HTTP 헤더·Brotli·Early Hints.
