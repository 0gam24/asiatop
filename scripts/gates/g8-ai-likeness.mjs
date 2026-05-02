/**
 * G8 — AI-likeness 게이트 (Post-LLM)
 *
 * scripts/lib/ai-likeness-scorer.mjs를 호출하는 thin wrapper.
 * 임계값을 환경변수 AI_LIKENESS_THRESHOLD로 단계화.
 *
 * 단계화 표 (단일 출처 — docs/MISSION-PIVOT.md §2와 동기화):
 *   Day 1~7   (운영 시작):  7.0  ← 코드 default
 *   Week 2~3  (안정화):     6.0
 *   Week 4+   (강화):       5.0
 *
 * 운영 진행에 따라 vars.AI_LIKENESS_THRESHOLD를 단계 하향. 단계 전환은
 * docs/AUTO-PUBLISH-GUIDE.md §6-3 참고.
 *
 * 차단 사유:
 *   g8-ai-likeness:<score>  — score >= threshold
 */
import { scoreAILikeness } from '../lib/ai-likeness-scorer.mjs';

export function checkAILikeness(mdx, options = {}) {
  const threshold = options.threshold
    ?? Number(process.env.AI_LIKENESS_THRESHOLD ?? '7.0');

  const result = scoreAILikeness(mdx, { threshold });

  return {
    pass: result.pass,
    reasons: result.pass ? [] : [`g8-ai-likeness:${result.score.toFixed(1)}`],
    score: result.score,
    threshold,
    signals: result.signals,
    breakdown: result.breakdown,
    hints: result.hints,
  };
}
