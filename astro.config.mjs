// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import remarkTrailingSlash from './src/lib/remark-trailing-slash.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 구글 회복 P3 (docs/24): noindex 글 sitemap 제외.
// astro.config 는 콘텐츠 컬렉션 API 접근 불가 → frontmatter 직독으로 경로 셋 구성.
// (sitemap-news·sitemap-images 는 각 엔드포인트에서 별도 필터)
const NOINDEX_PATHS = (() => {
  const set = new Set();
  try {
    const dir = fileURLToPath(new URL('./src/content/articles', import.meta.url));
    for (const name of readdirSync(dir)) {
      if (!/\.mdx?$/.test(name)) continue;
      const text = readFileSync(`${dir}/${name}`, 'utf8');
      if (!/^noindex:\s*true\s*$/m.test(text)) continue;
      const cluster = text.match(/^cluster:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
      if (!cluster) continue;
      set.add(`/${cluster}/${name.replace(/\.mdx?$/, '')}/`);
    }
  } catch {
    // 읽기 실패 시 제외 없이 진행 (빌드 차단보다 안전)
  }
  return set;
})();

/** @param {string} page */
const isNoindexedArticle = (page) => {
  try {
    return NOINDEX_PATHS.has(new URL(page).pathname);
  } catch {
    return false;
  }
};

export default defineConfig({
  site: 'https://asiatop.co.kr',
  output: 'static',
  // CF Pages가 format:'directory' 출력에서 /path/ 형태로 서빙하므로
  // trailingSlash:'always'로 맞춰 canonical·sitemap·OG URL을 실제 URL과 일치
  trailingSlash: 'always',
  // 마크다운: 단일 물결표(~) 취소선 비활성화 (2026-07-14).
  // "1~6월"·"3~5영업일" 같은 한국어 범위 표기가 GFM 기본값(singleTilde:true)에서
  // strikethrough로 렌더되던 버그를 차단. ~~이중 물결표~~ 취소선은 그대로 유지.
  // gfm:false로 Astro 기본 GFM을 끄고 remark-gfm을 직접 주입(표·자동링크 등 유지).
  // mdx()는 extendMarkdownConfig 기본값(true)으로 이 설정을 상속한다.
  // remark-trailing-slash (2026-09-05): 본문 내부 링크 `](/tax/slug)` 를 빌드 시 `/tax/slug/` 로 정규화.
  // 슬래시 없는 링크는 CF Pages 308 → 네이버 서치어드바이저 "리다이렉션된 페이지" 집계 원인.
  // 소스 685편은 손대지 않는다 (lastmod 무변경). 산출물 게이트: scripts/audit/internal-links.mjs
  markdown: {
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }], remarkTrailingSlash],
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx(),
    react(),
    // Partytown 통합은 2026-06-12 제거 — 마지막 사용처였던 GA4 gtag.js 를
    // 메인스레드 로더로 전환 (Analytics.astro 참조). dep 정리는 lockfile 재생성
    // 가능 환경에서 후속 처리.
    sitemap({
      filter: (page) =>
        !page.includes('/draft/') &&
        !page.includes('/og/') &&
        !page.includes('/404') &&
        !/\/(design-system|search)\/?$/.test(page) &&
        // llms*.txt 는 post-build 생성물이라 원래 sitemap 에 없지만 회귀 방어 (검색엔진 noindex 자산)
        !/\/llms(-full|-cluster-[a-z-]+)?\.txt$/.test(page) &&
        !isNoindexedArticle(page),
      changefreq: 'daily',
      priority: 0.7,
      entryLimit: 5000,
      serialize(item) {
        const url = item.url;
        if (/\/(about|privacy|terms|contact|editorial-policy)\/?$/.test(url)) {
          return { ...item, changefreq: 'monthly', priority: 0.3 };
        }
        if (/\/calculators\//.test(url)) {
          return { ...item, changefreq: 'weekly', priority: 0.8 };
        }
        if (/^https?:\/\/[^\/]+\/?$/.test(url)) {
          return { ...item, changefreq: 'daily', priority: 1.0 };
        }
        if (/^https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\/?$/.test(url)) {
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        return item;
      },
    }),
  ],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
