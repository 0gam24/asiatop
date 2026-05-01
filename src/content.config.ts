import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(20).max(70),
    description: z.string().min(80).max(170),
    cluster: z.string(),
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
