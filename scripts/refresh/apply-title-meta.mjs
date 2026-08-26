#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// apply-title-meta.mjs (제목·메타 경량 리프레시 — 구글 회복 P4, 2026-08-26)
//
// 네이버 노출 상위·클릭 하위 글의 제목/메타 디스크립션만 교체하는 경량 워크플로.
// 본문·날짜 필드는 절대 건드리지 않는다 (수정일 정직 — updatedAt 조작 금지).
//
// 입력: TSV (탭 구분 — 새 제목 규격에 쉼표가 포함되므로 CSV 부적합)
//   slug<TAB>new_title<TAB>new_description
//   - new_description 비우면 제목만 교체
//   - 헤더 행 허용, '#' 주석 행 허용
//
// 검증 (1건이라도 실패 시 전체 미적용):
//   - slug 실존
//   - 제목 20~70자 (content.config 스키마), 긴 줄표(—/–) 금지,
//     금지 패턴(총정리·완벽 정리 류 — template-footprint 와 동일) 금지
//   - 디스크립션 80~170자, 금지 종결(~정리했습니다 류) 금지
//   - 큰따옴표(") 포함 값 거부 (frontmatter 인용 안전)
//
// CLAUDE.md "기존 발행 글 제목 불변" 규칙의 유일한 예외 트랙 (docs/24 P4) —
// 운영자 지정 목록에 한해서만 실행한다.
//
//   검증: node scripts/refresh/apply-title-meta.mjs <목록.tsv>
//   적용: DRY_RUN=0 node scripts/refresh/apply-title-meta.mjs <목록.tsv>
// 로그: docs/audits/title-meta-refresh-<date>.json (before/after 보존)
// ════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const AUDITS_DIR = join(ROOT, 'docs', 'audits');

const DRY_RUN = process.env.DRY_RUN !== '0';
const tsvPath = process.argv[2];

const TITLE_BAN_RE = /총정리|완벽\s*정리|완벽\s*가이드|한눈에\s*보기|꿀팁\s*모음|모든\s*것/;
const DESC_END_BAN_RE =
  /(정리했습니다|정리했어요|정리해\s*드립니다|정리합니다|알려드립니다|알아봅니다|알아보겠습니다|살펴봅니다|살펴보겠습니다|소개합니다|확인해\s*보세요)[.!?]?\s*$/;
const DASH_RE = /[–—]/;

if (!tsvPath) {
  console.error('사용법: [DRY_RUN=0] node scripts/refresh/apply-title-meta.mjs <목록.tsv>');
  console.error('TSV: slug<TAB>new_title<TAB>new_description(선택)');
  process.exit(1);
}

