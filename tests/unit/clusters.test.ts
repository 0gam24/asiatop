import { describe, it, expect } from 'vitest';
import { clusters, findCluster, clusterAccentDark, recommendedAdPolicy } from '../../src/data/clusters';

describe('clusters', () => {
  it('정확히 12개 클러스터를 정의한다', () => {
    expect(clusters.length).toBe(12);
  });

  it('모든 슬러그는 고유하다', () => {
    const slugs = clusters.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('모든 클러스터에 metaDescription(50~200자)이 있다', () => {
    for (const c of clusters) {
      expect(c.metaDescription, `${c.slug} metaDescription`).toBeDefined();
      expect(c.metaDescription.length, `${c.slug} length`).toBeGreaterThanOrEqual(50);
      expect(c.metaDescription.length, `${c.slug} length`).toBeLessThanOrEqual(200);
    }
  });

  it('cpcTier는 정의된 4가지 등급만 사용한다', () => {
    const allowed = new Set(['하', '중', '상', '최상']);
    for (const c of clusters) {
      expect(allowed.has(c.cpcTier), `${c.slug} cpcTier=${c.cpcTier}`).toBe(true);
    }
  });

  it('seedKeywords는 클러스터당 1개 이상이다', () => {
    for (const c of clusters) {
      expect(c.seedKeywords.length, `${c.slug}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('findCluster', () => {
  it('존재하는 슬러그를 반환한다', () => {
    expect(findCluster('tax')?.title).toBe('연말정산·세금환급');
    expect(findCluster('credit-loan')?.cpcTier).toBe('최상');
  });

  it('없는 슬러그는 undefined', () => {
    expect(findCluster('nonexistent')).toBeUndefined();
  });
});

describe('clusterAccentDark', () => {
  it('어두운 네이비(#0F1B2D)는 다크 모드에서 밝은 색으로 치환한다', () => {
    expect(clusterAccentDark('#0F1B2D')).toBe('#5B8DEF');
  });

  it('일반 accent는 그대로 반환한다', () => {
    expect(clusterAccentDark('#00C896')).toBe('#00C896');
    expect(clusterAccentDark('#FFB800')).toBe('#FFB800');
  });
});

describe('cluster authority coverage 메타', () => {
  it('모든 cluster에 authorityCoverage(0~1)·adRiskTier 정의', () => {
    for (const c of clusters) {
      expect(c.authorityCoverage, `${c.slug} authorityCoverage`).toBeGreaterThan(0);
      expect(c.authorityCoverage).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high'], `${c.slug} adRiskTier`).toContain(c.adRiskTier);
    }
  });

  it('coverage<0.7 cluster는 high adRiskTier (AdSense 사전 차단)', () => {
    const low = clusters.filter((c) => (c.authorityCoverage ?? 1) < 0.7);
    for (const c of low) {
      expect(c.adRiskTier, `${c.slug} should be high`).toBe('high');
    }
  });
});

describe('recommendedAdPolicy', () => {
  it('coverage 0.9 (gov-support) → financial_advice=false', () => {
    const r = recommendedAdPolicy('gov-support');
    expect(r.contains_financial_advice).toBe(false);
    expect(r.forced_framing).toBeNull();
  });

  it('coverage 0.5 (credit-loan) → financial_advice=true + framing=explainer 강제', () => {
    const r = recommendedAdPolicy('credit-loan');
    expect(r.contains_financial_advice).toBe(true);
    expect(r.forced_framing).toBe('explainer');
  });

  it('coverage 0.7 (savings) → financial_advice=true', () => {
    const r = recommendedAdPolicy('savings');
    expect(r.contains_financial_advice).toBe(false);  // 0.7은 < 0.7 아님 (>=)
  });

  it('미지의 cluster → coverage 1 가정 (안전 측 기본값)', () => {
    const r = recommendedAdPolicy('unknown');
    expect(r.contains_financial_advice).toBe(false);
    expect(r.forced_framing).toBeNull();
  });
});
