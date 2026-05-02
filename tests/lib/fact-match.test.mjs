import { describe, it, expect } from 'vitest';
import { factEquals, classifyTokens } from '../../scripts/lib/fact-match.mjs';

const tok = (type, normalized, raw = normalized, extra = {}) => ({
  type, normalized, raw, line: 1, col: 0, context: raw, approximate: false, ...extra,
});

describe('factEquals — amount', () => {
  it('정확 일치', () => {
    expect(factEquals(tok('amount', '1000000'), tok('amount', '1000000'))).toBe(true);
  });
  it('다른 값', () => {
    expect(factEquals(tok('amount', '1000000'), tok('amount', '2000000'))).toBe(false);
  });
});

describe('factEquals — percent', () => {
  it('정확 일치', () => {
    expect(factEquals(tok('percent', '3.5'), tok('percent', '3.5'))).toBe(true);
  });
  it('±0.001 허용', () => {
    expect(factEquals(tok('percent', '3.5'), tok('percent', '3.5005'))).toBe(true);
  });
  it('±0.01 차이는 fail', () => {
    expect(factEquals(tok('percent', '3.5'), tok('percent', '3.51'))).toBe(false);
  });
});

describe('factEquals — date', () => {
  it('정확 일치 YYYY-MM-DD', () => {
    expect(factEquals(tok('date', '2025-07-01'), tok('date', '2025-07-01'))).toBe(true);
  });

  it('±7일 허용 (2025-07-01 vs 2025-07-08)', () => {
    expect(factEquals(tok('date', '2025-07-01'), tok('date', '2025-07-08'))).toBe(true);
  });

  it('±8일 차이는 fail', () => {
    expect(factEquals(tok('date', '2025-07-01'), tok('date', '2025-07-09'))).toBe(false);
  });

  it('YYYY-MM 매칭: body=YYYY-MM, src=YYYY-MM-DD 같은 월', () => {
    expect(factEquals(tok('date', '2025-07'), tok('date', '2025-07-15'))).toBe(true);
  });

  it('YYYY-MM 매칭: 다른 월은 fail', () => {
    expect(factEquals(tok('date', '2025-07'), tok('date', '2025-08-15'))).toBe(false);
  });
});

describe('factEquals — law', () => {
  it('법률명 + 조 일치', () => {
    expect(factEquals(tok('law', '근로기준법/55'), tok('law', '근로기준법/55'))).toBe(true);
  });

  it('다른 법률명', () => {
    expect(factEquals(tok('law', '근로기준법/55'), tok('law', '소득세법/55'))).toBe(false);
  });

  it('본문에 항 있고 권위에 없으면 통과', () => {
    expect(factEquals(tok('law', '근로기준법/55/2'), tok('law', '근로기준법/55'))).toBe(true);
  });

  it('본문에 항 없으면 권위 항 무관', () => {
    expect(factEquals(tok('law', '근로기준법/55'), tok('law', '근로기준법/55/3'))).toBe(true);
  });

  it('항 번호 다르면 fail', () => {
    expect(factEquals(tok('law', '근로기준법/55/2'), tok('law', '근로기준법/55/3'))).toBe(false);
  });
});

describe('factEquals — count_unit', () => {
  it('동일 type + normalized', () => {
    expect(factEquals(tok('count_unit', '30일'), tok('count_unit', '30일'))).toBe(true);
  });
  it('다른 단위 fail', () => {
    expect(factEquals(tok('count_unit', '30일'), tok('count_unit', '30년'))).toBe(false);
  });
});

describe('factEquals — type 다름', () => {
  it('amount vs percent fail', () => {
    expect(factEquals(tok('amount', '5'), tok('percent', '5'))).toBe(false);
  });
});

describe('classifyTokens', () => {
  it('모두 매칭 → unmatched 0', () => {
    const body = [tok('amount', '1000000'), tok('date', '2025-07-01')];
    const auth = [tok('amount', '1000000'), tok('date', '2025-07-01')];
    const r = classifyTokens(body, auth);
    expect(r.matched.length).toBe(2);
    expect(r.unmatched.length).toBe(0);
  });

  it('approximate는 분모 제외', () => {
    const body = [
      tok('amount', '1000000', '약 100만원', { approximate: true }),
      tok('amount', '500000'),
    ];
    const auth = [tok('amount', '500000')];
    const r = classifyTokens(body, auth);
    expect(r.matched.length).toBe(1);
    expect(r.unmatched.length).toBe(0);
    expect(r.approximate.length).toBe(1);
  });

  it('미매칭 토큰은 unmatched에 reason 부여', () => {
    const body = [tok('amount', '999999')];
    const auth = [tok('amount', '1000000')];
    const r = classifyTokens(body, auth);
    expect(r.unmatched.length).toBe(1);
    expect(r.unmatched[0].reason).toBe('no-match');
  });
});
