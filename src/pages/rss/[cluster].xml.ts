import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { clusters, findCluster } from '../../data/clusters';

export async function getStaticPaths() {
  return clusters.map((c) => ({ params: { cluster: c.slug } }));
}

export async function GET(context: APIContext) {
  const { cluster: clusterSlug } = context.params;
  const cluster = findCluster(clusterSlug!);
  if (!cluster) {
    return new Response('Not found', { status: 404 });
  }

  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection(
      'articles',
      ({ data }) => data.cluster === clusterSlug && !data.draft,
    );
  } catch {
    articles = [];
  }
  // 정렬 키: updatedAt ?? publishedAt — atom.xml·feed.json·rss.xml과 동일 기준.
  const sorted = articles.sort(
    (a, b) =>
      (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
      (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
  );

  // Naver SA 호환 — stylesheet 제거, link trailing slash 위치 정규화.
  // R72-2 — dc + atom 네임스페이스 root-level 선언 (Naver SA strict XML parser 호환).
  return rss({
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      dc: 'http://purl.org/dc/elements/1.1/',
      atom: 'http://www.w3.org/2005/Atom',
    },
    title: `${cluster.title} — 머니룩`,
    description: cluster.description,
    site: context.site!,
    items: sorted.slice(0, 100).map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      // R50-8 Naver SA 호환: content:encoded 제거 (본문 MDX JSX 호환성 문제).
      // R72 Naver SA 호환: utm 제거 — trailingSlash:always + query 조합이 link URL 끝에
      // 잘못된 slash 붙임 ("utm_campaign=realestate/") → Naver SA 거부.
      const descCapped = (article.data.description ?? '').slice(0, 800);
      return {
        title: article.data.title,
        pubDate: article.data.publishedAt,
        description: descCapped,
        link: `/${article.data.cluster}/${slug}/`,
        categories: [cluster.title],
        author: article.data.author,
        customData: `<dc:creator><![CDATA[${article.data.author}]]></dc:creator>`,
      };
    }),
    customData: `<language>ko-KR</language>
<atom:link href="${new URL(`/rss/${cluster.slug}.xml`, context.site).toString()}" rel="self" type="application/rss+xml" />
<atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />`,
  });
}
