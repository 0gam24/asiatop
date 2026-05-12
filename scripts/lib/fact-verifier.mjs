/**
 * fact-verifier (G4) — 본문 사실 토큰을 권위 소스에 1:1 매칭
 *
 * Step A: 본문 토큰 추출 (fact-extract.mjs)
 * Step B: brief.primary_sources[*].expected_facts + 권위 API 응답에서 토큰 추출
 * Step C: 매칭 (fact-match.mjs)
 * Step D: approximate 분류
 * Step E: 결과 집계 + frontmatter inject 데이터 생성
 *
 * 임계값 (R56 정책 완화):
 *   - 환경변수 FACT_VERIFY_MIN_MATCH_RATE (default 0.7 — 70%)
 *   - 본문 토큰의 N% 이상이 권위 풀과 매칭되면 통과
 *   - 정부 API 응답은 LLM 본문 토큰의 부분집합 (모든 사실을 못 가짐) → 100% 강제는 발행 0편 결과
 *   - 매칭 안 된 토큰 (unmatched) 은 LLM 이 본문에 출처 인라인 명시 ("국세청 2025") 로 처리
 *
 * MOCK_AUTHORITY=1 시 authority-sources/index.mjs 가 fixture 반환.
 */
import { extractFactTokens, extractFactsFromObject } from './fact-extract.mjs';
import { classifyTokens } from './fact-match.mjs';
import { stripFrontmatter } from './mdx-utils.mjs';

/**
 * brief.primary_sources[*].expected_facts (자유 텍스트)에서 토큰 추출.
 */
function extractBriefTokens(brief) {
  if (!brief?.primary_sources) return [];
  const out = [];
  for (const src of brief.primary_sources) {
    const facts = Array.isArray(src.expected_facts) ? src.expected_facts : [];
    const joined = facts.join('\n');
    const tokens = extractFactTokens(joined);
    for (const tok of tokens) {
      out.push({
        ...tok,
        source_id: src.id ?? null,
        source_url: src.url ?? null,
        source_title: src.title ?? null,
      });
    }
  }
  return out;
}

/**
 * G4 본체 — 본문 + brief 입력 → pass/fail + 상세 결과.
 *
 * @param {string} mdx Article MDX (frontmatter 포함)
 * @param {object} brief Brief 객체 (validate-brief 통과)
 * @param {object} options { authorityFetch?: (cluster, query) => Promise<{facts}>, mock?: boolean }
 * @returns {Promise<{
 *   pass: boolean,
 *   match_rate: number,
 *   matched: Array,
 *   unmatched: Array,
 *   approximate: Array,
 *   injected_frontmatter: object,
 *   stats: { body_tokens: number, authority_tokens: number, approximate_count: number }
 * }>}
 */
