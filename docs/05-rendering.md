# docs/05 — 렌더링 아키텍처

페이지 유형별 렌더링 전략. SSG 우선, 동적이 필수일 때만 SSR/ISR. CSR 단독 금지.

---

## 1. 렌더링 모드 정의

| 모드 | 정의 | LCP/TTFB | AI 크롤러 |
|---|---|---|---|
| **SSG** (Static Site Generation) | 빌드 시 HTML 생성, CDN 정적 서빙 | 최상 | 우호 |
| **ISR** (Incremental Static Regeneration) | SSG + 백그라운드 재생성 | 우수 | 우호 |
| **SSR** (Server-Side Rendering) | 요청마다 서버에서 HTML 생성 | 양호 | 우호 |
| **CSR** (Client-Side Rendering) | 빈 HTML + JS로 콘텐츠 렌더 | 나쁨 | **불가** |

본 프로젝트의 기본은 **SSG**. CSR은 인증 후 대시보드 외 사용 금지.

---

## 2. 페이지 유형별 전략 매트릭스

| 페이지 유형 | 1차 권장 | 2차 권장 | 사유 |
|---|---|---|---|
| 홈, 랜딩 | SSG | ISR | 변경 빈도 낮음, 캐시 유리 |
| 블로그 글, 문서 | SSG | ISR | LCP/TTFB 최적, AI 크롤러 우호 |
| 카테고리/리스트 | SSG (재빌드) | ISR | 콘텐츠 추가 시 재빌드로 갱신 |
| 검색 결과 | 정적 인덱스 + 클라이언트 검색 | SSR | Pagefind 등 |
| 사용자 대시보드 | SSR + 부분 CSR | — | 인증 의존 |
| 결제, 주문 | SSR | — | 보안·일관성 |
| 관리자 화면 | CSR (인증 후) | — | SEO 무관 |

---

## 3. Astro 출력 모드 설정

### 3-1. 정보 사이트·블로그·랜딩 (대부분)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',  // 기본값
  site: 'https://example.com',
  trailingSlash: 'never',
});
```

빌드 결과: `dist/` 폴더 안에 모든 페이지가 정적 HTML로 생성. Cloudflare Pages가 그대로 서빙.

### 3-2. 일부 페이지만 동적인 경우 (hybrid)

```js
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',  // 기본 SSG + 일부 SSR
  adapter: cloudflare({ mode: 'directory' }),
});
```

페이지 단위로 SSR 명시:

```astro
---
// src/pages/dashboard.astro
export const prerender = false;  // SSR로 처리
---
```

### 3-3. 전부 SSR (드물게)

```js
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

본 표준에서는 권장하지 않음. SaaS·대시보드 사이트만 해당.

---

## 4. ISR (재빌드) 전략

Cloudflare Pages는 진정한 ISR(Next.js 식)을 지원하지 않는다. 대신 **정기 재빌드**로 동등 효과 달성:

```
GitHub Actions cron (예: 6시간마다)
   ↓
CF Deploy Hook 호출
   ↓
CF Pages가 빌드 실행 (pnpm build)
   ↓
새 dist/ 엣지 배포
```

자세한 구현은 `docs/19-deployment.md` 와 `templates/github-actions/deploy-hook-cron.yml` 참조.

### 재빌드 주기 결정

| 데이터 변경 빈도 | 권장 주기 |
|---|---|
| 거의 안 바뀜 | 24시간 |
| 일 단위 | 12시간 |
| 시간 단위 | 4~6시간 |
| 분 단위 | ISR로 부족 → SSR 검토 |

PROJECT.md의 "정기 재빌드 주기" 필드를 따른다.

---

## 5. 스트리밍 SSR / Partial Hydration

### 5-1. Astro Islands

Astro의 Islands 아키텍처는 본질적으로 Partial Hydration이다.

- 페이지의 99%는 정적 HTML
- 인터랙션 필요한 작은 영역(섬, Island)만 클라이언트 JS 실행
- INP에 결정적으로 유리

```astro
---
import StaticHeader from '../components/StaticHeader.astro';
import InteractiveSearch from '../components/InteractiveSearch.tsx';
---
<StaticHeader />
<InteractiveSearch client:visible />  <!-- 뷰포트 진입 시에만 hydrate -->
```

### 5-2. 무거운 데이터 페치 격리

홈에 여러 섹션이 있을 때, **above-the-fold 영역**은 즉시 렌더하고, 아래는 지연 로드:

```astro
<HeroSection />  <!-- 즉시 -->
<FeatureGrid />  <!-- 즉시 -->

<LazySection client:visible>
  <RecentArticles />  <!-- 뷰포트 진입 시 -->
</LazySection>
```

---

