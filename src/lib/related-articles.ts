/**
 * 추천 글 알고리즘 v2 (빌드 타임)
 *
 * 점수 공식:
 *   sameCluster        : +5
 *   keyword TF-IDF lite: Σ(min(freq_a, freq_b) × idf) × 0.05
 *   recency            : 180일 이내 +1, 365일 이내 +0.5
 *   cpcBoost           : CPC 최상 (credit-loan, insurance-personal) +1
 *   explicitMention    : 후보 글 슬러그가 본문 마크다운 링크에 명시 시 +3
 *
 * 다양성 캡:
 *   - 추천 N개 중 CPC 최상 글은 최대 ⌈N/2⌉
 *   - 같은 클러스터 글이 부족하면 인접 클러스터로 fill
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

interface ScoredArticle<T extends ArticleLike> {
  article: T;
  score: number;
  isCpcMax: boolean;
}

const CPC_MAX_CLUSTERS = new Set(['credit-loan', 'insurance-personal']);

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
  const now = Date.now();
  const idf = buildIdf(pool);
  const currentFreq = buildTermFreq(current);
  const currentMentions = extractMentions(current.body);

  const scored: ScoredArticle<T>[] = [];

  for (const candidate of pool) {
    if (candidate.id === current.id) continue;
    if (candidate.data.draft) continue;

    let score = 0;

    if (candidate.data.cluster === current.data.cluster) {
      score += 5;
    }

    const candidateFreq = buildTermFreq(candidate);
    let tfidf = 0;
    for (const [tok, fa] of currentFreq) {
      const fb = candidateFreq.get(tok);
      if (!fb) continue;
      tfidf += Math.min(fa, fb) * (idf.get(tok) ?? 1);
    }
    score += tfidf * 0.05;

    const refDate = candidate.data.updatedAt ?? candidate.data.publishedAt;
    const ageDays = (now - refDate.valueOf()) / 86400000;
    if (ageDays <= 180) score += 1;
    else if (ageDays <= 365) score += 0.5;

    const isCpcMax = CPC_MAX_CLUSTERS.has(candidate.data.cluster);
    if (isCpcMax) score += 1;

    const candidateSlug = candidate.id.replace(/\.mdx?$/, '');
    if (currentMentions.has(candidateSlug)) score += 3;

    if (score > 0) {
      scored.push({ article: candidate, score, isCpcMax });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = (a.article.data.updatedAt ?? a.article.data.publishedAt).valueOf();
    const bDate = (b.article.data.updatedAt ?? b.article.data.publishedAt).valueOf();
    return bDate - aDate;
  });

  const cpcCap = Math.ceil(limit / 2);
  const result: T[] = [];
  let cpcCount = 0;

  for (const s of scored) {
    if (result.length >= limit) break;
    if (s.isCpcMax && cpcCount >= cpcCap) continue;
    result.push(s.article);
    if (s.isCpcMax) cpcCount++;
  }

  if (result.length < limit) {
    const adjacent = ADJACENT[current.data.cluster] ?? [];
    const used = new Set(result.map((a) => a.id));
    for (const adjSlug of adjacent) {
      if (result.length >= limit) break;
      const adjArticles = pool
        .filter(
          (a) =>
            a.data.cluster === adjSlug &&
            !used.has(a.id) &&
            a.id !== current.id &&
            !a.data.draft,
        )
        .sort(
          (a, b) =>
            (b.data.updatedAt ?? b.data.publishedAt).valueOf() -
            (a.data.updatedAt ?? a.data.publishedAt).valueOf(),
        );
      for (const a of adjArticles) {
        if (result.length >= limit) break;
        result.push(a);
        used.add(a.id);
      }
    }
  }

  return result;
}
