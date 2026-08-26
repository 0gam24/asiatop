#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// template-footprint.mjs (제목·메타 풋프린트 가드 — 구글 회복 P1, 2026-08-26)
//
// 2026-08-18 구글 스팸 억제 원인 중 하나가 메타·제목 균일 템플릿이다
// (실측: description "~정리했~" 종결 485편, "총정리" 제목 66편).
// 본 가드는 신규 글(publishedAt >= 2026-08-27)의 frontmatter 에서:
//   1. 금지 제목 패턴 ("총정리·완벽 정리·한눈에 보기" 류)
//   2. 금지 디스크립션 종결 ("~정리했습니다" 류)
//   3. 신규 글끼리의 종결 어미 중복률 (동일 종결 4자가 신규 글의 40% 초과 시)
// 을 검출해 빌드·CI 를 차단한다. 히스토리(발효일 이전 발행분)는 검사하지 않는다.
//
// 실행: node scripts/audit/template-footprint.mjs  (또는 pnpm audit:template)
// ════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

// 규칙 발효일 — 이 날짜 이후 publishedAt 글만 검사
const RULE_DATE = '2026-08-27';

// 금지 제목 패턴 — 사이트 전역에 복제된 공식형 표현
const TITLE_BAN_RE = /총정리|완벽\s*정리|완벽\s*가이드|한눈에\s*보기|꿀팁\s*모음|모든\s*것/;

// 금지 디스크립션 종결 — "~까지 정리했습니다" 균일 템플릿 계열
const DESC_END_BAN_RE =
  /(정리했습니다|정리했어요|정리해\s*드립니다|정리합니다|알려드립니다|알아봅니다|알아보겠습니다|살펴봅니다|살펴보겠습니다|소개합니다|확인해\s*보세요)[.!?]?\s*$/;

// 종결 어미 중복률 상한 — 신규 글 중 동일 종결(마지막 4자)이 이 비율 초과 + 3편 이상이면 실패
const ENDING_DUP_RATIO = 0.4;
const ENDING_DUP_MIN = 3;

function fmField(text, key) {
  // frontmatter 블록 내 단일행 문자열 필드만 파싱 (title/description 은 단일행 규격)
  const m = text.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'));
  return m?.[1]?.trim();
}

const newArticles = [];
for (const name of readdirSync(ARTICLES_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const text = readFileSync(join(ARTICLES_DIR, name), 'utf8');
  const pub = text.match(/^publishedAt:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!pub || pub < RULE_DATE) continue;
  newArticles.push({
    slug: name.replace(/\.mdx?$/, ''),
    title: fmField(text, 'title') ?? '',
    description: fmField(text, 'description') ?? '',
  });
}

const violations = [];

for (const a of newArticles) {
  if (TITLE_BAN_RE.test(a.title)) {
    violations.push(`${a.slug}: 금지 제목 패턴 — "${a.title}"`);
  }
  if (DESC_END_BAN_RE.test(a.description)) {
    violations.push(`${a.slug}: 금지 디스크립션 종결 — "…${a.description.slice(-30)}"`);
  }
}

// 종결 어미 중복률 (신규 글 3편 이상 쌓인 뒤부터 의미)
if (newArticles.length >= ENDING_DUP_MIN) {
  const endings = new Map(); // 마지막 4자(구두점 제거) → [slug...]
  for (const a of newArticles) {
    const tail = a.description.replace(/[.!?\s]+$/, '').slice(-4);
    if (!tail) continue;
    if (!endings.has(tail)) endings.set(tail, []);
    endings.get(tail).push(a.slug);
  }
  for (const [tail, slugs] of endings) {
    if (slugs.length >= ENDING_DUP_MIN && slugs.length / newArticles.length > ENDING_DUP_RATIO) {
      violations.push(
        `종결 "${tail}" 중복 ${slugs.length}/${newArticles.length}편 (상한 ${ENDING_DUP_RATIO * 100}%) — ${slugs.join(', ')}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    `❌ [template-footprint] 풋프린트 위반 ${violations.length}건 — docs/24 P1 (기준 ${RULE_DATE}~)`,
  );
  for (const v of violations) console.error(`   ${v}`);
  console.error('   제목 유형·메타 문형 로테이션은 .claude/agents/content-agent.md 참조.');
  process.exit(1);
}

console.log(
  `✅ [template-footprint] 통과: 신규 글 ${newArticles.length}편, 제목·메타 풋프린트 위반 0건 (기준 ${RULE_DATE}~)`,
);
