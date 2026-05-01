# docs/20 — 외부 API 통합 패턴

PROJECT.md §C-1 "외부 API 사용 = 예"인 경우 적용. 빌드 타임 호출이 기본, 런타임은 검색·동적 영역만.

---

## 1. 핵심 원칙

- ✅ **빌드 타임 호출 우선** — API 키 클라이언트 노출 0, 사용자 트래픽이 API에 안 닿음
- ✅ **런타임은 최소화** — 검색, 사용자별 동적 데이터만
- ✅ **API 키는 Cloudflare Pages 환경변수**, 빌드 시에만 사용
- ✅ **응답 캐싱**으로 Rate Limit 방어
- ✅ **Zod 스키마 검증**으로 응답 형식 변화 조기 감지
- ❌ 클라이언트에서 직접 API 호출 (키 노출)

---

## 2. 빌드 타임 vs 런타임 결정 매트릭스

| 데이터 특성 | 권장 |
|---|---|
| 거의 안 바뀌는 데이터 | 빌드 타임 + 정기 재빌드 |
| 시간 단위 갱신 | 빌드 타임 + 4~6시간 재빌드 |
| 분 단위 갱신 | 런타임 (CF Functions + 캐시) |
| 사용자별 동적 | 런타임 (CF Functions) |
| 검색 (전문) | 정적 인덱스 + 클라이언트 검색 (Pagefind) |
| 검색 (실시간) | 런타임 |

본 표준 기본값: **빌드 타임 + 정기 재빌드** (재빌드 주기는 PROJECT.md).

---

## 3. 빌드 타임 호출 패턴

### 3-1. 기본 패턴

```ts
// src/lib/api.ts
const API_KEY = import.meta.env.API_KEY;
const BASE_URL = 'https://api.example.com';

export async function fetchPosts() {
  if (!API_KEY) throw new Error('API_KEY 환경변수 누락');

  const response = await fetch(`${BASE_URL}/posts`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

```astro
---
// src/pages/index.astro
import { fetchPosts } from '../lib/api';
const posts = await fetchPosts();
---
{posts.map(p => <article>...</article>)}
```

빌드 시 한 번 실행 → 결과가 정적 HTML에 인라인 → 사용자는 정적 페이지만 받음.

### 3-2. 모듈 캐시

같은 API를 여러 페이지에서 호출하면 빌드 시간 ↑. 모듈 레벨 캐시로 한 번만 호출:

```ts
// src/lib/api.ts
let postsCache: Post[] | null = null;

export async function getPosts(): Promise<Post[]> {
  if (postsCache) return postsCache;
  postsCache = await fetchPosts();
  return postsCache;
}
```

### 3-3. Zod 스키마 검증

API 응답 형식이 바뀌면 빌드 시 즉시 에러:

```ts
import { z } from 'zod';

const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  publishedAt: z.string().datetime(),
  author: z.object({
    name: z.string(),
    avatarUrl: z.string().url().optional(),
  }),
});

const PostsResponseSchema = z.object({
  data: z.array(PostSchema),
  meta: z.object({
    total: z.number(),
  }),
});

export async function fetchPosts() {
  const raw = await fetch(...).then(r => r.json());
  const parsed = PostsResponseSchema.parse(raw);  // 실패 시 throw
  return parsed.data;
}
```

장점:
- 형식 변경 즉시 감지 → 운영 사고 방지
- TypeScript 타입 자동 추론

### 3-4. 동적 라우트 (페이지 생성)

API에서 N개 글을 받아 N개 페이지 생성:

```astro
---
// src/pages/posts/[slug].astro
import { getPosts } from '../../lib/api';

export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
---
<Layout title={post.title}>
  <h1>{post.title}</h1>
  <Fragment set:html={post.content} />
