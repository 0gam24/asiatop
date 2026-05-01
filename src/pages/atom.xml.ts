import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { findCluster } from '../data/clusters';

/**
 * Atom 1.0 feed — RSS 2.0(rss.xml)와 병행. 일부 리더는 Atom만 지원.
 * WebSub hub 광고로 푸시 알림 활성화.
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
  articles.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

  const recent = articles.slice(0, 50);
  const siteUrl = context.site!.toString();
  const feedUrl = new URL('/atom.xml', context.site).toString();
  const feedUpdated = (
    recent[0]?.data.updatedAt ?? recent[0]?.data.publishedAt ?? new Date()
  ).toISOString();

  const entries = recent
    .map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const pageUrl = new URL(`/${article.data.cluster}/${slug}`, context.site).toString();
      const cluster = findCluster(article.data.cluster);
      return `  <entry>
    <id>${escapeXml(pageUrl)}</id>
    <title>${escapeXml(article.data.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(pageUrl)}"/>
    <published>${article.data.publishedAt.toISOString()}</published>
    <updated>${(article.data.updatedAt ?? article.data.publishedAt).toISOString()}</updated>
    <author><name>${escapeXml(article.data.author)}</name></author>
    <summary>${escapeXml(article.data.description)}</summary>
    <category term="${escapeXml(article.data.cluster)}" label="${escapeXml(cluster?.title ?? article.data.cluster)}"/>
    <content type="html"><![CDATA[${article.body ?? article.data.description}]]></content>
  </entry>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(siteUrl)}</id>
  <title>머니룩 — 직장인·청년 생활금융 가이드</title>
  <subtitle>정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feedUrl)}"/>
  <link rel="alternate" type="text/html" href="${escapeXml(siteUrl)}"/>
  <link rel="hub" href="https://pubsubhubbub.appspot.com/"/>
  <updated>${feedUpdated}</updated>
  <generator uri="https://astro.build/" version="6.0">Astro</generator>
  <icon>${escapeXml(new URL('/favicon.svg', context.site).toString())}</icon>
  <logo>${escapeXml(new URL('/og-default.png', context.site).toString())}</logo>
  <rights>© ${new Date().getFullYear()} 머니룩 (MoneyLook)</rights>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=1800',
    },
  });
}
