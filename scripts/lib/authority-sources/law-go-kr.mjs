/**
 * law-go-kr 어댑터 — tax, insurance-labor, office-tips, unemployment (법령)
 *
 * V2 real fetch (R53 #5):
 *   1. lawSearch.do — 키워드 검색으로 법령 목록 + MST(일련번호) 획득
 *      https://www.law.go.kr/DRF/lawSearch.do?OC=<OC>&target=law&type=JSON&query=<keyword>
 *   2. (선택) lawService.do — MST 로 본문·시행일 메타 획득
 *      https://www.law.go.kr/DRF/lawService.do?OC=<OC>&target=law&type=JSON&MST=<MST>
 *
 * 인증: OC = LAW_GO_KR_OC (가입 이메일 @ 앞부분). 별도 발급 X.
 * 비용: 무료 / rate-limit 30 req/s.
 *
 * MOCK_AUTHORITY=1 (default) → fixture 반환 (네트워크 호출 X).
 * MOCK_AUTHORITY=0 + LAW_GO_KR_OC 설정 시 real fetch.
 * OC 미설정 시 mock fallback + warn.
 */

import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'law-go-kr';

const SEARCH_ENDPOINT = 'https://www.law.go.kr/DRF/lawSearch.do';
const SERVICE_ENDPOINT = 'https://www.law.go.kr/DRF/lawService.do';
const TIMEOUT_MS = 12_000;
const MAX_RESULTS = 5;

function buildSearchUrl(oc, keyword) {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('OC', oc);
  url.searchParams.set('target', 'law');
  url.searchParams.set('type', 'JSON');
  url.searchParams.set('query', keyword);
  url.searchParams.set('display', String(MAX_RESULTS));
  url.searchParams.set('sort', 'efdes'); // 시행일 내림차순 — 가장 최근 법령 우선
  return url.toString();
}

function buildServiceUrl(oc, mst) {
  const url = new URL(SERVICE_ENDPOINT);
  url.searchParams.set('OC', oc);
  url.searchParams.set('target', 'law');
  url.searchParams.set('type', 'JSON');
  url.searchParams.set('MST', String(mst));
  return url.toString();
}

async function fetchJson(url, opts = {}) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), opts.timeout ?? TIMEOUT_MS);
  const signal = opts.signal
    ? mergeSignals(opts.signal, ac.signal)
    : ac.signal;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // API 가 type=JSON 인데도 XML 로 응답하는 케이스 방어
    if (text.trim().startsWith('<')) {
      throw new Error('non-JSON response (got XML?)');
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(tid);
  }
}

function mergeSignals(a, b) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.any) {
    return AbortSignal.any([a, b]);
  }
  // Fallback — Node 18 호환: 한쪽 abort 시 다른 쪽도 abort
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return ac.signal;
}

/**
 * lawSearch 응답에서 LawSearch 배열 추출.
 * 응답 형태: { LawSearch: { law: [...] | {...} } } 또는 다양한 변형.
 * 단일 객체로 오는 경우(결과 1건) 도 배열로 정규화.
 */
