/**
 * G6 — YMYL 면책 + AI 보조 공시 자동 부착 (Post-LLM)
 *
 * brief.verification.ymyl_disclaimer === true 시 본문 끝에 YMYL 면책 부착.
 * brief.verification.ai_assistance_disclosure === true 시 AI 보조 공시 부착.
 *
 * idempotent: 이미 부착돼있으면 스킵 (재실행 안전).
 *
 * 차단 사유 (이 게이트는 거의 차단 X — 자동 부착 후 검증):
 *   g6-attach-failed  — 부착 후에도 면책·공시 미존재 (코드 버그 시그널)
 *   g6-policy-missing — brief에 ymyl_disclaimer / ai_assistance_disclosure가 false
 */

const YMYL_MARKER = '<!-- ymyl-disclaimer -->';
const AI_MARKER = '<!-- ai-disclosure -->';

function buildYMYLDisclaimer(dataValidAsOf) {
  return `${YMYL_MARKER}
> **고지**: 본 글은 YMYL(돈·건강·법률) 정보로서 일반 정보 제공 목적이며, 개별 사례 자문이 아닙니다. 최신 법령·요율은 출처 사이트에서 직접 확인하세요.${dataValidAsOf ? ` (data 기준일: ${dataValidAsOf})` : ''}`;
}

function buildAIDisclosure() {
  return `${AI_MARKER}
> **AI 보조 공시**: 본 글의 초안은 AI(DeepSeek-V3 + Claude Haiku)의 보조로 작성되었으며, 머니룩 편집팀이 1차 자료 검증·편집·승인 후 발행했습니다.`;
}

function stripFrontmatter(text) {
  if (typeof text !== 'string') return '';
  if (!text.startsWith('---')) return { fm: '', body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { fm: '', body: text };
  return {
    fm: text.slice(0, end + 4),
    body: text.slice(end + 4),
  };
}

/**
 * G6 본체. mdx에 면책·공시 부착 후 검증.
 * @param {string} mdx Article MDX
 * @param {object} brief Brief 객체
 * @returns {{ pass: boolean, reasons: string[], warnings: string[], mdx: string }}
 */
export function attachAndVerifyDisclosures(mdx, brief) {
  const reasons = [];
  const warnings = [];

  const ymylRequired = brief?.verification?.ymyl_disclaimer === true;
  const aiRequired = brief?.verification?.ai_assistance_disclosure === true;

  if (!ymylRequired) warnings.push('g6-policy-missing:ymyl');
  if (!aiRequired) warnings.push('g6-policy-missing:ai');

  const { fm, body } = stripFrontmatter(mdx);
  let newBody = body;

  // YMYL 면책 부착 (없을 때만)
  if (ymylRequired && !newBody.includes(YMYL_MARKER)) {
    const dataValidAsOf = brief?.verification?.data_basis_date;
    newBody = newBody.trimEnd() + '\n\n' + buildYMYLDisclaimer(dataValidAsOf) + '\n';
  }

  // AI 공시 부착
  if (aiRequired && !newBody.includes(AI_MARKER)) {
    newBody = newBody.trimEnd() + '\n\n' + buildAIDisclosure() + '\n';
  }

  // 검증
  if (ymylRequired && !newBody.includes(YMYL_MARKER)) reasons.push('g6-attach-failed:ymyl');
  if (aiRequired && !newBody.includes(AI_MARKER)) reasons.push('g6-attach-failed:ai');

  return {
    pass: reasons.length === 0,
    reasons,
    warnings,
    mdx: fm + newBody,
  };
}
