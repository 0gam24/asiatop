/**
 * G5 — AdSense 정책 게이트 (Post-LLM)
 *
 * 본문·brief 양쪽에서 AdSense 위반 가능 패턴 검출.
 *
 * 차단 사유:
 *   g5-promotes-loan       — brief.ad_policy.promotes_specific_loan === true
 *   g5-high-interest       — brief.ad_policy.contains_high_interest_loan_promotion === true
 *   g5-not-google-compliant — brief.ad_policy.google_compliant === false
 *   g5-banned-keyword:<w>  — 본문 deny-keyword 매칭
 *   g5-affiliate:<host>    — 외부 링크가 affiliate deny-list 매칭
 *
 * Warning (차단 X):
 *   g5-financial-advice    — brief.ad_policy.contains_financial_advice === true (면책 강화 권고)
 */

const BANNED_BODY_KEYWORDS = Object.freeze([
  // 특정 상품 추천 (AdSense는 브랜드 추천성 콘텐츠를 제재 위험)
  '추천드립니다', '강추', '꼭 가입',
  // 수익률·원금 보장 (금감원·AdSense 양쪽 위반)
  '수익률 보장', '원금 보장', '확정 수익', '연 수익',
  // 한정·낚시
  '선착순 한정', '한정 특가', '오늘만 특별',
  // 도박·투자 권유
  '베팅', '필승 전략', '대박',
  // 의료·법률 자문 형식 (전문 자격 없는 자문 금지)
  '진단해드립니다', '판결드립니다',
]);

const AFFILIATE_DOMAIN_DENY = Object.freeze([
  // 일반적 affiliate 네트워크
  'coupa.ng', 'aliprice.com',
  // 단기·고금리 대출 모집인
  'dabang-loan', 'badcredit-loan',
]);

function stripFrontmatter(text) {
  if (typeof text !== 'string') return '';
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return text;
  return text.slice(end + 4);
}

function extractExternalUrls(body) {
  const urls = [];
  const re = /https?:\/\/([^\s)<>"']+)/g;
  for (const m of body.matchAll(re)) {
    try {
      const host = new URL(`http://${m[1]}`).hostname.toLowerCase();
      urls.push(host);
    } catch {}
  }
  return urls;
}

/**
 * G5 본체.
 * @param {string} mdx Article MDX
 * @param {object} brief Brief 객체
 * @returns {{ pass: boolean, reasons: string[], warnings: string[], meta: object }}
 */
export function checkAdSensePolicy(mdx, brief) {
  const reasons = [];
  const warnings = [];

  const adPolicy = brief?.ad_policy ?? {};
  if (adPolicy.promotes_specific_loan === true) reasons.push('g5-promotes-loan');
  if (adPolicy.contains_high_interest_loan_promotion === true) reasons.push('g5-high-interest');
  if (adPolicy.google_compliant === false) reasons.push('g5-not-google-compliant');
  if (adPolicy.contains_financial_advice === true) warnings.push('g5-financial-advice');

  const body = stripFrontmatter(mdx);

  for (const kw of BANNED_BODY_KEYWORDS) {
    if (body.includes(kw)) reasons.push(`g5-banned-keyword:${kw}`);
  }

  const hosts = extractExternalUrls(body);
  for (const host of hosts) {
    for (const deny of AFFILIATE_DOMAIN_DENY) {
      if (host.includes(deny)) {
        reasons.push(`g5-affiliate:${host}`);
        break;
      }
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    warnings,
    meta: {
      external_url_count: hosts.length,
      banned_keyword_count: reasons.filter((r) => r.startsWith('g5-banned-keyword')).length,
    },
  };
}
