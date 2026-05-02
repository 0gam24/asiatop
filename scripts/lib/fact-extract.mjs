/**
 * 본문에서 사실 토큰 추출 (정규식 기반, NLP 라이브러리 X)
 *
 * 5개 토큰 타입:
 *   amount    — 100만원, 1억, 50,000원 (단위 정규화 → 원)
 *   percent   — 3.5%, 23.7% (정규화 → 0~1 비율)
 *   count_unit — 30일, 12개월, 3년, 5세, 100건 ...
 *   date      — 2025년 7월 1일, 2025-07-01, 2025년 7월 (YYYY-MM 또는 YYYY-MM-DD)
 *   law       — 근로기준법 제55조, 소득세법 시행령 제42조 제2항
 *
 * 출력 토큰 형식:
 *   { type, raw, normalized, line, col, context }
 *
 * 근사 표현 ("약 200만원") 검출:
 *   토큰 raw 앞 30자 내에 [약|대략|보통|평균적으로|통상|얼추|어림잡아] 등장 시 approximate=true
 */

const PATTERNS = {
  amount: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(원|만\s?원|억\s?원|억|만)/g,
  percent: /(\d{1,3}(?:\.\d+)?)\s*%/g,
  count_unit: /(\d{1,3}(?:,\d{3})*)\s*(일|개월|년|세|회|건|명|가구|시간|분)/g,
  date_kor_full: /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
  date_kor_ym: /(\d{4})년\s*(\d{1,2})월(?!\s*\d)/g,           // "2025년 7월" (일 없음)
  date_iso: /(\d{4})-(\d{2})-(\d{2})/g,
  law: /([가-힯]+법(?:\s*시행(?:령|규칙))?)\s*제\s*(\d+)\s*조(?:\s*제\s*(\d+)\s*항)?/g,
};

const APPROX_PREFIX_RE = /(약|대략|보통|평균적으로|통상|얼추|어림잡아)\s*$/;

function commaToInt(s) {
  return Number(String(s).replace(/,/g, ''));
}

function normalizeAmount(value, unit) {
  const num = parseFloat(commaToInt(value));
  const u = unit.replace(/\s+/g, '');
  if (u === '원') return String(Math.round(num));
  if (u === '만원' || u === '만') return String(Math.round(num * 10_000));
  if (u === '억원' || u === '억') return String(Math.round(num * 100_000_000));
  return String(num);
}

function normalizePercent(value) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;
  // 0.0001 단위 반올림 (0.001% 매칭 허용)
  return (Math.round(num * 10000) / 10000).toString();
}

function normalizeCountUnit(value, unit) {
  return `${commaToInt(value)}${unit}`;
}

function normalizeDateFull(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function normalizeDateYM(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

function normalizeLaw(name, article, paragraph) {
  const cleanName = name.replace(/\s+/g, '');
  const a = String(parseInt(article, 10));
  const p = paragraph ? String(parseInt(paragraph, 10)) : null;
  return p ? `${cleanName}/${a}/${p}` : `${cleanName}/${a}`;
}

/**
 * 본문에서 모든 사실 토큰 추출.
 * @param {string} text 본문 (markdown 또는 plain)
 * @returns {Array<{type, raw, normalized, line, col, context, approximate}>}
 */
export function extractFactTokens(text) {
  if (typeof text !== 'string' || !text) return [];

  const tokens = [];
  const lines = text.split('\n');

  // 라인별 위치 매핑 (line·col)
  function lineColAt(absIdx) {
    let cur = 0;
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].length + 1; // \n 포함
      if (absIdx < cur + len) {
        return { line: i + 1, col: absIdx - cur };
      }
      cur += len;
    }
    return { line: lines.length, col: 0 };
  }

  function checkApprox(absIdx) {
    const start = Math.max(0, absIdx - 30);
    const before = text.slice(start, absIdx);
    return APPROX_PREFIX_RE.test(before);
  }

  function pushToken(type, raw, normalized, m) {
    if (normalized === null || normalized === undefined) return;
    const { line, col } = lineColAt(m.index);
    const context = text.slice(Math.max(0, m.index - 20), Math.min(text.length, m.index + raw.length + 20));
    tokens.push({
      type,
      raw,
      normalized,
      line,
      col,
      context,
      approximate: checkApprox(m.index),
    });
  }

  // amount
  for (const m of text.matchAll(PATTERNS.amount)) {
    const [raw, value, unit] = m;
    pushToken('amount', raw, normalizeAmount(value, unit), m);
  }

  // percent
  for (const m of text.matchAll(PATTERNS.percent)) {
    const [raw, value] = m;
    pushToken('percent', raw, normalizePercent(value), m);
  }

  // count_unit (단, 위 amount/percent와 겹치지 않도록 후처리)
  for (const m of text.matchAll(PATTERNS.count_unit)) {
    const [raw, value, unit] = m;
    // amount와 겹침 방지: 같은 위치의 amount가 이미 있으면 skip
    const overlap = tokens.some(
      (t) => t.type === 'amount' && Math.abs((t.raw && text.indexOf(t.raw, m.index - 5) || -1) - m.index) < 3,
    );
    if (overlap) continue;
    pushToken('count_unit', raw, normalizeCountUnit(value, unit), m);
  }

  // date YYYY-MM-DD (한국어 표기)
  for (const m of text.matchAll(PATTERNS.date_kor_full)) {
    const [raw, y, mo, d] = m;
    pushToken('date', raw, normalizeDateFull(y, mo, d), m);
  }

  // date YYYY-MM (한국어, 일 없음)
  for (const m of text.matchAll(PATTERNS.date_kor_ym)) {
    const [raw, y, mo] = m;
    pushToken('date', raw, normalizeDateYM(y, mo), m);
  }

  // date ISO
  for (const m of text.matchAll(PATTERNS.date_iso)) {
    const [raw, y, mo, d] = m;
    pushToken('date', raw, normalizeDateFull(y, mo, d), m);
  }

  // law
  for (const m of text.matchAll(PATTERNS.law)) {
    const [raw, name, article, paragraph] = m;
    pushToken('law', raw, normalizeLaw(name, article, paragraph), m);
  }

  return tokens;
}

/**
 * 권위 소스 응답(JSON 객체)을 평탄화해 모든 leaf string 추출 후 토큰화.
 * Step B (권위 토큰 풀) 생성용.
 */
export function extractFactsFromObject(obj, sourceMeta = {}) {
  const strings = [];
  function walk(node) {
    if (typeof node === 'string') strings.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') Object.values(node).forEach(walk);
    else if (typeof node === 'number') strings.push(String(node));
  }
  walk(obj);
  const joined = strings.join('\n');
  return extractFactTokens(joined).map((t) => ({ ...t, ...sourceMeta }));
}
