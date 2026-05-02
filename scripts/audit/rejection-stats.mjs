#!/usr/bin/env node
/**
 * 자동 발행 폐기 사유 통계
 *
 * briefs/_pool/_rejected/<YYYY-MM-DD>/<hash>.yaml 의 _rejected 메타를 집계.
 *
 * 사용:
 *   node scripts/audit/rejection-stats.mjs                    # 전체 누적
 *   node scripts/audit/rejection-stats.mjs --days 7           # 최근 7일
 *   node scripts/audit/rejection-stats.mjs --date 2026-05-02  # 특정 날짜
 *   node scripts/audit/rejection-stats.mjs --json             # JSON 출력 (CI 자동화)
 *
 * 출력: gate별·reason별 카운트 + 폐기율
 *   기대 패턴 (정상 운영):
 *     G1 (PII·욕설) 5~10%
 *     G2 (cluster 미매핑) 20~30%
 *     G3 (권위 소스 미가용) 5~10%
 *     G4 (환각·매칭 실패) 30~40%
 *     기타 G5~G8 합계 10% 이내
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REJECTED_BASE = resolve(__dirname, '..', '..', 'briefs', '_pool', '_rejected');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] !== undefined) return process.argv[i + 1];
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return null;
}
function hasFlag(flag) { return process.argv.includes(flag); }

function parseRejectedYaml(text) {
  // 단순 정규식 — js-yaml 의존 회피 (audit는 lightweight 유지)
  const gateMatch = text.match(/gate:\s*"([^"]+)"/);
  const reasonMatch = text.match(/reason:\s*"?([^"\n]+?)"?\s*$/m);
  const dateMatch = text.match(/rejected_at:\s*"([^"]+)"/);
  return {
    gate: gateMatch?.[1] ?? 'unknown',
    reason: reasonMatch?.[1] ?? 'unknown',
    rejected_at: dateMatch?.[1] ?? null,
  };
}

function listDayDirs() {
  if (!existsSync(REJECTED_BASE)) return [];
  return readdirSync(REJECTED_BASE)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
}

function listRejectedFiles(dayDir) {
  const fullPath = resolve(REJECTED_BASE, dayDir);
  if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) return [];
  return readdirSync(fullPath)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => join(fullPath, f));
}

function withinDays(dateStr, days) {
  const target = new Date(dateStr).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return target >= cutoff;
}

const wantDays = arg('--days') ? Number(arg('--days')) : null;
const wantDate = arg('--date');
const asJson = hasFlag('--json');

const days = listDayDirs().filter((d) => {
  if (wantDate) return d === wantDate;
  if (wantDays) return withinDays(d, wantDays);
  return true;
});

const stats = {
  total: 0,
  by_gate: {},
  by_reason: {},
  by_day: {},
};

for (const day of days) {
  const files = listRejectedFiles(day);
  stats.by_day[day] = files.length;
  for (const file of files) {
    let text;
    try { text = readFileSync(file, 'utf-8'); } catch { continue; }
    const { gate, reason } = parseRejectedYaml(text);
    stats.total++;
    stats.by_gate[gate] = (stats.by_gate[gate] ?? 0) + 1;
    stats.by_reason[reason] = (stats.by_reason[reason] ?? 0) + 1;
  }
}

if (asJson) {
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

console.log(`📊 폐기 통계 — ${days.length}일 / 총 ${stats.total}건`);
console.log('');

if (stats.total === 0) {
  console.log('  (폐기된 brief 없음)');
  process.exit(0);
}

console.log('Gate별:');
for (const [gate, count] of Object.entries(stats.by_gate).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / stats.total) * 100).toFixed(1);
  console.log(`  ${gate.padEnd(8)} ${String(count).padStart(4)}건 (${pct}%)`);
}

console.log('\n사유 Top 10:');
for (const [reason, count] of Object.entries(stats.by_reason)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)) {
  console.log(`  ${count.toString().padStart(4)}건  ${reason}`);
}

console.log(`\n날짜별 (최근 ${Math.min(7, days.length)}일):`);
const recentDays = days.slice(-7);
for (const day of recentDays) {
  console.log(`  ${day}  ${stats.by_day[day]}건`);
}
