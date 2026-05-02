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

/**
 * AI 공시 메시지 — brief 메타에 따라 분기.
 *
 * R48 #48-6: 자동 발행 글(brief.source_question 존재)은 "8단계 자동 검증 게이트 통과"
 *           시스템 정체성을 명시. 사람 사칭 페널티 회피 + AI 답변 엔진의 신뢰 시그널.
 *           기존 manual 글은 종전 메시지 유지.
 */
function buildAIDisclosure(brief) {
  const isAutoPublished = !!brief?.source_question;
  if (isAutoPublished) {
    return `${AI_MARKER}
> **AI 보조·자동 검증 공시**: 본 글은 네이버 지식iN 질문에서 출발해 AI(DeepSeek + Claude)가 초안을 작성했고, MoneyLook 8단계 자동 검증 게이트(G0 중복 · G1 PII/욕설 · G2 클러스터 · G3 권위 출처 · G4 사실 1:1 매칭 · G5 AdSense · G6 면책 · G7 표절 · G8 AI다움)를 모두 통과했습니다. 본문의 모든 수치·날짜·법령은 정부 공식 API 응답과 1:1 매칭됐으며, 매칭률 100% 미만 시 자동 폐기됩니다. 정정 정책 — 오류 발견 시 24시간 내 수정.`;
  }
  return `${AI_MARKER}
> **AI 보조 공시**: 본 글의 초안은 AI(DeepSeek-V3 + Claude Haiku)의 보조로 작성되었으며, 머니룩 편집팀이 1차 자료 검증·편집·승인 후 발행했습니다.`;
}

import { splitFrontmatter as stripFrontmatter } from '../lib/mdx-utils.mjs';

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

  // AI 공시 부착 (brief 메타로 자동 발행 vs manual 분기)
  if (aiRequired && !newBody.includes(AI_MARKER)) {
    newBody = newBody.trimEnd() + '\n\n' + buildAIDisclosure(brief) + '\n';
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
