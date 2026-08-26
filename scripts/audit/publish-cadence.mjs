#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// publish-cadence.mjs (발행 캐던스 가드 — 구글 회복 P0, 2026-08-26)
//
// 2026-08-18 구글 스팸 업데이트 사이트 단위 억제의 핵심 원인은 "일 3~4편
// 기계적 발행" 풋프린트다. 본 가드는 신규 글(publishedAt >= 2026-08-27)이
// 같은 날짜(publishedAt 기준)에 2편 이상 존재하면 빌드·CI 를 차단한다.
//
// - 리프레시(updatedAt 갱신)는 집계하지 않는다 — 신규 publishedAt 만 검사.
// - 규칙 발효일 이전 발행분(685편 히스토리)은 검사 대상 아님.
// - pnpm build 체인 선두에서 실행 → CI·Cloudflare 배포 자동 차단.
//
// 실행: node scripts/audit/publish-cadence.mjs  (또는 pnpm audit:cadence)
// ════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

// 규칙 발효일 — 이 날짜 이후 publishedAt 글만 검사 (히스토리 소급 금지)
const RULE_DATE = '2026-08-27';
// 하루 최대 신규 발행 편수
const MAX_PER_DAY = 1;

const byDate = new Map(); // 'YYYY-MM-DD' → [slug, ...]

for (const name of readdirSync(ARTICLES_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const text = readFileSync(join(ARTICLES_DIR, name), 'utf8');
  const pub = text.match(/^publishedAt:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!pub || pub < RULE_DATE) continue;
  if (!byDate.has(pub)) byDate.set(pub, []);
  byDate.get(pub).push(name.replace(/\.mdx?$/, ''));
}

const violations = [...byDate.entries()].filter(([, slugs]) => slugs.length > MAX_PER_DAY);

if (violations.length > 0) {
  console.error(
    `❌ [publish-cadence] 일 ${MAX_PER_DAY}편 초과 발행일 ${violations.length}건 — 구글 회복 캐던스 위반 (기준 ${RULE_DATE}~)`,
  );
  for (const [date, slugs] of violations) {
    console.error(`   ${date}: ${slugs.length}편 — ${slugs.join(', ')}`);
  }
  console.error('   신규 글은 하루 1편까지만. 나머지는 draft: true 로 보존하거나 publishedAt 을 다음 날로 조정하세요.');
  process.exit(1);
}

const total = [...byDate.values()].reduce((n, s) => n + s.length, 0);
console.log(
  `✅ [publish-cadence] 통과: ${RULE_DATE} 이후 신규 ${total}편, 일 ${MAX_PER_DAY}편 상한 위반 0건`,
);
