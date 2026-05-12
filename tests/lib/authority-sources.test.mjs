import { describe, it, expect } from 'vitest';
import { routeByCluster, fetchAllForCluster } from '../../scripts/lib/authority-sources/index.mjs';
import { queryHash } from '../../scripts/lib/authority-sources/_mock-loader.mjs';

describe('authority-sources — routeByCluster', () => {
  it('gov-support 어댑터 매핑', () => {
    const adapters = routeByCluster('gov-support');
    expect(adapters.length).toBeGreaterThanOrEqual(1);
    expect(adapters.some((a) => a.id === 'data-go-kr')).toBe(true);
  });

  it('savings 어댑터 매핑', () => {
    const adapters = routeByCluster('savings');
    expect(adapters.some((a) => a.id === 'bok-ecos')).toBe(true);
  });

  it('pension 어댑터 매핑 (R60 — nps V2 대기, law-go-kr 임시 fallback)', () => {
    const adapters = routeByCluster('pension');
    // V2 (nps endpoint 확정 후) 복귀 예정 — 현재는 law-go-kr 임시
    expect(adapters.some((a) => a.id === 'law-go-kr')).toBe(true);
  });

  it('unemployment 어댑터 매핑 (R60 — work24 V1 미사용)', () => {
    const adapters = routeByCluster('unemployment');
    expect(adapters.some((a) => a.id === 'law-go-kr')).toBe(true);
    expect(adapters.some((a) => a.id === 'work24')).toBe(false);
  });

  it('gov-support 어댑터 매핑 (R60 — welfareGoKr V2 대기)', () => {
    const adapters = routeByCluster('gov-support');
    expect(adapters.some((a) => a.id === 'data-go-kr')).toBe(true);
    expect(adapters.some((a) => a.id === 'welfare-go-kr')).toBe(false);
  });

  it('미지의 cluster는 빈 배열', () => {
    expect(routeByCluster('unknown-cluster')).toEqual([]);
  });
});

describe('authority-sources — queryHash', () => {
  it('동일 query 동일 hash', () => {
    const a = queryHash({ keywords: ['청년월세'], expected_facts: ['월 20만원 지원'] });
    const b = queryHash({ keywords: ['청년월세'], expected_facts: ['월 20만원 지원'] });
    expect(a).toBe(b);
  });

  it('keyword 순서 무관 (sort)', () => {
    const a = queryHash({ keywords: ['A', 'B'], expected_facts: [] });
    const b = queryHash({ keywords: ['B', 'A'], expected_facts: [] });
    expect(a).toBe(b);
  });

  it('hash는 12자', () => {
    const h = queryHash({ keywords: [], expected_facts: [] });
    expect(h).toMatch(/^[a-f0-9]{12}$/);
  });
});

describe('authority-sources — fetchAllForCluster mock 모드', () => {
  it('gov-support fixture sample 호출', async () => {
    const responses = await fetchAllForCluster(
      'gov-support',
      {
        keywords: ['청년월세'],
        expected_facts: [
          '월 20만원 지원',
          '12개월 한도',
          '2025년 7월 1일 시행',
          '소득세법 제59조 제2항',
          '만 19세부터 신청',
        ],
      },
      { mock: true },
    );
    expect(Array.isArray(responses)).toBe(true);
    expect(responses.length).toBeGreaterThan(0);
    const dataGoKr = responses.find((r) => r.source_id === 'data-go-kr');
    expect(dataGoKr).toBeDefined();
    expect(dataGoKr.raw?.policyName).toContain('청년월세');
  });

  it('fixture 누락 시 __missing__ 폴백 (stub raw + facts=[])', async () => {
    const responses = await fetchAllForCluster(
      'gov-support',
      { keywords: ['no-fixture-keyword'], expected_facts: ['nothing'] },
      { mock: true },
    );
    const dataGoKr = responses.find((r) => r.source_id === 'data-go-kr');
    expect(dataGoKr.raw).not.toBeNull();
    expect(dataGoKr.facts).toEqual([]);
  });

  it('미지의 cluster는 빈 배열', async () => {
    const r = await fetchAllForCluster('unknown', { keywords: [], expected_facts: [] });
    expect(r).toEqual([]);
  });
});
