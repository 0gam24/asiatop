/**
 * G7 — 표절·저작권 검사 (Post-LLM)
 *
 * 지식인 질문 원문이 본문에 8단어+ 연속 등장 시 차단.
 * 네이버 OpenAPI ToS + 저작권 보호.
 *
 * 차단 사유:
 *   g7-quote-overlap:<n>words   — 8단어+ 연속 매칭 (n = 매칭 길이)
 *   g7-multi-overlap            — 5단어+ 매칭이 3건 이상 (분산 표절)
 *
 * 정책: 질문은 "페인 신호"로만 사용. 본문 표현은 모두 자체 작성.
 */

const MIN_OVERLAP_WORDS = 8;
const SOFT_OVERLAP_WORDS = 5;
const SOFT_OVERLAP_LIMIT = 3;

function tokenizeKorean(text) {
  if (typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

import { stripFrontmatter } from '../lib/mdx-utils.mjs';

/**
 * 두 토큰 리스트의 최대 연속 매칭 길이 + 매칭 위치 반환.
 * O(N*M) — 본문이 매우 길면 sliding hash 검토 (V2).
 */
function findOverlaps(questionTokens, bodyTokens, minLen) {
  const overlaps = [];
  const qLen = questionTokens.length;
  const bLen = bodyTokens.length;

  for (let i = 0; i <= qLen - minLen; i++) {
    for (let j = 0; j <= bLen - minLen; j++) {
      let k = 0;
      while (
        i + k < qLen &&
        j + k < bLen &&
        questionTokens[i + k] === bodyTokens[j + k]
      ) {
        k++;
      }
      if (k >= minLen) {
        overlaps.push({
          length: k,
          window: questionTokens.slice(i, i + k).join(' '),
          q_start: i,
          b_start: j,
        });
        // 같은 window의 중복 검출 방지
        i += k - 1;
        break;
      }
    }
  }

  return overlaps;
}

/**
 * G7 본체.
 * @param {string} mdx Article MDX
 * @param {string|null} questionText 지식인 원문 (brief.source_question.original_text)
 * @returns {{ pass: boolean, reasons: string[], overlaps: Array, meta: object }}
 */
export function checkPlagiarism(mdx, questionText) {
  if (!questionText || typeof questionText !== 'string') {
    return {
      pass: true,
      reasons: [],
      overlaps: [],
      meta: { note: 'no-question-source-provided' },
    };
  }

  const body = stripFrontmatter(mdx);
  const qTokens = tokenizeKorean(questionText);
  const bTokens = tokenizeKorean(body);

  if (qTokens.length < SOFT_OVERLAP_WORDS) {
    return {
      pass: true,
      reasons: [],
      overlaps: [],
      meta: { note: 'question-too-short' },
    };
  }

  const hardOverlaps = findOverlaps(qTokens, bTokens, MIN_OVERLAP_WORDS);
  const softOverlaps = findOverlaps(qTokens, bTokens, SOFT_OVERLAP_WORDS);

  const reasons = [];
  if (hardOverlaps.length > 0) {
    reasons.push(`g7-quote-overlap:${hardOverlaps[0].length}words`);
  } else if (softOverlaps.length >= SOFT_OVERLAP_LIMIT) {
    reasons.push('g7-multi-overlap');
  }

  return {
    pass: reasons.length === 0,
    reasons,
    overlaps: hardOverlaps.length > 0 ? hardOverlaps.slice(0, 3) : softOverlaps.slice(0, 5),
    meta: {
      question_word_count: qTokens.length,
      body_word_count: bTokens.length,
      hard_overlap_count: hardOverlaps.length,
      soft_overlap_count: softOverlaps.length,
    },
  };
}
