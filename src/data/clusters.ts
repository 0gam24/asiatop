export interface Cluster {
  slug: string;
  title: string;
  shortTitle: string;
  /** UI 카드·hero 한 줄 카피 */
  description: string;
  /** SEO·OG meta description (50~160자, 한국어 정보 밀도 고려) */
  metaDescription: string;
  emoji: string;
  accent: string;
  seedKeywords: string[];
  cpcTier: '하' | '중' | '상' | '최상';
  /**
   * 자동 발행 파이프라인용 — Plan agent #2 spec 기반
   * authorityCoverage: 권위 소스 API로 답변 가능한 비율 (0~1)
   *   < 0.7 클러스터는 ad_policy.contains_financial_advice=true 자동 체크 + framing="explainer" 강제
   *   AdSense 위험 사전 차단
   * adRiskTier: AdSense 정책 위반 가능성 ('low' | 'medium' | 'high')
   */
  authorityCoverage?: number;
  adRiskTier?: 'low' | 'medium' | 'high';
  /**
   * R67 — Google KG + AI engine entity 인식.
   * Wikidata QID URL / Korean Wikipedia URL / 정부 권위 기관 URL.
   * CollectionPage.about.sameAs · Article.about[*].sameAs 에 propagate.
   */
  entityRefs?: string[];
}

