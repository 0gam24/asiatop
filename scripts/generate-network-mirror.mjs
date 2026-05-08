#!/usr/bin/env node
/**
 * Network mirror — smartdata HQ 의 Network Index 시스템이 본 사이트
 * 페이지 list 를 sync 하기 위한 메타 JSON 생성기.
 *
 * 출력: public/network-mirror.json
 *
 * 빌드 트리거:
 *   1. package.json `build` 체인의 첫 단계 (확실)
 *   2. package.json `prebuild` (pnpm enable-pre-post-scripts 활성 시)
 *   3. 수동: `pnpm generate:mirror`
 *
 * 입력:
 *   - src/content/articles/*.mdx — 108편 글 frontmatter
 *   - src/data/clusters.ts — 12 cluster 메타 (slug 만 사용)
 *
 * 안정성:
 *   - posts 는 (cluster asc, publishedAt desc, slug asc) 결정적 정렬 → JSON diff 안정.
 *   - lastUpdated 는 ISO 시각이라 매 빌드 변동. .gitignore 에 산출물 등록되어 영향 없음.
 */

import { writeFileSync, readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { splitFrontmatter } from './lib/mdx-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ── 12 cluster (CATEGORY_MAP §3.3 / src/data/clusters.ts 와 동일 순서) ────
const CLUSTERS = [
  'tax',
  'realestate',
  'unemployment',
  'gov-support',
  'savings',
  'insurance-labor',
  'auto',
  'public-services',
  'office-tips',
  'credit-loan',
  'insurance-personal',
  'pension',
];

// 본 사이트 페르소나 (about 페이지 + spec 합의) ──────────────────────────
const PERSONAS = ['사회초년생', '신혼·신생아', '직장인', '자영업자'];

// cluster → 1차 페르소나 매핑 (post-level persona 자동 부여 — 메인 funnel 정확도) ─
const CLUSTER_TO_PRIMARY_PERSONA = {
  tax: '직장인',
  realestate: '신혼·신생아',
  unemployment: '직장인',
  'gov-support': '사회초년생',
  savings: '직장인',
  'insurance-labor': '직장인',
  auto: '직장인',
  'public-services': '사회초년생',
  'office-tips': '직장인',
  'credit-loan': '자영업자',
  'insurance-personal': '직장인',
  pension: '직장인',
};

// cluster → 메인 카테고리 (MainBackrefBox CLUSTER_TO_MAIN_CATEGORY 와 1:1 일치) ──
const CLUSTER_TO_MAIN_CATEGORY = {
  tax: 'tax-finance',
  realestate: 'tax-finance',
  unemployment: 'policy',
  'gov-support': 'policy',
  savings: 'tax-finance',
  'insurance-labor': 'policy',
  auto: 'tax-finance',
  'public-services': 'policy',
  'office-tips': 'policy',
  'credit-loan': 'tax-finance',
  'insurance-personal': 'tax-finance',
  pension: 'tax-finance',
};

const ARTICLES_DIR = resolve(REPO_ROOT, 'src/content/articles');
const OUTPUT_PATH = resolve(REPO_ROOT, 'public/network-mirror.json');
const SITE_DOMAIN = 'https://asiatop.co.kr';

/**
 * MDX frontmatter 의 top-level scalar key 만 단순 파싱.
 * (배열·중첩 객체는 본 mirror 에 불필요 — 무시.)
 *
 * 입력: '---\ntitle: "x"\ncluster: "tax"\npublishedAt: 2026-04-15\n...\n---\n'
 * 출력: { title: 'x', cluster: 'tax', publishedAt: '2026-04-15', ... }
 */
function parseFrontmatterScalars(fm) {
  const lines = fm.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    // top-level key 만 — 들여쓰기·하이픈 항목·구분선 제외
    if (/^\s/.test(line)) continue;
    if (line === '---' || line === '') continue;
    if (line.startsWith('-')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let raw = m[2].trim();
    // 후행 인라인 주석 (#) 제거 — 단, 따옴표 안 # 는 보존
    if (raw && raw[0] !== '"' && raw[0] !== "'") {
      const hash = raw.indexOf(' #');
      if (hash > 0) raw = raw.slice(0, hash).trim();
    }
    // 빈 값 → 다음 줄에 array/object — 본 파서는 무시
    if (raw === '' || raw === '|' || raw === '>') continue;
    // 따옴표 제거
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    // bool / null
    if (raw === 'true') {
      out[key] = true;
      continue;
    }
    if (raw === 'false') {
      out[key] = false;
      continue;
    }
    if (raw === 'null' || raw === '~') {
      out[key] = null;
      continue;
    }
    out[key] = raw;
  }
  return out;
}

function toIsoDateOnly(raw) {
  if (!raw) return null;
  // YAML date scalar (2026-04-15) 이미 ISO 일자 형식.
  // 따옴표 없는 raw 든 따옴표 제거 후든 그대로 통과.
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(raw);
}

function collectAllPages() {
  if (!existsSync(ARTICLES_DIR)) {
    throw new Error(`[network-mirror] articles dir 없음: ${ARTICLES_DIR}`);
  }
  const files = readdirSync(ARTICLES_DIR).filter((f) => /\.mdx?$/.test(f));
  const posts = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const full = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const { fm } = splitFrontmatter(full);
    if (!fm) {
      console.warn(`[network-mirror] frontmatter 누락 — skip: ${file}`);
      continue;
    }
    const data = parseFrontmatterScalars(fm);
    if (data.draft === true) continue;
    if (!data.cluster || !data.title) {
      console.warn(`[network-mirror] cluster/title 누락 — skip: ${file}`);
      continue;
    }
    if (!CLUSTERS.includes(data.cluster)) {
      console.warn(`[network-mirror] unknown cluster "${data.cluster}" — skip: ${file}`);
      continue;
    }
    const publishedAt = toIsoDateOnly(data.publishedAt);
    const updatedAt = data.updatedAt ? toIsoDateOnly(data.updatedAt) : null;
    posts.push({
      url: `${SITE_DOMAIN}/${data.cluster}/${slug}/`,
      slug,
      title: data.title,
      cluster: data.cluster,
      mainCategory: CLUSTER_TO_MAIN_CATEGORY[data.cluster] ?? null,
      persona: CLUSTER_TO_PRIMARY_PERSONA[data.cluster] ?? null,
      publishedAt,
      updatedAt,
      summary: data.description ? String(data.description).slice(0, 200) : null,
    });
  }
  // 결정적 정렬 — JSON diff 안정.
  posts.sort((a, b) => {
    if (a.cluster !== b.cluster) return a.cluster < b.cluster ? -1 : 1;
    if (a.publishedAt !== b.publishedAt) {
      return (b.publishedAt || '').localeCompare(a.publishedAt || '');
    }
    return a.slug.localeCompare(b.slug);
  });
  return posts;
}

