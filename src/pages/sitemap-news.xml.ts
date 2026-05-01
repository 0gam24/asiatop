import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * Google News sitemap (Discover 가속용)
 * - 발행 후 48시간 이내 글만 포함 (Google News 정책)
 * - <news:news> 네임스페이스 필수
 * - 빌드 타임 + scheduled-rebuild (6h cron) 자동 갱신
 */

const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

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
  const fresh = articles.filter((a) => {
    const ref = a.data.updatedAt ?? a.data.publishedAt;
    return now - ref.valueOf() <= NEWS_WINDOW_MS;
  });

  fresh.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

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