</Layout>
```

빌드 시 `posts/article-1.html`, `posts/article-2.html` 등 자동 생성.

---

## 4. Astro Content Collections 통합 (권장)

API 응답을 Content Collections로 변환하면 타입 안정성·검색·필터링·페이지네이션 일괄 처리.

### 4-1. 빌드 전 데이터 동기화

```ts
// scripts/sync-api-data.ts
import { writeFile, mkdir } from 'fs/promises';
import { fetchPosts } from '../src/lib/api';

const posts = await fetchPosts();
await mkdir('src/content/posts', { recursive: true });

for (const post of posts) {
  const md = `---
title: "${post.title.replace(/"/g, '\\"')}"
slug: "${post.slug}"
publishedAt: ${post.publishedAt}
author: "${post.author.name}"
---

${post.content}
`;
  await writeFile(`src/content/posts/${post.slug}.md`, md);
}

console.log(`✅ ${posts.length} posts synced`);
```

### 4-2. package.json 스크립트

```json
{
  "scripts": {
    "sync": "tsx scripts/sync-api-data.ts",
    "build": "pnpm sync && astro build"
  }
}
```

CF Pages에서 `pnpm build` 실행 시 자동으로 sync 먼저 실행.

### 4-3. Content Collection 정의

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    publishedAt: z.coerce.date(),
    author: z.string(),
  }),
});

export const collections = { posts };
```

### 4-4. 사용

```astro
---
import { getCollection } from 'astro:content';
const posts = await getCollection('posts');
const sorted = posts.sort((a, b) => b.data.publishedAt - a.data.publishedAt);
---
```

---

## 5. Rate Limit 대응

### 5-1. 빌드 타임 호출 횟수 추적

```ts
let apiCallCount = 0;

async function fetchWithCount(url: string, init?: RequestInit) {
  apiCallCount++;
  if (apiCallCount % 100 === 0) {
    console.log(`API calls so far: ${apiCallCount}`);
  }
  return fetch(url, init);
}
```

빌드 끝나면 총 호출 수 출력 → Rate Limit 한도 대비 여유 확인.

### 5-2. 재시도 + 지수 백오프

```ts
async function fetchWithRetry(url: string, init?: RequestInit, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429) {
        // Rate Limit 도달
        const retryAfter = Number(res.headers.get('Retry-After')) || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await sleep(2 ** i * 1000);  // 1s, 2s, 4s
    }
  }
  throw new Error('Unreachable');
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

### 5-3. 페이지네이션·배치 호출

```ts
async function fetchAllPages(): Promise<Post[]> {
  const all: Post[] = [];
  let page = 1;
  while (true) {
    const res = await fetchWithRetry(`${BASE_URL}/posts?page=${page}&size=100`);
    const data = await res.json();
    all.push(...data.items);
    if (data.items.length < 100) break;
    page++;
    await sleep(100);  // 호출 간 간격
  }
  return all;
}
```

---

## 6. 런타임 호출 (CF Functions)

빌드 타임으로 처리 못 하는 동적 데이터만.

### 6-1. Cloudflare Pages Functions

```
functions/
└── api/
    └── search.ts
