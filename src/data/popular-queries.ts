/**
 * 검색 빈 상태 추천 큐레이션
 *
 * Pagefind 한국어 형태소 미지원 → 매뉴얼 큐레이션 필수.
 * GA4 search_term Top 30 월 1회 리뷰 후 갱신.
 *
 * 시즌 추천: currentDate 기준 자동 분기 매핑.
 */

export interface QuerySuggestion {
  q: string;
  cluster?: string;
  hint?: string;
}

/** 분기 무관 인기 검색어 (CPC·검색량·페르소나 적합도) */
export const POPULAR_QUERIES: readonly QuerySuggestion[] = [
  { q: '연말정산', cluster: 'tax', hint: '13월의 월급' },
  { q: '청년월세지원', cluster: 'gov-support', hint: '월 20만원' },
  { q: '실업급여', cluster: 'unemployment', hint: '일 6.6만원' },
  { q: '신용점수', cluster: 'credit-loan', hint: '50점 올리기' },
  { q: '실수령액', cluster: 'office-tips', hint: '연봉 계산' },
  { q: '자동차세', cluster: 'auto', hint: '9.15% 할인' },
  { q: '청년도약계좌', cluster: 'savings', hint: '5년 5,200만' },
  { q: '주택연금', cluster: 'pension', hint: '평생 매월' },
];

/** 분기별 시즌 추천 (월 1~3 = Q1, 4~6 = Q2, ...) */
const SEASONAL: Record<number, readonly QuerySuggestion[]> = {
  1: [
    { q: '연말정산', cluster: 'tax', hint: '1월 간소화' },
    { q: '자동차세 연납', cluster: 'auto', hint: '1월 9.15% 할인' },
    { q: '실수령액 계산', cluster: 'office-tips', hint: '연봉 협상' },
    { q: '신용점수 올리기', cluster: 'credit-loan', hint: '새해 신용 관리' },
    { q: 'ISA 계좌', cluster: 'savings', hint: '연초 비과세' },
  ],
  2: [
    { q: '연말정산 환급', cluster: 'tax', hint: '2월 환급금' },
    { q: '월세 세액공제', cluster: 'tax', hint: '17% 환급' },
    { q: '의료비 공제', cluster: 'tax', hint: '안경·콘택트' },
    { q: '중소기업 감면', cluster: 'tax', hint: '청년 90%' },
    { q: '신용점수', cluster: 'credit-loan', hint: '50점 올리기' },
  ],
  3: [
    { q: '이직 실업급여', cluster: 'unemployment', hint: '7일 이내' },
    { q: '퇴직금 IRP', cluster: 'unemployment', hint: '일시금 vs 연금' },
    { q: '실수령액', cluster: 'office-tips', hint: '신입·이직' },
    { q: '4대보험', cluster: 'insurance-labor', hint: '취업 시작' },
    { q: '청년도약계좌', cluster: 'savings', hint: '신규 가입' },
  ],
  4: [
    { q: '종합소득세', cluster: 'tax', hint: '5월 신고 준비' },
    { q: '근로장려금', cluster: 'gov-support', hint: '5월 마감' },
    { q: '자녀장려금', cluster: 'gov-support', hint: '연 100만원' },
    { q: '청년월세지원', cluster: 'gov-support', hint: '월 20만원' },
    { q: '연말정산 5년 환급', cluster: 'tax', hint: '경정청구' },
  ],
  5: [
    { q: '종합소득세 신고', cluster: 'tax', hint: '5월 31일 마감' },
    { q: '근로장려금', cluster: 'gov-support', hint: '단독 165만원' },
    { q: '자녀장려금', cluster: 'gov-support', hint: '동시 신청' },
    { q: '프리랜서 세금', cluster: 'tax', hint: '3.3% 합산' },
    { q: '의료비 영수증', cluster: 'tax', hint: '5년 경정청구' },
  ],
  6: [
    { q: '자동차세 환급', cluster: 'auto', hint: '6월 정산' },
    { q: '재산세', cluster: 'tax', hint: '7월 1차분' },
    { q: '청년월세지원', cluster: 'gov-support', hint: '월 20만원' },
    { q: '실업급여', cluster: 'unemployment', hint: '경기 둔화' },
    { q: '햇살론', cluster: 'credit-loan', hint: '저소득 대출' },
  ],
  7: [
    { q: '재산세 1차', cluster: 'tax', hint: '7월 16일~31일' },
    { q: '실업급여 자발적', cluster: 'unemployment', hint: '정당 사유' },
    { q: '주휴수당', cluster: 'insurance-labor', hint: '주 15시간' },
    { q: '실손보험 청구', cluster: 'insurance-personal', hint: '5년 시효' },
    { q: '신용대출 갈아타기', cluster: 'credit-loan', hint: '금리 인하' },
  ],
  8: [
    { q: '청년월세지원 추가', cluster: 'gov-support', hint: '하반기 모집' },
    { q: '연차 미사용', cluster: 'office-tips', hint: '하반기 정리' },
    { q: '실손보험', cluster: 'insurance-personal', hint: '4세대 비교' },
    { q: '4대보험 부담', cluster: 'insurance-labor', hint: '8월 정산' },
    { q: '버팀목 전세대출', cluster: 'realestate', hint: '청년 1.5%' },
  ],
  9: [
    { q: '재산세 2차', cluster: 'tax', hint: '9월 16일~30일' },
    { q: '추석 정부지원', cluster: 'gov-support', hint: '명절 일정' },
    { q: '이직 실업급여', cluster: 'unemployment', hint: '하반기 이직' },
    { q: '연금저축', cluster: 'savings', hint: '연말 납입 시작' },
    { q: '신용카드 공제', cluster: 'tax', hint: '체크카드 30%' },
  ],
  10: [
    { q: '연말정산 미리보기', cluster: 'tax', hint: '10월 시작' },
    { q: '연금저축 IRP', cluster: 'savings', hint: '900만원 한도' },
    { q: '자동차세 1년 환급', cluster: 'auto', hint: '폐차·이전' },
    { q: '신용점수', cluster: 'credit-loan', hint: '연말 정리' },
    { q: '청년도약계좌', cluster: 'savings', hint: '5년 만기' },
  ],
  11: [
    { q: '연말정산 자료', cluster: 'tax', hint: '간소화 12월 준비' },
    { q: '연금저축 12월', cluster: 'savings', hint: '연 900만원 마감' },
    { q: '월세 영수증', cluster: 'tax', hint: '17% 환급' },
    { q: '기부금', cluster: 'tax', hint: '정치자금 100%' },
    { q: '신용대출', cluster: 'credit-loan', hint: '연말 한도' },
  ],
  12: [
    { q: '연금저축 추가 납입', cluster: 'savings', hint: '12월 31일 마감' },
    { q: '연말정산 간소화', cluster: 'tax', hint: '1월 시작' },
    { q: '신용카드 사용', cluster: 'tax', hint: '25% 초과 체크' },
    { q: '자동차세 연납', cluster: 'auto', hint: '내년 1월 준비' },
    { q: '청년월세지원', cluster: 'gov-support', hint: '재신청' },
  ],
};

/** 현재 월 기준 시즌 추천 — 빌드 타임 month 사용 (배포 후 갱신은 월 단위 재빌드) */
export function getSeasonalQueries(now: Date = new Date()): readonly QuerySuggestion[] {
  const month = now.getMonth() + 1;
  return SEASONAL[month] ?? POPULAR_QUERIES.slice(0, 5);
}
