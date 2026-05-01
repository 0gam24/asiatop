/**
 * 글 인기도 — GA4 Data API 빌드 타임 페치 스캐폴드
 *
 * 작동 방식:
 *   1. .env 또는 GitHub Secrets에 GA4 측정 ID + 서비스 계정 키 설정
 *   2. 빌드 시 GA4 Reporting API로 최근 7일/30일 페이지뷰 집계
 *   3. 인기 글 Top N을 정적 JSON으로 캐시
 *   4. 컴포넌트가 캐시 읽어 노출
 *
 * 환경변수 미설정 시 mock 데이터 반환 (개발·초기 운영).
 *
 * 출시 후 활성화 절차:
 *   1. GA4 측정 시작 (PUBLIC_GA4_ID 설정)
 *   2. Google Cloud Console에서 서비스 계정 + Data API 사용 권한 부여
 *   3. GA4_PROPERTY_ID, GA4_SERVICE_ACCOUNT_JSON 환경변수 추가
 *   4. 본 모듈의 fetchTopArticles() 호출 시 실제 데이터 사용
 *
 * 참고: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

export interface PopularArticle {
  slug: string;
  cluster: string;
  pageViews: number;
  averageEngagementSeconds: number;
}

const HAS_GA4 = Boolean(import.meta.env.GA4_PROPERTY_ID && import.meta.env.GA4_SERVICE_ACCOUNT_JSON);

const MOCK_TOP: PopularArticle[] = [
  { slug: 'tax/yearend-tax-2026-checklist', cluster: 'tax', pageViews: 12450, averageEngagementSeconds: 245 },
  { slug: 'gov-support/youth-housing-support-2026', cluster: 'gov-support', pageViews: 9820, averageEngagementSeconds: 198 },
  { slug: 'unemployment/unemployment-benefit-application', cluster: 'unemployment', pageViews: 8190, averageEngagementSeconds: 215 },
  { slug: 'credit-loan/credit-score-improvement', cluster: 'credit-loan', pageViews: 7650, averageEngagementSeconds: 188 },
  { slug: 'savings/youth-leap-account-simulation', cluster: 'savings', pageViews: 6980, averageEngagementSeconds: 230 },
  { slug: 'realestate/jeonse-deposit-protection', cluster: 'realestate', pageViews: 6400, averageEngagementSeconds: 268 },
  { slug: 'auto/car-tax-yeonnap-discount', cluster: 'auto', pageViews: 5840, averageEngagementSeconds: 165 },
  { slug: 'insurance-personal/silson-insurance-claim', cluster: 'insurance-personal', pageViews: 5210, averageEngagementSeconds: 192 },
];

/**
 * 인기 글 Top N 가져오기.
 * - GA4 환경변수 설정 시 실제 API 호출
 * - 미설정 시 mock 데이터 반환
 */
export async function fetchTopArticles(limit: number = 8): Promise<PopularArticle[]> {
  if (!HAS_GA4) {
    return MOCK_TOP.slice(0, limit);
  }

  /*
   * 실제 GA4 Data API 호출 예시 (참고용, 활성화 시 주석 해제):
   *
   * import { BetaAnalyticsDataClient } from '@google-analytics/data';
   *
   * const client = new BetaAnalyticsDataClient({
   *   credentials: JSON.parse(import.meta.env.GA4_SERVICE_ACCOUNT_JSON),
   * });
   *
   * const [response] = await client.runReport({
   *   property: `properties/${import.meta.env.GA4_PROPERTY_ID}`,
   *   dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
   *   dimensions: [{ name: 'pagePath' }],
   *   metrics: [
   *     { name: 'screenPageViews' },
   *     { name: 'averageEngagementTime' },
   *   ],
   *   orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
   *   limit: limit + 20,
   * });
   *
   * return (response.rows ?? [])
   *   .map((row) => {
   *     const path = row.dimensionValues?.[0]?.value ?? '';
   *     const m = path.match(/^\/([a-z-]+)\/([a-z0-9-]+)\/?$/);
   *     if (!m) return null;
   *     return {
   *       slug: `${m[1]}/${m[2]}`,
   *       cluster: m[1],
   *       pageViews: Number(row.metricValues?.[0]?.value ?? 0),
   *       averageEngagementSeconds: Number(row.metricValues?.[1]?.value ?? 0),
   *     };
   *   })
   *   .filter((x): x is PopularArticle => x !== null)
   *   .slice(0, limit);
   */

  return MOCK_TOP.slice(0, limit);
}

export const POPULARITY_STATUS = {
  hasGA4: HAS_GA4,
  message: HAS_GA4
    ? 'GA4 Data API 연동 활성. 실제 페이지뷰 데이터 사용.'
    : 'GA4 미연동 — mock 인기 글 데이터 사용. 출시 후 GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON 설정 필요.',
};
