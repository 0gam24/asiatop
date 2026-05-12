/**
 * data-go-kr 어댑터 — gov-support, public-services, realestate (1차)
 *
 * V2 real fetch (R53 #7) — 온통청년 OpenAPI (youthcenter.go.kr):
 *   getPlcy — 청년정책 list 조회 (정책명·기관·자격·신청기간).
 *   URL: https://www.youthcenter.go.kr/go/ythip/getPlcy
 *         ?apiKeyNm=<KEY>&pageNum=1&pageSize=10&rtnType=json
 *
 * 응답: { result: { pagging: {...}, youthPolicyList: [{ plcyNm, plcyKywdNm, ... }] } }
 *
 * 인증: YOUTH_CENTER_API_KEY (youthcenter.go.kr 자체 OpenAPI, data.go.kr 아님).
 * 비용: 무료. Rate-limit: 일 1,000건 (운영 키 10,000건).
 *
 * 어댑터 id 는 'data-go-kr' 유지 — 향후 진짜 data.go.kr API 통합 시 endpoint 추가 예정.
 *
 * MOCK_AUTHORITY=1 (default) → fixture.
 * MOCK_AUTHORITY=0 + YOUTH_CENTER_API_KEY → real fetch.
 * 키 미설정 시 mock fallback + warn.
 */

import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'data-go-kr';

const ENDPOINT = 'https://www.youthcenter.go.kr/go/ythip/getPlcy';
const TIMEOUT_MS = 12_000;

function buildUrl(key, keyword) {
  const u = new URL(ENDPOINT);
  u.searchParams.set('apiKeyNm', key);
  u.searchParams.set('pageNum', '1');
  u.searchParams.set('pageSize', '10');
  u.searchParams.set('rtnType', 'json');
  if (keyword) u.searchParams.set('srchKywd', keyword);
  return u.toString();
}

function mergeSignals(a, b) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.any) {
    return AbortSignal.any([a, b]);
  }
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return ac.signal;
}

async function fetchJson(url, opts = {}) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), opts.timeout ?? TIMEOUT_MS);
  const signal = opts.signal ? mergeSignals(opts.signal, ac.signal) : ac.signal;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(tid);
  }
}

function extractPolicies(json) {
  // 응답 형태: { result: { youthPolicyList: [...] } } 또는 { resultCode, result: [...] }
  const root = json?.result ?? json;
  if (Array.isArray(root)) return root;
  const list = root?.youthPolicyList ?? root?.list ?? [];
  return Array.isArray(list) ? list : [];
}

function policyToFact(p) {
  return {
    key: p?.plcyNm ?? p?.polyBizSjnm ?? 'unknown',
    value: p?.sprvsnInstCdNm ?? p?.cnsgNmor ?? null,
    type: 'youth-policy',
    citation: 'https://www.youthcenter.go.kr',
    raw: {
      title: p?.plcyNm ?? p?.polyBizSjnm,
      department: p?.sprvsnInstCdNm,
      target: p?.sporTrgtMaxAge ?? p?.ageInfo,
      keywords: p?.plcyKywdNm,
      applyPeriod: p?.bizPrdEtcCn ?? p?.rqutPrdCn,
    },
  };
}

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.data.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }

  const key = process.env.YOUTH_CENTER_API_KEY;
  if (!key) {
    if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
      console.warn('[data-go-kr] YOUTH_CENTER_API_KEY 미설정 — mock fallback');
    }
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.data.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 0.5 : 0,
      _warning: 'YOUTH_CENTER_API_KEY not set, returned mock fallback',
    };
  }

  const keyword =
    (Array.isArray(query?.keywords) && query.keywords[0]) ||
    (Array.isArray(query?.expected_facts) && query.expected_facts[0]) ||
    null;

  try {
    const url = buildUrl(key, keyword);
    const json = await fetchJson(url, { signal: opts.signal, timeout: opts.timeout });
    const policies = extractPolicies(json).slice(0, 10);
    const facts = policies.map(policyToFact);
    return {
      source_id: id,
      source_url: 'https://www.youthcenter.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: { keyword, count: policies.length },
      facts,
      confidence: facts.length > 0 ? Math.min(1, 0.5 + facts.length * 0.08) : 0,
    };
  } catch (err) {
    return {
      source_id: id,
      source_url: 'https://www.youthcenter.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: null,
      facts: [],
      confidence: 0,
      _error: String(err?.message ?? err),
    };
  }
}
