/**
 * G1 — 질문 정제 게이트 (Pre-LLM)
 *
 * 입력 질문을 검사해 폐기 여부 결정. fail 시 LLM 호출 없이 즉시 폐기 (토큰 0원).
 *
 * 차단 사유 (reasons[]):
 *   g1-empty           — null·공백
 *   g1-too-short       — 10자 미만
 *   g1-too-long        — 500자 초과
 *   g1-non-korean      — 한글 비율 < 30%
 *   g1-pii:<type>      — 주민번호·휴대폰·계좌·카드·이메일
 *   g1-profanity       — 한국어 욕설
 *   g1-prohibited      — 약물·도박
 *   g1-adult           — 성인
 *   g1-political       — data/political-deny.json 매칭
 *
 * 다중 사유 모두 수집 후 반환. 1건이라도 있으면 pass=false.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLITICAL_DENY_PATH = resolve(__dirname, '..', '..', 'data', 'political-deny.json');

// ─────────────────────────────────────────────
// PII 패턴 (강한 시그널 — 오탐 시에도 차단이 안전)
// ─────────────────────────────────────────────
const PII_PATTERNS = [
  { name: 'rrn', re: /\d{6}[\s-]?[1-4]\d{6}/ },                          // 주민등록번호
  { name: 'phone', re: /01[016-9][\s.-]?\d{3,4}[\s.-]?\d{4}/ },          // 휴대폰
  { name: 'bank', re: /\b\d{3}[-]\d{2,6}[-]\d{2,7}\b/ },                 // 계좌 추정
  { name: 'card', re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/ },    // 카드 추정
  { name: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
];

// ─────────────────────────────────────────────
// 키워드 deny-list (최소 셋 — 한국어 공개 자원 기반)
// ─────────────────────────────────────────────
const PROFANITY = ['시발', '씨발', '개새끼', '병신', '존나', 'ㅅㅂ', 'ㅄ', '좆', '꺼져'];
const DRUG_GAMBLING = [
  '마약', '대마', '필로폰', '히로뽕', '코카인',
  '도박장', '카지노 사이트', '베팅 사이트', '스포츠토토 작업',
  '먹튀', '환전상',
];
const ADULT = ['성매매', '음란', '유흥업소 이용', '성인용품 후기'];

// 정치 deny는 lazy load (운영자 갱신 빈번)
let _politicalDenyCache = null;
function loadPoliticalDeny() {
  if (_politicalDenyCache !== null) return _politicalDenyCache;
  if (!existsSync(POLITICAL_DENY_PATH)) {
    _politicalDenyCache = [];
    return _politicalDenyCache;
  }
  try {
    const data = JSON.parse(readFileSync(POLITICAL_DENY_PATH, 'utf-8'));
    _politicalDenyCache = Array.isArray(data?.terms) ? data.terms : [];
  } catch {
    _politicalDenyCache = [];
  }
  return _politicalDenyCache;
}

export function _resetPoliticalDenyCache() {
  _politicalDenyCache = null;
}

// ─────────────────────────────────────────────
// 한국어 비율 (한글 음절 / 비공백 문자)
// ─────────────────────────────────────────────
function koreanRatio(text) {
  if (!text) return 0;
  const koreanChars = (text.match(/[가-힯]/g) || []).length;
  const totalChars = (text.match(/\S/g) || []).length;
  return totalChars === 0 ? 0 : koreanChars / totalChars;
}

// ─────────────────────────────────────────────
// 메인 검사
// ─────────────────────────────────────────────
/**
 * 질문 정제 게이트.
 * @param {string} text 질문 본문
 * @returns {{ pass: boolean, reasons: string[], meta: { length: number, korean_ratio: number } }}
 */
export function sanitizeQuestion(text) {
  const reasons = [];
  const meta = { length: 0, korean_ratio: 0 };

  if (typeof text !== 'string' || !text.trim()) {
    return { pass: false, reasons: ['g1-empty'], meta };
  }

  const trimmed = text.trim();
  meta.length = trimmed.length;
  meta.korean_ratio = Number(koreanRatio(trimmed).toFixed(2));

  // 길이
  if (trimmed.length < 10) reasons.push('g1-too-short');
  if (trimmed.length > 500) reasons.push('g1-too-long');

  // 한국어 비율
  if (meta.korean_ratio < 0.3) reasons.push('g1-non-korean');

  // PII
  for (const { name, re } of PII_PATTERNS) {
    if (re.test(trimmed)) reasons.push(`g1-pii:${name}`);
  }

  // 키워드 deny (최초 매칭 1건만 사유 기록 — 카테고리당)
  for (const w of PROFANITY) {
    if (trimmed.includes(w)) { reasons.push('g1-profanity'); break; }
  }
  for (const w of DRUG_GAMBLING) {
    if (trimmed.includes(w)) { reasons.push('g1-prohibited'); break; }
  }
  for (const w of ADULT) {
    if (trimmed.includes(w)) { reasons.push('g1-adult'); break; }
  }
  for (const w of loadPoliticalDeny()) {
    if (trimmed.includes(w)) { reasons.push('g1-political'); break; }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    meta,
  };
}

/**
 * 텍스트에서 PII만 redact. brief 작성 시 본문 보존이 필요할 때 사용.
 */
export function redactPII(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const { name, re } of PII_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    out = out.replace(g, `<redacted:${name}>`);
  }
  return out;
}
