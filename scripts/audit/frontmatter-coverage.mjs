#!/usr/bin/env node
/**
 * Frontmatter 커버리지 감사 — 108편 legacy 글이 자동검증 메타 필드를
 * 얼마나 보유했는지 추적해 갱신 우선순위 큐를 만든다.
 *
 * 추적 필드 (자동 발행 파이프라인이 박는 메타):
 *   - aiAssisted (G6 disclosure-attach 분기)
 *   - sources_verified (G4 fact-verifier 통과)
 *   - lastReviewed (YMYL 신선도)
 *   - reviewedBy (자동검증 시스템 명의)
 *   - fact_verification_at (G4 timestamp)
 *
 * 출력:
 *   - stdout: cluster 별 커버리지 표 + 누락 글 list
 *   - dist/audit/frontmatter-coverage.json (선택, --json 플래그)
 *
 * 실행:
 *   node scripts/audit/frontmatter-coverage.mjs           # 보고서만
 *   node scripts/audit/frontmatter-coverage.mjs --json    # JSON 출력 추가
 *   node scripts/audit/frontmatter-coverage.mjs --stale=180  # stale 기준 일수 조정
 *
 * 게이트 X — 정보 수집·우선순위 큐 작성용 read-only 도구.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { splitFrontmatter } from '../lib/mdx-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ARTICLES_DIR = resolve(REPO_ROOT, 'src/content/articles');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const staleArg = args.find((a) => a.startsWith('--stale='));
const STALE_DAYS = staleArg ? parseInt(staleArg.split('=')[1], 10) : 180;
const VERY_STALE_DAYS = STALE_DAYS * 2;

const TRACKED_FIELDS = [
  'aiAssisted',
  'sources_verified',
  'lastReviewed',
  'reviewedBy',
  'fact_verification_at',
];

function parseScalars(fm) {
  const out = {};
  for (const line of fm.split(/\r?\n/)) {
    if (/^\s/.test(line)) continue;
    if (line === '---' || line === '') continue;
    if (line.startsWith('-')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let raw = m[2].trim();
    if (raw === '' || raw === '|' || raw === '>') continue;
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    out[m[1]] = raw;
  }
  return out;
}

function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.valueOf())) return Infinity;
  return Math.floor((Date.now() - d.valueOf()) / (1000 * 60 * 60 * 24));
}

const files = readdirSync(ARTICLES_DIR).filter((f) => /\.mdx?$/.test(f));
const articles = [];
for (const file of files) {
  const full = readFileSync(join(ARTICLES_DIR, file), 'utf8');
  const { fm } = splitFrontmatter(full);
  if (!fm) continue;
  const data = parseScalars(fm);
  if (data.draft === 'true') continue;
  const slug = file.replace(/\.mdx?$/, '');
  const reference = data.updatedAt || data.publishedAt;
  articles.push({
    slug,
    cluster: data.cluster,
    title: data.title,
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
    age: daysAgo(reference),
    has: Object.fromEntries(
      TRACKED_FIELDS.map((f) => [f, data[f] !== undefined && data[f] !== ''])
    ),
  });
}

const total = articles.length;
const clusters = [...new Set(articles.map((a) => a.cluster))].sort();

console.log(`\n📊 Frontmatter Coverage Audit — ${total}편 / ${clusters.length} cluster\n`);
console.log(`Stale 기준: ${STALE_DAYS}일 (Very stale: ${VERY_STALE_DAYS}일)\n`);

// ── 필드별 커버리지 (전체) ───────────────────────────────
console.log('─── 필드별 커버리지 (전체 108편 기준) ───────────────');
for (const f of TRACKED_FIELDS) {
  const hit = articles.filter((a) => a.has[f]).length;
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
  console.log(`  ${f.padEnd(24)} ${bar} ${pct}%  (${hit}/${total})`);
}

// ── Cluster 별 커버리지 ───────────────────────────────────
console.log('\n─── Cluster 별 자동검증 도입률 (sources_verified 기준) ───');
for (const cluster of clusters) {
  const cArticles = articles.filter((a) => a.cluster === cluster);
  const verified = cArticles.filter((a) => a.has.sources_verified).length;
  const pct = cArticles.length > 0 ? Math.round((verified / cArticles.length) * 100) : 0;
  const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
  console.log(`  ${cluster.padEnd(22)} ${bar} ${pct}%  (${verified}/${cArticles.length})`);
}

// ── Stale 글 list ─────────────────────────────────────────
const stale = articles.filter((a) => a.age >= STALE_DAYS).sort((a, b) => b.age - a.age);
const veryStale = stale.filter((a) => a.age >= VERY_STALE_DAYS);
console.log(`\n─── Stale 글 (${STALE_DAYS}일 이상) ────────────────────`);
console.log(`  Stale: ${stale.length}편 / Very stale (${VERY_STALE_DAYS}일+): ${veryStale.length}편`);

if (veryStale.length > 0) {
  console.log('\n  🚨 Very stale (최우선 갱신):');
  for (const a of veryStale.slice(0, 10)) {
    console.log(`    [${a.age}d] ${a.cluster}/${a.slug}`);
  }
  if (veryStale.length > 10) console.log(`    ... and ${veryStale.length - 10} more`);
}

// ── 갱신 우선순위 큐 ──────────────────────────────────────
const queue = articles
  .map((a) => {
    let score = 0;
    if (a.age >= VERY_STALE_DAYS) score += 100;
    else if (a.age >= STALE_DAYS) score += 50;
    if (!a.has.sources_verified) score += 30;
    if (!a.has.lastReviewed) score += 10;
    if (!a.has.aiAssisted) score += 5;
    return { ...a, score };
  })
  .sort((a, b) => b.score - a.score);

console.log('\n─── 갱신 우선순위 큐 (상위 15편) ───────────────────────');
console.log('   score · age · cluster/slug');
for (const a of queue.slice(0, 15)) {
  const flags = TRACKED_FIELDS.map((f) => (a.has[f] ? '✓' : '·')).join('');
  console.log(`  ${String(a.score).padStart(4)} · ${String(a.age).padStart(3)}d · [${flags}] ${a.cluster}/${a.slug}`);
}

console.log(`\n  플래그 순서: ${TRACKED_FIELDS.join(' · ')}\n`);

// ── 종합 ──────────────────────────────────────────────────
const summary = {
  total,
  clusters: clusters.length,
  fieldCoverage: Object.fromEntries(
    TRACKED_FIELDS.map((f) => [f, articles.filter((a) => a.has[f]).length])
  ),
  stale: stale.length,
  veryStale: veryStale.length,
  topPriority: queue.slice(0, 30).map((a) => ({
    cluster: a.cluster,
    slug: a.slug,
    score: a.score,
    age: a.age,
    has: a.has,
  })),
};

console.log('─── 종합 ─────────────────────────────────────────────');
console.log(`  • 자동검증 도입률 (sources_verified): ${summary.fieldCoverage.sources_verified}/${total}`);
console.log(`  • Stale (${STALE_DAYS}일+): ${stale.length}편`);
console.log(`  • Very stale (${VERY_STALE_DAYS}일+): ${veryStale.length}편`);
console.log(`  • 최우선 갱신 큐 상위 30편 ↑ 위 표 참조\n`);

if (wantJson) {
  const outDir = resolve(REPO_ROOT, 'dist', 'audit');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'frontmatter-coverage.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`📄 JSON: ${outPath}`);
}
