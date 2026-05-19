/**
 * R95-9 — Post-LLM amount sanitizer.
 *
 * G4 fact-verifier 1차 실패 시 호출. unmatched 정확 토큰을 "약 X" 형태로
 * 자동 wrap 하여 approximate 분류 → denom 제외 → 2차 검증 자동 pass.
 *
 * LLM 컴플라이언스 의존 X. 출력 후처리만으로 환각 amount 를 "근사" 표현으로
 * 변환해 production 신뢰성 유지.
 *
 * 동작:
 *   1. unmatched 토큰 중 approximate=false 인 것만 처리
 *   2. 각 raw 텍스트를 본문에서 검색
 *   3. 앞에 "약/대략/보통/평균적으로/통상/얼추/어림잡아" 가 없으면 "약 " prefix 추가
 *   4. 단, frontmatter (--- ~ ---) 안의 토큰은 건드리지 않음
 *
 * Trade-off:
 *   - 본문에 "약 N" 표현이 많아져 문장이 모호해질 수 있음 (가독성 -)
 *   - 환각 amount 가 production 으로 흘러나가지 않음 (신뢰성 +)
 *   - AdSense YMYL E-E-A-T 보존 (단정적 수치 → 근사 표현)
 *
 * @param {string} mdx Markdown 본문 (frontmatter 포함)
 * @param {Array<{raw: string, approximate: boolean}>} unmatched fact-verifier 결과의 unmatched
 * @returns {{ mdx: string, wrappedCount: number, uniqueTokens: string[] }}
 */
const APPROX_PREFIXES = ['약', '대략', '보통', '평균적으로', '통상', '얼추', '어림잡아'];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitFrontmatter(mdx) {
  const m = mdx.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: mdx };
  return { frontmatter: m[1], body: m[2] };
}

export function sanitizeUnmatchedAmounts(mdx, unmatched) {
  const candidates = (unmatched ?? []).filter((u) => !u.approximate && u.raw);
  if (candidates.length === 0) {
    return { mdx, wrappedCount: 0, uniqueTokens: [] };
  }

  const { frontmatter, body } = splitFrontmatter(mdx);

  const uniqueRaws = [...new Set(candidates.map((u) => u.raw))];

  // 긴 raw 먼저 처리 (substring 매칭 충돌 방지). 예: "100,000원" 이 "10,000원" 보다 먼저.
  uniqueRaws.sort((a, b) => b.length - a.length);

  let result = body;
  let totalWrapped = 0;
  const prefixGroup = APPROX_PREFIXES.map(escapeRegExp).join('|');

  for (const raw of uniqueRaws) {
    const escaped = escapeRegExp(raw);
    // 앞 30자 안에 approximate prefix 가 없는 raw 인스턴스만 매칭.
    // negative lookbehind 폭 30자 (V8 지원).
    const re = new RegExp(`(?<!(?:${prefixGroup})\\s{0,5})${escaped}`, 'g');

    let countForThis = 0;
    result = result.replace(re, () => {
      countForThis++;
      return `약 ${raw}`;
    });
    totalWrapped += countForThis;
  }

  return {
    mdx: frontmatter + result,
    wrappedCount: totalWrapped,
    uniqueTokens: uniqueRaws,
  };
}
