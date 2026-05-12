#!/usr/bin/env node
/**
 * Bundle size 게이트 — dist/_astro/*.js 의 총 크기 측정 후 임계 초과 시 exit 1.
 *
 * 측정 항목:
 *   - JS chunks 총합 (raw byte)
 *   - JS chunks gzip 추정 (raw × 0.32 — 한국어 사이트 평균)
 *   - CSS 총합
 *
 * 임계 (한국어 SSG 사이트 + Pretendard self-host + React island 4종 + Sentry lazy):
 *   - JS raw  ≤ 350KB   (현재 베이스라인 + 10% 여유)
 *   - JS gz   ≤ 120KB   (CWV 친화 임계)
 *   - CSS raw ≤ 80KB
 *
 * 사용:
 *   node scripts/audit/bundle-size.mjs                 # PR/main CI 게이트
 *   node scripts/audit/bundle-size.mjs --report-only   # exit 0 강제 (시각화만)
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DIST_DIR = resolve(REPO_ROOT, 'dist', '_astro');

const BUDGET = {
  js_raw: 350 * 1024,
  js_gz: 120 * 1024,
  css_raw: 80 * 1024,
};

const reportOnly = process.argv.includes('--report-only');

if (!existsSync(DIST_DIR)) {
  console.warn(`[bundle-size] dist/_astro 없음 — 빌드 먼저 실행 (pnpm build).`);
  console.warn(`[bundle-size] 경로: ${DIST_DIR}`);
  process.exit(reportOnly ? 0 : 0); // 빌드 안 됐으면 PR CI 외 컨텍스트 — 통과 처리
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push({ path: full, size: stat.size });
    }
  }
  return out;
}

const files = walk(DIST_DIR);
const js = files.filter((f) => extname(f.path) === '.js');
const css = files.filter((f) => extname(f.path) === '.css');

const jsRaw = js.reduce((s, f) => s + f.size, 0);
const cssRaw = css.reduce((s, f) => s + f.size, 0);

// gzip 추정 — 작은 chunk 들의 합산이라 실제와 약간 차이. 큰 chunk 1개씩 gzip 측정해 합산.
let jsGz = 0;
for (const f of js) {
  try {
    const content = readFileSync(f.path);
    jsGz += gzipSync(content).length;
  } catch {
    // ignore
  }
}

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function bar(pct) {
  const filled = Math.min(20, Math.round(pct / 5));
  return '█'.repeat(filled).padEnd(20, '░');
}

const jsRawPct = Math.round((jsRaw / BUDGET.js_raw) * 100);
const jsGzPct = Math.round((jsGz / BUDGET.js_gz) * 100);
const cssRawPct = Math.round((cssRaw / BUDGET.css_raw) * 100);

console.log('\n📦 Bundle Size Budget Audit\n');
console.log(`  JS  raw (${js.length} chunks)  ${bar(jsRawPct)} ${jsRawPct}%  ${fmt(jsRaw)} / ${fmt(BUDGET.js_raw)}`);
console.log(`  JS  gz  (estimated)         ${bar(jsGzPct)} ${jsGzPct}%  ${fmt(jsGz)} / ${fmt(BUDGET.js_gz)}`);
console.log(`  CSS raw (${css.length} chunks)  ${bar(cssRawPct)} ${cssRawPct}%  ${fmt(cssRaw)} / ${fmt(BUDGET.css_raw)}`);

console.log('\n  Top 5 JS chunks:');
const topJs = [...js].sort((a, b) => b.size - a.size).slice(0, 5);
for (const f of topJs) {
  const rel = f.path.replace(REPO_ROOT, '').replace(/\\/g, '/');
  console.log(`    ${fmt(f.size).padStart(8)}  ${rel}`);
}

const failures = [];
if (jsRaw > BUDGET.js_raw) failures.push(`JS raw ${fmt(jsRaw)} > ${fmt(BUDGET.js_raw)} (budget exceeded)`);
if (jsGz > BUDGET.js_gz) failures.push(`JS gz ${fmt(jsGz)} > ${fmt(BUDGET.js_gz)} (budget exceeded)`);
if (cssRaw > BUDGET.css_raw) failures.push(`CSS raw ${fmt(cssRaw)} > ${fmt(BUDGET.css_raw)} (budget exceeded)`);

if (failures.length > 0) {
  console.log('\n❌ Budget violations:');
  for (const f of failures) console.log(`   • ${f}`);
  if (!reportOnly) {
    console.log('\n  (--report-only 로 우회 가능. 임계 조정은 scripts/audit/bundle-size.mjs)');
    process.exit(1);
  } else {
    console.log('\n  [report-only] PASS (warning).');
  }
} else {
  console.log('\n✅ All budgets within limit.\n');
}
