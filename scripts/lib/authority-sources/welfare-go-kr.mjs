/**
 * welfare-go-kr 어댑터 — gov-support 보조 (복지로)
 *
 * 엔드포인트 (V2):
 *   https://www.bokjiro.go.kr/openapi/...
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'welfare-go-kr';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.bokjiro.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }
  throw new Error('welfare-go-kr: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