export const clusters: readonly Cluster[] = [
  {
    slug: 'gov-support',
    title: '정부지원금·청년정책',
    shortTitle: '정부지원',
    description: '청년월세지원·근로장려금·자녀장려금 등 받을 수 있는 돈, 한곳에서.',
    metaDescription: '청년월세지원·근로장려금·자녀장려금·청년도약계좌 등 정부 지원금 신청 자격·금액·기간을 1차 자료(복지로·고용24·국세청) 기반으로 정리합니다.',
    emoji: '🎁',
    accent: '#00C896',
    seedKeywords: ['청년월세지원', '근로장려금', '자녀장려금', '청년도약계좌'],
    cpcTier: '중',
    authorityCoverage: 0.9,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/사회_복지',
      'https://www.bokjiro.go.kr',
      'https://www.gov.kr',
    ],
  },
  {
    slug: 'tax',
    title: '연말정산·세금환급',
    shortTitle: '연말정산',
    description: '13월의 월급, 한 푼도 안 빠뜨리고 받기.',
    metaDescription: '연말정산 누락 공제·종합소득세·세금환급·인적공제·중소기업 감면. 직장인이 매년 놓치는 환급을 국세청 1차 자료 기반으로 짚어드립니다.',
    emoji: '🧾',
    accent: '#FFB800',
    seedKeywords: ['연말정산', '세금환급', '종합소득세', '인적공제'],
    cpcTier: '상',
    authorityCoverage: 0.95,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/소득세',
      'https://ko.wikipedia.org/wiki/연말정산',
      'https://www.nts.go.kr',
      'https://www.hometax.go.kr',
    ],
  },
  {
    slug: 'realestate',
    title: '부동산·전월세',
    shortTitle: '부동산',
    description: '전세보증금부터 디딤돌대출, 청약통장까지.',
    metaDescription: '전세보증금 보호·청약통장 전략·디딤돌대출·버팀목전세대출. 한국 직장인의 첫 집 마련부터 전월세 분쟁까지 정부 1차 자료 기반 정리.',
    emoji: '🏠',
    accent: '#5B8DEF',
    seedKeywords: ['전세보증금', '청약통장', '디딤돌대출', '버팀목전세대출'],
    cpcTier: '상',
    authorityCoverage: 0.8,
    adRiskTier: 'medium',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/부동산',
      'https://ko.wikipedia.org/wiki/전세',
      'https://www.molit.go.kr',
      'https://www.applyhome.co.kr',
    ],
  },
  {
    slug: 'unemployment',
    title: '실업·퇴직',
    shortTitle: '실업·퇴직',
    description: '실업급여·퇴직금·구직급여, 받을 수 있는 한도까지.',
    metaDescription: '실업급여 신청·구직급여 한도·퇴직금 계산·실업인정·재취업수당. 고용보험·근로기준법 기준으로 받을 수 있는 권리를 정리합니다.',
    emoji: '💼',
    accent: '#FF6B35',
    seedKeywords: ['실업급여', '퇴직금계산기', '구직급여', '실업인정'],
    cpcTier: '중',
    authorityCoverage: 0.95,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/실업급여',
      'https://ko.wikipedia.org/wiki/퇴직금',
      'https://www.ei.go.kr',
      'https://www.work.go.kr',
    ],
  },
  {
    slug: 'savings',
    title: '재테크·예적금',
    shortTitle: '재테크',
    description: 'ISA·CMA·청년도약계좌, 어디에 넣어야 손해 안 봐.',
    metaDescription: 'ISA 일반형/서민형·CMA·청년도약계좌·청년희망적금·연금저축. 한국은행 ECOS·금감원 공시 기반으로 직장인 재테크 시뮬레이션과 비교를 제공합니다.',
    emoji: '💰',
    accent: '#00C896',
    seedKeywords: ['ISA계좌', 'CMA통장', '청년도약계좌', '청년희망적금'],
    cpcTier: '상',
    authorityCoverage: 0.7,
    adRiskTier: 'high',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/저축',
      'https://ko.wikipedia.org/wiki/개인종합자산관리계좌',
      'https://www.bok.or.kr',
      'https://finlife.fss.or.kr',
    ],
  },
  {
    slug: 'insurance-labor',
    title: '4대보험·노동법',
    shortTitle: '4대보험',
    description: '건강보험료·국민연금·연차·휴가, 직장인 권리 정리.',
    metaDescription: '건강보험료 산정·국민연금·연차수당·주휴수당·산재보험. 근로기준법·건보공단·고용노동부 1차 자료 기반 직장인 권리 가이드.',
    emoji: '🛡️',
    accent: '#0F1B2D',
    seedKeywords: ['건강보험료', '국민연금', '연차수당', '주휴수당'],
    cpcTier: '중',
    authorityCoverage: 0.9,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/4대_사회보험',
      'https://ko.wikipedia.org/wiki/근로기준법',
      'https://www.nhis.or.kr',
      'https://www.nps.or.kr',
      'https://www.moel.go.kr',
    ],
  },
  {
    slug: 'auto',
    title: '자동차·교통',
    shortTitle: '자동차',
    description: '자동차세·보험료·면허, 매년 새는 돈 막기.',
    metaDescription: '자동차세 연납 할인·자동차보험 비교·면허 취득세·사고 보상 절차. 매년 새는 돈을 막는 자동차 운영 비용 절감 가이드.',
    emoji: '🚗',
    accent: '#5B8DEF',
    seedKeywords: ['자동차세', '자동차보험비교', '면허취득세', '자동차세연납'],
    cpcTier: '상',
    authorityCoverage: 0.6,
    adRiskTier: 'high',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/자동차세',
      'https://ko.wikipedia.org/wiki/자동차보험',
      'https://www.wetax.go.kr',
      'https://www.knia.or.kr',
    ],
  },
  {
    slug: 'public-services',
    title: '공공서비스·민원',
    shortTitle: '공공민원',
    description: '정부24·홈택스·복지로, 발품 안 팔고 모바일로 끝.',
    metaDescription: '정부24·홈택스·복지로·고용24 모바일 발급법. 주민등록등본·전입신고·확정일자부터 복지 신청까지 발품 안 팔고 끝내는 절차 정리.',
    emoji: '🏛️',
    accent: '#7C4DFF',
    seedKeywords: ['주민등록등본', '전입신고', '정부24', '복지로'],
    cpcTier: '하',
    authorityCoverage: 0.95,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/주민등록증',
      'https://www.gov.kr',
      'https://www.hometax.go.kr',
      'https://www.bokjiro.go.kr',
    ],
  },
  {
    slug: 'office-tips',
    title: '직장인 꿀팁',
    shortTitle: '직장인꿀팁',
    description: '연차·식대·출장비·야근수당, 사장도 모르는 권리.',
    metaDescription: '연차 사용·식대 비과세·출장비·야근수당·통상임금 계산. 근로기준법·세법 기준으로 직장인이 잘 모르는 권리와 절세 포인트 정리.',
    emoji: '✨',
    accent: '#FFB800',
    seedKeywords: ['연차계산', '식대비과세', '출장비', '야근수당'],
    cpcTier: '중',
    authorityCoverage: 0.85,
    adRiskTier: 'low',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/근로기준법',
      'https://ko.wikipedia.org/wiki/연차_유급휴가',
      'https://www.moel.go.kr',
      'https://www.minimumwage.go.kr',
    ],
  },
  {
    slug: 'credit-loan',
    title: '신용·대출',
    shortTitle: '신용·대출',
    description: '신용점수 올리는 법, 마이너스통장·햇살론 한도까지.',
    metaDescription: '신용점수 올리는 법·마이너스통장·햇살론·2금융권 대환·신용카드 거절 대응. 금융감독원·신용평가사 기준으로 신용·대출 의사결정 가이드.',
    emoji: '💳',
    accent: '#FF6B35',
    seedKeywords: ['신용점수올리기', '마이너스통장', '햇살론', '신용대출'],
    cpcTier: '최상',
    authorityCoverage: 0.5,
    adRiskTier: 'high',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/신용_점수',
      'https://ko.wikipedia.org/wiki/대출',
      'https://www.fss.or.kr',
      'https://www.kinfa.or.kr',
    ],
  },
  {
    slug: 'insurance-personal',
    title: '보험·실비',
    shortTitle: '보험',
    description: '실손·치아·운전자, 진짜 필요한 보험만 골라내기.',
    metaDescription: '실손보험 청구·운전자보험·치아보험·암보험·자녀보험·생명보험 비교. 보험협회·금감원 공시 기준으로 진짜 필요한 보장만 골라내는 가이드.',
    emoji: '🏥',
    accent: '#5B8DEF',
    seedKeywords: ['실손보험', '운전자보험', '치아보험', '암보험'],
    cpcTier: '최상',
    authorityCoverage: 0.55,
    adRiskTier: 'high',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/보험',
      'https://ko.wikipedia.org/wiki/실손의료보험',
      'https://www.fss.or.kr',
      'https://www.knia.or.kr',
    ],
  },
  {
    slug: 'pension',
    title: '노후·연금',
    shortTitle: '연금',
    description: '국민연금·퇴직연금·개인연금, 나의 노후 시뮬레이션.',
    metaDescription: '국민연금 수령 시기·퇴직연금 IRP·개인연금·연금저축·DB/DC 비교. 국민연금공단·금감원 자료로 노후 시뮬레이션과 절세 전략을 안내합니다.',
    emoji: '🌱',
    accent: '#00A77F',
    seedKeywords: ['국민연금수령', '퇴직연금IRP', '개인연금', '연금저축펀드'],
    cpcTier: '상',
    authorityCoverage: 0.8,
    adRiskTier: 'medium',
    entityRefs: [
      'https://ko.wikipedia.org/wiki/연금',
      'https://ko.wikipedia.org/wiki/국민연금',
      'https://www.nps.or.kr',
      'https://www.knps.or.kr',
    ],
  },
] as const;

