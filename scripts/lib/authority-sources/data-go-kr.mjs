/**
 * data.go.kr 어댑터 — gov-support, public-services, realestate (1차)
 *
 * 엔드포인트 (V1 — 청년정책 통합조회):
 *   https://www.youthcenter.go.kr/go/ythip/getPlcy + servicekey=DATA_GO_KR_KEY
 *
 * MOCK_AUTHORITY=1 시 fixture 반환. real fetch는 V2.
 */
import { loadMockFixture } from './_mock-loader.mjs';

export const id = 'data-go-kr';

export async function fetchFacts(query, opts = {}) {
  const mock = opts.mock !== false;

  if (mock) {
    const fixture = loadMockFixture(id, query);
    return {
      source_id: id,
      source_url: 'https://www.data.go.kr',
      retrieved_at: new Date().toISOString(),
      raw: fixture?.raw ?? null,
      facts: fixture?.facts ?? [],
      confidence: fixture ? 1.0 : 0,
    };
  }

  // Real fetch 구현은 외부 API 키 발급 후 (V2)
  throw new Error('data-go-kr: real fetch not yet implemented (use MOCK_AUTHORITY=1)');
}
