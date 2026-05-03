/**
 * G9 — Naver 스팸 정책 게이트 (Post-LLM, R50-7)
 *
 * Naver Search Advisor 가이드라인 기반 4룰 검증.
 * 8단계 게이트(G0~G8) 후 9번째 마지막 안전망 — Naver 인덱싱 강등 회피.
 *
 * 룰:
 *   R1 키워드 반복률 ≤ 3%   — 특정 키워드가 본문 어절의 3% 초과 시 reject
 *   R2 숨김 텍스트 0       — display:none·visibility:hidden·font-size:0·white-on-white
 *   R3 doorway 패턴 0      — 같은 클러스터 내 slug similarity > 0.85
 *   R4 LLM signature 0     — "Sure!", "I'll", "As an AI" 등 LLM 부산물
 *
 * 차단 사유:
 *   g9-keyword-density:<word>:<%>
 *   g9-hidden-text:<pattern>
 *   g9-doorway:<other-slug>:<similarity>
 *   g9-llm-signature:<pattern>
 */

const KEYWORD_DENSITY_MAX = 0.03; // 3%

// 숨김 텍스트 정규식 (CSS·HTML attr·인라인 style)
const HIDDEN_PATTERNS = Object.freeze([
  { name: 'display-none', re: /style\s*=\s*['"][^'"]*display\s*:\s*none/i },
  { name: 'visibility-hidden', re: /style\s*=\s*['"][^'"]*visibility\s*:\s*hidden/i },
  { name: 'font-size-zero', re: /style\s*=\s*['"][^'"]*font-size\s*:\s*0(\.0)?(px|em|rem|%)?[\s;'"]/i },
  { name: 'white-on-white', re: /color\s*:\s*(?:white|#fff(?:fff)?|rgb\(255,\s*255,\s*255\))[\s;'"][^}]*background[^:]*:\s*(?:white|#fff(?:fff)?)/i },
  { name: 'aria-hidden-text', re: /<[a-z]+[^>]+aria-hidden\s*=\s*['"]true['"][^>]*>[^<]{50,}/i },
]);

// LLM signature 패턴 (자동 생성 흔적)
const LLM_SIGNATURES = Object.freeze([
  { name: 'sure-here', re: /^(Sure|Of course|Certainly|Absolutely|Definitely|Here'?s|Let me|I'?ll|I will)[\s,!]/im },
  { name: 'as-an-ai', re: /As an AI (assistant|language model|model|system)/i },
  { name: 'in-this-article', re: /In this (article|guide|post|tutorial),?\s+(we'?ll|I'?ll|we will)/i },
  { name: 'i-cannot', re: /^(I cannot|I'?m unable to|I don'?t have)/im },
  { name: 'feel-free', re: /Feel free to (ask|let me know|reach out)/i },
  { name: 'happy-to-help', re: /happy to (help|assist)/i },
]);

import { stripFrontmatter } from '../lib/mdx-utils.mjs';

/**
 * Jaro similarity — 두 문자열의 유사도 (0~1).
 * R3 doorway 검출에서 slug 비교용. 외부 의존 없이 단순 구현.
 */
function jaroSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  return (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3;
}

export { jaroSimilarity };

/**
 * G9 본체.
 * @param {string} mdx Article MDX
 * @param {object} brief Brief 객체
 * @param {object} opts { otherSlugs?: string[] } 같은 클러스터 다른 글 slug 목록 (R3 doorway)
 * @returns {{ pass: boolean, reasons: string[], warnings: string[], meta: object }}
 */
export function checkNaverSpam(mdx, brief, opts = {}) {
  const reasons = [];
  const warnings = [];
  const body = stripFrontmatter(mdx);

  // R1: 키워드 반복률 ≤ 3%
  const words = body.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords > 0) {
    const keywords = brief?.keywords ?? brief?.search_intent?.keywords ?? [];
    for (const kw of keywords) {
      if (typeof kw !== 'string' || kw.length < 2) continue;
      const re = new RegExp(escapeRegex(kw), 'g');
      const occurrences = (body.match(re) ?? []).length;
      const density = occurrences / totalWords;
      if (density > KEYWORD_DENSITY_MAX) {
        reasons.push(`g9-keyword-density:${kw}:${(density * 100).toFixed(1)}%`);
      }
    }
  }

  // R2: 숨김 텍스트 0
  for (const { name, re } of HIDDEN_PATTERNS) {
    if (re.test(body)) {
      reasons.push(`g9-hidden-text:${name}`);
    }
  }

  // R3: doorway 패턴 — 같은 클러스터 내 다른 글 slug 비교
  const otherSlugs = opts.otherSlugs ?? [];
  const currentSlug = brief?.meta?.slug ?? '';
  if (currentSlug) {
    for (const other of otherSlugs) {
      if (other === currentSlug) continue;
      const sim = jaroSimilarity(currentSlug, other);
      if (sim > 0.85) {
        reasons.push(`g9-doorway:${other}:${sim.toFixed(2)}`);
      } else if (sim > 0.75) {
        warnings.push(`g9-doorway-near:${other}:${sim.toFixed(2)}`);
      }
    }
  }

  // R4: LLM signature 0
  for (const { name, re } of LLM_SIGNATURES) {
    const m = body.match(re);
    if (m) {
      reasons.push(`g9-llm-signature:${name}:${m[0].slice(0, 40)}`);
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    warnings,
    meta: {
      total_words: totalWords,
      keyword_count: (brief?.keywords ?? []).length,
      doorway_compared: otherSlugs.length,
    },
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
