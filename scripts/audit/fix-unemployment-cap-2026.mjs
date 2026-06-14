#!/usr/bin/env node
/**
 * 실업급여(구직급여) 2026 일액 상한·하한 일괄 정정
 *
 * 2026년 확정값(고용노동부, 웹검증 2026-06-15):
 *   - 1일 상한액: 66,000원 → 68,100원
 *   - 1일 하한액: 66,048원 (2026 최저시급 10,320 × 80% × 8h)
 *     (기존 글마다 64,192·63,104·57,600·약40,000 등 옛값/오류 혼재 → 66,048로 통일)
 *
 * 파생 계산(상한 × 소정급여일수) 동반 재산정. 각 치환은 명시 쌍으로 하드코딩(재현성).
 * DRY_RUN=1 기본. DRY_RUN=0 으로 실제 적용.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const A = (s) => join(ROOT, 'src', 'content', 'articles', s);
const DRY = process.env.DRY_RUN !== '0';

// 파일별 [찾기, 바꾸기] 명시 쌍 (문맥 검증 완료분만)
const EDITS = {
  'artist-employment-insurance-eligibility.mdx': [
    ['상한액은 66,000원, 하한액은 60%×최저임금', '상한액은 68,100원, 하한액은 66,048원(2026년)'],
    ['상한액: 66,000원/일 (2026년 기준)', '상한액: 68,100원/일 (2026년 기준)'],
  ],
  'business-closure-unemployment-eligibility.mdx': [
    ['단, 상한액은 1일 66,000원(2026년 기준)입니다.', '단, 상한액은 1일 68,100원(2026년 기준)입니다.'],
    ['하루 약 66,000원(상한 적용), 총 240일 → 약 1,584만 원', '하루 약 68,100원(상한 적용), 총 240일 → 약 1,634만 원'],
  ],
  'childcare-leave-resign-unemployment.mdx': [
    ['상한액은 1일 66,000원, 하한액은 최저임금의 80% 수준(1일 63,104원, 2026년 기준)', '상한액은 1일 68,100원, 하한액은 최저임금의 80% 수준(1일 66,048원, 2026년 기준)'],
    ['2026년 기준 하루 최대 66,000원, 최소 63,104원입니다.', '2026년 기준 하루 최대 68,100원, 최소 66,048원입니다.'],
    ['| **상한액** | 1일 66,000원 (2026년 기준) |', '| **상한액** | 1일 68,100원 (2026년 기준) |'],
    ['평균 임금의 60% (상한 66,000원/일)', '평균 임금의 60% (상한 68,100원/일)'],
  ],
  'self-employed-unemployment-benefit.mdx': [
    ['| 7등급 (332만원) | 약 66,000원 (상한) |', '| 7등급 (332만원) | 약 68,100원 (상한) |'],
  ],
  'self-employed-unemployment-voluntary.mdx': [
    ['상한액은 1일 66,000원, 하한액은 최저임금의 80%입니다.', '상한액은 1일 68,100원, 하한액은 66,048원입니다.'],
    ['1일 66,000원 (상한액) × 150일 = **9,900,000원**', '1일 68,100원 (상한액) × 150일 = **10,215,000원**'],
    ['1일 66,000원 (상한액 적용) × 180일 = **11,880,000원**', '1일 68,100원 (상한액 적용) × 180일 = **12,258,000원**'],
    ['1일 상한액이 66,000원(2026년 기준)이므로', '1일 상한액이 68,100원(2026년 기준)이므로'],
  ],
  'short-term-worker-unemployment-eligibility.mdx': [
    ['상한액은 1일 66,000원(2026년 기준), 하한액은 최저임금의 80%입니다.', '상한액은 1일 68,100원(2026년 기준), 하한액은 66,048원입니다.'],
    ['1일 상한 66,000원, 하한 최저임금 80% (고용노동부 2026)', '1일 상한 68,100원, 하한 66,048원 (고용노동부 2026)'],
    ['상한액 66,000원 이하, 하한액(최저임금 80% = 약 40,000원) 이상이므로 50,000원이 적용됩니다.', '상한액 68,100원 이하, 하한액(2026년 1일 66,048원) 미만이므로 하한액인 66,048원이 적용됩니다.'],
    ['| 지급액 | 1일 상한 66,000원 × 소정급여일수 | 잔여 실업급여의 50% |', '| 지급액 | 1일 상한 68,100원 × 소정급여일수 | 잔여 실업급여의 50% |'],
  ],
  'unemployment-benefit-application.mdx': [
    ['2026년 일 구직급여 상한 66,000원 기준', '2026년 일 구직급여 상한 68,100원 기준'],
    ['2026년 상한 **66,000원**·하한 64,192원', '2026년 상한 **68,100원**·하한 66,048원'],
    ['단 2026년 일 상한 66,000원, 하한 64,192원(최저시급 80%) 적용.', '단 2026년 일 상한 68,100원, 하한 66,048원(최저시급 80%) 적용.'],
  ],
  'unemployment-daily-payment-average-vs-ordinary.mdx': [
    ['2026년 기준 구직급여 일액 상한액은 66,000원, 하한액은 최저임금의 80% 수준으로 1일 57,600원입니다.', '2026년 기준 구직급여 일액 상한액은 68,100원, 하한액은 최저임금의 80% 수준으로 1일 66,048원입니다.'],
    ['2026년 기준 상한액 66,000원, 하한액 57,600원(최저임금의 80%)', '2026년 기준 상한액 68,100원, 하한액 66,048원(최저임금의 80%)'],
    ['하지만 상한액인 66,000원을 초과하므로 실제로는 66,000원만 받습니다.', '하지만 상한액인 68,100원을 초과하므로 실제로는 68,100원만 받습니다.'],
    ['113,333원 → 상한액 66,000원 적용', '113,333원 → 상한액 68,100원 적용'],
    ['| 구직급여 | 실업 상태 유지, 재취업 활동 | 1일 57,600원 ~ 66,000원 |', '| 구직급여 | 실업 상태 유지, 재취업 활동 | 1일 66,048원 ~ 68,100원 |'],
  ],
  'unemployment-individual-extension-benefit.mdx': [
    ['| 상한액 | 66,000원 (2026년) | 46,200원 (66,000 × 70%) |', '| 상한액 | 68,100원 (2026년) | 47,670원 (68,100 × 70%) |'],
  ],
};

function bumpFrontmatter(raw) {
  let s = raw.replace(/^dataValidAsOf:\s*"[^"]*"/m, 'dataValidAsOf: "2026년 6월"');
  if (!/^updatedAt:/m.test(s)) {
    s = s.replace(/^(publishedAt:\s*"[^"]*"\s*)$/m, '$1\nupdatedAt: "2026-06-15"\nlastReviewed: "2026-06-15"');
  } else {
    s = s.replace(/^updatedAt:\s*"[^"]*"/m, 'updatedAt: "2026-06-15"');
    if (/^lastReviewed:/m.test(s)) s = s.replace(/^lastReviewed:\s*"[^"]*"/m, 'lastReviewed: "2026-06-15"');
  }
  return s;
}

let totalFiles = 0, totalEdits = 0, misses = [];
for (const [file, pairs] of Object.entries(EDITS)) {
  const path = A(file);
  let raw = readFileSync(path, 'utf8');
  let fileEdits = 0;
  for (const [find, repl] of pairs) {
    if (!raw.includes(find)) { misses.push(`${file}: NOT FOUND → ${find.slice(0, 40)}…`); continue; }
    raw = raw.replace(find, repl);
    fileEdits++; totalEdits++;
  }
  raw = bumpFrontmatter(raw);
  // 잔여 66,000 검출 (정상 정정 후 0이어야)
  const left = (raw.match(/66,000/g) || []).length;
  if (left > 0) misses.push(`${file}: 잔여 66,000 ${left}건`);
  if (!DRY) writeFileSync(path, raw);
  totalFiles++;
  console.log(`${DRY ? '[DRY]' : '[APPLY]'} ${file}: ${fileEdits} edits, 잔여 66,000=${left}`);
}
console.log(`\n${DRY ? 'DRY-RUN' : 'APPLIED'} — ${totalFiles} files, ${totalEdits} edits`);
if (misses.length) { console.error('\n⚠️ 확인 필요:\n' + misses.join('\n')); process.exit(1); }
console.log('✅ 모든 치환 매칭 + 잔여 66,000 0건');
