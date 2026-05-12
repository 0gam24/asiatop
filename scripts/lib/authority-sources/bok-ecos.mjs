/**
 * bok-ecos 어댑터 — savings, credit-loan (한국은행 ECOS 통계)
 *
 * V2 real fetch (R53 #6):
 *   KeyStatisticList — 한국은행 주요 통계 100선 (기준금리·예금금리·환율·소비자물가지수 등).
 *   URL: https://ecos.bok.or.kr/api/KeyStatisticList/<KEY>/json/kr/1/100
 *   응답: { KeyStatisticList: { row: [{ KEYSTAT_NAME, DATA_VALUE, UNIT_NAME, CYCLE, CLASS_NAME }, ...] } }
 *
 * 키워드 매칭: query.keywords 와 KEYSTAT_NAME 부분 매칭 → 매치된 통계 반환.
 *
 * 인증: BOK_API_KEY (ecos.bok.or.kr/api 회원가입 즉시 발급, 일 10,000건).
 * 비용: 무료. Rate-limit 명시 없으나 분당 60건 권장.
 *
 * MOCK_AUTHORITY=1 (default) → fixture 반환.
 * MOCK_AUTHORITY=0 + BOK_API_KEY → real fetch.
 * BOK_API_KEY 미설정 시 mock fallback + warn.
 */

import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'bok-ecos';

const TIMEOUT_MS = 12_000;

function buildKeyStatUrl(key) {
  return `https://ecos.bok.or.kr/api/KeyStatisticList/${encodeURIComponent(key)}/json/kr/1/100`;
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

function extractRows(json) {
  // ECOS 표준: { KeyStatisticList: { list_total_count, row } }
  // 오류 시: { RESULT: { CODE, MESSAGE } }
  const result = json?.RESULT;
  if (result && result.CODE && result.CODE !== 'INFO-000' && result.CODE !== '000') {
    throw new Error(`ECOS API: ${result.CODE} ${result.MESSAGE ?? ''}`);
  }
  const list = json?.KeyStatisticList ?? json?.keyStatisticList ?? json;
  const rows = list?.row ?? list?.Row ?? [];
  return Array.isArray(rows) ? rows : [];
}

function rowMatchesKeyword(row, keyword) {
  if (!keyword) return false;
  const name = row?.KEYSTAT_NAME ?? row?.STAT_NAME ?? '';
  const klass = row?.CLASS_NAME ?? '';
  return name.includes(keyword) || klass.includes(keyword);
}

function rowToFact(row) {
  return {
    key: row?.KEYSTAT_NAME ?? row?.STAT_NAME ?? 'unknown',
    value: row?.DATA_VALUE ?? null,
    unit: row?.UNIT_NAME ?? null,
    cycle: row?.CYCLE ?? null,
    type: 'bok-key-statistic',
    citation: 'https://ecos.bok.or.kr',
  };
}

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://ecos.bok.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }

  const key = process.env.BOK_API_KEY;
  if (!key) {
    if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
      console.warn('[bok-ecos] BOK_API_KEY 미설정 — mock fallback');
    }
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://ecos.bok.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 0.5 : 0,
      _warning: 'BOK_API_KEY not set, returned mock fallback',
    };
  }

  try {
    const url = buildKeyStatUrl(key);
    const json = await fetchJson(url, { signal: opts.signal, timeout: opts.timeout });
    const rows = extractRows(json);

    const keywords = (Array.isArray(query?.keywords) ? query.keywords : []).filter(Boolean);

    // 키워드 매칭 (부분 일치). 없으면 상위 5개 fallback.
    let matched = [];
    if (keywords.length > 0) {
      matched = rows.filter((r) => keywords.some((k) => rowMatchesKeyword(r, k)));
    }
    if (matched.length === 0) {
      matched = rows.slice(0, 5);
    } else {
      matched = matched.slice(0, 10);
    }

    const facts = matched.map(rowToFact);
    // R55-2 — fact-verifier 가 매칭할 수 있는 text 본문을 raw 에 포함.
    // KEYSTAT_NAME + DATA_VALUE + UNIT_NAME + CYCLE 을 자유 텍스트로 합본 →
    // extractFactsFromObject 정규식이 한국어 통계명·% 값 토큰 추출 가능.
    const text = matched.map((r) => {
      const name = r?.KEYSTAT_NAME ?? r?.STAT_NAME ?? '';
      const value = r?.DATA_VALUE ?? '';
      const unit = r?.UNIT_NAME ?? '';
      const cycle = r?.CYCLE ?? '';
      return `${name}: ${value}${unit} (${cycle})`;
    }).join('\n');
    return {
      source_id: id,
      source_url: 'https://ecos.bok.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: { totalCount: rows.length, matchedCount: matched.length, keywords, text },
      facts,
      confidence: facts.length > 0 ? Math.min(1, 0.4 + facts.length * 0.1) : 0,
    };
  } catch (err) {
    return {
      source_id: id,
      source_url: 'https://ecos.bok.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: null,
      facts: [],
      confidence: 0,
      _error: String(err?.message ?? err),
    };
  }
}
