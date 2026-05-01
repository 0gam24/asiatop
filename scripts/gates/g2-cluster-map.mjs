/**
 * G2 — Cluster 매핑 게이트 (Pre-LLM)
 *
 * 질문 텍스트를 12 cluster 중 하나로 매핑. Top-1 score < 임계 또는 모호 시 폐기.
 *
 * 알고리즘 (단순·결정론적, NLP 라이브러리 X):
 *   1. data/cluster-keywords.json 읽기
 *   2. cluster별 키워드 매칭 카운트 → score (정규화: 키워드 길이·빈도 가중)
 *   3. Top-1 score >= 임계값(0.3) AND Top-1 - Top-2 >= 1.0 → pass
 *   4. 그 외 → 폐기
 *
 * 차단 사유:
 *   g2-no-match    — 어떤 cluster 키워드도 매칭 0
 *   g2-low-score   — Top-1 score < 0.3
 *   g2-ambiguous   — Top-1과 Top-2 score 차이 < 1.0
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYWORDS_PATH = resolve(__dirname, '..', '..', 'data', 'cluster-keywords.json');

const SCORE_THRESHOLD = 0.3;        // 절대 임계
const AMBIGUITY_MARGIN = 1.0;       // Top-1과 Top-2 score 차이 최소

let _keywordsCache = null;
function loadKeywords() {
  if (_keywordsCache !== null) return _keywordsCache;
  if (!existsSync(KEYWORDS_PATH)) {
    throw new Error(`G2: cluster-keywords.json not found at ${KEYWORDS_PATH}`);
  }
  const raw = JSON.parse(readFileSync(KEYWORDS_PATH, 'utf-8'));
  // _meta 키 제외
  const map = Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith('_'))
  );
  _keywordsCache = map;
  return map;
}

export function _resetKeywordsCache() {
  _keywordsCache = null;
}

/**
 * cluster 매칭 score 계산.
 * 매칭 카운트에 키워드 길이를 가중 (긴 키워드 = 명확한 시그널).
 */
function scoreCluster(text, keywords) {
  let score = 0;
  const matched = [];
  for (const kw of keywords) {
    if (text.includes(kw)) {
      // 긴 키워드(공백·복합어 포함)는 가중치 높음
      const weight = kw.includes(' ') ? 2.0 : Math.min(1.5, 0.5 + kw.length / 8);
      score += weight;
      matched.push(kw);
    }
  }
  return { score, matched };
}

/**
 * G2 메인 — cluster 매핑.
 * @param {string} text 질문 본문 (G1 통과 후)
 * @returns {{
 *   pass: boolean,
 *   cluster: string|null,
 *   score: number,
 *   reasons: string[],
 *   ranking: Array<{cluster: string, score: number, matched: string[]}>
 * }}
 */
export function mapCluster(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { pass: false, cluster: null, score: 0, reasons: ['g2-empty'], ranking: [] };
  }
  const normalized = text.toLowerCase().normalize('NFC');

  const keywords = loadKeywords();
  const ranking = Object.entries(keywords)
    .map(([cluster, words]) => {
      const { score, matched } = scoreCluster(normalized, words);
      return { cluster, score, matched };
    })
    .sort((a, b) => b.score - a.score);

  const top1 = ranking[0];
  const top2 = ranking[1];

  if (!top1 || top1.score === 0) {
    return { pass: false, cluster: null, score: 0, reasons: ['g2-no-match'], ranking };
  }
  if (top1.score < SCORE_THRESHOLD) {
    return { pass: false, cluster: null, score: top1.score, reasons: ['g2-low-score'], ranking };
  }
  if (top2 && top1.score - top2.score < AMBIGUITY_MARGIN) {
    return {
      pass: false,
      cluster: null,
      score: top1.score,
      reasons: [`g2-ambiguous:${top1.cluster}-vs-${top2.cluster}`],
      ranking,
    };
  }

  return {
    pass: true,
    cluster: top1.cluster,
    score: Number(top1.score.toFixed(2)),
    reasons: [],
    ranking: ranking.slice(0, 3),  // Top-3만 반환 (audit·디버깅용)
  };
}
