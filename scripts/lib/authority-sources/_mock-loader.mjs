/**
 * 권위 소스 mock fixture 로더
 *
 * MOCK_AUTHORITY=1 시 어댑터가 fetchFacts() 대신 호출.
 * 경로: tests/fixtures/authority-mock/<adapter_id>/<query_hash>.json
 *
 * fixture 누락 시 __missing__.json 폴백 (테스트 작성 누락 감지용 warning).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_BASE = resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'authority-mock');

/**
 * query 객체 → 결정론적 hash (정렬 후 sha1 prefix).
 */
export function queryHash(query) {
  const norm = JSON.stringify({
    keywords: [...(query?.keywords ?? [])].sort(),
    expected_facts: [...(query?.expected_facts ?? [])].sort(),
  });
  return createHash('sha1').update(norm).digest('hex').slice(0, 12);
}

/**
 * @param {string} adapterId 'data-go-kr', 'bok-ecos' ...
 * @param {object} query { keywords, expected_facts }
 * @returns {object|null} fixture JSON 또는 null (미존재 + warning)
 */
export function loadMockFixture(adapterId, query) {
  const hash = queryHash(query);
  const specific = resolve(FIXTURE_BASE, adapterId, `${hash}.json`);
  const fallback = resolve(FIXTURE_BASE, adapterId, '__missing__.json');

  if (existsSync(specific)) {
    try {
      return JSON.parse(readFileSync(specific, 'utf-8'));
    } catch {
      return null;
    }
  }
  if (existsSync(fallback)) {
    if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
      console.warn(`[mock] ${adapterId}: query hash ${hash} not found, using __missing__`);
    }
    try {
      return JSON.parse(readFileSync(fallback, 'utf-8'));
    } catch {
      return null;
    }
  }

  if (process.env.MOCK_AUTHORITY_VERBOSE === '1') {
    console.warn(`[mock] ${adapterId}: no fixture found at ${specific} or ${fallback}`);
  }
  return null;
}
