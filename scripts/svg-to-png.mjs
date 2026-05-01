#!/usr/bin/env node
/**
 * SVG → PNG 빌드 후처리
 *
 * dist/og/**.svg 파일을 동일 이름 .png로 변환.
 * Google Discover 카드는 PNG/JPEG 강제 (SVG 부적합).
 *
 * 폰트 처리:
 *   - resvg-js의 font.loadSystemFonts: true 로 시스템 폰트 자동 로드
 *   - 한국어 글자가 있으면 시스템에서 사용 가능한 한국어 폰트 (Malgun Gothic·Noto Sans CJK 등) fallback
 *   - CI 환경에서 한국어 fallback 없을 수 있으니 향후 src/assets/fonts/NotoSansKR-VariableFont_wght.ttf 추가 권장
 */

import { Resvg } from '@resvg/resvg-js';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OG_DIR = join(ROOT, 'dist', 'og');

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

async function main() {
  if (!existsSync(OG_DIR)) {
    console.warn('[svg-to-png] dist/og/ not found, skipping.');
    return;
  }

  let converted = 0;
  let failed = 0;

  for await (const svgPath of walkSvg(OG_DIR)) {
    try {
      const svg = await readFile(svgPath, 'utf-8');
      const resvg = new Resvg(svg, {
        font: {
          loadSystemFonts: true,
          defaultFontFamily: 'Pretendard Variable',
          fontFiles: [],
        },
        fitTo: { mode: 'width', value: 1200 },
        background: 'white',
      });
      const pngBuffer = resvg.render().asPng();
      const pngPath = svgPath.replace(/\.svg$/, '.png');
      await writeFile(pngPath, pngBuffer);
      converted++;
    } catch (e) {
      failed++;
      console.warn(`[svg-to-png] ❌ ${svgPath}:`, e.message);
    }
  }

  console.log(`[svg-to-png] ✅ ${converted} PNG generated · ${failed} failed`);
}

main();