function main() {
  const posts = collectAllPages();

  const mirror = {
    site: 'moneylook',
    siteName: 'moneylook (asiatop.co.kr)',
    domain: SITE_DOMAIN,
    parentSite: 'https://smartdatashop.kr',
    lastUpdated: new Date().toISOString(),
    totalPosts: posts.length,
    categories: CLUSTERS,
    personas: PERSONAS,
    clusterToMainCategory: CLUSTER_TO_MAIN_CATEGORY,
    clusterToPrimaryPersona: CLUSTER_TO_PRIMARY_PERSONA,
    clusterIndexes: CLUSTERS.map((c) => ({
      cluster: c,
      url: `${SITE_DOMAIN}/${c}/`,
      mainCategory: CLUSTER_TO_MAIN_CATEGORY[c],
      primaryPersona: CLUSTER_TO_PRIMARY_PERSONA[c],
      postsCount: posts.filter((p) => p.cluster === c).length,
    })),
    posts: posts.map((p) => ({
      url: p.url,
      title: p.title,
      cluster: p.cluster,
      mainCategory: p.mainCategory,
      persona: p.persona,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      summary: p.summary,
    })),
  };

  const outDir = dirname(OUTPUT_PATH);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(mirror, null, 2) + '\n', 'utf8');

  console.log(
    `[network-mirror] ${OUTPUT_PATH} 생성 — ${posts.length}편 + ${CLUSTERS.length} cluster 인덱스`
  );

  // 12 cluster × 9 편 정확 균등 보장 — sanity check (게이트 자체는 아님).
  const counts = CLUSTERS.map((c) => posts.filter((p) => p.cluster === c).length);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === 0) {
    console.warn(`[network-mirror] WARN: 일부 cluster 글 0편 — counts=${counts.join(',')}`);
  }
  if (max - min > 0) {
    console.warn(
      `[network-mirror] NOTE: cluster 글 수 비균등 (min=${min} max=${max}) — counts=${counts.join(',')}`
    );
  }
}

main();
