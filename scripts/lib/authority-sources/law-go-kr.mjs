/**
 * law-go-kr 어댑터 — tax, insurance-labor, office-tips, unemployment (법령)
 *
 * 엔드포인트 (V2):
 *   https://www.law.go.kr/DRF/lawService.do?OC=<EMAIL_ID>&target=law&MST=...
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'law-go-kr';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;
  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.law.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }
  throw new Error('law-go-kr: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
