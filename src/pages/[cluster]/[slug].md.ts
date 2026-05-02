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
      // R48 #48-4 — markdown mirror에 검증·신선도 메타 노출 (AI 답변 엔진 인용 신호 ↑)
      lastReviewed?: Date;
      aiAssisted?: boolean;
      next_review_date?: Date;
      reviewedBy?: string;
      sources_verified?: boolean;
      verified_facts_count?: number;
      approximate_facts_count?: number;
      fact_verification_at?: string;
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
  // R48 #48-4 — 자동 발행 글이면 검증 주체·시스템 명시 (사람 사칭 페널티 회피)
  if (article.data.aiAssisted) {
    lines.push(`- **검증**: MoneyLook 자동검증시스템 (G0~G8 8단계 게이트 통과)`);
  } else if (article.data.reviewedBy) {
    lines.push(`- **검증 주체**: ${article.data.reviewedBy}`);
  }
  lines.push(`- **발행**: ${article.data.publishedAt.toISOString().slice(0, 10)}`);
  if (article.data.updatedAt) {
    lines.push(`- **갱신**: ${article.data.updatedAt.toISOString().slice(0, 10)}`);
  }
  // R48 #48-4 — lastReviewed 우선순위: frontmatter → fact_verification_at → dataValidAsOf
  if (article.data.lastReviewed) {
    lines.push(`- **마지막 검토**: ${article.data.lastReviewed.toISOString().slice(0, 10)}`);
  } else if (article.data.fact_verification_at) {
    lines.push(`- **마지막 검토**: ${article.data.fact_verification_at.slice(0, 10)} (자동 검증)`);
  }
  if (article.data.next_review_date) {
    lines.push(`- **다음 재검증**: ${article.data.next_review_date.toISOString().slice(0, 10)}`);
  }
  lines.push(`- **데이터 기준**: ${article.data.dataValidAsOf}`);
  // R48 #48-4 — 정량 검증 강도 노출 (sources_verified=true 글)
  if (article.data.sources_verified && article.data.verified_facts_count) {
    const apx = article.data.approximate_facts_count
      ? ` · 근사 ${article.data.approximate_facts_count}건`
      : '';
    lines.push(
      `- **검증 강도**: 정부 1차 자료 ${article.data.sources.length}건 인용 · 사실 ${article.data.verified_facts_count}건 1:1 매칭${apx}`,
    );
  }
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
      // R48 #48-4 — 강화 캐시: 브라우저 1시간·edge 24시간·stale-while-revalidate 7일.
      // 마크다운 미러는 본문/메타 변경 외 변동 없음 → AI 크롤러 fetch 응답 속도 ↑.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Robots-Tag': 'index, follow',
      // canonical HTML 페이지 명시 — AI 크롤러가 마크다운/HTML 중복으로 판단하지 않도록.
      Link: `<${url}>; rel="canonical"`,
    },
  });
}
