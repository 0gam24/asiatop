#!/usr/bin/env node
/**
 * SVG → PNG 빌드 후처리
 *
 * dist/og/**.svg + dist/og-square/**.svg 동일 이름 .png 변환.
 * Google Discover·Perplexity·X 모두 PNG/JPEG 강제 (SVG 부적합).
 *
 * 폰트:
 *   - node_modules/pretendard/dist/public/static/Pretendard-{Bold,Regular}.otf 명시.
 *   - resvg-js 가 시스템 폰트 fallback 시 CF Pages Ubuntu 러너에서 tofu(□) 위험.
 *
 * R65 — 병렬화:
 *   - 132편 × 2 비율 (16:9 + 1:1) = 264 PNG → 직렬 약 100초.
 *   - p-limit 8 병렬 → 약 12초. CF Pages 빌드 분 한도 보호.
 */

import { Resvg } from '@resvg/resvg-js';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OG_DIRS = [join(ROOT, 'dist', 'og'), join(ROOT, 'dist', 'og-square')];

// Pretendard OTF — npm package dist
const PRETENDARD_DIR = join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static');
const FONT_FILES = [
  join(PRETENDARD_DIR, 'Pretendard-Bold.otf'),
  join(PRETENDARD_DIR, 'Pretendard-Regular.otf'),
].filter((p) => existsSync(p));

if (FONT_FILES.length === 0) {
  console.warn(
    '[svg-to-png] Pretendard OTF not found in node_modules. Falling back to system fonts (CF Pages 러너에서 tofu 위험).',
  );
}

const CONCURRENCY = 8;

async function* walkSvg(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSvg(full);
    else if (entry.name.endsWith('.svg')) yield full;
  }
}

async function convertOne(svgPath) {
  const svg = await readFile(svgPath, 'utf-8');
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Pretendard',
      fontFiles: FONT_FILES,
    },
    fitTo: { mode: 'width', value: 1200 },
    background: 'white',
  });
  const pngBuffer = resvg.render().asPng();
  const pngPath = svgPath.replace(/\.svg$/, '.png');
  await writeFile(pngPath, pngBuffer);
  return pngBuffer.length;
}

// 간이 p-limit — 외부 의존 회피
async function runParallel(items, limit, worker) {
  const results = [];
  let next = 0;
  const slots = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const idx = next++;
      try {
        const r = await worker(items[idx]);
        results.push({ ok: true, value: r, item: items[idx] });
      } catch (e) {
        results.push({ ok: false, error: e, item: items[idx] });
      }
    }
  });
  await Promise.all(slots);
  return results;
}

async function main() {
  const allSvgs = [];
  for (const dir of OG_DIRS) {
    if (!existsSync(dir)) continue;
    for await (const svgPath of walkSvg(dir)) allSvgs.push(svgPath);
  }

  if (allSvgs.length === 0) {
    console.warn('[svg-to-png] no SVG found in dist/og/ or dist/og-square/, skipping.');
    return;
  }

  const t0 = Date.now();
  const results = await runParallel(allSvgs, CONCURRENCY, convertOne);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  let converted = 0;
  let failed = 0;
  let bytes = 0;
  for (const r of results) {
    if (r.ok) {
      converted++;
      bytes += r.value;
    } else {
      failed++;
      console.warn(`[svg-to-png] ❌ ${r.item}:`, r.error?.message);
    }
  }

  console.log(
    `[svg-to-png] ✅ ${converted} PNG generated · ${failed} failed · ${(bytes / 1024 / 1024).toFixed(2)} MB · ${dt}s (parallel ${CONCURRENCY})`,
  );
}

main();