```

```ts
// functions/api/search.ts
export const onRequest: PagesFunction<{ API_KEY: string }> = async ({ request, env }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  if (!query) return new Response('Missing query', { status: 400 });

  const apiResponse = await fetch(
    `https://api.example.com/search?q=${encodeURIComponent(query)}`,
    { headers: { 'Authorization': `Bearer ${env.API_KEY}` } }
  );

  const data = await apiResponse.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
```

엔드포인트: `https://example.com/api/search?q=...`

### 6-2. 클라이언트에서 호출

```ts
const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
const data = await res.json();
```

API 키는 서버 측 함수에만 → 클라이언트 노출 0.

### 6-3. CF Functions 캐시

`Cache-Control` 헤더로 엣지 캐시 활용. Rate Limit 대응 + TTFB 단축.

---

## 7. 정적 검색 — Pagefind (검색이 필요한 경우 우선 검토)

전문 검색을 API 호출 없이:

```bash
pnpm add -D pagefind
```

```json
// package.json
{
  "scripts": {
    "build": "pnpm sync && astro build && pagefind --site dist"
  }
}
```

빌드 시 `dist/pagefind/` 자동 생성. 클라이언트에서 정적 인덱스 검색.

```astro
---
// src/pages/search.astro
---
<input id="search-input" type="search" />
<div id="search-results"></div>

<script>
  const PagefindUI = (await import('@pagefind/default-ui')).default;
  new PagefindUI({ element: '#search', showSubResults: true });
</script>
```

장점: API 키·서버 부담 0, INP 영향 거의 없음.

---

## 8. 한국 공공데이터포털 특화

PROJECT.md에서 공공데이터포털(data.go.kr) 명시한 경우.

### 8-1. 인증 방식

대부분 API Key를 쿼리 스트링으로:

```
https://apis.data.go.kr/.../endpoint?serviceKey=ENCODED_KEY&...
```

### 8-2. 키 형식

- 인코딩 키 (URL 인코딩 됨): 기본 사용
- 디코딩 키 (원본): 직접 인코딩 필요

```ts
const KEY = import.meta.env.DATA_GO_KR_KEY;  // 디코딩 키 사용

const params = new URLSearchParams({
  serviceKey: KEY,
  pageNo: '1',
  numOfRows: '100',
  type: 'json',
});

const url = `https://apis.data.go.kr/.../endpoint?${params}`;
```

### 8-3. 응답 형식

대부분 XML 기본, JSON은 `type=json` 또는 `_type=json` 파라미터 필요. API마다 다름 — 공식 문서 확인.

응답 구조도 표준화 안 됨 → Zod 스키마 작성 시 실제 응답 보고 결정.

### 8-4. Rate Limit

대부분 일일 트래픽 제한:
- 개발용: 1,000회/일
- 운영용: 10,000회/일 (별도 신청)

빌드 타임 호출만 하면 일일 빌드 횟수만큼만 소비 → 6시간마다 빌드 = 4회/일 = 여유.

### 8-5. 응답 형식 변경 대응

공공데이터포털 API는 사전 공지 없이 형식 바뀌는 경우 있음:
- Zod 스키마 검증으로 즉시 감지
- Sentry 알림 설정
- 빌드 실패 시 이전 배포 유지(CF 자동) → 사이트 정상

---

## 9. API 통합 에이전트

`templates/claude-agents/api-agent.md`가 본 프로젝트용으로 자동 생성됨. PROJECT.md의 API 정보를 박제.

내용:
- 엔드포인트 URL
- 인증 방식 + 환경변수 키 이름
- Rate Limit
- 응답 스키마 (Zod 코드)
- 재시도·캐싱 정책

API 변경 시 이 에이전트 파일을 먼저 갱신.

---

## 10. 검증 체크리스트

- [ ] API 키 클라이언트 코드/번들에 노출 0건 (`pnpm build` 후 검증)
- [ ] 환경변수 키 이름이 `PUBLIC_*`/`VITE_*`/`NEXT_PUBLIC_*` 아님
- [ ] Zod 스키마로 응답 검증
- [ ] Rate Limit 한도 대비 빌드당 호출 수 여유
- [ ] 재시도 + 지수 백오프 구현
- [ ] 페이지네이션 처리
- [ ] 빌드 타임 실패 시 빌드 중단 (이전 배포 유지)
- [ ] Sentry 또는 동급으로 응답 형식 변경 감지
- [ ] 검색은 Pagefind 우선 검토
- [ ] 런타임 필요한 부분만 CF Functions
- [ ] CF Functions 응답 캐시 적용
- [ ] PROJECT.md의 API 정보가 `templates/claude-agents/api-agent.md`에 반영

---

**다음 작업**: `docs/21-content-ops.md` — 콘텐츠 운영 표준.
