#!/usr/bin/env node
/**
 * R94-7 — RSS·sitemap 동기화 게이트.
 *
 * 목적:
 *   article frontmatter (publishedAt/updatedAt) 변경 시 RSS·sitemap-0·sitemap-news 가
 *   최신 상태인지 검증. 누락·미동기화 시 build 차단.
 *
 * 검사 항목:
 *   1. updatedAt < publishedAt 인 article 0건 (논리 오류 + sitemap-lastmod 오염)
 *   2. dist/sitemap-0.xml 의 article URL 수 == src/content/articles/*.mdx 비-draft 수
 *   3. dist/sitemap-news.xml 의 최신 5 publication_date 가 article 의 top 5 publishedAt 과 일치
 *   4. dist/rss.xml 의 item 수 가 0보다 큼 + 최신 item pubDate 가 article top publishedAt 일치
 *
 * 사용:
 *   node scripts/audit/feed-sync.mjs                  # dist 기준 검증
 *   FAIL_ON_WARN=1 node scripts/audit/feed-sync.mjs   # warning 도 fail
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const DIST = join(ROOT, 'dist');

const FAIL_ON_WARN = process.env.FAIL_ON_WARN === '1';

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

function collectArticles() {
  const list = [];
  for (const file of walkMdx(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm || fm.draft === 'true') continue;
    list.push({ file, ...fm });
  }
  return list;
}

function isoOf(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString().slice(0, 10);
}

function main() {
  const errors = [];
  const warnings = [];

  // === 1. updatedAt < publishedAt 검사 ===
  const articles = collectArticles();
  console.log(`[feed-sync] articles ${articles.length}편 스캔`);

  const stale = articles.filter((a) => {
    if (!a.updatedAt) return false;
    const u = new Date(a.updatedAt).valueOf();
    const p = new Date(a.publishedAt).valueOf();
    return !Number.isNaN(u) && !Number.isNaN(p) && u < p;
  });
  if (stale.length > 0) {
    errors.push(`updatedAt < publishedAt 인 article ${stale.length}편 — distribute-published-dates.mjs 재실행 필요`);
    for (const s of stale.slice(0, 5)) {
      const name = s.file.split(/[/\\]/).pop();
      errors.push(`   - ${name}: publishedAt=${s.publishedAt} updatedAt=${s.updatedAt}`);
    }
  } else {
    console.log('[feed-sync] ✅ updatedAt >= publishedAt 일관성 OK');
  }

  // === 2~4. dist 검증 (build 후에만) ===
  if (!existsSync(DIST)) {
    console.log('[feed-sync] ℹ️  dist/ 미존재 — frontmatter-only 검증만 수행');
    if (errors.length > 0) {
      console.error('');
      console.error('[feed-sync] ❌ 실패:');
      for (const e of errors) console.error('  ' + e);
      process.exit(1);
    }
    return;
  }

  // top N article by publishedAt
  const sortedArticles = articles
    .slice()
    .sort((a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf());
  const top5Dates = sortedArticles.slice(0, 5).map((a) => isoOf(a.publishedAt));

  // === 2. sitemap-0 URL 수 == article 수 ===
  const sitemap0 = join(DIST, 'sitemap-0.xml');
  if (existsSync(sitemap0)) {
    const xml = readFileSync(sitemap0, 'utf-8');
    const articleUrlCount = (xml.match(/<loc>https:\/\/asiatop\.co\.kr\/[^/]+\/[^<]+\/<\/loc>/g) || []).length;
    if (articleUrlCount < articles.length) {
      errors.push(`sitemap-0.xml article URL ${articleUrlCount} < frontmatter 비-draft ${articles.length} — 빌드 누락`);
    } else {
      console.log(`[feed-sync] ✅ sitemap-0.xml article URL ${articleUrlCount} >= ${articles.length}`);
    }
  } else {
    warnings.push('sitemap-0.xml 미존재');
  }

  // === 3. sitemap-news.xml top dates 일치 ===
  const sitemapNews = join(DIST, 'sitemap-news.xml');
  if (existsSync(sitemapNews)) {
    const xml = readFileSync(sitemapNews, 'utf-8');
    const dates = [...xml.matchAll(/<news:publication_date>([^<]+)<\/news:publication_date>/g)].map((m) =>
      m[1].slice(0, 10),
    );
    if (dates.length === 0) {
      errors.push('sitemap-news.xml urlset 비어있음');
    } else {
      const newest = dates.slice().sort().reverse()[0];
      if (newest !== top5Dates[0]) {
        warnings.push(`sitemap-news.xml 최신=${newest} ≠ frontmatter top=${top5Dates[0]} (CF 캐시 가능)`);
      } else {
        console.log(`[feed-sync] ✅ sitemap-news.xml newest ${newest} == frontmatter top`);
      }
    }
  } else {
    warnings.push('sitemap-news.xml 미존재');
  }

  // === 4. RSS item 수 + 최신 pubDate ===
  const rss = join(DIST, 'rss.xml');
  if (existsSync(rss)) {
    const xml = readFileSync(rss, 'utf-8');
    const items = (xml.match(/<item>/g) || []).length;
    if (items === 0) {
      errors.push('rss.xml item 0건');
    } else {
      const pubDates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) =>
        new Date(m[1]).toISOString().slice(0, 10),
      );
      const newest = pubDates.slice().sort().reverse()[0];
      if (newest !== top5Dates[0]) {
        warnings.push(`rss.xml 최신=${newest} ≠ frontmatter top=${top5Dates[0]}`);
      } else {
        console.log(`[feed-sync] ✅ rss.xml item ${items}건 · newest ${newest} == frontmatter top`);
      }
    }
  } else {
    warnings.push('rss.xml 미존재');
  }

  // === Summary ===
  if (warnings.length > 0) {
    console.warn('');
    console.warn('[feed-sync] ⚠️  warnings:');
    for (const w of warnings) console.warn('  - ' + w);
  }
  if (errors.length > 0) {
    console.error('');
    console.error('[feed-sync] ❌ errors:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  if (FAIL_ON_WARN && warnings.length > 0) {
    console.error('[feed-sync] ❌ FAIL_ON_WARN=1 → warning fail');
    process.exit(1);
  }
  console.log('[feed-sync] ✅ 통과');
}

main();
