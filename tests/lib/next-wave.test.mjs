/**
 * next-wave·queue-set 단위 테스트 — 다음 물결 판정과 눈 확인 점수 (docs/28-naver-gap-200-plan-2026-10.md 3-4)
 * 단계 정의는 목록 위젯 범례·.claude/commands/목록.md 와 같아야 한다.
 */
import { describe, it, expect } from 'vitest';
import { extractTerms, measureSeries, stageOf, seasonOf, lastYearWindow, dateAxis } from '../../scripts/audit/next-wave.mjs';
import { parseEye, rescore } from '../../scripts/audit/queue-set.mjs';

describe('extractTerms', () => {
  it('제도·상품 이름을 뽑는다', () => {
    expect([...extractTerms('청년미래적금 2차 신청부터 프리랜서 세금 환급까지')]).toContain('청년미래적금');
    expect([...extractTerms('근로장려금 지급일은?')]).toEqual(['근로장려금']);
  });
  it('꼬리만 있는 일반명사는 앞 낱말과 붙인다', () => {
    expect([...extractTerms('찾아가지 않은 건강보험료 환급금 신청하세요')]).toContain('건강보험료 환급금');
  });
  it('자매 awoo 주제·지원금·지역 기사·금융사 상품은 뺀다', () => {
    expect([...extractTerms('김해 민생지원금 신청 시작')]).toEqual([]);
    expect([...extractTerms('경북 칠곡군, 출산장려금 확대')]).toEqual([]);
    expect([...extractTerms('제주시 지방세 체납액 고강도 징수')]).toEqual([]);
    expect([...extractTerms('한투운용 연금 투자자 공략')]).toEqual([]);
    expect([...extractTerms('민간 아파트 부정청약 80%')]).toEqual([]);
  });
});

describe('measureSeries', () => {
  it('기준어 최근 28일 평균 = 100 으로 환산하고 직전 3주 대비 배수를 낸다', () => {
    const anchor = Array(56).fill(50);
    const series = [...Array(49).fill(10), ...Array(7).fill(20)];
    const m = measureSeries(series, anchor);
    expect(m.level).toBe(40);
    expect(m.base).toBe(20);
    expect(m.growth).toBe(2);
    expect(m.weekly).toHaveLength(8);
  });
  it('직전 3주가 거의 0 이면 배수 대신 새로 잡힘', () => {
    const m = measureSeries([...Array(49).fill(0), ...Array(7).fill(5)], Array(56).fill(50));
    expect(m.growth).toBeNull();
    expect(m.fromZero).toBe(true);
  });
});

describe('stageOf', () => {
  it('지금 뜨는 중: 1.4배 이상·크기 8 이상', () => {
    expect(stageOf({ level: 10, base: 7, growth: 1.4 })).toBe('rising');
    expect(stageOf({ level: 7, base: 4, growth: 1.8 })).toBe('growing');
  });
  it('곧 뜸: 감시 목록이고 작년 한두 달 뒤 1.5배 이상', () => {
    const m = { level: 16.8, base: 13, growth: 1.3 };
    expect(stageOf(m, { curated: true, season: { up: 10.4, peakMonth: 12, lastYear: 15 } })).toBe('soon');
    expect(stageOf(m, { curated: false, season: { up: 10.4, peakMonth: 12, lastYear: 15 } })).toBe('growing');
  });
  it('꺾이는 중: 0.6배 이하이고 직전 3주 10 이상', () => {
    expect(stageOf({ level: 40, base: 80, growth: 0.5 })).toBe('fading');
    expect(stageOf({ level: 4, base: 8, growth: 0.5 })).toBe('steady');
  });
  it('큰데 우리 글 적음: 감시 목록·크기 30 이상·글 2개 이하', () => {
    expect(stageOf({ level: 40, base: 40, growth: 1 }, { curated: true, posts: 2 })).toBe('thin');
    expect(stageOf({ level: 40, base: 40, growth: 1 }, { curated: true, posts: 3 })).toBe('steady');
  });
});

