/**
 * fact-verifier (G4) — 본문 사실 토큰을 권위 소스에 1:1 매칭
 *
 * Step A: 본문 토큰 추출 (fact-extract.mjs)
 * Step B: brief.primary_sources[*].expected_facts + 권위 API 응답에서 토큰 추출
 * Step C: 매칭 (fact-match.mjs)
 * Step D: approximate 분류
 * Step E: 결과 집계 + frontmatter inject 데이터 생성
 *
 * 임계값: 매칭률 100% 미만 = pass=false (재시도 X, 폐기)
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
  if (options.authorityFetch) {
    try {
      const cluster = brief?.meta?.cluster;
      const query = {
        keywords: brief?.keywords?.secondary ?? [],
        expected_facts: brief?.primary_sources?.flatMap((s) => s.expected_facts ?? []) ?? [],
      };
      const responses = await options.authorityFetch(cluster, query, { mock: !!options.mock });
      const all = Array.isArray(responses) ? responses : [responses];
      for (const resp of all) {
        if (!resp) continue;
        // R55 — facts(어댑터 메타) + raw(원본 응답) 둘 다 처리.
        // 이전 `else if` 는 어댑터가 facts 반환 시 raw 무시 → R54-4 의 law-go-kr raw.body
        // (lawService.do 조문 본문) 활용 불가. classifyTokens 가 fact-extract 표준 형식
        // ({ type:'law'|'amount'|..., normalized }) 만 매칭하므로 어댑터 facts (type:'law-metadata')
        // 는 사실상 매칭 안 됨. raw 에서 extractFactsFromObject 가 leaf string 정규식 매칭으로
        // 진짜 토큰 추출.
        const sourceMeta = { source_url: resp.source_url, source_id: resp.source_id };
        if (Array.isArray(resp.facts)) {
          fetchedTokens.push(...resp.facts.map((f) => ({ ...f, ...sourceMeta })));
        }
        if (resp.raw) {
          fetchedTokens.push(...extractFactsFromObject(resp.raw, sourceMeta));
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
  const pass = unmatched.length === 0;

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
