#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// ai-tell-style.mjs (AI 티 스타일 가드, CLAUDE.md "AI 티 금지" 2026-07-10)
//
// 신규 글(publishedAt >= 2026-07-10)의 파일 전체(제목·설명·본문·faq)에서
// 긴 줄표(em-dash U+2014, en-dash U+2013)를 발견하면 exit 1.
// pnpm build 체인 선두에서 실행되므로 CI·Cloudflare 배포가 자동 차단된다.
//
// 배경: "명사구 — 부제" 제목은 사람이 잘 안 쓰고 AI가 즐겨 쓰는 패턴이라
//   애드센스 재승인 심사에서 "AI가 찍어낸 사이트" 인상을 준다.
// 규칙 이전 발행 글은 검사하지 않는다. 제목 변경은 색인 리셋(순위 손실)이라
//   기존 글 소급 수정도 금지 — 이 가드는 신규 글 전용.
//
// 실행: node scripts/audit/ai-tell-style.mjs  (또는 pnpm audit:ai-style)
// ════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

// 규칙 발효일 — 이 날짜 이후 publishedAt 글만 검사
const RULE_DATE = '2026-07-10';

// 규칙 확정 전 같은 날(07-10) 오전에 이미 발행·색인된 글 — 제목 불변 원칙에 따라 예외
const EXEMPT = new Set([
  'unemployment-benefit-part-time-work',
  'unemployment-benefit-application-process',
]);

const DASH_RE = /[–—]/; // – (en dash), — (em dash)

let checked = 0;
const violations = [];

for (const name of readdirSync(ARTICLES_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const slug = name.replace(/\.mdx?$/, '');
  const text = readFileSync(join(ARTICLES_DIR, name), 'utf8');
  const pub = text.match(/^publishedAt:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!pub || pub < RULE_DATE || EXEMPT.has(slug)) continue;

  checked++;
  text.split(/\r?\n/).forEach((line, i) => {
    if (DASH_RE.test(line)) {
      violations.push({ slug: name, line: i + 1, text: line.trim().slice(0, 80) });
    }
  });
}

if (violations.length > 0) {
  console.error(
    `❌ [ai-tell-style] 긴 줄표(—/–) ${violations.length}건 발견, CLAUDE.md "AI 티 금지" 위반 (${RULE_DATE} 이후 신규 글)`,
  );
  for (const v of violations) {
    console.error(`   ${v.slug}:${v.line}  ${v.text}`);
  }
  console.error('   쉼표나 자연스러운 어구로 바꿔 주세요. 예) "A — B" → "A, B"');
  process.exit(1);
}

console.log(
  `✅ [ai-tell-style] 통과: 신규 글 ${checked}편에서 긴 줄표 0건 (기준 ${RULE_DATE}~, 예외 ${EXEMPT.size}편)`,
);
