/**
 * G3 — 권위 소스 가용성 게이트 (Pre-LLM)
 *
 * cluster에 매핑된 1차 권위 소스 어댑터를 호출 → 응답이 의미있는 데이터를 반환하는지 검증.
 * 반환 0건 = 폐기 (LLM 호출 비용 0).
 *
 * 차단 사유:
 *   g3-no-adapter      — cluster 매핑된 어댑터 0개
 *   g3-empty-response  — 모든 어댑터 응답이 raw=null·facts=[]
 *   g3-fetch-error     — Promise.allSettled 모두 rejected
 *
 * MOCK_AUTHORITY=1 시 fixture 응답 사용. fixture 없으면 __missing__ → empty 처리.
 */
import { fetchAllForCluster, routeByCluster } from '../lib/authority-sources/index.mjs';

/**
 * @param {string} cluster cluster slug (G2 통과 결과)
 * @param {{ keywords: string[], expected_facts: string[] }} query
 * @param {{ mock?: boolean }} opts
 * @returns {Promise<{
 *   pass: boolean,
 *   reasons: string[],
 *   responses: Array,
 *   meta: { adapter_count: number, non_empty_count: number }
 * }>}
 */
export async function probeAuthoritySources(cluster, query, opts = {}) {
  const adapters = routeByCluster(cluster);
  if (adapters.length === 0) {
    return {
      pass: false,
      reasons: ['g3-no-adapter'],
      responses: [],
      meta: { adapter_count: 0, non_empty_count: 0 },
    };
  }

  let responses = [];
  try {
    responses = await fetchAllForCluster(cluster, query, opts);
  } catch (e) {
    return {
      pass: false,
      reasons: [`g3-fetch-error:${e?.message ?? e}`],
      responses: [],
      meta: { adapter_count: adapters.length, non_empty_count: 0 },
    };
  }

  const nonEmpty = responses.filter((r) => {
    if (!r) return false;
    if (r.error) return false;
    if (r.raw && Object.keys(r.raw).length > 0) return true;
    if (Array.isArray(r.facts) && r.facts.length > 0) return true;
    return false;
  });

  if (nonEmpty.length === 0) {
    return {
      pass: false,
      reasons: ['g3-empty-response'],
      responses,
      meta: { adapter_count: adapters.length, non_empty_count: 0 },
    };
  }

  return {
    pass: true,
    reasons: [],
    responses,
    meta: { adapter_count: adapters.length, non_empty_count: nonEmpty.length },
  };
}
