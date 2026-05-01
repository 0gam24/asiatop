#!/usr/bin/env node
/**
 * 60글의 publishedAt을 2025-11 ~ 2026-04로 점진 증가 분산
 * (1인 미디어 자연스러운 발행 곡선: 사이트 성숙도 ↑)
 *
 * 분포:
 *   2025-11: 5편   (사이트 출범)
 *   2025-12: 7편
 *   2026-01: 9편
 *   2026-02: 11편
 *   2026-03: 13편
 *   2026-04: 15편  (현재까지 누적 60)
 *
 * 결정성: cluster + 파일명 알파벳 정렬 → 분배 (재실행 시 동일 결과)
 * updatedAt: publishedAt + 0~30일 (단, 2026-04-30 초과 금지)
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'src/content/articles');

const DISTRIBUTION = [
  { month: '2025-11', count: 5, daysInMonth: 30 },
  { month: '2025-12', count: 7, daysInMonth: 31 },
  { month: '2026-01', count: 9, daysInMonth: 31 },
  { month: '2026-02', count: 11, daysInMonth: 28 },
  { month: '2026-03', count: 13, daysInMonth: 31 },
  { month: '2026-04', count: 15, daysInMonth: 30 },
];

// 결정적 hash (cluster + filename 알파벳 → 인덱스)
const files = readdirSync(DIR)
  .filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'))
  .sort();

if (files.length !== 60) {
  console.error(`⚠️  60글 기대, ${files.length}글 발견. 분포 조정 필요.`);
  console.error('   계속 진행하면 마지막 월에 잔여분이 누적됩니다.');
}

// 각 글에 슬롯 할당
let idx = 0;
const assignments = [];
for (const slot of DISTRIBUTION) {
  for (let i = 0; i < slot.count && idx < files.length; i++, idx++) {
    // 한 달 안에 균등 분포 — 1, 5, 10, 15, 20, 25, 28일 식
    const dayStep = Math.max(1, Math.floor(slot.daysInMonth / (slot.count + 1)));
    const day = String(Math.min(slot.daysInMonth - 1, 1 + dayStep * (i + 1))).padStart(2, '0');
    assignments.push({
      file: files[idx],
      published: `${slot.month}-${day}`,
    });
  }
}
// 잔여 글이 있으면 마지막 월에 분포
while (idx < files.length) {
  const last = DISTRIBUTION[DISTRIBUTION.length - 1];
  const day = String(Math.min(last.daysInMonth - 1, 28 + (idx - 59))).padStart(2, '0');
  assignments.push({
    file: files[idx],
    published: `${last.month}-${day}`,
  });
  idx++;
}

// updatedAt 결정적 hash (글 이름 길이로 0~30 매핑)
function det(seed, max) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % (max + 1);
}

const MAX_UPDATED = new Date('2026-04-30T00:00:00Z').valueOf();

for (const { file, published } of assignments) {
  const path = join(DIR, file);
  const raw = readFileSync(path, 'utf-8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) continue;
  const [, fm, body] = fmMatch;

  // updatedAt 계산 (publishedAt + 0~30일, 2026-04-30 캡)
  const pubDate = new Date(`${published}T00:00:00Z`);
  const offset = det(file, 60); // 0~60일
  const updatedTs = Math.min(pubDate.valueOf() + offset * 24 * 3600 * 1000, MAX_UPDATED);
  const updated = new Date(updatedTs).toISOString().slice(0, 10);

  // frontmatter 갱신
  let newFm = fm.replace(/^publishedAt:\s*"[^"]+"/m, `publishedAt: "${published}"`);
  // updatedAt 있으면 교체, 없으면 publishedAt 다음 줄에 추가
  if (/^updatedAt:/m.test(newFm)) {
    newFm = newFm.replace(/^updatedAt:\s*"[^"]+"/m, `updatedAt: "${updated}"`);
  } else {
    newFm = newFm.replace(/^publishedAt:\s*"([^"]+)"/m, `publishedAt: "$1"\nupdatedAt: "${updated}"`);
  }

  const out = `---\n${newFm}\n---\n${body}`;
  writeFileSync(path, out, 'utf-8');
}

console.log(`✅ ${assignments.length}글 publishedAt·updatedAt 분산 완료\n`);
console.log('월별 분포:');
const byMonth = assignments.reduce((acc, a) => {
  const m = a.published.slice(0, 7);
  acc[m] = (acc[m] || 0) + 1;
  return acc;
}, {});
for (const [m, n] of Object.entries(byMonth).sort()) {
  console.log(`   ${m}: ${n}편`);
}
