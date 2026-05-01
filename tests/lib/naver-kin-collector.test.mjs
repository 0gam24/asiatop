import { describe, it, expect } from 'vitest';
import {
  searchKin,
  searchKinBulk,
  extractSourceSignal,
  loadKinFixture,
} from '../../scripts/lib/naver-kin-collector.mjs';

describe('naver-kin-collector — searchKin (mock 모드)', () => {
  it('fixture 매칭 시 item 반환', async () => {
    const items = await searchKin('청년월세지원', { mock: true });
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].query).toBe('청년월세지원');
    expect(items[0].sort).toBe('date');
    expect(items[0].rank).toBe(1);
  });

  it('HTML 태그 stripped (title, description)', async () => {
    const items = await searchKin('청년월세지원', { mock: true });
    expect(items[0].title).not.toContain('<b>');
    expect(items[0].title).not.toContain('</b>');
  });

  it('fixture 누락 query → 빈 배열', async () => {
    const items = await searchKin('존재하지않는키워드_zzz', { mock: true });
    expect(items).toEqual([]);
  });

  it('collected_at은 ISO 8601', async () => {
    const items = await searchKin('청년월세지원', { mock: true });
    expect(items[0].collected_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('naver-kin-collector — searchKinBulk', () => {
  it('여러 키워드 → link 기준 dedup', async () => {
    const items = await searchKinBulk(
      ['청년월세지원', '청년월세지원'],
      { mock: true },
    );
    // 같은 query 두 번 → 같은 link 중복 제거
    const links = items.map((i) => i.link);
    expect(new Set(links).size).toBe(links.length);
  });
});

describe('naver-kin-collector — extractSourceSignal', () => {
  it('짧은 description (< 20) → unmet_market_score=3', () => {
    const r = extractSourceSignal({ description: '짧은답변' });
    expect(r.unmet_market_score).toBe(3);
    expect(r.description_length).toBe(4);
  });

  it('중간 description (20~50) → score 2', () => {
    const r = extractSourceSignal({ description: 'a'.repeat(35) });
    expect(r.unmet_market_score).toBe(2);
  });

  it('긴 description (50~100) → score 1', () => {
    const r = extractSourceSignal({ description: 'a'.repeat(80) });
    expect(r.unmet_market_score).toBe(1);
  });

  it('충분한 description (≥ 100) → score 0', () => {
    const r = extractSourceSignal({ description: 'a'.repeat(150) });
    expect(r.unmet_market_score).toBe(0);
  });
});

describe('naver-kin-collector — searchKin (real mode without keys)', () => {
  it('mock=false + 키 없음 → throw', async () => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;
    await expect(searchKin('q', { mock: false })).rejects.toThrow(/NAVER_CLIENT_ID/);
  });
});

describe('naver-kin-collector — loadKinFixture', () => {
  it('직접 호출 가능', () => {
    const items = loadKinFixture('청년월세지원');
    expect(items.length).toBeGreaterThan(0);
  });
});
