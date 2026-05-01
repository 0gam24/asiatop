/**
 * work24 어댑터 — unemployment (실업급여·구직급여)
 *
 * 엔드포인트 (V2):
 *   https://www.work24.go.kr/cm/openApi/...
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'work24';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.work24.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }
  throw new Error('work24: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