export const findCluster = (slug: string): Cluster | undefined =>
  clusters.find((c) => c.slug === slug);

/**
 * 다크 모드에서 가독성이 떨어지는 accent (#0F1B2D 등)를 밝은 fallback으로 치환.
 * 라이트 모드에서는 accent 그대로 반환되도록 light/dark 두 토큰을 함께 사용.
 */
export function clusterAccentDark(accent: string): string {
  return accent === '#0F1B2D' ? '#5B8DEF' : accent;
}

/**
 * 자동 발행 파이프라인 — cluster의 권위 답변 가능률에 따라 ad_policy 자동 권고.
 *
 *   coverage < 0.7 → contains_financial_advice=true 자동 체크 (금융 자문 면책 강화)
 *   coverage < 0.6 → framing="explainer" 강제 (decision-guide 금지)
 *
 * Plan agent #2 spec 기반 — savings·auto·credit-loan·insurance-personal 보호.
 */
export function recommendedAdPolicy(slug: string): {
  contains_financial_advice: boolean;
  forced_framing: 'explainer' | null;
} {
  const c = findCluster(slug);
  const cov = c?.authorityCoverage ?? 1;
  return {
    contains_financial_advice: cov < 0.7,
    forced_framing: cov < 0.6 ? 'explainer' : null,
  };
}
