# docs/11 — 메타데이터 및 기본 SEO

페이지별 메타 태그, 사이트 전체 파일(robots.txt, sitemap.xml, llms.txt). PageSpeed Insights SEO 카테고리 100점의 기본.

---

## 1. 페이지별 필수 메타 태그

### 1-1. 필수 항목

```astro
---
// src/layouts/Base.astro
interface Props {
  title: string;        // 50~60자
  description: string;  // 140~160자
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}
const {
  title,
  description,
  canonical = Astro.url.href,
  ogImage = '/og-default.png',
  noindex = false,
} = Astro.props;
const fullTitle = `${title} | 사이트명`;
const ogImageUrl = new URL(ogImage, Astro.site).toString();
---
<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />

  {noindex && <meta name="robots" content="noindex, nofollow" />}

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="사이트명" />
  <meta property="og:locale" content="ko_KR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />
  <meta name="twitter:site" content="@example" />

  <!-- Theme color -->
  <meta name="theme-color" content="#0066cc" />

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <slot name="head" />
</head>
<body>
  <slot />
</body>
</html>
```

### 1-2. 작성 규칙

**title**:
- 50~60자 (한국어는 25~30자)
- "핵심 키워드 + 브랜드"
- 핵심 키워드는 앞 30자 안에 배치 (한국 SERP 절단 기준)
- 페이지마다 고유 (중복 금지)
- 파이프(`|`) 또는 대시(`-`)로 구분

**description**:
- 140~160자 (한국어는 70~80자)
- CTA 포함 권장
- 키워드 자연스럽게
- 페이지 내용 정확히 요약

**canonical**:
- 자기참조 또는 정본 지정
- 쿼리 스트링 제거 (`?utm_source` 등)
- trailing slash 정책 일관

**OG image**:
- 1200×630 px 정확히
- 텍스트 가독성 (모바일 thumbnail에서도 읽혀야 함)
- 절대 URL 필수

---

## 2. 페이지 유형별 메타 패턴

### 2-1. 홈

```html
<title>사이트명 - 핵심 가치 한 줄</title>
<meta name="description" content="...">
<meta property="og:type" content="website">
```

### 2-2. 블로그 글

```html
<title>글 제목 | 사이트명</title>
<meta property="og:type" content="article">
<meta property="article:published_time" content="2026-01-15T08:00:00+09:00">
<meta property="article:modified_time" content="2026-01-20T10:00:00+09:00">
<meta property="article:author" content="저자명">
<meta property="article:tag" content="태그1">
<meta property="article:tag" content="태그2">
```

### 2-3. 제품

```html
<title>제품명 - 가격 | 사이트명</title>
<meta property="og:type" content="product">
<meta property="product:price:amount" content="29900">
<meta property="product:price:currency" content="KRW">
<meta property="product:availability" content="instock">
```

### 2-4. noindex 페이지

검색 결과, 필터, 관리자, 검색용 미공개 페이지:

```html
<meta name="robots" content="noindex, follow">
```

---

## 3. robots.txt

`public/robots.txt` 또는 동적 생성.

### 3-1. 표준 템플릿 (2026)

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /search

# AI 크롤러 명시적 허용 (GEO 가시성 확보)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

# AI 학습 차단을 원하면 위 Allow를 Disallow로 변경
# 단, GEO 가시성 확보 목적이면 허용이 기본값

Sitemap: https://example.com/sitemap-index.xml
```

### 3-2. 정책 결정

AI 크롤러 차단 vs 허용은 **비즈니스 정책**:

- **허용**: AI 답변 엔진 인용 가능성 ↑ (GEO)
- **차단**: AI 학습에 콘텐츠 사용 안 됨 (저작권 보호)

PROJECT.md의 결정에 따른다. 본 표준 기본값은 **허용**.

---

## 4. sitemap.xml

### 4-1. Astro 통합

```bash
pnpm astro add sitemap
```

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('/draft/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      i18n: {
        defaultLocale: 'ko',
        locales: { ko: 'ko-KR', en: 'en-US' },
      },
    }),
  ],
});
```

빌드 시 `dist/sitemap-index.xml` + `dist/sitemap-0.xml` 자동 생성.

### 4-2. 분할 정책

- 단일 sitemap 한도: 50,000 URL 또는 50MB
- 1만 URL 초과 시 인덱스 사이트맵으로 분할
- Astro `@astrojs/sitemap`이 자동 처리

### 4-3. 추가 사이트맵

뉴스·이미지·동영상이 핵심인 경우 별도 생성:

- `sitemap-news.xml` — 48시간 이내 발행 글
- `sitemap-images.xml` — 이미지 위주
- `sitemap-videos.xml` — 동영상 위주

---

## 5. llms.txt — AI 크롤러용 사이트 요약 (2026 신규)

### 5-1. 개요

