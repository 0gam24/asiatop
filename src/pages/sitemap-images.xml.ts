import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * Google Image Sitemap — 글별 OG 이미지를 검색엔진에 알리기.
 * - <image:image> 네임스페이스 필수
 * - 글당 1개 OG 이미지 (PNG 자동 생성, /og/{cluster}/{slug}.png)
 * - draft 제외, sitemap 우선순위는 globalsitemap-index가 담당
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
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    articles = [];
  }

  const urls = articles.map((article) => {
    const slug = article.id.replace(/\.mdx?$/, '');
    const pageUrl = new URL(`/${article.data.cluster}/${slug}`, context.site).toString();
    const imageUrl = new URL(`/og/${article.data.cluster}/${slug}.png`, context.site).toString();
    return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(article.data.title)}</image:title>
      <image:caption>${escapeXml(article.data.description)}</image:caption>
    </image:image>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
