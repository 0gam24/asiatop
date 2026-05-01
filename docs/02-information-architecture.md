# docs/02 — 정보 아키텍처(IA) 설계

URL 구조, 사이트맵, 내비게이션 설계 표준. 본 문서는 SEO·GEO 인용성·사용자 탐색성에 직접적인 영향을 미친다.

---

## 1. URL 구조 원칙

### 1-1. 필수 규칙

- ✅ **모두 소문자**, 단어 구분은 **하이픈(-)**, 영문 슬러그(또는 다국어 IDN)
- ✅ **깊이 3단계 이하** 권장: `/category/subcategory/post-slug`
- ✅ **트레일링 슬래시 정책 통일** — 본 표준은 **트레일링 슬래시 없음**으로 통일
  - `/about/` → `/about` 으로 308 리다이렉트
  - Astro 설정: `trailingSlash: 'never'`
- ✅ **자기참조 canonical** 모든 페이지에 부착
- ❌ 쿼리 스트링으로 콘텐츠 구분 금지 (`?page=about` 금지)
- ❌ 날짜 포함 URL 금지 (뉴스 제외) — 콘텐츠 영구성 영향
- ❌ ID 포함 URL 금지 (`/post/12345/title`) — 슬러그만 사용

### 1-2. URL 패턴 예시

| 페이지 유형 | URL 패턴 |
|---|---|
| 홈 | `/` |
| 페이지 | `/about`, `/contact`, `/pricing` |
| 블로그 허브 | `/blog` |
| 블로그 글 | `/blog/article-slug` |
| 카테고리 허브 | `/blog/category-slug` |
| 카테고리 글 | `/blog/category-slug/article-slug` |
| 태그 페이지 | `/tag/tag-slug` |
| 저자 페이지 | `/author/author-slug` |
| 제품 (이커머스) | `/product/product-slug` |
| 제품 카테고리 | `/category/category-slug` |
| 검색 | `/search?q=...` (쿼리 허용 예외) |

### 1-3. 슬러그 규칙

- 슬러그는 **6단어 이내** 권장
- 한국어 사이트도 슬러그는 영문 권장 (예: 한글 IDN은 가능하나 공유·복사 시 인코딩 이슈)
- 불용어 제거: "the", "a", "is", "of", "을/를", "이/가" 등
- 키워드 1~2개 자연스럽게 포함

```
❌ /blog/2026/01/15/the-ultimate-guide-to-react-server-components-in-2026
✅ /blog/react-server-components-guide
```

---

## 2. 사이트맵 설계 — 토픽 클러스터 모델

### 2-1. 구조

```
[메인 토픽 = 허브(Pillar) 페이지]
   │
   ├── [서브 토픽 1 = 클러스터 페이지]
   │      ↕ 양방향 내부 링크
   ├── [서브 토픽 2 = 클러스터 페이지]
   │      ↕
   └── [서브 토픽 3 = 클러스터 페이지]
          ↕
```

- **허브(Pillar) 페이지**: 메인 토픽을 포괄적으로 다루는 깊이 있는 페이지. 모든 클러스터로 링크.
- **클러스터(Cluster) 페이지**: 특정 서브 토픽을 깊이 있게 다루는 페이지. 허브로 다시 링크 + 같은 클러스터 내 다른 글로도 링크.

### 2-2. 양방향 링크 규칙

- 허브 페이지는 **모든 클러스터 페이지**로 링크
- 클러스터 페이지는 자신의 **허브로 링크 + 같은 클러스터 내 다른 글 2~5개**로 링크
- 무작위 링크 금지 — 의미적으로 연결된 페이지만 링크

### 2-3. 고아 페이지 0개

- **모든 페이지는 최소 한 곳에서 링크되어야 함**
- 빌드 후 자동 검증 스크립트로 고아 페이지 검출
- 검색만으로 도달 가능한 페이지는 고아로 간주

### 2-4. 클릭 깊이(Click Depth)

- 홈에서 모든 페이지까지 **클릭 3회 이내** 도달 가능
- 깊이가 깊은 페이지일수록 크롤링 우선순위 낮음 → SEO 손해

### 2-5. 페이지네이션

- 무한 스크롤 사용 시에도 **검색용 정적 인덱스 페이지를 별도로 생성**
- `/blog?page=2` 대신 `/blog/page/2`로 정적 페이지 생성
- 각 페이지는 자체 canonical, prev/next link
- `rel="next"`, `rel="prev"` link 헤더는 Google이 더 이상 사용하지 않지만, 명시적 페이지 URL은 여전히 유효

---

## 3. 내비게이션 설계

