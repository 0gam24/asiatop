#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// author-transition.mjs (익명 저자 → 실명 저자 전환 — 구글 회복 P2, 2026-08-26)
//
// 2026-08-18 구글 스팸 억제 원인 중 하나가 "전 글 단일 익명 저자"다
// (author "editor-team" 572편 / 685편). 본 스크립트는 frontmatter 의
// `author: "editor-team"` 를 `author: "kim-junhyeok"` (실명·사업자등록 공개
// 프로필, src/content/authors/kim-junhyeok.json) 로 일괄 전환한다.
//
// 정직성 가드:
//   - author 줄만 교체. updatedAt·lastReviewed 미변경 → sitemap lastmod 불변
//     ("콘텐츠 변경 없이 수정일 갱신" 금지 조항 준수).
//   - 바이라인 검수 표기는 [slug].astro 에서 발행 시기별로 구분:
//     2026-06-11(수동 전환일) 이전 발행분 = "책임 편집", 이후 = "작성·검수".
//
// CLAUDE.md 대규모 일괄 변경 패턴 준수: DRY_RUN=1 기본 + audit 로그.
//   검증: node scripts/audit/author-transition.mjs
//   적용: DRY_RUN=0 node scripts/audit/author-transition.mjs
// 로그: docs/audits/author-transition-<date>.json (같은 PR 에 commit)
// ════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const AUDITS_DIR = join(ROOT, 'docs', 'audits');

const DRY_RUN = process.env.DRY_RUN !== '0';
const FROM = 'editor-team';
const TO = 'kim-junhyeok';

// author 줄 정확 매칭 — 값이 정확히 FROM 인 경우만 (부분 일치·다른 필드 오염 방지)
const AUTHOR_LINE_RE = new RegExp(`^author:\\s*["']?${FROM}["']?\\s*$`, 'm');

const changed = [];
const skipped = [];

for (const name of readdirSync(ARTICLES_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const path = join(ARTICLES_DIR, name);
  const text = readFileSync(path, 'utf8');
  if (!AUTHOR_LINE_RE.test(text)) {
    skipped.push(name);
    continue;
  }
  const next = text.replace(AUTHOR_LINE_RE, `author: "${TO}"`);
  if (!DRY_RUN) writeFileSync(path, next, 'utf8');
  changed.push(name.replace(/\.mdx?$/, ''));
}

const log = {
  script: 'scripts/audit/author-transition.mjs',
  ranAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  from: FROM,
  to: TO,
  changedCount: changed.length,
  skippedCount: skipped.length,
  changed,
};

if (!DRY_RUN) {
  mkdirSync(AUDITS_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const logPath = join(AUDITS_DIR, `author-transition-${date}.json`);
  writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n', 'utf8');
  console.log(`📝 audit 로그: ${logPath}`);
}

console.log(
  `${DRY_RUN ? '🔍 [DRY_RUN]' : '✅ [적용 완료]'} author "${FROM}" → "${TO}": 대상 ${changed.length}편, 비대상 ${skipped.length}편`,
);
if (DRY_RUN) {
  console.log('   샘플 10편:', changed.slice(0, 10).join(', '));
  console.log('   적용: DRY_RUN=0 node scripts/audit/author-transition.mjs');
}
