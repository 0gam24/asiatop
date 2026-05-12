/**
 * fss-finlife 어댑터 — savings, credit-loan, insurance-personal, auto
 *
 * V2 real fetch (R53 #7):
 *   depositProductsSearch — 은행 정기예금 상품 비교공시.
 *   URL: https://finlife.fss.or.kr/finlifeapi/depositProductsSearch.json
 *         ?auth=<KEY>&topFinGrpNo=020000&pageNo=1
 *   topFinGrpNo:
 *     020000 = 은행 (기본)
 *     030200 = 상호저축은행
 *     040000 = 금융투자
 *     050000 = 보험
 *     060000 = 여신전문
 *
 * 응답: { result: { total_count, baseList: [...], optionList: [...] } }
 *
 * 인증: FSS_KEY (finlife.fss.or.kr 회원가입 → OpenAPI 인증키 신청, 즉시 발급).
 * 비용: 무료. Rate-limit: 일 10,000건.
 *
 * MOCK_AUTHORITY=1 (default) → fixture.
 * MOCK_AUTHORITY=0 + FSS_KEY → real fetch.
 * FSS_KEY 미설정 시 mock fallback + warn.
 */

import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'fss-finlife';

const ENDPOINT = 'https://finlife.fss.or.kr/finlifeapi/depositProductsSearch.json';
const TIMEOUT_MS = 12_000;
const DEFAULT_FIN_GRP = '020000'; // 은행

function buildUrl(key, topFinGrpNo) {
  const u = new URL(ENDPOINT);
  u.searchParams.set('auth', key);
  u.searchParams.set('topFinGrpNo', topFinGrpNo);
  u.searchParams.set('pageNo', '1');
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

function extractBaseList(json) {
  const result = json?.result;
  if (!result) throw new Error('FSS API: missing result');
  if (result.err_cd && result.err_cd !== '000') {
    throw new Error(`FSS API: ${result.err_cd} ${result.err_msg ?? ''}`);
  }
  return Array.isArray(result.baseList) ? result.baseList : [];
}

function productMatchesKeyword(product, keyword) {
  if (!keyword) return false;
  const co = product?.kor_co_nm ?? '';
  const prd = product?.fin_prdt_nm ?? '';
  const note = product?.etc_note ?? '';
  return co.includes(keyword) || prd.includes(keyword) || note.includes(keyword);
}

function productToFact(p) {
  return {
    key: p?.fin_prdt_nm ?? 'unknown',
    value: p?.kor_co_nm ?? null,
    type: 'fss-deposit-product',
    citation: 'https://finlife.fss.or.kr',
    raw: {
      bank: p?.kor_co_nm,
      product: p?.fin_prdt_nm,
      dcls_month: p?.dcls_month,
      mtrt_int: p?.mtrt_int, // 만기 후 이자율
      join_way: p?.join_way,
    },
  };
}

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://finlife.fss.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }

  const key = process.env.FSS_KEY;
  if (!key) {
    if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
      console.warn('[fss-finlife] FSS_KEY 미설정 — mock fallback');
    }
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://finlife.fss.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 0.5 : 0,
      _warning: 'FSS_KEY not set, returned mock fallback',
    };
  }

  try {
    const url = buildUrl(key, DEFAULT_FIN_GRP);
    const json = await fetchJson(url, { signal: opts.signal, timeout: opts.timeout });
    const products = extractBaseList(json);

    const keywords = (Array.isArray(query?.keywords) ? query.keywords : []).filter(Boolean);

    let matched = [];
    if (keywords.length > 0) {
      matched = products.filter((p) => keywords.some((k) => productMatchesKeyword(p, k)));
    }
    if (matched.length === 0) {
      matched = products.slice(0, 5);
    } else {
      matched = matched.slice(0, 10);
    }

    const facts = matched.map(productToFact);
    // R55-2 — fact-verifier 가 매칭할 수 있는 text 본문 추가.
    // 은행명·상품명·만기이자율·가입 채널 자유 텍스트 합본 → 한국어 정규식 매칭 가능.
    const text = matched.map((p) => {
      const co = p?.kor_co_nm ?? '';
      const prd = p?.fin_prdt_nm ?? '';
      const mtrt = p?.mtrt_int ?? '';
      const join = p?.join_way ?? '';
      const note = p?.etc_note ?? '';
      return `${co} ${prd} (만기이자율 ${mtrt}, 가입 ${join}) ${note}`;
    }).join('\n');
    return {
      source_id: id,
      source_url: 'https://finlife.fss.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: { totalCount: products.length, matchedCount: matched.length, keywords, text },
      facts,
      confidence: facts.length > 0 ? Math.min(1, 0.4 + facts.length * 0.1) : 0,
    };
  } catch (err) {
    return {
      source_id: id,
      source_url: 'https://finlife.fss.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: null,
      facts: [],
      confidence: 0,
      _error: String(err?.message ?? err),
    };
  }
}
