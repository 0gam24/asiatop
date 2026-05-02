/**
 * 신뢰 도메인 단일 진실 공급원 (Single Source of Truth)
 *
 * 통합 전: 3곳 중복
 *   - scripts/article-pipeline.mjs `GOV` 배열
 *   - scripts/validate-brief.mjs `TRUSTED_DOMAINS + TRUSTED_SUFFIXES`
 *   - scripts/geo-audit.mjs `GOV`
 *
 * 통합 후: 본 파일이 유일한 출처. 위 3곳은 import 후 재사용.
 *
 * 정책:
 *   - 정부(.go.kr)·공공기관(.or.kr) 도메인만 신뢰
 *   - 민간 사이트는 절대 추가 금지 (E-E-A-T·AdSense 정책)
 *   - 신규 도메인 추가는 PR 단위 리뷰
 */

export const TRUSTED_DOMAINS = Object.freeze([
  // 데이터·법령
  'data.go.kr', 'open.go.kr', 'korea.kr',
  'law.go.kr', 'easylaw.go.kr',
  // 세금
  'nts.go.kr', 'hometax.go.kr',
  // 고용·노동
  'work24.go.kr', 'work.go.kr', 'ei.go.kr', 'moel.go.kr',
  // 복지
  'bokjiro.go.kr', 'mohw.go.kr',
  // 통계·금융
  'kostat.go.kr', 'ecos.bok.or.kr', 'bok.or.kr',
  'fss.or.kr', 'finlife.fss.or.kr', '100lifeplan.fss.or.kr',
  // 부동산·국토
  'molit.go.kr', 'nhuf.molit.go.kr', 'rt.molit.go.kr',
  'kab.co.kr', 'reb.or.kr',
  // 청약·임대
  'applyhome.co.kr', 'lh.or.kr', 'sh.co.kr', 'gh.or.kr',
  // 지방세·민원
  'wetax.go.kr', 'gov.kr',
  // 보험·연금
  'nps.or.kr', 'nhis.or.kr', 'kcomwel.or.kr',
  'klia.or.kr', 'knia.or.kr',
  // 정부 인포그래픽·뉴스
  'mois.go.kr', 'mosf.go.kr',
]);

export const TRUSTED_SUFFIXES = Object.freeze(['.go.kr', '.or.kr']);

/**
 * URL이 신뢰 도메인 목록 또는 신뢰 suffix에 속하는지 검사.
 * 잘못된 URL은 false 반환 (예외 X).
 */
export function isTrustedUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (TRUSTED_DOMAINS.includes(host)) return true;
    return TRUSTED_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

/**
 * cluster slug → 권장 1차 도메인 (G3 권위 소스 가용성 게이트에서 사용)
 * 1차 fetch 실패 시 cluster의 다른 도메인 폴백.
 */
export const CLUSTER_PRIMARY_DOMAINS = Object.freeze({
  'gov-support': ['data.go.kr', 'bokjiro.go.kr', 'work24.go.kr'],
  'tax': ['nts.go.kr', 'hometax.go.kr', 'law.go.kr'],
  'realestate': ['nhuf.molit.go.kr', 'molit.go.kr', 'applyhome.co.kr', 'rt.molit.go.kr'],
  'unemployment': ['work24.go.kr', 'ei.go.kr', 'moel.go.kr', 'law.go.kr'],
  'savings': ['ecos.bok.or.kr', 'finlife.fss.or.kr', 'fss.or.kr'],
  'insurance-labor': ['law.go.kr', 'nhis.or.kr', 'moel.go.kr', 'kcomwel.or.kr'],
  'auto': ['wetax.go.kr', 'finlife.fss.or.kr', 'knia.or.kr'],
  'public-services': ['gov.kr', 'korea.kr', 'data.go.kr'],
  'office-tips': ['law.go.kr', 'moel.go.kr', 'nts.go.kr'],
  'credit-loan': ['finlife.fss.or.kr', 'fss.or.kr'],
  'insurance-personal': ['knia.or.kr', 'klia.or.kr', 'fss.or.kr'],
  'pension': ['nps.or.kr', '100lifeplan.fss.or.kr'],
});
