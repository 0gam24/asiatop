/**
 * title 길이 audit — R50-2 (Naver SA SERP 표시 한도)
 *
 * Naver 검색 결과 화면에서 한국어 title은 약 30~40자 이후 잘림 (디바이스별 차이).
 * 본 audit은 모든 article frontmatter title 길이를 검증해 SERP 잘림 사전 예방.
 *
 * 정책:
 *   - title ≤ 35자: 통과 (Naver·Google·Bing 모두 풀 표시)
 *   - 35 < title ≤ 40: warn (일부 환경에서 잘림)
 *   - title > 40자: critical (Naver 모바일에서 확실히 잘림)
 *
 * 모드:
 *   기본          모든 글 audit, 결과 출력 (warn 수준, exit 0)
 *   --strict      critical 1건이라도 발견 시 exit 1
 *   --auto-only   aiAssisted=true 글만 strict 검증
 *
 * description은 별도 처리:
 *   content.config.ts schema가 80~170자 강제 — Google·Twitter 표준에 맞춤.
 *   Naver SERP 80자 잘림은 수용 (R51에서 별도 naverDescription 필드 검토).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const TITLE_PASS_MAX = 35; // ≤ 35자: 모든 검색엔진 풀 표시
const TITLE_WARN_MAX = 40; // 35 < title ≤ 40: warn
// title > 40: critical (Naver 모바일 확실히 잘림)

const STRICT = process.argv.includes('--strict');
const AUTO_ONLY = process.argv.includes('--auto-only');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

/**
 * title 길이 분류.
 */
export function classifyTitle(title) {
  const len = (title ?? '').length;
  if (len === 0) return { level: 'critical', reason: 'empty' };
  if (len > TITLE_WARN_MAX) return { level: 'critical', reason: `${len}자 (>${TITLE_WARN_MAX}, Naver 모바일 잘림 확실)` };
  if (len > TITLE_PASS_MAX) return { level: 'warn', reason: `${len}자 (35 < × ≤ 40)` };
  return { level: 'pass', reason: `${len}자` };
}

function main() {
  const reports = [];
  for (const file of walk(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    if (fm.draft === 'true') continue;

    const aiAssisted = fm.aiAssisted === 'true';
    if (AUTO_ONLY && !aiAssisted) continue;

    const r = classifyTitle(fm.title);
    reports.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      title: fm.title ?? '',
      length: (fm.title ?? '').length,
      aiAssisted,
      level: r.level,
      reason: r.reason,
    });
  }

  const stats = {
    total: reports.length,
    pass: reports.filter((r) => r.level === 'pass').length,
    warn: reports.filter((r) => r.level === 'warn').length,
    critical: reports.filter((r) => r.level === 'critical').length,
  };

  console.log(`📦 title 길이 audit (Naver SA SERP 표시 한도)\n`);
  console.log(
    `📊 결과 — total ${stats.total} · pass ${stats.pass} · warn ${stats.warn} · critical ${stats.critical}`,
  );

  // critical 출력
  if (stats.critical > 0) {
    console.log(`\n❌ critical (${stats.critical}건 — Naver 모바일 잘림 확실):`);
    reports
      .filter((r) => r.level === 'critical')
      .forEach((r) => console.log(`   - [${r.length}자] ${r.file}\n     "${r.title}"`));
  }

  // warn 출력
  if (stats.warn > 0) {
    console.log(`\n⚠️  warn (${stats.warn}건 — 일부 환경에서 잘림):`);
    reports
      .filter((r) => r.level === 'warn')
      .slice(0, 10)
      .forEach((r) => console.log(`   - [${r.length}자] ${r.file}\n     "${r.title}"`));
    if (stats.warn > 10) console.log(`   ...외 ${stats.warn - 10}건`);
  }

  // strict 모드
  if (STRICT && stats.critical > 0) {
    console.log(`\n🚫 strict 모드: critical violation ${stats.critical}건 → exit 1`);
    process.exit(1);
  }
  if (AUTO_ONLY && stats.critical > 0) {
    console.log(`\n🚫 auto-only: 자동 발행 글에 critical violation → exit 1`);
    process.exit(1);
  }

  console.log(
    `\n✅ 통과 (V1: warn 허용. 자동 발행 글 도입 시 --strict 활성). ` +
      `35~40자 글은 R50 후속에서 점진 마이그레이션 권장.`,
  );
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) main();
