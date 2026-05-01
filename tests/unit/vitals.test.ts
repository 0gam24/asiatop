import { describe, it, expect } from 'vitest';
import { classify } from '../../src/lib/vitals';

describe('classify (CWV rating)', () => {
  it('LCP — 통합 임계값 (2026)', () => {
    expect(classify('LCP', 2000)).toBe('good');
    expect(classify('LCP', 2500)).toBe('good');
    expect(classify('LCP', 3000)).toBe('needs-improvement');
    expect(classify('LCP', 4001)).toBe('poor');
  });

  it('INP — 본 사이트 강화 임계값 (good ≤ 150ms)', () => {
    expect(classify('INP', 100)).toBe('good');
    expect(classify('INP', 150)).toBe('good');
    expect(classify('INP', 151)).toBe('needs-improvement');
    expect(classify('INP', 500)).toBe('needs-improvement');
    expect(classify('INP', 501)).toBe('poor');
  });

  it('CLS — good ≤ 0.1, poor > 0.25', () => {
    expect(classify('CLS', 0.05)).toBe('good');
    expect(classify('CLS', 0.1)).toBe('good');
    expect(classify('CLS', 0.2)).toBe('needs-improvement');
    expect(classify('CLS', 0.3)).toBe('poor');
  });

  it('FCP — good ≤ 1800', () => {
    expect(classify('FCP', 1500)).toBe('good');
    expect(classify('FCP', 1800)).toBe('good');
    expect(classify('FCP', 2000)).toBe('needs-improvement');
    expect(classify('FCP', 3500)).toBe('poor');
  });

  it('TTFB — good ≤ 800', () => {
    expect(classify('TTFB', 500)).toBe('good');
    expect(classify('TTFB', 800)).toBe('good');
    expect(classify('TTFB', 1500)).toBe('needs-improvement');
    expect(classify('TTFB', 2000)).toBe('poor');
  });

  it('알 수 없는 메트릭은 needs-improvement로 분류', () => {
    expect(classify('UNKNOWN', 100)).toBe('needs-improvement');
  });
});
