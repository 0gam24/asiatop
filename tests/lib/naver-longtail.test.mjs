/**
 * naver-longtail 단위 테스트 — 사이트 표본 비율·꼬리 채굴·대기열 항목 (2026-10-16 운영자 지시 "지식인 질문은 중요하지 않아")
 */
import { describe, it, expect } from 'vitest';
import { wordsOf, cellOf, bandOf, siteRates, mineTails, toQueueItem } from '../../scripts/audit/naver-longtail.mjs';

describe('낱말 수 · 조건 칸', () => {
  it('공백 여러 개도 한 번으로 센다', () => { expect(wordsOf(' 청년미래적금  중도해지 불이익 ')).toBe(3); });
  it('3단어 이상 · 열림 / 1~2단어 · 닫힘', () => {
    expect(cellOf(3, true)).toBe('3단어 이상 · 열림');
    expect(cellOf(4, false)).toBe('3단어 이상 · 닫힘');
    expect(cellOf(2, true)).toBe('1~2단어 · 열림');
  });
  it('결과 수 구간', () => {
    expect(bandOf(29999)).toBe('3만 미만');
    expect(bandOf(30000)).toBe('3만~10만');
    expect(bandOf(1000000)).toBe('100만 이상');
    expect(bandOf(null)).toBe('?');
  });
});

describe('siteRates', () => {
  it('같은 조건 글 수와 10위 안 수를 센다(결과 수가 없는 행은 뺀다)', () => {
    const rows = [
      { query: '종소세 사후 적발', rank: 1, webDocCount: 1097, open: true },
      { query: '청년도약계좌 미가입 6월', rank: 12, webDocCount: 53864, open: true },
      { query: '청년미래적금', rank: null, webDocCount: 820678, open: false },
      { query: '연말정산 서류', rank: 7, webDocCount: 400000, open: true },
      { query: '확정일자', rank: 3, webDocCount: null, open: true },
    ];
    const r = siteRates({ rows });
    expect(r.cell.get('3단어 이상 · 열림')).toEqual({ n: 2, top10: 1 });
    expect(r.cell.get('1~2단어 · 닫힘')).toEqual({ n: 1, top10: 0 });
    expect(r.cell.get('1~2단어 · 열림')).toEqual({ n: 1, top10: 1 });
    expect(r.band.get('3만 미만')).toEqual({ n: 1, top10: 1 });
  });
});

describe('mineTails', () => {
  it('앞말 바로 뒤에 붙는 말을 제목 목록 전체에서 센다(min 2)', () => {
    const blog = ['청년미래적금 중도해지 불이익 정리', '청년미래적금 중도해지 사유'];
    const web = ['청년미래적금 중도해지 방법', '청년미래적금 금리 비교'];
    const r = mineTails('청년미래적금', [blog, web]);
    expect(r[0]).toEqual({ suffix: '중도해지', n: 3 });
    expect(r.every((x) => x.n >= 2)).toBe(true);
  });
});

describe('toQueueItem', () => {
  it('빈틈: 항목으로, 쿼리를 넘겨 3단어 이상 가점과 같은 조건 비율 이유를 단다', () => {
    const r = {
      query: '청년미래적금 중도해지 불이익', head: '청년미래적금', base: '청년미래적금 중도해지', words: 3, family: 'A',
      demand: { rel30: 0.21, activeDays30: 12, ratio7: 1.1 },
      serp: { rank: null, verdictT2: 'open', openSlots: 4, wallTop5: 1, newsWall: 2, webDocCount: 52000, top10: [] },
      site: { cell: '3단어 이상 · 열림', cellN: 87, cellTop10: 21, cellRate: 24.1 },
      ledger: { verdict: 'PASS', program: '청년미래적금', adjacent: 0, relatedSlugs: [] },
    };
    const it0 = toQueueItem(r, '2026-10-16', { cluster: 'savings' });
    expect(it0).toMatchObject({ id: '빈틈:청년미래적금 중도해지 불이익', status: 'proposed', manual: true, addedBy: 'naver-longtail', cluster: 'savings' });
    expect(it0.reasons[0]).toBe('3단어 이상 · 열림 우리 글 87편 중 21편 10위 안(24.1%)');
    expect(it0.reasons).toContain('3단어 이상');
    // 40 열림 + 10 3단어 + 15 빈자리 + 5 관공서 1 + 10 뉴스 + 5 검색량 = 85
    expect(it0.score).toBe(85);
    expect(it0.demand).toEqual({ rel30: 0.21, ratio7: 1.1, activeDays30: 12 });
  });
});