### 3-1. 글로벌 내비게이션

- **메인 메뉴 항목 5±2개** (Miller's law)
- 깊은 메뉴(드롭다운)는 최대 1단계만
- 메가 메뉴는 사이트 규모가 클 때만 (이커머스, 미디어)
- 모바일에서는 햄버거 메뉴, 단 인터랙션 200ms 이내 응답

### 3-2. 푸터

다음을 모두 포함:

- 사이트맵 요약 (주요 카테고리 링크)
- 회사·운영 정보 (사업자명, 주소, 사업자번호)
- 연락처 (이메일, 전화)
- 정책 페이지 링크 (개인정보처리방침, 이용약관, 쿠키 정책)
- 저작권 표기 `© 2026 회사명`
- 소셜 미디어 링크 (sameAs와 동일)

### 3-3. 빵부스러기(Breadcrumb)

- **모든 하위 페이지에 노출** (홈 제외)
- `BreadcrumbList` 스키마(JSON-LD) 부착 → `docs/10` 참조
- 시각적 표시 + 스크린 리더 친화적 마크업

```html
<nav aria-label="breadcrumb">
  <ol>
    <li><a href="/">홈</a></li>
    <li><a href="/blog">블로그</a></li>
    <li aria-current="page">현재 글 제목</li>
  </ol>
</nav>
```

### 3-4. 본문 내 내부 링크

- 글 내 자연스러운 앵커 텍스트 (URL 그대로 노출 금지)
- 같은 사이트 내 관련 글 3~5개 링크
- 외부 권위 사이트로의 인용 링크 (정부, 학술, 1차 자료) — E-E-A-T 강화

---

## 4. 사이트맵 파일

### 4-1. sitemap.xml

- Astro `@astrojs/sitemap` 통합 사용
- 1만 URL 초과 시 인덱스 사이트맵으로 분할 (`sitemap-index.xml`)
- 변경 빈도가 높은 페이지 우선 (홈, 카테고리)

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
```

### 4-2. 추가 사이트맵 (해당 시)

- `sitemap-news.xml` — 뉴스 사이트 (48시간 이내 발행 글)
- `sitemap-images.xml` — 이미지가 많은 사이트
- `sitemap-videos.xml` — 동영상이 핵심인 사이트

---

## 5. 라우팅 구현 (Astro)

### 5-1. 정적 라우팅

```
src/pages/
├── index.astro              → /
├── about.astro              → /about
├── blog/
│   ├── index.astro          → /blog
│   └── [slug].astro         → /blog/:slug (동적)
└── category/
    └── [slug].astro         → /category/:slug
```

### 5-2. 동적 라우팅 + getStaticPaths

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---
<Layout title={post.data.title}>
  <Content />
</Layout>
```

### 5-3. 페이지네이션

```astro
---
// src/pages/blog/page/[page].astro
export async function getStaticPaths({ paginate }) {
  const posts = await getCollection('blog');
  return paginate(posts, { pageSize: 12 });
}

const { page } = Astro.props;
---
```

---

## 6. 리다이렉트 정책

### 6-1. 영구 리다이렉트 (308)

- HTTPS 강제: `http://example.com/*` → `https://example.com/*`
- www 정책 통일: `www.example.com` ↔ `example.com` 중 하나로
- 트레일링 슬래시 통일: `/about/` → `/about`

### 6-2. Cloudflare Pages `_redirects`

```
# public/_redirects
/old-blog/*   /blog/:splat   308
/old-page     /new-page      308
```

### 6-3. 마이그레이션 시

- 기존 URL 인벤토리 추출 (Search Console + Analytics + 크롤러)
- 1:1 매핑 작성
- 체인·루프 0건 검증
- 4xx/5xx 0건 검증

---

## 7. 검증 체크리스트

- [ ] 모든 URL 소문자, 하이픈, 영문 슬러그
- [ ] 트레일링 슬래시 정책 일관 (없음)
- [ ] 클릭 깊이 3 이하 (자동 크롤러로 검증)
- [ ] 고아 페이지 0개
- [ ] 모든 하위 페이지에 빵부스러기 + 스키마
- [ ] sitemap.xml 자동 생성, 빌드마다 갱신
- [ ] 글로벌 메뉴 5±2개
- [ ] 모든 카테고리에 허브 페이지 + 양방향 링크
- [ ] 페이지네이션 정적 인덱스 페이지 생성
- [ ] 깨진 내부 링크 0건 (`pnpm dlx linkinator http://localhost:4321 --recurse`)

---

**다음 작업**: `docs/03-design-system.md` — 디자인 토큰·반응형·컴포넌트 라이브러리.
