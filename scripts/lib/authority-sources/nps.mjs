/**
 * nps 어댑터 — pension (국민연금)
 *
 * 엔드포인트 (V2):
 *   https://www.nps.or.kr/openapi/...
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'nps';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.nps.or.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }
  throw new Error('nps: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
