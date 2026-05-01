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
});
