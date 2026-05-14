#!/usr/bin/env node
/**
 * R94-4 — publishedAt 자연 분산.
 *
 * 문제:
 *   R94-3 backfill 후 360편 중 250+편이 2026-05-12 ~ 05-14 에 몰림
 *   → Google/Naver "콘텐츠 농장" 의심 신호
 *   → AdSense 심사 중 부정적 패턴 가능
 *
 * 해결:
 *   git first-commit 시각 순으로 정렬 → 2026-04-01 ~ 2026-05-14 (44일) 균등 분산
 *   R21 batch (최신 12편) 은 2026-05-14 그대로 유지 → 홈 "새로 올라온 글" 최상단 보존
 *   나머지 348편 → 43일 × 약 8편 자연스러운 cadence
 *
 * 사용:
 *   node scripts/audit/distribute-published-dates.mjs            # dry-run
 *   DRY_RUN=0 node scripts/audit/distribute-published-dates.mjs  # apply
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const DRY_RUN = process.env.DRY_RUN !== '0';

const START_DATE = '2026-04-01';
const END_DATE = '2026-05-14';
const PIN_END_COUNT = 4; // 5/14 에 4편만 pin (홈 첫 화면 8장이 5/14, 5/13 두 날짜로 자연스럽게 섞이게)

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
  const m = fm.match(/^publishedAt:\s*"?(.+?)"?\s*$/m);
  return m ? m[1] : null;
}

function replacePublishedAt(fm, newISODate) {
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

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((db.valueOf() - da.valueOf()) / (24 * 60 * 60 * 1000));
}

function main() {
  console.log(`[distribute] DRY_RUN=${DRY_RUN ? 1 : 0} · ${START_DATE} ~ ${END_DATE}`);
  console.log('');

  // 1) Collect all articles with git first-commit timestamp
  const articles = [];
  for (const file of walkMdx(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;

    const currentPublishedAt = extractPublishedAt(parsed.fm);
    if (!currentPublishedAt) continue;

    const gitFirstISO = gitFirstCommitISO(file);
    if (!gitFirstISO) continue;

    articles.push({
      file,
      raw,
      parsed,
      currentPublishedAt,
      gitFirstISO,
      gitTs: new Date(gitFirstISO).valueOf(),
    });
  }

  // 2) Sort by git first-commit timestamp ASC (oldest → newest)
  articles.sort((a, b) => a.gitTs - b.gitTs);

  const total = articles.length;
  const pinnedCount = Math.min(PIN_END_COUNT, total);
  const distributedCount = total - pinnedCount;
  const dayRange = daysBetween(START_DATE, END_DATE); // e.g. 43 (April 1 → May 14 = 43 days span)

  console.log(`[distribute] 총 ${total}편 · ${pinnedCount}편은 ${END_DATE} 고정 · ${distributedCount}편을 ${dayRange + 1}일에 분산`);
  console.log('');

  // 3) Assign new dates
  let changed = 0;
  let unchanged = 0;
  const dayCount = new Map();

  for (let i = 0; i < total; i++) {
    const art = articles[i];
    let newDate;

    if (i >= total - pinnedCount) {
      // 최신 12편 → END_DATE 고정
      newDate = END_DATE;
    } else {
      // 0..distributedCount-1 → START_DATE..END_DATE-1 균등 분포
      // 정수 offset 계산: i 가 0..distributedCount-1 → dayOffset 0..dayRange-1
      const dayOffset = Math.floor((i * dayRange) / distributedCount);
      newDate = addDays(START_DATE, dayOffset);
    }

    dayCount.set(newDate, (dayCount.get(newDate) || 0) + 1);

    if (art.currentPublishedAt === newDate) {
      unchanged++;
      continue;
    }

    changed++;
    const relName = art.file.replace(ROOT + '\\', '').replace(/\\/g, '/').replace('src/content/articles/', '');
    if (changed <= 20 || changed % 50 === 0) {
      console.log(`  [${i + 1}/${total}] ${relName}  ${art.currentPublishedAt} → ${newDate}`);
    }

    if (!DRY_RUN) {
      const newFm = replacePublishedAt(art.parsed.fm, newDate);
      const newContent = `---\n${newFm}\n---\n${art.parsed.body}`;
      writeFileSync(art.file, newContent, 'utf-8');
    }
  }

  // 4) Distribution summary
  console.log('');
  console.log('[distribute] 날짜별 분포:');
  const sortedDays = [...dayCount.keys()].sort();
  for (const d of sortedDays) {
    const n = dayCount.get(d);
    const bar = '█'.repeat(n);
    console.log(`  ${d}  ${n.toString().padStart(2)}편  ${bar}`);
  }

  console.log('');
  console.log(`[distribute] ${changed}편 ${DRY_RUN ? '변경 대상' : '변경 완료'} · ${unchanged}편 이미 일치 · 총 ${total}편`);
  if (DRY_RUN) console.log('[distribute] 실제 적용: DRY_RUN=0 node scripts/audit/distribute-published-dates.mjs');
}

main();
