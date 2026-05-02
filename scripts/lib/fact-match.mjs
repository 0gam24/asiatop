/**
 * 사실 토큰 매칭 룰 (Step C)
 *
 * 본문 토큰 ↔ 권위 소스 토큰 1:1 매칭. 100% 매칭 미만 시 G4 fail.
 *
 * 매칭 룰:
 *   amount      — normalized 정확 일치 (오차 0)
 *   percent     — normalized ±0.001 허용 (반올림 표기)
 *   count_unit  — type + normalized 동시 일치
 *   date        — 정확 일치 OR 권위 소스 retrieved_at ±7일 허용
 *   law         — 법률명 + 조 번호 정확 일치 (항 번호는 본문에 있을 때만 검증)
 */

const PERCENT_TOLERANCE = 0.001;
const DATE_DAYS_TOLERANCE = 7;

function isYM(s) {
  return /^\d{4}-\d{2}$/.test(s);
}
function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function ymdToDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function ymToFirstDay(s) {
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function dateEquals(bodyTok, srcTok) {
  const a = bodyTok.normalized;
  const b = srcTok.normalized;
  if (a === b) return true;

  // YYYY-MM 매칭: 같은 월이면 일 무관 매칭
  if (isYM(a) && isYMD(b)) return b.startsWith(a);
  if (isYMD(a) && isYM(b)) return a.startsWith(b);

  // ±7일 허용 (권위 소스의 retrieved_at 또는 명시 날짜)
  if (isYMD(a) && isYMD(b)) {
    const diff = Math.abs(ymdToDate(a).getTime() - ymdToDate(b).getTime());
    return diff <= DATE_DAYS_TOLERANCE * 24 * 60 * 60 * 1000;
  }
  return false;
}

function lawEquals(bodyTok, srcTok) {
  // normalized 형식: "법률명/조" 또는 "법률명/조/항"
  const [aLaw, aArticle, aPara] = bodyTok.normalized.split('/');
  const [bLaw, bArticle, bPara] = srcTok.normalized.split('/');
  if (aLaw !== bLaw) return false;
  if (aArticle !== bArticle) return false;
  // 본문에 항 번호 있고 권위에 없으면 통과 (권위는 조 단위만 응답할 수 있음)
  // 본문에 항 없으면 권위 항 무관
  if (aPara && bPara && aPara !== bPara) return false;
  return true;
}

function percentEquals(bodyTok, srcTok) {
  const a = parseFloat(bodyTok.normalized);
  const b = parseFloat(srcTok.normalized);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) <= PERCENT_TOLERANCE;
}

/**
 * 두 토큰이 매칭되는지 검사.
 * type 우선 검증 (다른 타입은 매칭 없음).
 */
export function factEquals(bodyTok, srcTok) {
  if (!bodyTok || !srcTok) return false;
  if (bodyTok.type !== srcTok.type) return false;
  if (bodyTok.normalized === undefined || srcTok.normalized === undefined) return false;

  switch (bodyTok.type) {
    case 'amount':
    case 'count_unit':
      return bodyTok.normalized === srcTok.normalized;
    case 'percent':
      return percentEquals(bodyTok, srcTok);
    case 'date':
      return dateEquals(bodyTok, srcTok);
    case 'law':
      return lawEquals(bodyTok, srcTok);
    default:
      return bodyTok.normalized === srcTok.normalized;
  }
}

/**
 * 본문 토큰 배열에서 권위 토큰 풀에 매칭되는/안 되는 항목 분리.
 * approximate 토큰은 분모에서 제외 (별도 분류).
 */
export function classifyTokens(bodyTokens, authorityPool) {
  const matched = [];
  const unmatched = [];
  const approximate = [];

  for (const tok of bodyTokens) {
    if (tok.approximate) {
      approximate.push(tok);
      continue;
    }
    const m = authorityPool.find((src) => factEquals(tok, src));
    if (m) {
      matched.push({ token: tok, source: m });
    } else {
      unmatched.push({
        token: tok,
        reason: 'no-match',
      });
    }
  }
  return { matched, unmatched, approximate };
}
