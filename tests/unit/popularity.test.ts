import { describe, it, expect } from 'vitest';
import { fetchTopArticles, POPULARITY_STATUS } from '../../src/lib/popularity';

describe('fetchTopArticles (mock 분기)', () => {
  it('GA4 환경변수 없을 때 mock 데이터를 반환한다', async () => {
    const result = await fetchTopArticles();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      slug: expect.any(String),
      cluster: expect.any(String),
      pageViews: expect.any(Number),
      averageEngagementSeconds: expect.any(Number),
    });
  });

  it('limit 파라미터를 존중한다', async () => {
    const result = await fetchTopArticles(3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('mock 데이터는 pageViews 내림차순으로 정렬되어 있다', async () => {
    const result = await fetchTopArticles(8);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].pageViews).toBeGreaterThanOrEqual(result[i].pageViews);
    }
  });
});

describe('POPULARITY_STATUS', () => {
  it('hasGA4 boolean과 안내 메시지를 노출한다', () => {
    expect(typeof POPULARITY_STATUS.hasGA4).toBe('boolean');
    expect(POPULARITY_STATUS.message).toMatch(/GA4/);
  });
});
