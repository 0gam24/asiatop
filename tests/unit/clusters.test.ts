import { describe, it, expect } from 'vitest';
import { clusters, findCluster, clusterAccentDark } from '../../src/data/clusters';

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
