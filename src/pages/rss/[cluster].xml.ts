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
  return rss({
    xmlns: { content: 'http://purl.org/rss/1.0/modules/content/' },
    title: `${cluster.title} — 머니룩`,
    description: cluster.description,
    site: context.site!,
    items: sorted.slice(0, 50).map((article) => {
      const slug = article.id.replace(/\.mdx?$/, '');
      const utm = `utm_source=rss&utm_medium=feed&utm_campaign=${article.data.cluster}`;
      // R50-4: description 1,200자 cap (Naver RSS 본문 길이 제한 회피).
      const descCapped = (article.data.description ?? '').slice(0, 1200);
      return {
        title: article.data.title,
        pubDate: article.data.publishedAt,
        description: descCapped,
        link: `/${article.data.cluster}/${slug}/?${utm}`,
        categories: [cluster.title],
        author: article.data.author,
        customData: `<content:encoded><![CDATA[${article.body ?? ''}]]></content:encoded><dc:creator><![CDATA[${article.data.author}]]></dc:creator>`,
      };
    }),
    customData: `<language>ko-KR</language>
<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${new URL(`/rss/${cluster.slug}.xml`, context.site).toString()}" rel="self" type="application/rss+xml" />
<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="https://pubsubhubbub.appspot.com/" rel="hub" />`,
  });
}
