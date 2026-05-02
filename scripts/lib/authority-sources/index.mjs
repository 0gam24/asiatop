/**
 * 권위 소스 디스패처
 *
 * 흐름:
 *   1. cluster slug → 1차+2차 어댑터 모듈 routing
 *   2. 각 어댑터의 fetchFacts(query)를 Promise.all로 병렬 실행
 *   3. 응답을 통합해 반환 (fact-verifier가 토큰화)
 *
 * 환경:
 *   MOCK_AUTHORITY=1 (default in CI/local) → tests/fixtures/authority-mock/{cluster}/{hash}.json
 *   MOCK_AUTHORITY=0 (production cron) → 실 API 호출
 *
 * 어댑터 인터페이스:
 *   {
 *     id: string,                              // 'data-go-kr', 'bok-ecos' ...
 *     fetchFacts(query, opts): Promise<{
 *       source_id, source_url, retrieved_at, raw, facts?, confidence
 *     }>
 *   }
 */
import * as dataGoKr from './data-go-kr.mjs';
import * as bokEcos from './bok-ecos.mjs';
import * as lawGoKr from './law-go-kr.mjs';
import * as fssFinlife from './fss-finlife.mjs';
import * as work24 from './work24.mjs';
import * as nps from './nps.mjs';
import * as welfareGoKr from './welfare-go-kr.mjs';

const ROUTING = Object.freeze({
  'gov-support': [dataGoKr, welfareGoKr],
  'tax': [lawGoKr],                         // 국세청은 PDF cache 별도 (V2)
  'realestate': [dataGoKr],                 // 청약홈·HUG는 PDF·정적 fetch (V2)
  'unemployment': [work24, lawGoKr],
  'savings': [bokEcos, fssFinlife],
  'insurance-labor': [lawGoKr],             // 건보공단 정적 (V2)
  'auto': [fssFinlife],                     // 위택스·KNIA (V2)
  'public-services': [dataGoKr],
  'office-tips': [lawGoKr],
  'credit-loan': [fssFinlife],
  'insurance-personal': [fssFinlife],
  'pension': [nps],
});

/**
 * cluster slug에 매핑된 어댑터 모듈 배열 반환.
 */
export function routeByCluster(cluster) {
  return ROUTING[cluster] ?? [];
}

/**
 * cluster의 모든 어댑터를 병렬 호출 → 응답 배열 반환.
 *
 * @param {string} cluster cluster slug
 * @param {{ keywords: string[], expected_facts: string[] }} query
 * @param {{ mock?: boolean, signal?: AbortSignal }} opts
 * @returns {Promise<Array<{source_id, source_url, retrieved_at, raw, facts, confidence}>>}
 */
export async function fetchAllForCluster(cluster, query, opts = {}) {
  const adapters = routeByCluster(cluster);
  if (adapters.length === 0) return [];

  const mock = opts.mock !== undefined ? opts.mock : process.env.MOCK_AUTHORITY !== '0';

  const results = await Promise.allSettled(
    adapters.map((adapter) =>
      adapter.fetchFacts(query, { mock, signal: opts.signal }),
    ),
  );

  return results
    .map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      // 실패 시 null로 반환 (fact-verifier에서 분기)
      return { source_id: adapters[i].id ?? `adapter-${i}`, error: String(r.reason?.message ?? r.reason), facts: [], raw: null };
    })
    .filter(Boolean);
}

/**
 * 어댑터가 mock fixture를 로드할 때 호출하는 공용 헬퍼.
 * 어댑터에서 import해서 재사용.
 */
export { loadMockFixture } from './_mock-loader.mjs';
