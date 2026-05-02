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

// 정확 매칭 deny-list — narrow (general-purpose 회귀 감사 P0 #2 false positive 방어)
// 제거: "원금 보장"·"수익률 보장" (정상 보험 상품 설명에 등장 — variable-insurance 등)
// 제거: "확정 수익"·"연 수익" (금융상품 일반 용어)
// 제거: "꼭 가입"·"선착순 한정"·"대박" (정상 표현 가능)
// 정규식 BANNED_BODY_PATTERNS에서 강요성 표현만 잡음.
const BANNED_BODY_KEYWORDS = Object.freeze([
  // 특정 상품 추천 (AdSense는 브랜드 추천성 콘텐츠를 제재 위험)
  '추천드립니다', '강추',
  // 한정·낚시 (강한 압력 어조만)
  '한정 특가', '오늘만 특별',
  // 도박·투자 권유
  '베팅', '필승 전략',
  // 의료·법률 자문 형식 (전문 자격 없는 자문 금지)
  '진단해드립니다', '판결드립니다',
]);

// V2 변형·동의어 정규식 패턴 (Plan agent #2 S1 권고)
// general-purpose 회귀 감사 P0 #2 — false positive narrow:
//   - "추천" 단독은 비교표·일반 용어로 빈출 → "추천드립니다·드려요" 만
//   - "원금 보장"은 변액보험 상품 설명으로 정상 등장 → narrow X (별도 룰)
//   - "선착순"은 정부 보조금 조기 마감 안내로 정상 → narrow ("선착순 한정·마감")
const BANNED_BODY_PATTERNS = Object.freeze([
  // 추천·강요 변형 (강한 어조만 — "추천" 단독 X)
  { name: 'cta-recommendation', re: /(추천드(립니다|려요|립)|강추|꼭\s?(가입|신청|드세요)|반드시\s?(가입|신청))/g },
  // 시한·한정·선착 압력 (단독 "선착순" X — "선착순 한정·마감"만)
  { name: 'cta-pressure', re: /(선착순\s?(한정|마감|N명)|한정\s?(특가|혜택|판매)|오늘만\s?특별|마감\s?임박|딱\s?\d+명)/g },
  // 수익·원금·이자 보장 — 광고성 강요만 (보험 상품 설명은 통과)
  // "원금 보장 받으세요" 같은 권유성 패턴
  { name: 'guarantee-promo', re: /(원금|수익|이자|배당)\s?(보장|확정)\s?(받으세요|드립니다|상품)/g },
  // 투기·도박 어휘
  { name: 'gambling', re: /(필승\s?(전략|공식)|대박\s?(터지|기회)|역전\s?(만루|홈런))/g },
  // 자문 형식 (의료·법률·세무)
  { name: 'unauthorized-advice', re: /(진단해\s?드(립니다|려요)|판결\s?(드립니다|입니다)|확정적으로\s?(말씀|판단))/g },
  // 행동 압력 마지막 단락 패턴 (CTA pressure)
  { name: 'cta-end', re: /(지금\s?(즉시|당장|바로)\s?(신청|가입|클릭)|서두르세요|놓치(지\s?마|면\s?안))/g },
]);

const AFFILIATE_DOMAIN_DENY = Object.freeze([
  // 일반적 affiliate 네트워크
  'coupa.ng', 'aliprice.com',
  // 단기·고금리 대출 모집인
  'dabang-loan', 'badcredit-loan',
]);

import { stripFrontmatter } from '../lib/mdx-utils.mjs';

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

  // V2 정규식 변형·동의어 검출 (LLM 의역 회피 방어)
  for (const { name, re } of BANNED_BODY_PATTERNS) {
    const matches = body.match(re);
    if (matches && matches.length > 0) {
      reasons.push(`g5-pattern:${name}:${matches[0].slice(0, 30)}`);
    }
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
