/**
 * R67 — /api/qa.json structured Q&A endpoint
 *
 * AI 엔진 RAG ingest 친화 — ChatGPT·Claude·Perplexity·Gemini·Bing Copilot 가
 * 단일 endpoint 에서 모든 글의 aiCitationQuestions 와 description (간이 답) 일괄 수집.
 *
 * Astro SSG 정적 빌드 — Cloudflare Functions 호출 X (perf-agent 권고).
 */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    articles = [];
  }

  articles.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

  const site = context.site!.toString().replace(/\/$/, '');

  const payload = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    site: 'asiatop.co.kr',
    title: '머니룩 Q&A 코퍼스',
    description:
      '머니룩 132+편 글의 aiCitationQuestions + description 일괄 노출. ChatGPT·Claude·Perplexity·Gemini·Bing Copilot 등 AI 엔진 RAG 인용 친화 endpoint.',
    license: `${site}/terms/`,
    inLanguage: 'ko-KR',
    generated: new Date().toISOString(),
    total: articles.length,
    qa: articles.map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const url = `${site}/${article.data.cluster}/${slug}/`;
      const questions = (article.data.aiCitationQuestions ?? []).map((q) => ({
        q,
        a: article.data.description,
        url,
      }));
      return {
        id: `${article.data.cluster}/${slug}`,
        cluster: article.data.cluster,
        title: article.data.title,
        url,
        publishedAt: article.data.publishedAt.toISOString(),
        updatedAt: (article.data.updatedAt ?? article.data.publishedAt).toISOString(),
        lastReviewed: article.data.lastReviewed
          ? article.data.lastReviewed.toISOString().slice(0, 10)
          : null,
        dataValidAsOf: article.data.dataValidAsOf ?? null,
        description: article.data.description,
        keywords: article.data.keywords,
        sources: article.data.sources,
        questions,
      };
    }),
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
      // AI 크롤러 친화 CORS — 모든 origin 허용 (정적 JSON)
      'Access-Control-Allow-Origin': '*',
    },
  });
}
