#!/usr/bin/env node
/**
 * 본문 인포그래픽 SVG → PNG 변환 (P1 이미지 파이프라인, 2026-07-19)
 *
 * scripts/content-images/svg/*.svg → public/images/articles/*.png (1200px 폭)
 *
 * 목적: 구글 디스커버 노출 요건(본문 내 1200px 이상 이미지 + max-image-preview:large)
 * 충족. OG 카드와 달리 본문용 인포그래픽은 빌드 타임이 아니라 발행 시 1회 생성해
 * PNG 를 커밋한다 (빌드 체인 무변경 — CF Pages 빌드 분 한도 보호).
 *
 * 사용: node scripts/content-images/build.mjs [이름필터]
 * 폰트: svg-to-png.mjs 와 동일하게 Pretendard OTF 명시 로드 (시스템 폰트 tofu 방지).
 */

import { Resvg } from '@resvg/resvg-js';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SVG_DIR = join(__dirname, 'svg');
const OUT_DIR = join(ROOT, 'public', 'images', 'articles');

const PRETENDARD_DIR = join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static');
const FONT_FILES = [
  join(PRETENDARD_DIR, 'Pretendard-Bold.otf'),
  join(PRETENDARD_DIR, 'Pretendard-Regular.otf'),
  join(PRETENDARD_DIR, 'Pretendard-SemiBold.otf'),
].filter((p) => existsSync(p));

const filter = process.argv[2];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = (await readdir(SVG_DIR)).filter((f) => f.endsWith('.svg'));
  const targets = filter ? entries.filter((f) => f.includes(filter)) : entries;
  if (targets.length === 0) {
    console.error(`[content-images] 대상 SVG 없음 (filter: ${filter ?? '없음'})`);
    process.exit(1);
  }
  for (const file of targets) {
    const svg = await readFile(join(SVG_DIR, file), 'utf-8');
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
      font: {
        loadSystemFonts: true,
        fontFiles: FONT_FILES,
        defaultFontFamily: 'Pretendard',
      },
    });
    const png = resvg.render().asPng();
    const out = join(OUT_DIR, basename(file, '.svg') + '.png');
    await writeFile(out, png);
    console.log(`✅ ${file} → public/images/articles/${basename(file, '.svg')}.png (${(png.length / 1024).toFixed(0)}KB)`);
  }
}

main().catch((e) => {
  console.error('[content-images] 실패:', e);
  process.exit(1);
});