function extractLaws(searchJson) {
  const root = searchJson?.LawSearch ?? searchJson?.lawSearch ?? searchJson;
  const raw = root?.law ?? root?.Law ?? [];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function lawToFact(law) {
  // law: { 법령명한글, 법령ID, 시행일자, 공포일자, 법령상세링크 ... }
  const name = law?.법령명한글 ?? law?.LawNameHangul ?? law?.lawName ?? null;
  const id = law?.법령ID ?? law?.LawID ?? law?.MST ?? null;
  const efDate = law?.시행일자 ?? law?.EffectiveDate ?? null;
  const promDate = law?.공포일자 ?? law?.PromulgationDate ?? null;
  const link = law?.법령상세링크 ?? law?.LawDetailLink ?? null;
  return {
    key: name ?? `law-${id}`,
    value: efDate ?? promDate ?? null,
    type: 'law-metadata',
    citation: link ? `https://www.law.go.kr${link}` : 'https://www.law.go.kr',
    raw: { id, name, efDate, promDate },
  };
}

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }

  const oc = process.env.LAW_GO_KR_OC;
  if (!oc) {
    // 실 fetch 모드인데 OC 미설정 → mock fallback + warn (G3 source-probe 가 후속 처리)
    if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
      console.warn('[law-go-kr] LAW_GO_KR_OC 미설정 — mock fallback');
    }
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 0.5 : 0, // mock fallback 은 0.5 (실 API 미달)
      _warning: 'LAW_GO_KR_OC not set, returned mock fallback',
    };
  }

  // query.keywords 의 첫 번째 키워드로 검색.
  // 빈 keywords 면 expected_facts 의 첫 번째라도 사용.
  const keyword =
    (Array.isArray(query?.keywords) && query.keywords[0]) ||
    (Array.isArray(query?.expected_facts) && query.expected_facts[0]) ||
    null;
  if (!keyword) {
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: null,
      facts: [],
      confidence: 0,
      _warning: 'no keyword in query',
    };
  }

  try {
    const url = buildSearchUrl(oc, keyword);
    const searchJson = await fetchJson(url, { signal: opts.signal, timeout: opts.timeout });
    const laws = extractLaws(searchJson).slice(0, MAX_RESULTS);
    const facts = laws.map(lawToFact).filter((f) => f.key);

    // R54-4 — G4 fact-verifier 가 본문 토큰 (금액·일자·조항) 을 매칭하려면
    // 메타데이터 외 법령 본문 텍스트도 raw 에 포함해야 함. 첫 결과 1건만 본문 fetch
    // (rate-limit·timeout 위험 최소화). 실패 시 메타만 반환.
    let bodyExcerpt = null;
    if (laws.length > 0) {
      const firstMst = laws[0]?.법령ID ?? laws[0]?.LawID ?? laws[0]?.MST;
      if (firstMst) {
        try {
          const bodyJson = await fetchJson(
            buildServiceUrl(oc, firstMst),
            { signal: opts.signal, timeout: opts.timeout },
          );
          // 응답에서 텍스트 추출 — 조문 본문이 다양한 키 (조문내용·조문 등) 에 들어옴.
          // 안전하게 JSON.stringify 후 토큰 매칭 (fact-extract 의 정규식이 작동).
          bodyExcerpt = JSON.stringify(bodyJson).slice(0, 20_000);
        } catch {
          // 본문 fetch 실패는 hard fail 아님 — 메타만으로 진행
        }
      }
    }

    // R63 — laws 배열 자체 raw 에 포함. 모든 law 객체의 leaf string (법령명·시행일·공포일)
    // 정규식 매칭으로 토큰 추출 가능. tax·insurance-labor·office-tips·unemployment·pension
    // cluster 매칭률 향상 기대 (R62 의 savings 패턴 응용).
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: {
        keyword,
        count: laws.length,
        body: bodyExcerpt,
        laws: laws.slice(0, 10), // lawSearch 상위 10건 메타 객체
      },
      facts,
      confidence: facts.length > 0 ? Math.min(1, 0.5 + facts.length * 0.1) : 0,
    };
  } catch (err) {
    // 네트워크·파싱 실패 시 confidence 0 으로 반환 (예외로 전체 파이프라인 죽이지 않음).
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: null,
      facts: [],
      confidence: 0,
      _error: String(err?.message ?? err),
    };
  }
}

// (선택) 본문 조회 — 향후 fact-verifier 가 조문 토큰 매칭 시 사용.
// 본 PR 에서는 export 만 + 호출은 안 함 (회귀 위험 최소화).
export async function fetchLawBody(mst, opts = {}) {
  const oc = process.env.LAW_GO_KR_OC;
  if (!oc) throw new Error('LAW_GO_KR_OC not set');
  if (!mst) throw new Error('MST required');
  const url = buildServiceUrl(oc, mst);
  return fetchJson(url, opts);
}
