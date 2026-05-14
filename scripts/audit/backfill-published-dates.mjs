#!/usr/bin/env node
/**
 * R94 — 자동 발행 글의 publishedAt 을 git first-commit 시각으로 일괄 정정.
 *
 * 문제:
 *   LLM 자동 발행 글의 publishedAt 이 frontmatter 임의 날짜 (예: 2026-04-15)
 *   → 홈 "새로 올라온 글" 4월 27일 멈춤
 *   → Google Discover/News 신선도 신호 손상
 *
 * 해결:
 *   git log --diff-filter=A --follow --format=%aI -- {file} 첫 commit ISO 시각 추출
 *   현재 publishedAt 과 5일 이상 차이 나면 git 값으로 overwrite
 *
 * 안전망:
 *   - DRY_RUN=1 기본 (스캔만, 변경 X)
 *   - DRY_RUN=0 시 frontmatter 직접 수정
 *   - 변경 5일 미만 글은 skip
 *   - draft·sample 글 제외
 *
 * 사용:
 *   node scripts/audit/backfill-published-dates.mjs       # dry-run
 *   DRY_RUN=0 node scripts/audit/backfill-published-dates.mjs  # apply
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const DRY_RUN = process.env.DRY_RUN !== '0';
const DIFF_THRESHOLD_DAYS = 5; // 5일 이상 차이 시만 정정 (Google 5일+ 차이 "조작" 시그널 임계)

function gitFirstCommitISO(filePath) {
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${filePath}"`,
      { encoding: 'utf-8', cwd: ROOT },
    ).trim();
    const lines = out.split('\n').filter(Boolean);
    return lines.length > 0 ? lines[lines.length - 1] : null;
  } catch {
    return null;
  }
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

function extractPublishedAt(fm) {
  const m = fm.match(/^publishedAt:\s*\"?(.+?)\"?\s*$/m);
  return m ? m[1] : null;
}

function replacePublishedAt(fm, newISODate) {
  // Date-only format (YYYY-MM-DD) — preserve existing style
  return fm.replace(/^publishedAt:.*$/m, `publishedAt: "${newISODate}"`);
}

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

function daysBetween(d1, d2) {
  return Math.abs(d1.valueOf() - d2.valueOf()) / (24 * 60 * 60 * 1000);
}

function main() {
  console.log(`[backfill] DRY_RUN=${DRY_RUN ? 1 : 0} · 임계 ${DIFF_THRESHOLD_DAYS}일`);
  console.log('');

  let total = 0;
  let changed = 0;
  let skipped = 0;
  let noGit = 0;

  for (const file of walkMdx(ARTICLES_DIR)) {
    total++;
    const raw = readFileSync(file, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;

    const currentPublishedAt = extractPublishedAt(parsed.fm);
    if (!currentPublishedAt) continue;

    const gitFirstISO = gitFirstCommitISO(file);
    if (!gitFirstISO) {
      noGit++;
      continue;
    }

    const currentDate = new Date(currentPublishedAt);
    const gitDate = new Date(gitFirstISO);
    const diffDays = daysBetween(currentDate, gitDate);

    const relPath = file.replace(ROOT + '\\', '').replace(/\\/g, '/');

    if (diffDays < DIFF_THRESHOLD_DAYS) {
      skipped++;
      continue;
    }

    const gitDateOnly = gitFirstISO.slice(0, 10); // YYYY-MM-DD
    console.log(
      `  ${relPath.replace('src/content/articles/', '')}  ${currentPublishedAt} → ${gitDateOnly}  (${Math.round(diffDays)}일 차)`,
    );
    changed++;

    if (!DRY_RUN) {
      const newFm = replacePublishedAt(parsed.fm, gitDateOnly);
      const newContent = `---\n${newFm}\n---\n${parsed.body}`;
      writeFileSync(file, newContent, 'utf-8');
    }
  }

  console.log('');
  console.log(`[backfill] ${changed}편 ${DRY_RUN ? '정정 대상' : '정정 완료'} · ${skipped}편 skip (< ${DIFF_THRESHOLD_DAYS}일) · ${noGit}편 git 이력 없음 · 총 ${total}편`);
  if (DRY_RUN) console.log('[backfill] 실제 적용: DRY_RUN=0 node scripts/audit/backfill-published-dates.mjs');
}

main();
