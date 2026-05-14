#!/usr/bin/env node
/**
 * R94-2 — frontmatter 안 중복 top-level key 제거 (두 번째 등장 블록 삭제).
 *
 * LLM 자동 발행 시 faq 블록을 두 번 출력하는 패턴 빈발 — YAML invalid.
 *
 * 처리:
 *   - top-level key (no indent) 검출
 *   - 두 번째 등장하는 동일 key 의 블록 (다음 top-level key 또는 --- 까지) 제거
 *   - 첫 번째 블록만 보존
 *
 * 사용:
 *   node scripts/audit/fix-duplicate-yaml-keys.mjs            # dry-run
 *   DRY_RUN=0 node scripts/audit/fix-duplicate-yaml-keys.mjs  # apply
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const DRY_RUN = process.env.DRY_RUN !== '0';

function findDuplicateBlocks(fmText) {
  // 줄 단위 처리. top-level key = ^[a-zA-Z_][a-zA-Z0-9_]*:
  const lines = fmText.split(/\r?\n/);
  const topKeyRe = /^([a-zA-Z_][a-zA-Z0-9_]*):/;

  // 각 top-level key 의 시작 줄 + 끝 줄 (다음 top-level 직전) 매핑
  const blocks = []; // [{key, start, end}]
  let curKey = null;
  let curStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(topKeyRe);
    if (m) {
      if (curKey !== null) blocks.push({ key: curKey, start: curStart, end: i - 1 });
      curKey = m[1];
      curStart = i;
    }
  }
  if (curKey !== null) blocks.push({ key: curKey, start: curStart, end: lines.length - 1 });

  // 같은 key 중 두 번째 이상 블록 = 제거 대상
  const seen = new Set();
  const toRemove = [];
  for (const b of blocks) {
    if (seen.has(b.key)) toRemove.push(b);
    else seen.add(b.key);
  }
  return { lines, toRemove };
}

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

let total = 0;
let fixed = 0;

for (const file of walkMdx(ARTICLES_DIR)) {
  total++;
  const raw = readFileSync(file, 'utf-8');
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!m) continue;

  const fmText = m[2];
  const { lines, toRemove } = findDuplicateBlocks(fmText);
  if (toRemove.length === 0) continue;

  // 제거 대상 줄 (start ~ end) 마킹
  const removeSet = new Set();
  for (const b of toRemove) {
    for (let i = b.start; i <= b.end; i++) removeSet.add(i);
  }
  const newLines = lines.filter((_, i) => !removeSet.has(i));
  const newFm = newLines.join('\n');

  const rel = file.replace(ROOT + '\\', '').replace(/\\/g, '/').replace('src/content/articles/', '');
  const removedKeys = [...new Set(toRemove.map((b) => b.key))].join(',');
  console.log(`  ${rel} — 중복 제거: ${removedKeys} (${toRemove.length} 블록)`);
  fixed++;

  if (!DRY_RUN) {
    writeFileSync(file, `${m[1]}${newFm}${m[3]}${m[4]}`, 'utf-8');
  }
}

console.log('');
console.log(`[fix-duplicate-yaml-keys] ${fixed}편 ${DRY_RUN ? '제거 대상' : '제거 완료'} / 총 ${total}편`);
if (DRY_RUN) console.log('[fix-duplicate-yaml-keys] 실제 적용: DRY_RUN=0 node scripts/audit/fix-duplicate-yaml-keys.mjs');
