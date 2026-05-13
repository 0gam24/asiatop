import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * Google News sitemap (Discover 가속용)
 * - 발행 후 48시간 이내 글만 포함 (Google News 정책)
 * - <news:news> 네임스페이스 필수
 * - 빌드 타임 + scheduled-rebuild (6h cron) 자동 갱신
 */

// R73 — 48h → 7d 윈도우 확장 + 비어있을 때 최신 1편 fallback.
// 원인: Naver SA 가 빈 <urlset> 을 "사이트맵 형식이 올바르지 않음" 거부.
//      자동 발행 글의 publishedAt 이 frontmatter 명시 날짜라 발행 시점과 다를 수 있음.
// Google News 도 7일 윈도우 받음 (단, 신선도 가산은 2-3일 안 글만).
const NEWS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    articles = [];
  }

  const now = Date.now();
  let fresh = articles.filter((a) => {
    const ref = a.data.updatedAt ?? a.data.publishedAt;
    return now - ref.valueOf() <= NEWS_WINDOW_MS;
  });

  fresh.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

  // R73 — 윈도우 안 글이 0건이면 최신 5편 fallback. Naver SA 빈 urlset 거부 방지.
  if (fresh.length === 0 && articles.length > 0) {
    fresh = [...articles]
      .sort(
        (a, b) =>
          (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
          (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
      )
      .slice(0, 5);
  }

  const urls = fresh.map((article) => {
    const slug = article.id.replace(/\.mdx?$/, '');
    const url = new URL(`/${article.data.cluster}/${slug}/`, context.site).toString();
    const pubDate = article.data.publishedAt.toISOString();
    return `  <url>
    <loc>${escapeXml(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>머니룩</news:name>
        <news:language>ko</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(article.data.title)}</news:title>
      <news:keywords>${escapeXml(article.data.keywords.join(', '))}</news:keywords>
    </news:news>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
