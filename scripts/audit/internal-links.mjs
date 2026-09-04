#!/usr/bin/env node
/**
 * 빌드 산출물 내부 링크·메타 게이트 — 네이버 서치어드바이저 진단 재발 방지 (2026-09-05)
 *
 *  1. dist 의 모든 HTML 에서 href="/..." 내부 링크가 전부 trailing slash 로 끝나는지 검사.
 *     (파일 자원 .xml/.txt/.png 등 · /cdn-cgi 제외, ?query·#hash 는 떼고 판정)
 *     위반 = CF Pages 308 → 서치어드바이저 "리다이렉션된 페이지" 집계 (2026-09-04 약 103건).
 *  2. 내부 링크가 dist 에 실제로 존재하는 페이지를 가리키는지 검사 (직접 200 이어야 한다 —
 *     _redirects 를 타는 링크도 크롤러에겐 "리다이렉션된 페이지", 없는 경로는 "접근 불가").
 *  3. 모든 HTML 에 <title> 과 <meta name="description"> 이 있는지 검사.
 *
 * 사용: node scripts/audit/internal-links.mjs [--dist dist]
 * 위반 시 exit 1 — package.json build 체인 마지막 단계라 로컬 빌드·CI 모두 차단한다.
 * 래퍼: scripts/check-trailing-slash.sh
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argIdx = process.argv.indexOf('--dist');
const DIST = join(ROOT, argIdx !== -1 ? process.argv[argIdx + 1] : 'dist');
const SKIP_DIRS = new Set(['pagefind', '_astro']);
// 검색엔진 소유권 인증 파일 (public/ 정적, 링크되지 않음) — title/description 검사 대상 아님
const SKIP_FILES_RE = /^(naver[0-9a-f]{16,}|google[0-9a-f]{8,}|BingSiteAuth|yandex_[0-9a-f]+)\.html$/i;
const FILE_EXT_RE = /\.(xml|txt|json|png|jpe?g|svg|ico|webp|avif|gif|css|js|mjs|webmanifest|pdf|md|xsl|html)$/i;
const MAX_PRINT = 40;

if (!existsSync(DIST)) {
  console.error(`❌ dist 없음: ${DIST} — 먼저 astro build 를 실행하세요.`);
  process.exit(1);
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      yield* htmlFiles(full);
    } else if (name.endsWith('.html')) {
      if (dir === DIST && SKIP_FILES_RE.test(name)) continue;
      yield full;
    }
  }
}

const HREF_RE = /href=(["'])([^"']*)\1/g;
const TITLE_RE = /<title[^>]*>\s*[^<\s][^<]*<\/title>/i;
const DESC_RE_A = /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i;
const DESC_RE_B = /<meta\s+[^>]*content=["'][^"']+["'][^>]*name=["']description["']/i;

/** 페이지 경로(/tax/) 가 dist 에 존재하는지 — directory 포맷이라 index.html 로 판정 */
const existsCache = new Map();
function pageExists(path) {
  if (existsCache.has(path)) return existsCache.get(path);
  const decoded = decodeURIComponent(path);
  const ok = existsSync(join(DIST, decoded, 'index.html')) || existsSync(join(DIST, decoded));
  existsCache.set(path, ok);
  return ok;
}

const noSlash = new Map(); // target -> { count, files:Set }
const dead = new Map();
const missingTitle = [];
const missingDesc = [];
let scanned = 0;

function record(map, path, rel) {
  const entry = map.get(path) ?? { count: 0, files: new Set() };
  entry.count += 1;
  entry.files.add(rel);
  map.set(path, entry);
}

for (const file of htmlFiles(DIST)) {
  scanned += 1;
  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file).replaceAll('\\', '/');

  for (const m of html.matchAll(HREF_RE)) {
    const raw = m[2];
    if (!raw.startsWith('/') || raw.startsWith('//')) continue;
    const cut = raw.search(/[?#]/);
    const path = cut === -1 ? raw : raw.slice(0, cut);
    if (FILE_EXT_RE.test(path)) continue;
    if (path.startsWith('/cdn-cgi')) continue;
    if (!path.endsWith('/')) {
      record(noSlash, path, rel);
      continue;
    }
    if (!pageExists(path)) record(dead, path, rel);
  }

  if (!TITLE_RE.test(html)) missingTitle.push(rel);
  if (!DESC_RE_A.test(html) && !DESC_RE_B.test(html)) missingDesc.push(rel);
}

function printMap(label, map) {
  const total = [...map.values()].reduce((s, e) => s + e.count, 0);
  console.log(`\n❌ ${label}: 대상 ${map.size}종 / 출현 ${total}회`);
  const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, MAX_PRINT);
  for (const [path, e] of rows) {
    const sample = [...e.files][0];
    console.log(`  ${path}  ×${e.count}  (예: ${sample}${e.files.size > 1 ? ` 외 ${e.files.size - 1}` : ''})`);
  }
  if (map.size > MAX_PRINT) console.log(`  … 외 ${map.size - MAX_PRINT}종`);
}

let failed = false;
console.log(`\n══ 내부 링크·메타 게이트 — HTML ${scanned}개 스캔 ══`);

if (noSlash.size > 0) {
  failed = true;
  printMap('trailing slash 누락 내부 링크', noSlash);
} else {
  console.log('✅ 내부 링크 trailing slash 전부 정상');
}

if (dead.size > 0) {
  failed = true;
  printMap('dist 에 없는 페이지로 가는 내부 링크 (404 또는 _redirects 경유)', dead);
} else {
  console.log('✅ 내부 링크 전부 실존 페이지 직결');
}

if (missingTitle.length > 0) {
  failed = true;
  console.log(`\n❌ <title> 없음: ${missingTitle.length}개`);
  for (const f of missingTitle.slice(0, MAX_PRINT)) console.log(`  ${f}`);
} else {
  console.log('✅ <title> 전 페이지 존재');
}

if (missingDesc.length > 0) {
  failed = true;
  console.log(`\n❌ <meta name="description"> 없음: ${missingDesc.length}개`);
  for (const f of missingDesc.slice(0, MAX_PRINT)) console.log(`  ${f}`);
} else {
  console.log('✅ <meta name="description"> 전 페이지 존재');
}

if (failed) {
  console.log(
    '\n→ 컴포넌트 링크는 src/lib/url.ts href() 또는 리터럴에 / 추가, 본문 링크는 remark-trailing-slash 가 처리한다.' +
      '\n→ 없는 페이지 링크는 대상 글의 현재 경로로 고치거나(리다이렉트 경유 금지), 삭제된 글이면 링크를 뺀다.',
  );
  process.exit(1);
}
console.log('');
