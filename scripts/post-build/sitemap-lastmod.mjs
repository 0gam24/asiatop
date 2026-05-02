#!/usr/bin/env node
/**
 * sitemap lastmod 정확화 — R49 #49-6
 *
 * @astrojs/sitemap 이 자동 생성하는 dist/sitemap-0.xml 은 lastmod 누락.
 * 본 스크립트는 빌드 후 모든 article URL 에 대해 frontmatter `updatedAt ?? publishedAt`
 * 값을 ISO 8601 lastmod 로 삽입한다.
 *
 * Google·Bing·Naver 모두 lastmod 신호를 인덱싱 우선순위·재크롤 빈도 결정에 활용.
 * 정확한 lastmod 미설정 시 search engine 이 자체 추측 → 갱신 글이 늦게 재크롤됨.
 *
 * 적용 범위:
 *   - article URL (e.g., /tax/yearend-tax-2026-checklist/) → frontmatter lastReviewed > updatedAt > publishedAt
 *   - 그 외 페이지 (홈·카테고리·운영) → 변경 없음 (기존 lastmod 미설정 유지)
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

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

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

function buildArticleLastmodMap() {
  const map = new Map(); // article URL path → ISO lastmod
  for (const file of walk(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    if (fm.draft === 'true') continue;
    const cluster = fm.cluster;
    if (!cluster) continue;
    const slug = relative(ARTICLES_DIR, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
    // lastmod 우선순위: lastReviewed > updatedAt > publishedAt > 파일 mtime fallback.
    const candidates = [fm.lastReviewed, fm.updatedAt, fm.publishedAt].filter(Boolean);
    let iso;
    if (candidates.length > 0) {
      const d = new Date(candidates[0]);
      if (!Number.isNaN(d.valueOf())) iso = d.toISOString();
    }
    if (!iso) iso = statSync(file).mtime.toISOString();
    map.set(`/${cluster}/${slug}/`, iso);
  }
  return map;
}

function patchSitemap(xmlPath, lastmodMap) {
  if (!existsSync(xmlPath)) {
    console.warn(`[sitemap-lastmod] ⚠️  ${xmlPath} 부재 — skip`);
    return { patched: 0, total: 0 };
  }
  let xml = readFileSync(xmlPath, 'utf-8');
  let patched = 0;
  let total = 0;

  // <url>...</url> 블록 단위로 처리. <loc> 추출 후 lastmod 매칭.
  xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, (full, body) => {
    total++;
    const locMatch = body.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) return full;
    let pathName;
    try {
      pathName = new URL(locMatch[1]).pathname;
    } catch {
      return full;
    }
    if (!pathName.endsWith('/')) pathName += '/';
    const iso = lastmodMap.get(pathName);
    if (!iso) return full;
    if (/<lastmod>/.test(body)) {
      // 기존 lastmod 가 있으면 우리 값으로 갱신 (권위적 ISO).
      const newBody = body.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${iso}</lastmod>`);
      patched++;
      return `<url>${newBody}</url>`;
    }
    // 신규 삽입 — <loc> 뒤에 lastmod 삽입.
    const newBody = body.replace(/<\/loc>/, `</loc><lastmod>${iso}</lastmod>`);
    patched++;
    return `<url>${newBody}</url>`;
  });

  writeFileSync(xmlPath, xml, 'utf-8');
  return { patched, total };
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[sitemap-lastmod] ❌ dist/ 미존재. astro build 먼저.');
    process.exit(1);
  }

  const map = buildArticleLastmodMap();
  console.log(`[sitemap-lastmod] 📦 article frontmatter ${map.size}건 lastmod 매핑`);

  const sitemap0 = join(DIST, 'sitemap-0.xml');
  const r0 = patchSitemap(sitemap0, map);
  console.log(`   - sitemap-0.xml: ${r0.patched}/${r0.total} URL 에 lastmod 적용`);

  // sitemap-news.xml 은 자체적으로 publication date 처리. lastmod 추가는 신호 보강.
  const sitemapNews = join(DIST, 'sitemap-news.xml');
  if (existsSync(sitemapNews)) {
    const rNews = patchSitemap(sitemapNews, map);
    console.log(`   - sitemap-news.xml: ${rNews.patched}/${rNews.total} URL 에 lastmod 적용`);
  }

  console.log(`[sitemap-lastmod] ✅ 완료`);
}

main();