export async function verifyFacts(mdx, brief, options = {}) {
  const body = stripFrontmatter(mdx);
  const bodyTokens = extractFactTokens(body);

  const briefTokens = extractBriefTokens(brief);

  let fetchedTokens = [];
  // R55 진단 — 어댑터 응답 상태를 stats 에 노출. 추출 0건일 때 원인 추적 가능.
  let diagnostic = {
    responses_count: 0,
    with_facts_count: 0,
    with_raw_count: 0,
    raw_total_chars: 0,
    raw_body_total_chars: 0,
    sources_attempted: [],
    fetched_tokens_from_facts: 0,
    fetched_tokens_from_raw: 0,
  };
  if (options.authorityFetch) {
    try {
      const cluster = brief?.meta?.cluster;
      const query = {
        keywords: brief?.keywords?.secondary ?? [],
        expected_facts: brief?.primary_sources?.flatMap((s) => s.expected_facts ?? []) ?? [],
      };
      const responses = await options.authorityFetch(cluster, query, { mock: !!options.mock });
      const all = Array.isArray(responses) ? responses : [responses];
      diagnostic.responses_count = all.length;
      for (const resp of all) {
        if (!resp) continue;
        diagnostic.sources_attempted.push(resp.source_id ?? 'unknown');
        // R55 — facts(어댑터 메타) + raw(원본 응답) 둘 다 처리.
        const sourceMeta = { source_url: resp.source_url, source_id: resp.source_id };
        if (Array.isArray(resp.facts) && resp.facts.length > 0) {
          diagnostic.with_facts_count++;
          const before = fetchedTokens.length;
          fetchedTokens.push(...resp.facts.map((f) => ({ ...f, ...sourceMeta })));
          diagnostic.fetched_tokens_from_facts += fetchedTokens.length - before;
        }
        if (resp.raw) {
          diagnostic.with_raw_count++;
          const rawStr = typeof resp.raw === 'string' ? resp.raw : JSON.stringify(resp.raw);
          diagnostic.raw_total_chars += rawStr.length;
          // raw.body (R54-4 law-go-kr 본문 추가) 별도 추적
          if (typeof resp.raw?.body === 'string') {
            diagnostic.raw_body_total_chars += resp.raw.body.length;
          }
          const before = fetchedTokens.length;
          fetchedTokens.push(...extractFactsFromObject(resp.raw, sourceMeta));
          diagnostic.fetched_tokens_from_raw += fetchedTokens.length - before;
        }
      }
    } catch (e) {
      // authority fetch 실패는 pass=false 사유로 처리
      return {
        pass: false,
        match_rate: 0,
        matched: [],
        unmatched: bodyTokens.map((t) => ({ token: t, reason: 'authority-fetch-failed' })),
        approximate: [],
        injected_frontmatter: { sources_verified: false, fact_verification_at: new Date().toISOString() },
        stats: { body_tokens: bodyTokens.length, authority_tokens: 0, approximate_count: 0, error: String(e?.message ?? e) },
      };
    }
  }

  const authorityPool = [...briefTokens, ...fetchedTokens];
  const { matched, unmatched, approximate } = classifyTokens(bodyTokens, authorityPool);

  const denom = matched.length + unmatched.length;
  const match_rate = denom === 0 ? 1 : matched.length / denom;
  // R56 — 임계 완화. 환경변수 FACT_VERIFY_MIN_MATCH_RATE 우선 (0.0~1.0).
  // default 0.7 (본문 토큰의 70% 이상 매칭 시 통과).
  // denom === 0 이면 본문에 사실 토큰 없음 → pass 처리 (예: 의견·해설 글).
  const minRateRaw = process.env.FACT_VERIFY_MIN_MATCH_RATE;
  const minRate = (() => {
    const n = Number(minRateRaw);
    if (!Number.isFinite(n)) return 0.7;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  })();
  const pass = denom === 0 || match_rate >= minRate;

  return {
    pass,
    match_rate: Number(match_rate.toFixed(4)),
    matched,
    unmatched,
    approximate,
    injected_frontmatter: {
      sources_verified: pass,
      verified_facts_count: matched.length,
      approximate_facts_count: approximate.length,
      fact_verification_at: new Date().toISOString(),
    },
    stats: {
      body_tokens: bodyTokens.length,
      authority_tokens: authorityPool.length,
      approximate_count: approximate.length,
      // R55 진단 — G4 fail 시 어디서 토큰 추출이 멈췄는지 추적
      ...(diagnostic ? { diagnostic } : {}),
    },
  };
}

/**
 * G4 결과를 audit log 형식으로 직렬화 (briefs/_pool/_rejected/<date>/<hash>.yaml 작성용).
 */
export function summarizeForAudit(result) {
  return {
    pass: result.pass,
    match_rate: result.match_rate,
    body_tokens: result.stats.body_tokens,
    authority_tokens: result.stats.authority_tokens,
    unmatched: result.unmatched.slice(0, 10).map(({ token, reason }) => ({
      type: token.type,
      raw: token.raw,
      normalized: token.normalized,
      line: token.line,
      reason,
    })),
    approximate_count: result.stats.approximate_count,
  };
}
