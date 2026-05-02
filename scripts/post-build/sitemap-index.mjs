#!/usr/bin/env node
/**
 * sitemap-index 통합 — R49 #49-1
 *
 * @astrojs/sitemap 이 자동 생성하는 dist/sitemap-index.xml 은 sitemap-0.xml 만 포함.
 * 본 스크립트는 빌드 후 다음을 모두 참조하도록 sitemap-index.xml 을 덮어쓴다:
 *
 *   - dist/sitemap-0.xml          (Astro 자동, 모든 페이지)
 *   - dist/sitemap-news.xml       (48h news 윈도우)
 *   - dist/sitemap-images.xml     (모든 글 hero·OG)
 *
 * 카테고리 RSS 12개는 sitemap-index 가 아니라 robots.txt 의 Sitemap: 라인으로 등록
 * (sitemap-index 표준은 sitemap 만 entry, RSS 는 별도).
 *
 * 빌드 흐름:
 *   astro build  →  Astro pages 출력
 *                →  @astrojs/sitemap 자동 생성
 *                →  post-build/sitemap-index.mjs 덮어쓰기 (본 스크립트)
 *
 * package.json build 끝에 wire-up.
 */

import { writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://asiatop.co.kr';

// 통합할 sitemap 파일들 (dist 기준 상대 경로).
const SITEMAPS = ['sitemap-0.xml', 'sitemap-news.xml', 'sitemap-images.xml'];

function isoDate(filePath) {
  if (!existsSync(filePath)) return new Date().toISOString();
  return statSync(filePath).mtime.toISOString();
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[sitemap-index] ❌ dist/ 미존재. astro build 먼저.');
    process.exit(1);
  }

  const entries = [];
  for (const name of SITEMAPS) {
    const filePath = join(DIST, name);
    if (!existsSync(filePath)) {
      console.warn(`[sitemap-index] ⚠️  ${name} 부재 — skip`);
      continue;
    }
    entries.push({
      loc: `${SITE}/${name}`,
      lastmod: isoDate(filePath),
    });
  }

  if (entries.length === 0) {
    console.error('[sitemap-index] ❌ 통합할 sitemap 0건.');
    process.exit(1);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (e) =>
        `  <sitemap>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </sitemap>`,
    ),
    '</sitemapindex>',
    '',
  ].join('\n');

  const outPath = join(DIST, 'sitemap-index.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap-index] ✅ ${entries.length}개 sitemap 통합 → ${outPath}`);
  for (const e of entries) {
    console.log(`   - ${e.loc} (lastmod: ${e.lastmod.slice(0, 10)})`);
  }
}

main();
