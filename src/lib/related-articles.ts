/**
 * 추천 글 알고리즘 v3 (빌드 타임) — 2026-10-14 운영자 지시
 * ("추천 매칭은 현재 글과 같은 카테고리 안에서 핵심 키워드·태그 유사도가 가장 높은 글 4~6개")
 *
 * 1순위: 같은 클러스터 글만 고른다. 점수 순, 동점이면 최근 글(updatedAt ?? publishedAt) 먼저.
 *   keyword TF-IDF lite: Σ(min(freq_a, freq_b) × idf) × 0.05
 *   explicitMention    : 후보 글 슬러그가 본문 마크다운 링크에 명시 시 +3
 * 같은 클러스터 후보가 MIN_SAME_CLUSTER 개보다 적을 때만 인접 클러스터 글을 같은 점수 순으로 채운다.
 *
 * v2(2026-10-14 이전)에 있던 최근성 가산(+1/+0.5)·CPC 최상 클러스터 가산(+1)·CPC 글 상한(⌈N/2⌉)은 뺐다.
 * CPC 상한 때문에 credit-loan·insurance-personal 글의 추천에는 같은 클러스터 글이 3개까지만 나왔다.
 */

export interface ArticleLike {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    cluster: string;
    keywords: readonly string[];
    publishedAt: Date;
    updatedAt?: Date;
    draft?: boolean;
  };
}

/** 같은 클러스터 후보가 이보다 적으면 인접 클러스터로 이 개수까지 채운다. */
export const MIN_SAME_CLUSTER = 4;

const ADJACENT: Record<string, readonly string[]> = {
  'credit-loan': ['savings', 'insurance-personal'],
  'insurance-personal': ['insurance-labor', 'pension', 'credit-loan'],
  tax: ['gov-support', 'office-tips'],
  savings: ['pension', 'credit-loan'],
  realestate: ['gov-support', 'tax'],
  unemployment: ['insurance-labor', 'pension'],
  pension: ['savings', 'insurance-personal'],
  'gov-support': ['realestate', 'tax'],
  'insurance-labor': ['unemployment', 'office-tips'],
  auto: ['insurance-personal', 'tax'],
  'public-services': ['gov-support', 'tax'],
  'office-tips': ['insurance-labor', 'tax'],
};

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function buildTermFreq(article: ArticleLike): Map<string, number> {
  const freq = new Map<string, number>();
  const text = [
    article.data.title,
    article.data.description,
    article.data.keywords.join(' '),
    article.body ?? '',
  ].join(' ');
  for (const tok of tokenize(text)) {
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  return freq;
}

function buildIdf<T extends ArticleLike>(pool: readonly T[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const a of pool) {
    const seen = new Set<string>();
    for (const k of a.data.keywords) {
      for (const tok of tokenize(k)) seen.add(tok);
    }
    for (const tok of tokenize(a.data.title)) seen.add(tok);
    for (const tok of seen) {
      df.set(tok, (df.get(tok) ?? 0) + 1);
    }
  }
  const N = pool.length;
  const idf = new Map<string, number>();
  for (const [tok, count] of df) {
    idf.set(tok, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
}

function extractMentions(body: string | undefined): Set<string> {
  if (!body) return new Set();
  const mentions = new Set<string>();
  const re = /\]\(\/([a-z-]+)\/([a-z0-9-]+)(?:\/|\)|#)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const slug = m[2];
    if (slug) mentions.add(slug);
  }
  return mentions;
}

export function getRelatedArticles<T extends ArticleLike>(
  current: T,
  pool: readonly T[],
  limit: number = 6,
): T[] {
  const idf = buildIdf(pool);
  const currentFreq = buildTermFreq(current);
  const currentMentions = extractMentions(current.body);

  const score = (candidate: T): number => {
    const candidateFreq = buildTermFreq(candidate);
    let tfidf = 0;
    for (const [tok, fa] of currentFreq) {
      const fb = candidateFreq.get(tok);
      if (!fb) continue;
      tfidf += Math.min(fa, fb) * (idf.get(tok) ?? 1);
    }
    const slug = candidate.id.replace(/\.mdx?$/, '');
    return tfidf * 0.05 + (currentMentions.has(slug) ? 3 : 0);
  };
  const refTime = (a: T) => (a.data.updatedAt ?? a.data.publishedAt).valueOf();
  const rank = (candidates: T[]): T[] =>
    candidates
      .map((article) => ({ article, score: score(article) }))
      .sort((a, b) => b.score - a.score || refTime(b.article) - refTime(a.article))
      .map((s) => s.article);
  const eligible = (a: T) => a.id !== current.id && !a.data.draft;

  const result = rank(pool.filter((a) => eligible(a) && a.data.cluster === current.data.cluster)).slice(0, limit);

  const minCount = Math.min(MIN_SAME_CLUSTER, limit);
  if (result.length < minCount) {
    const adjacent = new Set(ADJACENT[current.data.cluster] ?? []);
    for (const a of rank(pool.filter((a) => eligible(a) && adjacent.has(a.data.cluster)))) {
      if (result.length >= minCount) break;
      result.push(a);
    }
  }

  return result;
}