## 6. AI 크롤러 가시성 보장 (필수)

### 6-1. 핵심 원칙

**JavaScript 실행 후에만 보이는 콘텐츠는 AI 크롤러에 노출 안 됨.**

GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot, CCBot 등은 대부분 JS 실행을 하지 않거나 제한적이다. SSG/SSR 결과에 핵심 콘텐츠가 **이미 HTML로 포함**되어 있어야 한다.

### 6-2. 검증 방법

빌드 후 또는 배포 후 다음 명령으로 검증:

```bash
# GPTBot 시뮬레이션
curl -A "GPTBot/1.0" https://example.com/ | grep -E "<h1|<main"

# ClaudeBot 시뮬레이션
curl -A "ClaudeBot/1.0" https://example.com/blog/article | wc -c

# 실제 콘텐츠 텍스트 포함 확인
curl -A "GPTBot/1.0" https://example.com/blog/article | grep "본문에 들어있어야 할 핵심 문구"
```

핵심 콘텐츠가 보이지 않으면 SSR/SSG 설정 오류. 즉시 수정.

### 6-3. SPA 함정 회피

다음은 **금지**:

- ❌ React Router 단독 (`react-router-dom`만 쓰고 SSR 없음)
- ❌ Vue Router 단독 (Nuxt 같은 SSR 프레임워크 없이)
- ❌ `<div id="root"></div>` + 클라이언트 JS만으로 콘텐츠 렌더

본 프로젝트는 Astro 고정이므로 위 패턴이 발생할 일이 거의 없지만, React/Vue 컴포넌트를 `client:only`로 만들어 **콘텐츠 핵심**을 거기 넣으면 위와 같은 문제가 생긴다.

```astro
<!-- ❌ 금지 -->
<ArticleContent client:only="react" />

<!-- ✅ 정적 렌더 + 인터랙션만 hydrate -->
<ArticleContent />
<LikeButton client:visible />
```

---

## 7. 리다이렉트와 404

### 7-1. 404 페이지

```astro
---
// src/pages/404.astro
---
<Layout title="페이지를 찾을 수 없습니다">
  <h1>404</h1>
  <p>요청하신 페이지를 찾을 수 없습니다.</p>
  <a href="/">홈으로 돌아가기</a>
</Layout>
```

CF Pages가 자동으로 404 응답에 사용한다.

### 7-2. 리다이렉트

`docs/02` 참조. `public/_redirects` 파일.

---

## 8. 데이터 페칭 패턴

### 8-1. 빌드 타임 (SSG)

```astro
---
// src/pages/blog/index.astro
const response = await fetch('https://api.example.com/posts', {
  headers: { 'Authorization': `Bearer ${import.meta.env.API_KEY}` }
});
const posts = await response.json();
---
{posts.map(post => <article>{post.title}</article>)}
```

- API 키는 `import.meta.env.SECRET_*` (PUBLIC_ 접두사 금지 — 클라이언트 노출됨)
- Cloudflare Pages 환경변수에 등록

### 8-2. 빌드 타임 + 캐시 (반복 호출 방지)

같은 API를 여러 페이지에서 호출할 때:

```ts
// src/lib/api.ts
let cache: any = null;

export async function getPosts() {
  if (cache) return cache;
  const res = await fetch('https://api.example.com/posts', {
    headers: { 'Authorization': `Bearer ${import.meta.env.API_KEY}` }
  });
  cache = await res.json();
  return cache;
}
```

### 8-3. Astro Content Collections (권장)

API 데이터를 빌드 시 한 번만 가져와 콘텐츠 콜렉션처럼 다루기:

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

export const collections = {
  posts: defineCollection({
    type: 'data',
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      publishedAt: z.string(),
    }),
  }),
};
```

빌드 전 스크립트로 API 호출 → JSON 저장 → 콘텐츠 콜렉션 사용. 자세한 패턴은 `docs/20-external-api.md`.

---

## 9. 검증 체크리스트

- [ ] `astro.config.mjs`에 `output` 명시
- [ ] 정적 페이지는 `dist/`에 `.html` 파일로 생성됨
- [ ] curl로 GPTBot 시뮬레이션 시 핵심 콘텐츠 HTML 포함
- [ ] `client:only` 사용 시 SEO 핵심 콘텐츠 아님
- [ ] hybrid/SSR 시 Cloudflare 어댑터 적용
- [ ] API 키는 `SECRET_*` 또는 prefix 없는 환경변수, `PUBLIC_*` 금지
- [ ] 재빌드 주기가 PROJECT.md와 일치
- [ ] 404 페이지 작성

---

**다음 작업**: `docs/06-javascript.md` — JS 번들 최적화, Islands 패턴.
