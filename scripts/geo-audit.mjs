#!/usr/bin/env node
/**
 * GEO chunking + E-E-A-T 컴플라이언스 감사 (frontmatter 기준).
 *
 * 점수 (높을수록 개선 우선순위 높음):
 *   sources < 3      → +5
 *   .gov.kr 0개      → +3
 *   aiCitationQ < 5  → +2 (Zod min 3, 권장 ≥5)
 *   dataValidAsOf 형식 미일치 (^2026년\s\d{1,2}월$) → +2
 *   keywords < 5     → +1
 *
 * 게이트 통과 조건: 모든 글이 score === 0
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/articles';
const GOV = [
  'data.go.kr', 'law.go.kr', 'hometax.go.kr', 'bokjiro.go.kr', 'ecos.bok.or.kr',
  'fss.or.kr', 'work24.go.kr', 'nps.or.kr', 'nhis.or.kr', 'kostat.go.kr',
  'hipension.or.kr', 'korea.kr', 'bok.or.kr', 'molit.go.kr', 'moel.go.kr',
  'nts.go.kr', 'mss.go.kr', '.go.kr', '.or.kr', 'gov.kr'
];

const files = readdirSync(DIR).filter((f) => /\.mdx?$/.test(f));
const audit = [];

for (const f of files) {
  const raw = readFileSync(join(DIR, f), 'utf-8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];

  const sourceUrls = [...fm.matchAll(/url:\s*["'](https?:\/\/[^"'\s]+)/g)].map((m) => m[1]);
  const govCount = sourceUrls.filter((u) => GOV.some((d) => u.includes(d))).length;

  const aiBlock = fm.match(/aiCitationQuestions:\s*\n((?:\s+-\s+["'].+["']\s*\n)+)/);
  const aiCount = aiBlock ? (aiBlock[1].match(/^\s+-\s/gm) || []).length : 0;

  const dv = (fm.match(/dataValidAsOf:\s*["'](.+?)["']/) || [])[1] || '';
  const dvOk = /^2026년\s\d{1,2}월$/.test(dv);

  const kwBlock = fm.match(/keywords:\s*\n((?:\s+-\s+.+\n)+)/);
  const kwCount = kwBlock ? (kwBlock[1].match(/^\s+-/gm) || []).length : 0;

  let score = 0;
  if (sourceUrls.length < 3) score += 5;
  if (govCount === 0) score += 3;
  if (aiCount < 5) score += 2;
  if (!dvOk) score += 2;
  if (kwCount < 5) score += 1;

  audit.push({
    file: f.replace(/\.mdx?$/, ''),
    sources: sourceUrls.length,
    gov: govCount,
    ai: aiCount,
    kw: kwCount,
    dv,
    dvOk,
    score,
  });
}

audit.sort((a, b) => b.score - a.score);

console.log('\n=== TOP 10 GEO 개선 우선순위 ===');
for (const a of audit.slice(0, 10)) {
  console.log(
    `${String(a.score).padStart(2)} pts  ${a.file.padEnd(45)} ` +
      `src:${a.sources}/${a.gov}gov  ai:${a.ai}  kw:${a.kw}  dv:"${a.dv}"`
  );
}

console.log('\n=== 점수 분포 ===');
const dist = audit.reduce((acc, a) => {
  acc[a.score] = (acc[a.score] || 0) + 1;
  return acc;
}, {});
for (const [s, n] of Object.entries(dist).sort((a, b) => +b[0] - +a[0])) {
  console.log(`  score ${s}: ${n} articles`);
}
console.log(`  total: ${audit.length} articles\n`);

const allFiles = audit.map((a) => a.file);
console.log(`=== 컴플라이언스 요약 ===`);
console.log(`  sources ≥ 3: ${audit.filter((a) => a.sources >= 3).length}/${allFiles.length}`);
console.log(`  .gov.kr ≥ 1: ${audit.filter((a) => a.gov >= 1).length}/${allFiles.length}`);
console.log(`  aiCitationQ ≥ 5: ${audit.filter((a) => a.ai >= 5).length}/${allFiles.length}`);
console.log(`  dataValidAsOf 형식 일치: ${audit.filter((a) => a.dvOk).length}/${allFiles.length}`);
console.log(`  keywords ≥ 5: ${audit.filter((a) => a.kw >= 5).length}/${allFiles.length}`);

const failingScore = audit.filter((a) => a.score > 0).length;
if (failingScore > 0) {
  console.log(`\n🚫 GEO 게이트 미통과: ${failingScore}/${allFiles.length} 글이 score > 0`);
  process.exit(1);
}
console.log(`\n✅ 모든 60개 글이 GEO 게이트 통과 (score 0)`);
