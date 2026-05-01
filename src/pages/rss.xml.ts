import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { findCluster } from '../data/clusters';

export async function GET(context: APIContext) {
  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    articles = [];
  }
  const sorted = articles.sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

  return rss({
    xmlns: { content: 'http://purl.org/rss/1.0/modules/content/' },
    stylesheet: '/rss-styles.xsl',
    title: '머니룩 — 직장인·청년 생활금융 가이드',
    description:
      '정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금. 한국 직장인이 매일 마주치는 돈 문제를 한곳에서.',
    site: context.site!,
    items: sorted.slice(0, 50).map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const cluster = findCluster(article.data.cluster);
      const utm = `?utm_source=rss&utm_medium=feed&utm_campaign=${article.data.cluster}`;
      return {
        title: article.data.title,
        pubDate: article.data.publishedAt,
        description: article.data.description,
        link: `/${article.data.cluster}/${slug}${utm}`,
        categories: cluster ? [cluster.title] : [],
        author: article.data.author,
        customData: `<content:encoded><![CDATA[${article.body ?? ''}]]></content:encoded><dc:creator><![CDATA[${article.data.author}]]></dc:creator>`,
      };
    }),
    customData: `<language>ko-KR</language>
<copyright>© ${new Date().getFullYear()} 머니룩 (MoneyLook)</copyright>
<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${new URL('/rss.xml', context.site).toString()}" rel="self" type="application/rss+xml" />
<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="https://pubsubhubbub.appspot.com/" rel="hub" />
<image>
  <url>${new URL('/favicon.svg', context.site).toString()}</url>
  <title>머니룩</title>
  <link>${context.site!.toString()}</link>
</image>`,
  });
}
