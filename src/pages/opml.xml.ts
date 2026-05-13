/**
 * R67 — OPML 2.0 디렉토리
 *
 * Feedly·Inoreader·NetNewsWire 등 RSS 리더에 "Subscribe to all" 원클릭 제공.
 * 13개 피드 (전체 + 12 카테고리) 묶음.
 *
 * AI 크롤러 (PerplexityBot·ClaudeBot·GPTBot) 도 OPML 을 사이트 카테고리 맵으로 인식.
 */
import type { APIContext } from 'astro';
import { clusters } from '../data/clusters';

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');
  const now = new Date().toUTCString();

  const categoryOutlines = clusters
    .map(
      (c) => `      <outline
        type="rss"
        text="${escapeXml(c.title)}"
        title="${escapeXml(c.title)}"
        xmlUrl="${site}/rss/${c.slug}.xml"
        htmlUrl="${site}/${c.slug}/"
        description="${escapeXml(c.description)}" />`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>머니룩 — 직장인·청년 생활금융 RSS 디렉토리</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
    <ownerName>머니룩 편집팀</ownerName>
    <ownerEmail>smartdatashop@gmail.com</ownerEmail>
    <docs>https://opml.org/spec2.opml</docs>
  </head>
  <body>
    <outline
      type="rss"
      text="머니룩 전체"
      title="머니룩 — 직장인·청년 생활금융 종합"
      xmlUrl="${site}/rss.xml"
      htmlUrl="${site}/"
      description="정부지원금·세금·재테크·부동산·노동·신용대출·보험·연금" />
    <outline text="카테고리별" title="12 카테고리별 RSS">
${categoryOutlines}
    </outline>
  </body>
</opml>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'text/x-opml+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
