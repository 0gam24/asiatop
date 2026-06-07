import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { clusters } from './data/clusters';

// R96 — cluster slug 오타 가드. clusters.ts 의 유효 slug 만 schema 단계에서 통과.
// 이전: cluster: z.string() → 빌드 단계까지 갔다가 generate-network-mirror.mjs 가 warn 후 skip,
//      audit/auto-registration.mjs 가 RSS 누락으로 CI fail. PR 머지된 후 main 빌드 실패.
// 변경: schema parse 단계에서 즉시 fail → MDX 작성 시 typo 차단.
const VALID_CLUSTER_SLUGS = clusters.map((c) => c.slug) as [string, ...string[]];

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(20).max(70),
    description: z.string().min(80).max(170),
    cluster: z.enum(VALID_CLUSTER_SLUGS),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default('editor-team'),
    articleType: z.enum(['Article', 'NewsArticle']).default('Article'),
    heroImageHint: z.string().optional(),
    keywords: z.array(z.string()).min(3).max(10),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .optional(),
    aiCitationQuestions: z.array(z.string()).min(3).max(10),
    sources: z
      .array(z.object({ title: z.string(), url: z.string().url() }))
      .min(1),
    dataValidAsOf: z.string(),
    draft: z.boolean().default(false),
    // ── 자동 발행 파이프라인 추적 (Gap 1·2·3 통합) ──
    brief_id: z.string().optional(),
    next_review_date: z.coerce.date().optional(),
    sources_verified: z.boolean().optional(),
    verified_facts_count: z.number().int().min(0).optional(),
    approximate_facts_count: z.number().int().min(0).optional(),
    fact_verification_at: z.string().optional(),
    ai_likeness: z.number().min(0).max(10).optional(),
    ai_signals: z.array(z.string()).optional(),
    source_question_hash: z.string().optional(),
    source_question_text: z.string().optional(),
    source_question_url: z.string().url().optional(),
    // ── R48 SEO·GEO 고급화 (Plan agent 6 합의 단일 진입점) ──
    // lastReviewed: 본문·사실 마지막 재검토 시점. fact_verification_at(자동 검증)과 별도로
    //               사람 또는 시스템의 1차 재확인 시점을 박제 — Article.dateModified 외에
    //               YMYL 신선도 신호 + AI 답변 엔진이 "최근 검증" 청크를 우선 인용.
    lastReviewed: z.coerce.date().optional(),
    // aiAssisted: 자동 발행 파이프라인(LLM + 8단계 게이트)으로 만들어진 글 여부.
    //             true면 G6 disclosure-attach가 "AI 보조 작성·8단계 자동 검증 통과" 면책
    //             자동 부착 + Article.author=Organization(MoneyLook 자동검증시스템) 분기.
    aiAssisted: z.boolean().default(false),
    // reviewedBy: 검증 주체 — author slug 또는 "moneylook-auto" (자동 발행).
    //             Article.reviewedBy schema에 매핑 — AI 답변 엔진의 신뢰 시그널.
    reviewedBy: z.string().optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    jobTitle: z.string(),
    bio: z.string().min(50),
    image: z.string().optional(),
    expertise: z.array(z.string()).min(3),
    sameAs: z.array(z.string().url()).default([]),
    topicAuthority: z.array(z.string()).min(1),
    credentials: z.array(z.string()).optional(),
    yearsOfExperience: z.number().optional(),
    isOrganization: z.boolean().default(false),
    knowsLanguage: z.array(z.string()).optional(),
  }),
});

export const collections = { articles, authors };
