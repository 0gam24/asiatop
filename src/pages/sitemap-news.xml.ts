import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * Google News + Naver SA 호환 sitemap.
 * - 최신 5편 (publishedAt·updatedAt 기준 내림차순). Naver SA 빈 urlset 거부 회피.
 * - <news:news> 네임스페이스 + <news:publication_date>.
 * - 빌드 타임 + scheduled-rebuild (6h cron) 자동 갱신.
 */

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
    articles = await getCollection('articles', ({ data }) => !data.draft && !data.noindex);
  } catch {
    articles = [];
  }

  // 최신 5편만. publishedAt·updatedAt 둘 다 안전하게 처리.
  const sorted = articles
    .slice()
    .sort(
      (a, b) =>
        (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
        (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
    )
    .slice(0, 5);

  const urls = sorted.map((article) => {
    const slug = article.id.replace(/\.mdx?$/, '');
    const url = new URL(`/${article.data.cluster}/${slug}/`, context.site).toString();
    const pubDate = (article.data.updatedAt ?? article.data.publishedAt).toISOString();
    const kw = (article.data.keywords ?? []).slice(0, 5).join(', ');
    return `  <url>
    <loc>${escapeXml(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>머니룩</news:name>
        <news:language>ko</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(article.data.title)}</news:title>
      <news:keywords>${escapeXml(kw)}</news:keywords>
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
