/**
 * naver-volume 단위 테스트 — 기준어 눈금 환산·빈 날짜 채우기·신생 판정 (docs/ops/KEYWORD-PLAN-2026-09-15.md §4-5)
 */
import { describe, it, expect } from 'vitest';
import { dateAxis, alignToAxis, summarizeSeries } from '../../scripts/audit/naver-volume.mjs';

describe('dateAxis', () => {
  it('끝 날짜 포함 과거로 N 일', () => {
    expect(dateAxis('2026-09-14', 3)).toEqual(['2026-09-12', '2026-09-13', '2026-09-14']);
  });
  it('월 경계를 넘는다', () => {
    expect(dateAxis('2026-10-01', 2)).toEqual(['2026-09-30', '2026-10-01']);
  });
});

describe('alignToAxis', () => {
  it('API 가 생략한 0 인 날짜를 채운다', () => {
    const axis = ['2026-09-12', '2026-09-13', '2026-09-14'];
    expect(alignToAxis([{ period: '2026-09-13', ratio: 50 }], axis)).toEqual([0, 50, 0]);
  });
});

const flat = (n, v) => Array.from({ length: n }, () => v);

describe('summarizeSeries', () => {
  it('기준어 최근 30일 평균 = 100 으로 환산한다', () => {
    const anchor = flat(90, 20);
    const kw = flat(90, 10);
    const s = summarizeSeries(kw, anchor);
    expect(s.rel30).toBe(50);
    expect(s.ratio7).toBe(1);
  });

  it('최근 7일이 직전 7일의 2배면 ratio7 = 2', () => {
    const kw = [...flat(76, 10), ...flat(7, 10), ...flat(7, 20)];
    expect(summarizeSeries(kw, flat(90, 10)).ratio7).toBe(2);
  });

  it('90일 창 앞부분이 모두 0 이고 10일 전부터 계속 나오면 신생', () => {
    const kw = [...flat(80, 0), ...flat(10, 5)];
    const s = summarizeSeries(kw, flat(90, 10));
    expect(s.firstSeenDaysAgo).toBe(10);
    expect(s.born).toBe(true);
  });

  it('창 처음부터 값이 있으면 신생이 아니다 (창 길이를 신생일로 착각하지 않는다)', () => {
    const s = summarizeSeries(flat(90, 5), flat(90, 10));
    expect(s.firstSeenDaysAgo).toBe(90);
    expect(s.born).toBe(false);
  });

  it('최근에 딱 하루 튄 값은 신생이 아니라 sparse', () => {
    const kw = [...flat(85, 0), 7, ...flat(4, 0)];
    const s = summarizeSeries(kw, flat(90, 10));
    expect(s.born).toBe(false);
    expect(s.sparse).toBe(true);
  });

  it('기준어가 0 이면 눈금 없음(null)', () => {
    expect(summarizeSeries(flat(90, 5), flat(90, 0)).rel30).toBeNull();
  });
});