describe('계절', () => {
  it('작년 이번 달·다음 두 달 창', () => {
    expect(lastYearWindow('2026-10-07')).toEqual({ start: '2025-10-01', end: '2025-12-31', months: ['2025-10-01', '2025-11-01', '2025-12-01'] });
  });
  it('한두 달 뒤 최고 배수와 그 달', () => {
    const win = lastYearWindow('2026-10-07');
    expect(seasonOf([10, 20, 104], [50, 50, 50], win)).toEqual({ up: 10.4, peakMonth: 12, lastYear: 20 });
    expect(seasonOf([0, 5, 5], [50, 50, 50], win)).toBeNull();
  });
  it('날짜 축', () => {
    expect(dateAxis('2026-10-01', '2026-10-03')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
});

describe('queue-set 눈 확인', () => {
  it('값 읽기', () => {
    expect(parseEye('첫 화면')).toBe(1);
    expect(parseEye('"한 번 스크롤"')).toBe(2);
    expect(parseEye('그 아래')).toBe(3);
    expect(parseEye('clear')).toBe(0);
    expect(parseEye('모름')).toBeNull();
  });
  it('첫 화면은 +10, 한 번 스크롤은 +5 로 다시 계산한다', () => {
    const it = {
      track: 'T2', score: 80, reasons: ['자리 열림', '빈자리 6', '상위 5 관공서·공단·도구 없음', '뉴스 벽 없음'],
      demand: { kinExact: 11, rel30: 0 }, ledger: { verdict: 'PASS' },
      serp: { rank: null, openSlots: 6, wallTop5: 0, newsWall: 0, eyeOffset: null, verdictT2: 'open', fincoAbove: 1 },
    };
    expect(rescore(it, 1).score).toBe(90);
    expect(rescore(it, 2).score).toBe(85);
    expect(rescore(it, 3).score).toBe(80);
  });
});

describe('gap-outcomes rankAt', async () => {
  const { rankAt } = await import('../../scripts/audit/gap-outcomes.mjs');
  const series = [{ date: '2026-09-30', rank: 0 }, { date: '2026-10-07', rank: 15 }];
  it('발행 후 n일에 가장 가까운 측정(±2일)', () => {
    expect(rankAt(series, '2026-09-23', 7, '2026-10-07')).toBe(0);
    expect(rankAt(series, '2026-09-23', 14, '2026-10-07')).toBe(15);
    expect(rankAt(series, '2026-09-20', 14, '2026-10-07')).toBeNull();
  });
  it('아직 n일이 안 지났으면 빈칸', () => {
    expect(rankAt(series, '2026-10-06', 3, '2026-10-07')).toBeNull();
  });
});

describe('wave-auto pickTerms', async () => {
  const { pickTerms } = await import('../../scripts/audit/wave-auto.mjs');
  const wave = { items: [
    { term: '청년미래적금', stage: 'rising', score: 900 },
    { term: '근로장려금', stage: 'fading', score: 40 },
    { term: '연말정산', stage: 'soon', score: 170 },
  ] };
  const seeds = { seeds: [{ term: '연말정산' }, { term: '퇴직금' }, { term: '주휴수당' }], ignore: ['주휴수당'] };
  const big = { axes: [{ keywords: [{ keyword: '민생지원금' }, { keyword: '실업급여' }] }] };
  it('뜨는 묶음을 먼저, 꺾이는 묶음·보류·자매 주제는 빼고 돌아가며 채운다', () => {
    const r = pickTerms({ wave, seeds, big, log: { terms: {} }, today: '2026-10-08', maxTerms: 4 }).map((x) => x.term);
    expect(r).toEqual(['청년미래적금', '연말정산', '실업급여', '퇴직금']);
  });
  it('7일 안에 쪼갠 주제는 건너뛴다', () => {
    const log = { terms: { 청년미래적금: { at: '2026-10-05' }, 실업급여: { at: '2026-09-30' } } };
    const r = pickTerms({ wave, seeds, big, log, today: '2026-10-08', maxTerms: 3 }).map((x) => x.term);
    expect(r).toEqual(['연말정산', '퇴직금', '실업급여']);
  });
});
