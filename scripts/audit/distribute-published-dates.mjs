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

function syncUpdatedAt(fm, newISODate) {
  // updatedAt 이 publishedAt 보다 옛날이면 sitemap-lastmod 가 옛 값 사용 → publishedAt 으로 동기화.
  // updatedAt 이 없으면 그대로 (sitemap-lastmod 가 publishedAt fallback).
  const m = fm.match(/^updatedAt:\s*"?(.+?)"?\s*$/m);
  if (!m) return fm;
  const current = new Date(m[1]);
  const target = new Date(newISODate);
  if (Number.isNaN(current.valueOf()) || current.valueOf() < target.valueOf()) {
    return fm.replace(/^updatedAt:.*$/m, `updatedAt: ${newISODate}`);
  }
  return fm;
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
  let changedPub = 0;
  let changedUpd = 0;
  let unchanged = 0;
  const dayCount = new Map();

  for (let i = 0; i < total; i++) {
    const art = articles[i];
    let newDate;

    if (i >= total - pinnedCount) {
      newDate = END_DATE;
    } else {
      const dayOffset = Math.floor((i * dayRange) / distributedCount);
      newDate = addDays(START_DATE, dayOffset);
    }

    dayCount.set(newDate, (dayCount.get(newDate) || 0) + 1);

    const pubNeedsChange = art.currentPublishedAt !== newDate;
    // updatedAt < publishedAt 인 article 도 sync 필요 (sitemap-lastmod 가 stale 값 사용 중)
    const updMatch = art.parsed.fm.match(/^updatedAt:\s*"?(.+?)"?\s*$/m);
    const updNeedsSync = updMatch && new Date(updMatch[1]).valueOf() < new Date(newDate).valueOf();

    if (!pubNeedsChange && !updNeedsSync) {
      unchanged++;
      continue;
    }

    if (pubNeedsChange) changedPub++;
    if (updNeedsSync) changedUpd++;

    const relName = art.file.replace(ROOT + '\\', '').replace(/\\/g, '/').replace('src/content/articles/', '');
    if (changedPub + changedUpd <= 20 || (changedPub + changedUpd) % 50 === 0) {
      const note = pubNeedsChange ? `${art.currentPublishedAt} → ${newDate}` : `upd-sync → ${newDate}`;
      console.log(`  [${i + 1}/${total}] ${relName}  ${note}`);
    }

    if (!DRY_RUN) {
      let newFm = pubNeedsChange ? replacePublishedAt(art.parsed.fm, newDate) : art.parsed.fm;
      newFm = syncUpdatedAt(newFm, newDate);
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
  console.log(`[distribute] publishedAt ${changedPub}편 · updatedAt sync ${changedUpd}편 ${DRY_RUN ? '변경 대상' : '변경 완료'} · ${unchanged}편 이미 일치 · 총 ${total}편`);
  if (DRY_RUN) console.log('[distribute] 실제 적용: DRY_RUN=0 node scripts/audit/distribute-published-dates.mjs');
}

main();
