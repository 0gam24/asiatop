/**
 * bok-ecos 어댑터 — savings, credit-loan (기준금리·예금금리)
 *
 * 엔드포인트 (V2):
 *   https://ecos.bok.or.kr/api/StatisticSearch/<KEY>/json/kr/...
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'bok-ecos';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://ecos.bok.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }
  throw new Error('bok-ecos: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
