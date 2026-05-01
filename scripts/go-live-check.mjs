#!/usr/bin/env node
/**
 * docs/22-go-live-checklist.md 자동 검증 스크립트
 *
 * 빌드 산출물(`dist/`)에 대해 정적 분석으로 검증 가능한 항목을 일괄 점검한다.
 * 라이브 도메인이 필요한 항목(securityheaders.com, PageSpeed Insights 라이브,
 * NVDA/VoiceOver, Search Console 등)은 본 스크립트에서 제외한다.
 *
 * 종료 코드:
 *   0 = 모든 필수 항목 통과
 *   1 = 한 개 이상의 필수 항목 실패
 *
 * 경고(warn)는 기본적으로 비차단. `--strict` 플래그 시 경고도 실패로 취급.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC_DIR = join(ROOT, 'public');
const STRICT = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const passes = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const pass = (msg) => passes.push(msg);

function* walkHtml(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

function readFile(path) {
  return readFileSync(path, 'utf-8');
}

function exists(path) {
  return existsSync(path);
}

function fileSize(path) {
  try { return statSync(path).size; } catch { return 0; }
}

function attr(html, tag, attrName) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attrName}=("([^"]*)"|'([^']*)')`, 'i');
  const m = html.match(re);
  return m ? (m[2] ?? m[3]) : null;
}

function metaContent(html, name) {
  const reName = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const reProperty = new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  return (html.match(reName) || html.match(reProperty) || [, null])[1];
}

function linkAttr(html, rel) {
  const re = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["']`, 'i');
  return (html.match(re) || [, null])[1];
}

function countTags(html, tag) {
  const re = new RegExp(`<${tag}\\b`, 'gi');
  return (html.match(re) || []).length;
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function parseJsonLd(blocks, file) {
  const parsed = [];
  for (const block of blocks) {
    try {
      const obj = JSON.parse(block);
      const arr = Array.isArray(obj) ? obj : [obj];
      parsed.push(...arr);
    } catch (e) {
      fail(`${file}: JSON-LD 파싱 실패 — ${e.message}`);
    }
  }
  return parsed;
}

// ---- 검증 루틴 ---------------------------------------------------------

function checkSiteWideFiles() {
  const required = [
    ['robots.txt', join(DIST, 'robots.txt')],
    ['sitemap-index.xml', join(DIST, 'sitemap-index.xml')],
    ['llms.txt', join(DIST, 'llms.txt')],
    ['llms-full.txt', join(DIST, 'llms-full.txt')],
    ['rss.xml', join(DIST, 'rss.xml')],
    ['favicon.svg', join(DIST, 'favicon.svg')],
    ['logo.svg', join(DIST, 'logo.svg')],
    ['_headers', join(DIST, '_headers')],
    ['og-default.svg', join(DIST, 'og-default.svg')],
  ];

  for (const [label, path] of required) {
    if (exists(path)) pass(`사이트 파일: /${label}`);
    else fail(`필수 사이트 파일 누락: /${label}`);
  }
}

function checkRobotsTxt() {
  const path = join(DIST, 'robots.txt');
  if (!exists(path)) return;
  const txt = readFile(path);
  const aiBots = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];
  for (const bot of aiBots) {
    if (txt.includes(`User-agent: ${bot}`)) pass(`robots: ${bot} 정책 명시`);
    else fail(`robots.txt에 ${bot} 정책 누락`);
  }
  if (/Sitemap:\s*https?:\/\//i.test(txt)) pass('robots: Sitemap URL 명시');
  else fail('robots.txt에 Sitemap URL 누락');
}

function checkLlmsTxt() {
  const llms = readFile(join(DIST, 'llms.txt'));
  const size = Buffer.byteLength(llms, 'utf-8');
  if (size <= 50 * 1024) pass(`llms.txt 크기: ${(size / 1024).toFixed(1)}KB ≤ 50KB`);
  else fail(`llms.txt 크기 초과: ${(size / 1024).toFixed(1)}KB > 50KB`);
  if (/^# /m.test(llms)) pass('llms.txt: 사이트 제목 헤더 존재');
  else warn('llms.txt: 첫 줄 # 헤더 권장');
}

function checkHeaders() {
  const path = join(DIST, '_headers');
  if (!exists(path)) return;
  const txt = readFile(path);
  const required = [
    ['HSTS', /Strict-Transport-Security:\s*max-age=\d+/i],
    ['X-Content-Type-Options', /X-Content-Type-Options:\s*nosniff/i],
    ['X-Frame-Options', /X-Frame-Options:\s*DENY/i],
    ['Referrer-Policy', /Referrer-Policy:/i],
    ['Permissions-Policy', /Permissions-Policy:/i],
    ['CSP', /Content-Security-Policy(-Report-Only)?:/i],
  ];
  for (const [name, re] of required) {
    if (re.test(txt)) pass(`_headers: ${name} 적용`);
    else fail(`_headers에 ${name} 누락`);
  }
}

function checkRequiredPages() {
  const required = [
    ['홈', 'index.html'],
    ['About', 'about/index.html'],
    ['Privacy', 'privacy/index.html'],
    ['Terms', 'terms/index.html'],
    ['Editorial Policy', 'editorial-policy/index.html'],
    ['Contact', 'contact/index.html'],
    ['Author 페이지', 'author/editor-team/index.html'],
    ['404', '404.html'],
  ];
  for (const [label, rel] of required) {
    if (exists(join(DIST, rel))) pass(`필수 페이지: ${label} (/${rel})`);
    else fail(`필수 페이지 누락: ${label} (/${rel})`);
  }
}

function checkNoDraftLeak() {
  const draftDir = join(DIST, 'draft');
  if (exists(draftDir)) fail('dist/draft/ 누출됨 — 드래프트 글이 빌드에 포함');
  else pass('드래프트 누출 없음');
}

function checkSitemapIntegrity() {
  const indexPath = join(DIST, 'sitemap-index.xml');
  if (!exists(indexPath)) return;
  const xml = readFile(indexPath);
  const sitemaps = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (sitemaps.length === 0) {
    fail('sitemap-index.xml에 항목 없음');
    return;
  }
  let totalUrls = 0;
  let badPaths = 0;
  for (const sUrl of sitemaps) {
    const fileName = sUrl.split('/').pop();
    const local = join(DIST, fileName);
    if (!exists(local)) {
      warn(`sitemap 파일 로컬에 없음: ${fileName}`);
      continue;
    }
    const sub = readFile(local);
    const urls = [...sub.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    totalUrls += urls.length;
    for (const u of urls) {
      if (/\/(draft|og|search|design-system|404)(\/|$)/.test(u)) {
        badPaths++;
        fail(`sitemap에 제외 경로 포함: ${u}`);
      }
    }
  }
  if (badPaths === 0) pass(`sitemap: ${totalUrls}개 URL, 제외 경로 없음`);
}

function checkPage(file, html) {
  const rel = relative(DIST, file).replace(/\\/g, '/');
  const localErrors = [];

  // noindex 페이지는 검증에서 제외 (어차피 인덱싱·sitemap 대상이 아님)
  const robotsContent = metaContent(html, 'robots') || '';
  if (/noindex/i.test(robotsContent)) {
    pass(`noindex 페이지 — 검증 스킵: ${rel}`);
    return;
  }

  // <html lang>
  const lang = attr(html, 'html', 'lang');
  if (lang !== 'ko') localErrors.push(`html lang="${lang}" (expected ko)`);

  // viewport
  if (!metaContent(html, 'viewport')) localErrors.push('viewport meta 누락');

  // title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) localErrors.push('title 누락');
  else if (title.length > 70) warn(`${rel}: title 길이 ${title.length}자 (≤70 권장)`);

  // description (한국어는 정보 밀도가 높아 50자 하한)
  const desc = metaContent(html, 'description');
  if (!desc) localErrors.push('description 누락');
  else if (desc.length < 50 || desc.length > 200) warn(`${rel}: description 길이 ${desc.length}자 (50~200 권장)`);

  // canonical
  if (!linkAttr(html, 'canonical')) localErrors.push('canonical 누락');

  // OG tags
  const ogRequired = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  for (const og of ogRequired) {
    if (!metaContent(html, og)) localErrors.push(`${og} 누락`);
  }

  // Twitter Card
  if (!metaContent(html, 'twitter:card')) localErrors.push('twitter:card 누락');

  // H1 — 정확히 1개
  const h1Count = countTags(html, 'h1');
  if (h1Count !== 1) localErrors.push(`h1 개수 ${h1Count} (expected 1)`);

  // Skip link
  if (!/href=["']#main["']/.test(html)) localErrors.push('skip link 누락');

  // <img width/height 누락 (CLS 방지)
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const img of imgs) {
    const hasW = /\bwidth=/i.test(img);
    const hasH = /\bheight=/i.test(img);
    if (!hasW || !hasH) {
      warn(`${rel}: <img>에 width/height 누락 — ${img.slice(0, 80)}…`);
    }
  }

  // JSON-LD 파싱
  const blocks = extractJsonLd(html);
  if (blocks.length === 0) localErrors.push('JSON-LD 누락');
  const ld = parseJsonLd(blocks, rel);

  // 홈: Organization + WebSite
  if (rel === 'index.html') {
    const types = ld.map((o) => o['@type']).flat();
    if (!types.includes('Organization')) localErrors.push('홈에 Organization 스키마 누락');
    if (!types.includes('WebSite')) localErrors.push('홈에 WebSite 스키마 누락');
  }

  // 글 페이지: BreadcrumbList + Article + author
  const isArticle = /^[^\/]+\/[^\/]+\/index\.html$/.test(rel)
    && !rel.startsWith('author/')
    && !rel.startsWith('calculators/')
    && !rel.startsWith('og/');
  if (isArticle) {
    const types = ld.map((o) => o['@type']).flat();
    if (!types.includes('BreadcrumbList')) localErrors.push('BreadcrumbList 누락');
    const article = ld.find((o) => o['@type'] === 'Article' || o['@type'] === 'NewsArticle');
    if (!article) localErrors.push('Article/NewsArticle 스키마 누락');
    else {
      if (!article.author) localErrors.push('Article.author 누락');
      else if (typeof article.author === 'object' && !article.author['@id']) {
        warn(`${rel}: Article.author에 @id 권장 (저자 페이지 연결)`);
      }
      if (!article.publisher) localErrors.push('Article.publisher 누락');
      if (!article.datePublished) localErrors.push('Article.datePublished 누락');
    }
  }

  // 클러스터 허브 (e.g. /tax/index.html, /credit-loan/index.html)
  const isHub = /^[^\/]+\/index\.html$/.test(rel)
    && !['index.html', '404.html'].includes(rel);
  if (isHub) {
    const types = ld.map((o) => o['@type']).flat();
    if (!types.includes('BreadcrumbList')) {
      warn(`${rel}: 클러스터 허브에 BreadcrumbList 권장`);
    }
  }

  if (localErrors.length > 0) {
    for (const e of localErrors) fail(`${rel}: ${e}`);
  } else {
    pass(`페이지 메타 OK: ${rel}`);
  }
}

function checkAllPages() {
  let count = 0;
  for (const file of walkHtml(DIST)) {
    const rel = relative(DIST, file).replace(/\\/g, '/');
    // Pagefind 산출물 등 제외
    if (rel.startsWith('pagefind/')) continue;
    const html = readFile(file);
    checkPage(file, html);
    count++;
  }
  pass(`총 ${count}개 HTML 페이지 검증 완료`);
}

function checkBundleSize() {
  // 홈페이지 HTML 크기
  const homeHtml = join(DIST, 'index.html');
  if (exists(homeHtml)) {
    const size = fileSize(homeHtml);
    if (size <= 50 * 1024) pass(`홈 HTML 크기: ${(size / 1024).toFixed(1)}KB ≤ 50KB`);
    else warn(`홈 HTML 크기: ${(size / 1024).toFixed(1)}KB > 50KB`);
  }

  // _astro 디렉터리 JS 합계 (gzip 추정 = raw / 3 정도)
  const astroDir = join(DIST, '_astro');
  if (exists(astroDir)) {
    let jsRaw = 0;
    let cssRaw = 0;
    const stack = [astroDir];
    while (stack.length) {
      const cur = stack.pop();
      for (const e of readdirSync(cur, { withFileTypes: true })) {
        const full = join(cur, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.name.endsWith('.js')) jsRaw += fileSize(full);
        else if (e.name.endsWith('.css')) cssRaw += fileSize(full);
      }
    }
    const jsKb = (jsRaw / 1024).toFixed(1);
    const cssKb = (cssRaw / 1024).toFixed(1);
    pass(`_astro JS 총 raw: ${jsKb}KB · CSS 총 raw: ${cssKb}KB (gzip ≈ 1/3)`);
  }
}

// ---- 실행 -------------------------------------------------------------

function main() {
  if (!exists(DIST)) {
    console.error('❌ dist/ 디렉터리가 없습니다. `pnpm build`를 먼저 실행하세요.');
    process.exit(1);
  }

  console.log('🔍 docs/22 go-live 검증 시작…\n');

  checkSiteWideFiles();
  checkRobotsTxt();
  checkLlmsTxt();
  checkHeaders();
  checkRequiredPages();
  checkNoDraftLeak();
  checkSitemapIntegrity();
  checkAllPages();
  checkBundleSize();

  console.log(`\n📊 결과 요약`);
  console.log(`   ✅ 통과: ${passes.length}건`);
  console.log(`   ⚠️  경고: ${warnings.length}건`);
  console.log(`   ❌ 실패: ${errors.length}건`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  경고 ${warnings.length}건 (상위 20):`);
    for (const w of warnings.slice(0, 20)) console.log(`   · ${w}`);
    if (warnings.length > 20) console.log(`   · …외 ${warnings.length - 20}건`);
  }

  if (errors.length > 0) {
    console.log(`\n❌ 실패 ${errors.length}건 (상위 30):`);
    for (const e of errors.slice(0, 30)) console.log(`   · ${e}`);
    if (errors.length > 30) console.log(`   · …외 ${errors.length - 30}건`);
  }

  const failedDueToWarn = STRICT && warnings.length > 0;
  if (errors.length > 0 || failedDueToWarn) {
    console.log(`\n🚫 게이트 미통과 — 위 항목을 수정 후 재실행하세요.`);
    process.exit(1);
  }

  console.log(`\n🚀 go-live 정적 검증 통과. 다음 라이브 검증 항목은 별도 수행:`);
  console.log(`   - PageSpeed Insights 모바일·데스크톱 100점 (라이브 도메인)`);
  console.log(`   - securityheaders.com A+ (라이브 도메인)`);
  console.log(`   - axe 접근성 위반 0건 (별도 GHA 작업)`);
  console.log(`   - linkinator 깨진 링크 0건 (별도 GHA 작업)`);
  console.log(`   - Search Console / Bing Webmaster 등록 + 사이트맵 제출`);
  process.exit(0);
}

main();
