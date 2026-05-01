import { describe, it, expect } from 'vitest';
import { getRelatedArticles, type ArticleLike } from '../../src/lib/related-articles';

const today = new Date('2026-04-01T00:00:00Z');

function mkArticle(
  id: string,
  cluster: string,
  opts: Partial<ArticleLike['data']> & { body?: string } = {},
): ArticleLike {
  return {
    id: `${id}.mdx`,
    body: opts.body ?? '',
    data: {
      title: opts.title ?? `${id} 제목`,
      description: opts.description ?? `${id} 설명`,
      cluster,
      keywords: opts.keywords ?? [cluster, id],
      publishedAt: opts.publishedAt ?? today,
      updatedAt: opts.updatedAt,
      draft: opts.draft ?? false,
    },
  };
}

describe('getRelatedArticles', () => {
  it('현재 글 자체는 결과에서 제외한다', () => {
    const current = mkArticle('a', 'tax');
    const pool = [current, mkArticle('b', 'tax'), mkArticle('c', 'tax')];
    const result = getRelatedArticles(current, pool, 6);
    expect(result.find((a) => a.id === current.id)).toBeUndefined();
  });

  it('draft 글은 제외한다', () => {
    const current = mkArticle('a', 'tax');
    const pool = [
      current,
      mkArticle('b', 'tax', { draft: true }),
      mkArticle('c', 'tax'),
    ];
    const result = getRelatedArticles(current, pool, 6);
    expect(result.find((a) => a.id === 'b.mdx')).toBeUndefined();
  });

  it('같은 클러스터 글이 다른 클러스터 글보다 상위에 온다', () => {
    const current = mkArticle('a', 'tax', { keywords: ['세금'] });
    const sameCluster = mkArticle('same', 'tax', { keywords: ['세금'] });
    const otherCluster = mkArticle('other', 'auto', { keywords: ['자동차'] });
    const result = getRelatedArticles(current, [current, sameCluster, otherCluster], 6);
    expect(result[0]?.id).toBe('same.mdx');
  });

  it('limit을 초과하지 않는다', () => {
    const current = mkArticle('a', 'tax');
    const pool = [
      current,
      ...Array.from({ length: 20 }, (_, i) => mkArticle(`x${i}`, 'tax')),
    ];
    const result = getRelatedArticles(current, pool, 6);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('CPC 최상 클러스터는 결과의 절반(올림)을 초과하지 않는다', () => {
    const current = mkArticle('a', 'tax', { keywords: ['세금'] });
    const cpcMax = Array.from({ length: 10 }, (_, i) =>
      mkArticle(`cpc${i}`, 'credit-loan', { keywords: ['세금', 'cpc'] }),
    );
    const others = Array.from({ length: 5 }, (_, i) =>
      mkArticle(`oth${i}`, 'tax', { keywords: ['세금'] }),
    );
    const result = getRelatedArticles(current, [current, ...cpcMax, ...others], 6);
    const cpcInResult = result.filter((a) =>
      ['credit-loan', 'insurance-personal'].includes(a.data.cluster),
    );
    // limit 6 → 절반은 3
    expect(cpcInResult.length).toBeLessThanOrEqual(3);
  });

  it('본문에 링크된 슬러그(explicit mention)를 우대한다', () => {
    const current = mkArticle('a', 'tax', {
      body: '관련 글 [참고](/tax/explicit-target)에서 확인하세요.',
    });
    const explicit = mkArticle('explicit-target', 'tax');
    const generic = mkArticle('generic', 'tax');
    const result = getRelatedArticles(current, [current, generic, explicit], 6);
    expect(result[0]?.id).toBe('explicit-target.mdx');
  });

  it('인접 클러스터로 부족분을 채운다', () => {
    const current = mkArticle('a', 'realestate', { keywords: ['부동산'] });
    // 같은 클러스터 글 0개, 인접(gov-support, tax) 글 다수
    const pool = [
      current,
      mkArticle('gov1', 'gov-support', { keywords: ['지원금'] }),
      mkArticle('tax1', 'tax', { keywords: ['세금'] }),
    ];
    const result = getRelatedArticles(current, pool, 6);
    const clusters = new Set(result.map((a) => a.data.cluster));
    expect(clusters.has('gov-support') || clusters.has('tax')).toBe(true);
  });
});
