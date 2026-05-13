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
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      // R65 — Discover·Naver·Yahoo 등 모두 media RSS 표준 인식.
      // media:thumbnail / media:content 가 RSS 피드 안 이미지 신호의 1순위.
      media: 'http://search.yahoo.com/mrss/',
    },
    title: '머니룩 — 직장인·청년 생활금융 가이드',
    description:
      '정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금. 한국 직장인이 매일 마주치는 돈 문제를 한곳에서.',
    site: context.site!,
    items: sorted.slice(0, 50).map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const cluster = findCluster(article.data.cluster);
      const utm = `utm_source=rss&utm_medium=feed&utm_campaign=${article.data.cluster}`;
      // R50-8 Naver SA RSS 호환: content:encoded 제거 (MDX JSX 컴포넌트가
      // CDATA 안에 들어가면서 Naver parser가 invalid XML로 거부).
      // 본문은 link 클릭으로 유도. RSS는 메타 + 요약만.
      const descCapped = (article.data.description ?? '').slice(0, 800);
      // R65 — 절대 URL 16:9 OG PNG. Discover 카드화 1순위 신호.
      const ogUrl = new URL(`/og/${article.data.cluster}/${slug}.png`, context.site).toString();
      const ogSquareUrl = new URL(`/og-square/${article.data.cluster}/${slug}.png`, context.site).toString();
      // R67-3 — RSS content:encoded 안 JSON-LD Article schema 삽입.
      // Perplexity·ChatGPT·Claude·Bing Copilot 등 RSS 만 긁는 AI 크롤러가
      // schema.org 그대로 인용 가능 → AI 인용 정확도·확률 ↑↑.
      // CDATA 안 순수 JSON 만 (MDX JSX 금지 — Naver SA parser 거부).
      const pageUrl = new URL(`/${article.data.cluster}/${slug}/`, context.site).toString();
      const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.data.title,
        description: article.data.description,
        url: pageUrl,
        image: [ogUrl, ogSquareUrl],
        datePublished: article.data.publishedAt.toISOString(),
        dateModified: (article.data.updatedAt ?? article.data.publishedAt).toISOString(),
        inLanguage: 'ko-KR',
        author: {
          '@type': 'Organization',
          name: '머니룩 편집팀',
          url: new URL('/about/', context.site).toString(),
        },
        publisher: {
          '@type': 'Organization',
          name: '머니룩',
          url: context.site!.toString(),
        },
        articleSection: cluster?.title,
        keywords: article.data.keywords.join(', '),
      };
      const contentEncoded =
        `<![CDATA[<script type="application/ld+json">${JSON.stringify(articleLd)}</script>` +
        `<p>${article.data.description}</p>` +
        `<p><a href="${pageUrl}">머니룩에서 자세히 보기 →</a></p>]]>`;
      return {
        title: article.data.title,
        pubDate: article.data.publishedAt,
        description: descCapped,
        link: `/${article.data.cluster}/${slug}/?${utm}`,
        categories: cluster ? [cluster.title] : [],
        author: article.data.author,
        customData:
          `<dc:creator><![CDATA[${article.data.author}]]></dc:creator>` +
          // media:content (full) + media:thumbnail (preview) — Discover·Yahoo Media RSS 표준.
          // 16:9 = content, 1:1 = thumbnail. Naver SA 도 media:content 우선 인식.
          `<media:content url="${ogUrl}" type="image/png" medium="image" width="1200" height="630" />` +
          `<media:thumbnail url="${ogSquareUrl}" width="1200" height="1200" />` +
          `<content:encoded>${contentEncoded}</content:encoded>`,
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
