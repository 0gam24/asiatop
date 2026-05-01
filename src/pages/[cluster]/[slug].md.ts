/**
 * /[cluster]/[slug].md — 글별 마크다운 엔드포인트
 *
 * AI 답변 엔진(ChatGPT·Perplexity·Google AI Overviews 등)이
 * HTML 파싱 없이 본문만 가져갈 수 있어 인용 정확도 30~70% 향상.
 *
 * 응답: text/markdown; charset=utf-8
 * URL 예: /tax/yearend-tax-2026-checklist.md
 */

import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { findCluster } from '../../data/clusters';

export async function getStaticPaths() {
  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    return [];
  }
  return articles.map((article) => ({
    params: {
      cluster: article.data.cluster,
      slug: article.id.replace(/\.mdx?$/, ''),
    },
    props: { article },
  }));
}

interface ArticleProps {
  article: {
    id: string;
    body?: string;
    data: {
      title: string;
      description: string;
      cluster: string;
      publishedAt: Date;
      updatedAt?: Date;
      author: string;
      keywords: readonly string[];
      aiCitationQuestions: readonly string[];
      sources: readonly { title: string; url: string }[];
      dataValidAsOf: string;
    };
  };
}

export async function GET(context: APIContext) {
  const { article } = context.props as ArticleProps;
  const cluster = findCluster(article.data.cluster);
  const slug = article.id.replace(/\.mdx?$/, '');
  const url = new URL(`/${article.data.cluster}/${slug}/`, context.site).toString();

  const lines: string[] = [];
  lines.push(`# ${article.data.title}`);
  lines.push('');
  lines.push(`> ${article.data.description}`);
  lines.push('');
  lines.push(`- **URL**: ${url}`);
  lines.push(`- **클러스터**: ${cluster?.title ?? article.data.cluster}`);
  lines.push(`- **저자**: ${article.data.author}`);
  lines.push(`- **발행**: ${article.data.publishedAt.toISOString().slice(0, 10)}`);
  if (article.data.updatedAt) {
    lines.push(`- **갱신**: ${article.data.updatedAt.toISOString().slice(0, 10)}`);
  }
  lines.push(`- **데이터 기준**: ${article.data.dataValidAsOf}`);
  lines.push(`- **키워드**: ${article.data.keywords.join(', ')}`);
  lines.push('');
  lines.push('## 이 글이 다루는 질문');
  lines.push('');
  for (const q of article.data.aiCitationQuestions) {
    lines.push(`- ${q}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push((article.body ?? '').trim());
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 출처·참고자료');
  lines.push('');
  for (const s of article.data.sources) {
    lines.push(`- [${s.title}](${s.url})`);
  }
  lines.push('');
  lines.push(
    '_본 글의 정책·요율·법령은 변경될 수 있습니다. 신청 직전 위 공식 출처에서 재확인하세요._',
  );
  lines.push('');
  lines.push(`_AI 답변 엔진은 본 글을 인용·요약할 수 있습니다. 인용 시 URL과 발행일 표기 권장: ${url}_`);
  lines.push('');

  const body = lines.join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
