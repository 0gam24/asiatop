/**
 * 네이버 검색 API (지식iN) 질문 수집 어댑터
 *
 * 엔드포인트: https://openapi.naver.com/v1/search/kin.json
 * 인증: X-Naver-Client-Id + X-Naver-Client-Secret (developers.naver.com)
 * 일 한도: 25,000건 (비로그인 검색 API)
 *
 * 흐름:
 *   1. cluster별 키워드 풀로 매일 06:00 폴링
 *   2. sort=date로 신규 질문 추출
 *   3. description 길이·답변 수 추정 → niche.source_signal에 매핑
 *   4. 24h dedup-index 통과한 후보만 G1 진입
 *
 * MOCK_NAVER_KIN=1 시 fixture 응답 반환 (CI/dev). real fetch는 외부 키 발급 후.
 *
 * 약관 준수:
 *   - 검색 결과를 사이트에 그대로 표출 X
 *   - 답변 본문은 description (일부)만 사용, link로 fetch X
 *   - 질문 원문 인용 X (G7에서 차단)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, '..', '..', 'tests', 'fixtures', 'naver-kin');

const ENDPOINT = 'https://openapi.naver.com/v1/search/kin.json';

/**
 * @typedef {{
 *   title: string,         // 검색어 매칭 (HTML <b> 태그 포함 가능)
 *   description: string,   // 답변 일부
 *   link: string,          // 지식iN 페이지 URL
 *   query: string,         // 사용한 검색어
 *   collected_at: string,  // ISO timestamp
 *   sort: 'date' | 'sim',
 *   rank: number,          // 응답 내 순위
 * }} KinItem
 */

function stripHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]+>/g, '').trim();
}

/**
 * 네이버 응답 item을 정규화.
 */
function normalizeItem(rawItem, query, sort, rank) {
  return {
    title: stripHtml(rawItem.title ?? ''),
    description: stripHtml(rawItem.description ?? ''),
    link: rawItem.link ?? '',
    query,
    collected_at: new Date().toISOString(),
    sort,
    rank,
  };
}

/**
 * 단일 키워드로 검색 (mock 또는 real).
 *
 * @param {string} query 검색어
 * @param {{ display?: number, sort?: 'sim'|'date', mock?: boolean }} opts
 * @returns {Promise<KinItem[]>}
 */
export async function searchKin(query, opts = {}) {
  const display = Math.min(Math.max(opts.display ?? 20, 1), 100);
  const sort = opts.sort ?? 'date';
  const mock = opts.mock !== false;

  if (mock) {
    return loadKinFixture(query, { sort, display });
  }

  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다 (또는 mock=true)');
  }

  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': id,
      'X-Naver-Client-Secret': secret,
    },
  });
  if (!res.ok) {
    throw new Error(`Naver kin API error: HTTP ${res.status}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((it, i) => normalizeItem(it, query, sort, i + 1));
}

/**
 * fixture에서 응답 로드. 누락 시 빈 배열 + warning.
 */
export function loadKinFixture(query, { sort = 'date' } = {}) {
  const safeQuery = query.replace(/[^\p{Letter}\p{Number}-]/gu, '_').slice(0, 60);
  const path = resolve(FIXTURE_DIR, `${safeQuery}.${sort}.json`);
  if (!existsSync(path)) {
    if (process.env.MOCK_NAVER_KIN_VERBOSE === '1') {
      console.warn(`[mock-kin] fixture not found: ${path}`);
    }
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    const items = Array.isArray(raw?.items) ? raw.items : [];
    return items.map((it, i) => normalizeItem(it, query, sort, i + 1));
  } catch {
    return [];
  }
}

/**
 * 다중 키워드 풀 동시 검색. cluster별 일일 수집용.
 * 결과는 link 기준 dedup.
 */
export async function searchKinBulk(queries, opts = {}) {
  const all = await Promise.allSettled(queries.map((q) => searchKin(q, opts)));
  const results = all.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  // link 기준 dedup
  const seen = new Set();
  const unique = [];
  for (const item of results) {
    if (!item.link) continue;
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    unique.push(item);
  }
  return unique;
}

/**
 * 답변 부족 시그널 추출 (niche.source_signal 매핑용).
 *
 * @param {KinItem} item
 * @returns {{ description_length: number, unmet_market_score: 0|1|2|3 }}
 */
export function extractSourceSignal(item) {
  const len = item.description?.length ?? 0;
  // unmet_market_score (0~3): 짧은 description일수록 답변 부족 시그널
  let score = 0;
  if (len < 100) score = 1;
  if (len < 50) score = 2;
  if (len < 20) score = 3;
  return {
    description_length: len,
    answer_count: 0,            // 검색 API는 답변 수 미제공 (link fetch는 ToS 회색)
    repeat_count: 0,            // 누적 통계는 별도 (V2)
    unmet_market_score: score,
  };
}
