/**
 * G8 — AI-likeness 게이트 (Post-LLM)
 *
 * scripts/lib/ai-likeness-scorer.mjs를 호출하는 thin wrapper.
 * 임계값을 환경변수 AI_LIKENESS_THRESHOLD로 단계화 (기본 5.0).
 *
 * 차단 사유:
 *   g8-ai-likeness:<score>  — score >= threshold
 */
import { scoreAILikeness } from '../lib/ai-likeness-scorer.mjs';

export function checkAILikeness(mdx, options = {}) {
  const threshold = options.threshold
    ?? Number(process.env.AI_LIKENESS_THRESHOLD ?? '5.0');

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
