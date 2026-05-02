/**
 * 자동 등록 하네스 단위 테스트 — R49 #49-5
 *
 * `scripts/audit/auto-registration.mjs` 의 핵심 함수들을 격리 검증.
 * dist/ 미존재 시 audit() 자체는 ok=false 반환 (회귀 차단 유지).
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectArticles, audit } from '../../scripts/audit/auto-registration.mjs';

const ROOT = process.cwd();
const DIST = resolve(ROOT, 'dist');

describe('collectArticles — frontmatter 파싱 + 정렬', () => {
  it('모든 발행 글(!draft)을 수집', () => {
    const articles = collectArticles();
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(a.cluster).toBeTruthy();
      expect(a.slug).toBeTruthy();
      expect(a.publishedAt).toBeInstanceOf(Date);
    }
  });

  it('updatedAt ?? publishedAt 기준 최신순 정렬 (rss·atom·feed.json과 동일 키)', () => {
    const articles = collectArticles();
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i - 1].sortKey).toBeGreaterThanOrEqual(articles[i].sortKey);
    }
  });

  it('각 글의 cluster·slug가 unique', () => {
    const articles = collectArticles();
    const keys = articles.map((a) => `${a.cluster}/${a.slug}`);
    const uniq = new Set(keys);
    expect(uniq.size).toBe(keys.length);
  });
});

describe('audit() — dist 산출물 검증', () => {
  it.skipIf(!existsSync(DIST))('현재 dist 상태에서 0 errors (모든 발행 글이 모든 채널에 등록)', () => {
    const result = audit();
    if (!result.ok) {
      const summary = result.errors.slice(0, 5).map((e) => e.join(' / ')).join('\n');
      throw new Error(`자동 등록 누락 ${result.errors.length}건. 첫 5건:\n${summary}`);
    }
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.skipIf(!existsSync(DIST))('채널별 등록 카운트 sanity (sitemap ≥ articles, rss/atom/feed.json ≤ 50)', () => {
    const result = audit();
    expect(result.stats.articles).toBeGreaterThan(0);
    expect(result.stats.sitemap).toBeGreaterThanOrEqual(result.stats.articles);
    expect(result.stats.rssMain).toBeLessThanOrEqual(60); // 50 캡 + heading 여유
    expect(result.stats.atom).toBeLessThanOrEqual(60);
    expect(result.stats.feedJson).toBeLessThanOrEqual(60);
    expect(result.stats.categoryRss).toBe(12);
    expect(result.stats.llmsCluster).toBe(12);
  });
});

describe('audit() — dist 부재 시 fail-closed', () => {
  it.skipIf(existsSync(DIST))('dist 없으면 ok=false 반환', () => {
    const result = audit();
    expect(result.ok).toBe(false);
    expect(result.errors[0][0]).toBe('DIST_MISSING');
  });
});
