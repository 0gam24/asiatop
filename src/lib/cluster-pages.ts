// 카테고리 글 목록 페이지 나눔 (2026-10-14 운영자 지시: 한 번에 수십 개 글이 나열되지 않도록 12~15개 단위).
// 1페이지는 기존 주소 /<cluster>/ 를 그대로 쓰고, 2페이지부터 /<cluster>/page/<n>/ 로 만든다.
// 2페이지부터는 sitemap 에서 뺀다(astro.config.mjs filter). 글 상세 URL 은 바뀌지 않는다.
export const CLUSTER_PAGE_SIZE = 15;

export function clusterPageHref(clusterSlug: string, page: number): string {
  return page <= 1 ? `/${clusterSlug}/` : `/${clusterSlug}/page/${page}/`;
}

export function clusterPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / CLUSTER_PAGE_SIZE));
}
