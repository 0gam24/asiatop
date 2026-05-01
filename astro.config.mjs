// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://asiatop.co.kr',
  output: 'static',
  // CF Pages가 format:'directory' 출력에서 /path/ 형태로 서빙하므로
  // trailingSlash:'always'로 맞춰 canonical·sitemap·OG URL을 실제 URL과 일치
  trailingSlash: 'always',
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
    partytown({
      config: { forward: ['dataLayer.push', 'gtag'] },
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/draft/') &&
        !page.includes('/og/') &&
        !page.includes('/404') &&
        !/\/(design-system|search)\/?$/.test(page),
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
