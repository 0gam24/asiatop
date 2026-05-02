/**
 * 질문 hash 기반 24시간 재진입 차단
 *
 * 흐름:
 *   1. 새 질문 진입 → questionHash() → isDuplicate(hash) 검사
 *   2. 24h 미경과 동일 hash 발견 시 즉시 skip (G0)
 *   3. 처리 후 recordSeen()으로 status 갱신 (성공/폐기 무관)
 *   4. pruneOld()는 30일 초과 entry 제거 (수동 또는 cron)
 *
 * 저장: briefs/_pool/_dedup-index.json (git tracked)
 *   { "<hash16>": { last_seen_at, status, reason, count } }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROD_INDEX_PATH = resolve(__dirname, '..', '..', 'briefs', '_pool', '_dedup-index.json');
const TEST_INDEX_PATH = resolve(__dirname, '..', '..', 'briefs', '_pool', '.test-dedup-index.json');
// 테스트 환경은 별도 인덱스 사용 (prod state 오염 방지). DEDUP_INDEX_PATH로 override 가능.
const INDEX_PATH = process.env.DEDUP_INDEX_PATH
  ?? (process.env.NODE_ENV === 'test' ? TEST_INDEX_PATH : PROD_INDEX_PATH);

const TTL_MS = 24 * 60 * 60 * 1000;            // 24h 차단
const PRUNE_MS = 30 * 24 * 60 * 60 * 1000;     // 30일 후 entry 제거

/**
 * 질문 텍스트 → 안정적 16자 hash (NFC 정규화 + trim 후 sha256 prefix).
 * 동일 의미 질문이 약간 다른 표현이어도 hash 일치는 안 함 — exact match만 24h 차단.
 * 의미 기반 dedup은 별도 모듈 영역.
 */
export function questionHash(text) {
  if (typeof text !== 'string') text = String(text ?? '');
  const normalized = text.normalize('NFC').trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function ensureDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadIndex() {
  if (!existsSync(INDEX_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function saveIndex(idx) {
  ensureDir(INDEX_PATH);
  writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2) + '\n', 'utf-8');
}

/**
 * 24시간 내 같은 질문 본 적 있으면 true.
 */
export function isDuplicate(text) {
  const h = questionHash(text);
  const entry = loadIndex()[h];
  if (!entry?.last_seen_at) return false;
  const elapsed = Date.now() - new Date(entry.last_seen_at).getTime();
  return elapsed < TTL_MS;
}

/**
 * 질문을 '본' 것으로 기록.
 * @param {string} text 질문 본문
 * @param {'pending'|'rejected'|'published'} status 처리 결과
 * @param {string|null} reason 폐기 사유 (rejected일 때)
 * @returns {string} hash16
 */
export function recordSeen(text, status = 'pending', reason = null) {
  const h = questionHash(text);
  const idx = loadIndex();
  const prev = idx[h] ?? { count: 0 };
  idx[h] = {
    last_seen_at: new Date().toISOString(),
    status,
    reason,
    count: (prev.count ?? 0) + 1,
  };
  saveIndex(idx);
  return h;
}

/**
 * 30일 초과 entry 제거. 정기 cron 또는 수동 호출.
 * @returns {number} 제거된 entry 수
 */
export function pruneOld() {
  const idx = loadIndex();
  const cutoff = Date.now() - PRUNE_MS;
  let removed = 0;
  for (const [h, entry] of Object.entries(idx)) {
    const ts = entry?.last_seen_at ? new Date(entry.last_seen_at).getTime() : 0;
    if (!ts || ts < cutoff) {
      delete idx[h];
      removed++;
    }
  }
  if (removed > 0) saveIndex(idx);
  return removed;
}

export function _resetForTest() {
  if (process.env.NODE_ENV !== 'test') return;
  saveIndex({});
}