function articleFile(slug) {
  for (const ext of ['.mdx', '.md']) {
    const p = join(ARTICLES_DIR, slug + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

const rows = [];
for (const [i, raw] of readFileSync(tsvPath, 'utf8').split(/\r?\n/).entries()) {
  const line = raw.replace(/\s+$/, '');
  if (!line || line.startsWith('#')) continue;
  const [slug, newTitle, newDesc] = line.split('\t').map((s) => s?.trim());
  if (i === 0 && /^slug$/i.test(slug)) continue;
  rows.push({ line: i + 1, slug, newTitle, newDesc: newDesc || null });
}

const errors = [];
const plan = [];

for (const r of rows) {
  const file = r.slug ? articleFile(r.slug) : null;
  if (!file) {
    errors.push(`행 ${r.line}: slug 미존재 — ${r.slug ?? '(빈 값)'}`);
    continue;
  }
  if (!r.newTitle) {
    errors.push(`행 ${r.line}: new_title 누락 — ${r.slug}`);
    continue;
  }
  if (r.newTitle.length < 20 || r.newTitle.length > 70) {
    errors.push(`행 ${r.line}: 제목 길이 ${r.newTitle.length}자 (허용 20~70) — ${r.slug}`);
  }
  if (DASH_RE.test(r.newTitle) || (r.newDesc && DASH_RE.test(r.newDesc))) {
    errors.push(`행 ${r.line}: 긴 줄표(—/–) 금지 — ${r.slug}`);
  }
  if (TITLE_BAN_RE.test(r.newTitle)) {
    errors.push(`행 ${r.line}: 금지 제목 패턴 (총정리 류) — ${r.slug}`);
  }
  if (r.newTitle.includes('"') || (r.newDesc && r.newDesc.includes('"'))) {
    errors.push(`행 ${r.line}: 큰따옴표(") 포함 값 거부 — ${r.slug}`);
  }
  if (r.newDesc) {
    if (r.newDesc.length < 80 || r.newDesc.length > 170) {
      errors.push(`행 ${r.line}: 디스크립션 길이 ${r.newDesc.length}자 (허용 80~170) — ${r.slug}`);
    }
    if (DESC_END_BAN_RE.test(r.newDesc)) {
      errors.push(`행 ${r.line}: 금지 종결 (~정리했습니다 류) — ${r.slug}`);
    }
  }

  const text = readFileSync(file, 'utf8');
  const curTitle = text.match(/^title:\s*"(.*)"\s*$/m)?.[1];
  const curDesc = text.match(/^description:\s*"(.*)"\s*$/m)?.[1];
  if (curTitle === undefined) {
    errors.push(`행 ${r.line}: title frontmatter 파싱 실패 (큰따옴표 단일행 규격 아님) — ${r.slug}`);
    continue;
  }
  if (r.newDesc && curDesc === undefined) {
    errors.push(`행 ${r.line}: description frontmatter 파싱 실패 — ${r.slug}`);
    continue;
  }
  if (curTitle === r.newTitle && (!r.newDesc || curDesc === r.newDesc)) {
    errors.push(`행 ${r.line}: 변경 없음 (현재 값과 동일) — ${r.slug}`);
    continue;
  }
  plan.push({ ...r, file, curTitle, curDesc });
}

if (errors.length > 0) {
  console.error(`❌ [title-meta] 검증 실패 ${errors.length}건 — 아무것도 적용하지 않음`);
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}

console.log(`${DRY_RUN ? '🔍 [DRY_RUN]' : '⚙️  [적용]'} 제목·메타 리프레시 ${plan.length}건`);
for (const p of plan) {
  console.log(`   ${p.slug}`);
  console.log(`     제목: ${p.curTitle}`);
  console.log(`       →  ${p.newTitle}`);
  if (p.newDesc) {
    console.log(`     메타: …${(p.curDesc ?? '').slice(-25)} → …${p.newDesc.slice(-25)}`);
  }
}

if (DRY_RUN) {
  console.log('\n적용: DRY_RUN=0 node scripts/refresh/apply-title-meta.mjs ' + tsvPath);
  process.exit(0);
}

for (const p of plan) {
  let text = readFileSync(p.file, 'utf8');
  text = text.replace(/^title:\s*".*"\s*$/m, `title: "${p.newTitle}"`);
  if (p.newDesc) {
    text = text.replace(/^description:\s*".*"\s*$/m, `description: "${p.newDesc}"`);
  }
  writeFileSync(p.file, text, 'utf8');
}

mkdirSync(AUDITS_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const logPath = join(AUDITS_DIR, `title-meta-refresh-${today}.json`);
const prev = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { batches: [] };
prev.batches.push({
  ranAt: new Date().toISOString(),
  tsv: tsvPath,
  changes: plan.map(({ slug, curTitle, newTitle, curDesc, newDesc }) => ({
    slug,
    titleBefore: curTitle,
    titleAfter: newTitle,
    ...(newDesc ? { descBefore: curDesc, descAfter: newDesc } : {}),
  })),
});
writeFileSync(logPath, JSON.stringify(prev, null, 2) + '\n', 'utf8');

console.log(`\n✅ 적용 완료 — audit: ${logPath}`);
console.log('   본문·날짜 필드 불변 확인: git diff 에 title/description 줄만 있어야 정상.');
console.log('   다음: 브랜치/PR 생성 → CI green → 운영자 merge-approved 라벨 승인 (docs/24 P0)');
