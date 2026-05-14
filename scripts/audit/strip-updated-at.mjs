#!/usr/bin/env node
/**
 * R94-8 — updatedAt 일괄 제거.
 *
 * 문제:
 *   LLM 자동 발행 시 publishedAt 과 별개로 updatedAt 을 임의 날짜로 박음
 *   (예: publishedAt=4/1, updatedAt=4/29). 실제로 글이 갱신된 적이 없으므로
 *   의미상 잘못됨 + sitemap-lastmod 가 updatedAt 우선 → sitemap-0 lastmod 편중.
 *
 * 해결:
 *   updatedAt 필드를 frontmatter 에서 일괄 삭제.
 *   sitemap-lastmod 가 publishedAt fallback 사용 → 분산된 publishedAt 그대로 반영.
 *   실제로 글이 갱신될 때만 updatedAt 추가 (article-pipeline 또는 manual).
 *
 * 사용:
 *   node scripts/audit/strip-updated-at.mjs            # dry-run
 *   DRY_RUN=0 node scripts/audit/strip-updated-at.mjs  # apply
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const DRY_RUN = process.env.DRY_RUN !== '0';

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

function main() {
  console.log(`[strip-updatedAt] DRY_RUN=${DRY_RUN ? 1 : 0}`);

  let stripped = 0;
  let untouched = 0;

  for (const file of walkMdx(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!fmMatch) continue;

    const fm = fmMatch[1];
    const body = fmMatch[2];

    if (!/^updatedAt:/m.test(fm)) {
      untouched++;
      continue;
    }

    const newFm = fm.replace(/^updatedAt:.*\r?\n/m, '');
    if (newFm === fm) {
      untouched++;
      continue;
    }

    stripped++;
    if (!DRY_RUN) {
      writeFileSync(file, `---\n${newFm}\n---\n${body}`, 'utf-8');
    }
  }

  console.log(`[strip-updatedAt] ${stripped}편 ${DRY_RUN ? '삭제 대상' : '삭제 완료'} · ${untouched}편 이미 없음`);
  if (DRY_RUN) console.log('[strip-updatedAt] 실제 적용: DRY_RUN=0 node scripts/audit/strip-updated-at.mjs');
}

main();
