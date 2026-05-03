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
  // 정렬 키: updatedAt ?? publishedAt — atom.xml·feed.json과 동일 기준.
  // R49 하네스(scripts/audit/auto-registration.mjs)가 50개 캡 동일성 의존.
  const sorted = articles.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

  // Naver Search Advisor 호환 — 다음 3종 제거/변경:
  //   1. <?xml-stylesheet?> 처리 명령 (Naver RSS parser 거부)
  //   2. <image><url> SVG (RSS 표준은 GIF/JPEG/PNG — Naver 엄격)
  //   3. link URL trailing slash 위치 — utm 파라미터 앞에 붙이기
  return rss({
    xmlns: { content: 'http://purl.org/rss/1.0/modules/content/' },
    title: '머니룩 — 직장인·청년 생활금융 가이드',
    description:
      '정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금. 한국 직장인이 매일 마주치는 돈 문제를 한곳에서.',
    site: context.site!,
    items: sorted.slice(0, 50).map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const cluster = findCluster(article.data.cluster);
      const utm = `utm_source=rss&utm_medium=feed&utm_campaign=${article.data.cluster}`;
      // R50-4: description 1,200자 cap (Naver RSS 본문 길이 제한 회피).
      // full-text는 content:encoded에만, description은 요약.
      const descCapped = (article.data.description ?? '').slice(0, 1200);
      return {
        title: article.data.title,
        pubDate: article.data.publishedAt,
        description: descCapped,
        link: `/${article.data.cluster}/${slug}/?${utm}`,
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
  <url>${new URL('/og-default.png', context.site).toString()}</url>
  <title>머니룩</title>
  <link>${context.site!.toString()}</link>
</image>`,
  });
}
