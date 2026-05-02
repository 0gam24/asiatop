import { describe, it, expect } from 'vitest';
import { mapCluster } from '../../scripts/gates/g2-cluster-map.mjs';

describe('G2 — mapCluster', () => {
  it('정부지원금 명확 매칭 → gov-support', () => {
    const r = mapCluster('청년월세지원 신청 자격이 어떻게 되나요?');
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe('gov-support');
    expect(r.score).toBeGreaterThan(0);
  });

  it('연말정산 매칭 → tax', () => {
    const r = mapCluster('연말정산 인적공제 부양가족 등록 어떻게 하나요');
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe('tax');
  });

  it('실업급여 매칭 → unemployment', () => {
    const r = mapCluster('자발적 퇴사인데 실업급여 받을 수 있나요? 권고사직으로 처리되었어요');
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe('unemployment');
  });

  it('전세보증금 매칭 → realestate', () => {
    const r = mapCluster('전세보증금 반환 안 해주는데 HUG 보증보험 청구 절차');
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe('realestate');
  });

  it('연금 매칭 → pension', () => {
    const r = mapCluster('국민연금 임의가입 IRP 연금저축 어떤 게 더 유리한가요?');
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe('pension');
  });

  it('어떤 cluster 키워드도 없으면 g2-no-match', () => {
    const r = mapCluster('오늘 날씨 어때요? 비 와요?');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g2-no-match');
  });

  it('빈 입력 → g2-empty', () => {
    const r = mapCluster('');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g2-empty');
  });

  it('낮은 점수(짧은 일반 단어 1개)는 폐기', () => {
    const r = mapCluster('자동차 사고 났어요'); // 자동차세·자동차보험 키워드 미매칭, 일반 "자동차" 단어
    // 일반 "자동차"는 키워드 사전에 없음 → score 0 → g2-no-match
    expect(r.pass).toBe(false);
  });

  it('ranking 배열 반환 (디버깅용)', () => {
    const r = mapCluster('청년월세지원 자격');
    expect(Array.isArray(r.ranking)).toBe(true);
    expect(r.ranking[0].cluster).toBe('gov-support');
    expect(r.ranking[0].matched.length).toBeGreaterThan(0);
  });

  // ─── 12 cluster 정확도 매트릭스 (확장된 키워드 사전 검증) ───
  it.each([
    ['credit-loan', 'KCB 신용점수 올리는 방법 마이너스통장 한도'],
    ['insurance-personal', '실손보험 4세대 갱신 운전자보험 필요할까요'],
    ['savings', 'ISA 일반형 서민형 차이 CMA 통장 비교'],
    ['insurance-labor', '주휴수당 주 15시간 미만 사업장 적용'],
    ['auto', '자동차세 연납 할인 다이렉트 자동차보험 비교'],
    ['public-services', '공동인증서 만료 정부24 재발급'],
    ['office-tips', '식대 비과세 한도 야근수당 통상임금'],
    ['tax', '월세세액공제 한도 13월의 월급 환급'],
    ['gov-support', '근로장려금 자녀장려금 EITC CTC'],
    ['pension', '국민연금 임의가입 추납 노령연금 수령'],
    ['unemployment', '권고사직 자발적 퇴사 실업급여 받을 수 있나요'],
    ['realestate', 'HUG 전세보증보험 청구 디딤돌대출 청약통장'],
  ])('cluster=%s 매핑 정확', (expectedCluster, question) => {
    const r = mapCluster(question);
    expect(r.pass).toBe(true);
    expect(r.cluster).toBe(expectedCluster);
  });
});