- 위치: `/llms.txt` (사이트 루트)
- 형식: 마크다운
- 목적: AI 답변 엔진이 사이트 전체를 빠르게 이해하도록

### 5-2. 표준 템플릿

```markdown
# 사이트명

> 한 문장 요약 (사이트 정체성을 가장 압축적으로)

핵심 가치 제안 2~3문장. 어떤 사용자에게, 어떤 문제를, 어떻게 해결해주는지 명확히.

## 주요 콘텐츠

- [페이지 제목](https://example.com/page-1): 한 줄 설명
- [페이지 제목](https://example.com/page-2): 한 줄 설명
- [페이지 제목](https://example.com/page-3): 한 줄 설명

## 토픽 클러스터

### 클러스터 1: [클러스터 이름]
- [허브 페이지](https://example.com/cluster-1): 클러스터 개요
- [세부 글 1](https://example.com/cluster-1/article-1): 한 줄 설명
- [세부 글 2](https://example.com/cluster-1/article-2): 한 줄 설명

### 클러스터 2: [클러스터 이름]
- ...

## 회사·운영 정보

- [회사 소개](https://example.com/about)
- [편집 정책](https://example.com/editorial-policy)
- [저자 목록](https://example.com/authors)
- [연락처](https://example.com/contact)

## 선택

- [전체 콘텐츠 마크다운 합본](https://example.com/llms-full.txt)
```

### 5-3. llms-full.txt (선택)

전체 콘텐츠를 마크다운으로 합본 — AI가 한 번에 사이트 전체 이해 가능.

빌드 시 자동 생성:

```ts
// scripts/generate-llms-full.ts
import { getCollection } from 'astro:content';
import { writeFileSync } from 'node:fs';

const posts = await getCollection('blog');
let output = '# 사이트명 - 전체 콘텐츠\n\n';

for (const post of posts) {
  output += `## ${post.data.title}\n`;
  output += `URL: https://example.com/blog/${post.slug}\n\n`;
  output += `${post.body}\n\n---\n\n`;
}

writeFileSync('public/llms-full.txt', output);
```

---

## 6. .well-known/security.txt

```
# public/.well-known/security.txt
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: ko, en
Canonical: https://example.com/.well-known/security.txt
Policy: https://example.com/security-policy
```

보안 연구자가 취약점 신고 시 연락처 안내. 필수는 아니지만 신뢰도 ↑.

---

## 7. hreflang (다국어 사이트만)

`docs/16-i18n.md` 참조. 모든 언어 페이지에 상호 hreflang + x-default.

```html
<link rel="alternate" hreflang="ko-KR" href="https://example.com/ko/page" />
<link rel="alternate" hreflang="en-US" href="https://example.com/en/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/en/page" />
```

---

## 8. RSS / Atom Feed (블로그·미디어)

`@astrojs/rss` 통합:

```bash
pnpm add @astrojs/rss
```

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: '사이트명',
    description: '...',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
    customData: `<language>ko-KR</language>`,
  });
}
```

`<head>`에 자동 발견 링크:

```html
<link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml" />
```

---

## 9. Search Console / Bing Webmaster Tools

### 9-1. 등록

배포 직후:
1. Google Search Console — 도메인 추가 → DNS TXT 레코드로 인증
2. Bing Webmaster Tools — Google에서 임포트 가능
3. 사이트맵 제출: `sitemap-index.xml`

### 9-2. 모니터링 (주간)

- Coverage / 페이지 인덱싱 리포트
- Enhancements (구조화된 데이터)
- Core Web Vitals
- 검색어 분석 (CTR 낮은 페이지 → 메타 개선)
- 수동 조치(Manual Actions) — 0건이어야 함

---

## 10. 검증 체크리스트

- [ ] 모든 페이지 고유 `<title>`, `<meta description>`, `<link rel="canonical">`
- [ ] OG 이미지 1200×630, 절대 URL
- [ ] Twitter Card `summary_large_image`
- [ ] `<html lang="ko">` (또는 적절한 언어 코드)
- [ ] viewport 메타
- [ ] favicon 세트 (ico, svg, apple-touch-icon)
- [ ] `robots.txt` 게시 (AI 크롤러 정책 명시)
- [ ] `sitemap-index.xml` 자동 생성, 빌드마다 갱신
- [ ] `llms.txt` 게시 (사이트 요약)
- [ ] `llms-full.txt` 빌드 시 자동 생성 (선택)
- [ ] `.well-known/security.txt` 게시 (선택)
- [ ] RSS feed (블로그·미디어인 경우)
- [ ] Search Console / Bing 등록 + 사이트맵 제출
- [ ] 깨진 OG 이미지 0건 (소셜 공유 테스트)
- [ ] PageSpeed SEO 카테고리 100점

---

**다음 작업**: `docs/12-geo-ai-citation.md` — 생성형 엔진 최적화(GEO).
