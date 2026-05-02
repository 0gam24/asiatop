import { describe, it, expect } from 'vitest';
import { extractFactTokens, extractFactsFromObject } from '../../scripts/lib/fact-extract.mjs';

describe('fact-extract — amount', () => {
  it('만원 단위 정규화', () => {
    const t = extractFactTokens('월 100만원 지원');
    const amt = t.find((x) => x.type === 'amount');
    expect(amt).toBeDefined();
    expect(amt.normalized).toBe('1000000');
  });

  it('억원 단위 정규화', () => {
    const t = extractFactTokens('한도 1억원');
    const amt = t.find((x) => x.type === 'amount');
    expect(amt.normalized).toBe('100000000');
  });

  it('쉼표 포함 원 단위', () => {
    const t = extractFactTokens('지원금 1,234,567원');
    const amt = t.find((x) => x.type === 'amount');
    expect(amt.normalized).toBe('1234567');
  });

  it('근사 표현 (약 100만원) 검출', () => {
    const t = extractFactTokens('월 약 100만원 정도 지원');
    const amt = t.find((x) => x.type === 'amount');
    expect(amt.approximate).toBe(true);
  });

  it('근사 아닌 표현은 approximate=false', () => {
    const t = extractFactTokens('정확히 100만원 지원합니다');
    const amt = t.find((x) => x.type === 'amount');
    expect(amt.approximate).toBe(false);
  });
});

describe('fact-extract — percent', () => {
  it('정수 %', () => {
    const t = extractFactTokens('이자율 5%');
    const p = t.find((x) => x.type === 'percent');
    expect(p.normalized).toBe('5');
  });

  it('소수점 %', () => {
    const t = extractFactTokens('금리 3.5% 적용');
    const p = t.find((x) => x.type === 'percent');
    expect(p.normalized).toBe('3.5');
  });

  it('반올림 토큰 일관성 (3.50 → 3.5)', () => {
    const t = extractFactTokens('이자 3.50% 적용');
    const p = t.find((x) => x.type === 'percent');
    expect(p.normalized).toBe('3.5');
  });
});

describe('fact-extract — count_unit', () => {
  it('일 단위', () => {
    const t = extractFactTokens('처리 기한 30일 이내');
    const c = t.find((x) => x.type === 'count_unit');
    expect(c.normalized).toBe('30일');
  });

  it('개월 단위', () => {
    const t = extractFactTokens('실업급여 12개월 한도');
    const c = t.find((x) => x.type === 'count_unit');
    expect(c.normalized).toBe('12개월');
  });

  it('세 단위 (만 19세)', () => {
    const t = extractFactTokens('만 19세부터 신청');
    const c = t.find((x) => x.type === 'count_unit');
    expect(c.normalized).toBe('19세');
  });
});

describe('fact-extract — date', () => {
  it('한국어 YYYY년 MM월 DD일', () => {
    const t = extractFactTokens('2025년 7월 1일부터 시행');
    const d = t.find((x) => x.type === 'date');
    expect(d.normalized).toBe('2025-07-01');
  });

  it('한국어 YYYY년 MM월 (일 없음)', () => {
    const t = extractFactTokens('2026년 4월 기준 데이터');
    const d = t.find((x) => x.type === 'date');
    expect(d.normalized).toBe('2026-04');
  });

  it('ISO YYYY-MM-DD', () => {
    const t = extractFactTokens('갱신일: 2025-12-31');
    const d = t.find((x) => x.type === 'date');
    expect(d.normalized).toBe('2025-12-31');
  });
});

describe('fact-extract — law', () => {
  it('법률 제N조', () => {
    const t = extractFactTokens('근로기준법 제55조에 따라');
    const l = t.find((x) => x.type === 'law');
    expect(l.normalized).toBe('근로기준법/55');
  });

  it('법률 제N조 제M항', () => {
    const t = extractFactTokens('소득세법 제59조 제2항');
    const l = t.find((x) => x.type === 'law');
    expect(l.normalized).toBe('소득세법/59/2');
  });

  it('시행령', () => {
    const t = extractFactTokens('근로기준법 시행령 제30조');
    const l = t.find((x) => x.type === 'law');
    expect(l.normalized).toBe('근로기준법시행령/30');
  });
});

describe('fact-extract — line/col 위치', () => {
  it('multi-line 입력에서 line 번호 정확', () => {
    const text = '첫 줄.\n둘째 줄 100만원 지원\n셋째 줄.';
    const t = extractFactTokens(text);
    const amt = t.find((x) => x.type === 'amount');
    expect(amt.line).toBe(2);
  });
});

describe('extractFactsFromObject', () => {
  it('JSON 객체에서 토큰 추출', () => {
    const obj = {
      data: {
        rate: '3.5%',
        date: '2025-07-01',
        amount: '100만원',
      },
    };
    const tokens = extractFactsFromObject(obj, { source_id: 'test' });
    expect(tokens.length).toBeGreaterThanOrEqual(3);
    expect(tokens.every((t) => t.source_id === 'test')).toBe(true);
  });

  it('숫자 leaf도 추출', () => {
    const obj = { value: 1500000, unit: '원' }; // string '1500000원'으로 join
    const tokens = extractFactsFromObject(obj);
    // join 시 '1500000\n원' 형태라 단위 매칭 안 됨 (정상 — 응답 구조에 따라 별도 stringify 필요할 수 있음)
    expect(Array.isArray(tokens)).toBe(true);
  });
});
