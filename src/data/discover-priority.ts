/**
 * Google Discover 우선 푸시 매니페스트
 *
 * content-agent 추천 (시의성 + CPC + 페르소나 적합도 기준).
 * 출시 후 GSC > Discover 보고서에서 노출 데이터 누적되면 재정렬.
 */

export interface DiscoverPriority {
  slug: string;
  cluster: string;
  reason: string;
  season?: string;
  cpcTier: '하' | '중' | '상' | '최상';
}

export const DISCOVER_PRIORITY_8: readonly DiscoverPriority[] = [
  {
    slug: 'yearend-tax-2026-checklist',
    cluster: 'tax',
    reason: '4~5월 환급금 도착 시즌 + CPC 상',
    season: 'Q1·Q2',
    cpcTier: '상',
  },
  {
    slug: 'youth-housing-support-2026',
    cluster: 'gov-support',
    reason: '직장인·사회초년생 페르소나 정확 일치',
    season: '연중',
    cpcTier: '중',
  },
  {
    slug: 'earned-income-tax-credit-guide',
    cluster: 'gov-support',
    reason: '5월 신청 마감 시즌성 폭발',
    season: 'Q2',
    cpcTier: '중',
  },
  {
    slug: 'child-allowance-comparison',
    cluster: 'gov-support',
    reason: '자녀장려금 + 5월 종소세 동시',
    season: 'Q2',
    cpcTier: '중',
  },
  {
    slug: 'credit-score-improvement',
    cluster: 'credit-loan',
    reason: 'CPC 최상 + 직장인 일상 호기심',
    season: '연중',
    cpcTier: '최상',
  },
  {
    slug: 'severance-irp-lump-sum-vs-pension',
    cluster: 'unemployment',
    reason: '이직 시즌(3·9월) + Transactional',
    season: 'Q1·Q3',
    cpcTier: '상',
  },
  {
    slug: 'unemployment-benefit-application',
    cluster: 'unemployment',
    reason: '경기 둔화 시 Discover 트래픽 폭증',
    season: '연중',
    cpcTier: '중',
  },
  {
    slug: 'car-tax-yeonnap-discount',
    cluster: 'auto',
    reason: '1월·6월 두 번 시즌성',
    season: 'Q1·Q2',
    cpcTier: '상',
  },
] as const;

export const DISCOVER_PRIORITY_SLUGS = new Set(
  DISCOVER_PRIORITY_8.map((d) => `${d.cluster}/${d.slug}`),
);

export function isDiscoverPriority(cluster: string, slug: string): boolean {
  return DISCOVER_PRIORITY_SLUGS.has(`${cluster}/${slug}`);
}
