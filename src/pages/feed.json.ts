import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { findCluster } from '../data/clusters';

/**
 * JSON Feed 1.1 (https://www.jsonfeed.org/version/1.1/)
 * - 사람이 읽기 쉬운 JSON, NetNewsWire/Reeder 등 모던 피드 리더 지원
 * - hubs 광고로 WebSub 푸시 알림 (RSS·Atom과 동일)
 */

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

  const siteUrl = context.site!.toString();

  const items = articles.slice(0, 50).map((article) => {
    const slug = article.id.replace(/\.mdx?$/, '');
    const pageUrl = new URL(`/${article.data.cluster}/${slug}/`, context.site).toString();
    const cluster = findCluster(article.data.cluster);
    // R65 — JSON Feed 1.1 image 필드 (16:9 OG). Discover·Reeder·NetNewsWire 모두 인식.
    const ogUrl = new URL(`/og/${article.data.cluster}/${slug}.png`, context.site).toString();
    return {
      id: pageUrl,
      url: pageUrl,
      title: article.data.title,
      content_html: article.body ?? article.data.description,
      summary: article.data.description,
      image: ogUrl,
      banner_image: ogUrl,
      date_published: article.data.publishedAt.toISOString(),
      date_modified: (article.data.updatedAt ?? article.data.publishedAt).toISOString(),
      tags: [...article.data.keywords, ...(cluster ? [cluster.title] : [])],
      authors: [{ name: article.data.author }],
      language: 'ko',
    };
  });

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: '머니룩 — 직장인·청년 생활금융 가이드',
    description:
      '정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금. 한국 직장인이 매일 마주치는 돈 문제를 한곳에서.',
    home_page_url: siteUrl,
    feed_url: new URL('/feed.json', context.site).toString(),
    language: 'ko',
    icon: new URL('/og-default.png', context.site).toString(),
    favicon: new URL('/favicon.svg', context.site).toString(),
    authors: [{ name: '머니룩 편집팀', url: new URL('/about/', context.site).toString() }],
    hubs: [{ type: 'WebSub', url: 'https://pubsubhubbub.appspot.com/' }],
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=1800',
    },
  });
}
