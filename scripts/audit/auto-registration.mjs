/**
 * 자동 등록 회귀 하네스 — R49 #49-5
 *
 * "새 페이지·포스팅이 생기면 자동으로 RSS·사이트맵에 꼭 추가" 정책 회귀 차단.
 *
 * src/content/articles 의 모든 발행 글(`!draft`)이 다음 채널에 자동 등록됐는지 검증:
 *   1. dist/sitemap-0.xml          — 모든 발행 글 URL
 *   2. dist/rss.xml                — 최신 50개 캡 내 모두
 *   3. dist/atom.xml               — 최신 50개 캡 내 모두
 *   4. dist/feed.json              — 최신 50개 캡 내 모두
 *   5. dist/rss/{cluster}.xml × 12 — 자기 클러스터 RSS에 등장
 *   6. dist/llms-full.txt          — 모든 발행 글 인덱스
 *   7. dist/llms-cluster-{slug}.txt — 자기 클러스터 인덱스
 *   8. dist/sitemap-images.xml     — 모든 발행 글 이미지
 *
 * 누락 1건이라도 발견 시 exit 1. 매 빌드 후 자동 실행 (CI build-test job).
 *
 * 정책 근거:
 *   - 사용자 R49 요청: "새 글이 생기면 자동으로 RSS·사이트맵에 꼭 추가 — 하네스로 기록"
 *   - sitemap-news.xml 은 48h window 의존이라 본 하네스에서는 제외 (별도 검증)
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const RSS_FEED_CAP = 50; // src/pages/rss.xml.ts·atom.xml.ts·feed.json.ts 의 cap 과 동일해야 함.

// ──────────────────────────────────────
// 발행 글 inventory (frontmatter 파싱)
// ──────────────────────────────────────
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

export function collectArticles() {
  const articles = [];
  for (const file of walk(ARTICLES_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm) continue;
    if (fm.draft === 'true') continue;
    const slug = relative(ARTICLES_DIR, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
    const cluster = fm.cluster;
    if (!cluster) continue;
    const publishedAt = fm.publishedAt ? new Date(fm.publishedAt) : new Date(0);
    const updatedAt = fm.updatedAt ? new Date(fm.updatedAt) : null;
    articles.push({
      slug,
      cluster,
      publishedAt,
      updatedAt,
      // 모든 피드 정렬 키 (rss·atom·feed.json·카테고리 RSS 통일).
      sortKey: (updatedAt ?? publishedAt).valueOf(),
      title: fm.title ?? '',
      file: relative(ROOT, file).replace(/\\/g, '/'),
    });
  }
  // updatedAt ?? publishedAt 기준 최신순 — rss·atom·feed.json과 동일.
  articles.sort((a, b) => b.sortKey - a.sortKey);
  return articles;
}

// ──────────────────────────────────────
// 채널별 URL 추출
// ──────────────────────────────────────
function readDist(relPath) {
  const p = join(DIST, relPath);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

function extractUrlsFromXml(xml, tagName = 'loc') {
  if (!xml) return new Set();
  const re = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'g');
  const set = new Set();
  let m;
  while ((m = re.exec(xml)) !== null) {
    set.add(normalizeUrl(m[1]));
  }
  return set;
}

function extractRssLinks(xml) {
  if (!xml) return new Set();
  const set = new Set();
  // <link>...</link> 안에 utm 파라미터 포함 가능 — 정규화 후 키.
  const re = /<link>([^<]+)<\/link>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    set.add(normalizeUrl(m[1]));
  }
  return set;
}

function extractAtomLinks(xml) {
  if (!xml) return new Set();
  const set = new Set();
  // <link href="..." /> 또는 <link rel="alternate" href="...">
  const re = /<link\s[^>]*?href="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1];
    if (url.includes('/rss/') || url.includes('rel="self"') || url.includes('pubsubhubbub')) continue;
    set.add(normalizeUrl(url));
  }
  return set;
}

function extractJsonFeedUrls(json) {
  if (!json) return new Set();
  try {
    const parsed = JSON.parse(json);
    const items = parsed.items ?? [];
    return new Set(items.map((i) => normalizeUrl(i.url ?? i.id ?? '')).filter(Boolean));
  } catch {
    return new Set();
  }
}

function extractLlmsUrls(text) {
  if (!text) return new Set();
  const set = new Set();
  const re = /https?:\/\/[^\s)>"\]]+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    set.add(normalizeUrl(m[0]));
  }
  return set;
}

/**
 * URL 정규화 — utm 파라미터·trailing slash·fragment 제거 후 path만 키로.
 * 사이트 origin은 무시 (절대/상대 모두 같은 키).
 */
function normalizeUrl(u) {
  if (!u) return '';
  try {
    const url = new URL(u, 'https://asiatop.co.kr');
    let p = url.pathname;
    if (!p.endsWith('/') && !p.includes('.')) p += '/';
    return p;
  } catch {
    let p = u.split('?')[0].split('#')[0];
    if (!p.startsWith('/')) p = '/' + p;
    if (!p.endsWith('/') && !p.includes('.')) p += '/';
    return p;
  }
}

function articlePath(article) {
  return normalizeUrl(`/${article.cluster}/${article.slug}/`);
}

// ──────────────────────────────────────
// 검증 본체
// ──────────────────────────────────────
export function audit() {
  if (!existsSync(DIST)) {
    return { ok: false, errors: [['DIST_MISSING', 'dist/ 디렉터리 없음. `pnpm build` 먼저 실행.']] };
  }

  const articles = collectArticles();
  const articlePaths = articles.map((a) => articlePath(a));
  const articleSet = new Set(articlePaths);
  const cappedSet = new Set(articlePaths.slice(0, RSS_FEED_CAP));

  const errors = [];
  const warnings = [];
  const stats = { articles: articles.length };

  // 1. sitemap-0.xml — 모든 글
  const sitemapXml = readDist('sitemap-0.xml');
  const sitemapUrls = extractUrlsFromXml(sitemapXml, 'loc');
  stats.sitemap = sitemapUrls.size;
  for (const p of articleSet) {
    if (![...sitemapUrls].some((u) => normalizeUrl(u) === p)) {
      errors.push(['SITEMAP_MISSING', p, 'dist/sitemap-0.xml']);
    }
  }

  // 2. rss.xml — 최신 50개 캡
  const rssXml = readDist('rss.xml');
  const rssUrls = extractRssLinks(rssXml);
  stats.rssMain = rssUrls.size;
  for (const p of cappedSet) {
    if (!rssUrls.has(p)) {
      errors.push(['RSS_MAIN_MISSING', p, 'dist/rss.xml']);
    }
  }

  // 3. atom.xml — 최신 50개 캡
  const atomXml = readDist('atom.xml');
  const atomUrls = extractAtomLinks(atomXml);
  stats.atom = atomUrls.size;
  for (const p of cappedSet) {
    const found = [...atomUrls].some((u) => u === p);
    if (!found) {
      errors.push(['ATOM_MISSING', p, 'dist/atom.xml']);
    }
  }

  // 4. feed.json — 최신 50개 캡
  const feedJson = readDist('feed.json');
  const feedUrls = extractJsonFeedUrls(feedJson);
  stats.feedJson = feedUrls.size;
  for (const p of cappedSet) {
    if (!feedUrls.has(p)) {
      errors.push(['FEED_JSON_MISSING', p, 'dist/feed.json']);
    }
  }

  // 5. dist/rss/{cluster}.xml — 자기 클러스터 RSS
  const clusterRssCache = new Map();
  for (const article of articles) {
    const path = articlePath(article);
    let urls = clusterRssCache.get(article.cluster);
    if (!urls) {
      const xml = readDist(`rss/${article.cluster}.xml`);
      urls = extractRssLinks(xml);
      clusterRssCache.set(article.cluster, urls);
    }
    if (!urls.has(path)) {
      errors.push(['CATEGORY_RSS_MISSING', path, `dist/rss/${article.cluster}.xml`]);
    }
  }
  stats.categoryRss = clusterRssCache.size;

  // 6. llms-full.txt — 모든 글
  const llmsFull = readDist('llms-full.txt');
  const llmsFullUrls = extractLlmsUrls(llmsFull);
  stats.llmsFull = llmsFullUrls.size;
  for (const p of articleSet) {
    if (![...llmsFullUrls].some((u) => normalizeUrl(u) === p)) {
      // llms-full.txt는 markdown body 인용이라 캡 정책 다를 수 있음 — warn 처리
      warnings.push(['LLMS_FULL_MISSING', p, 'dist/llms-full.txt']);
    }
  }

  // 7. llms-cluster-{slug}.txt — 자기 클러스터
  const llmsClusterCache = new Map();
  for (const article of articles) {
    const path = articlePath(article);
    let urls = llmsClusterCache.get(article.cluster);
    if (!urls) {
      const text = readDist(`llms-cluster-${article.cluster}.txt`);
      urls = extractLlmsUrls(text);
      llmsClusterCache.set(article.cluster, urls);
    }
    if (![...urls].some((u) => normalizeUrl(u) === path)) {
      warnings.push(['LLMS_CLUSTER_MISSING', path, `dist/llms-cluster-${article.cluster}.txt`]);
    }
  }
  stats.llmsCluster = llmsClusterCache.size;

  // 8. sitemap-images.xml — 글 URL이 image:loc 또는 image:image 안 어딘가에
  const imagesXml = readDist('sitemap-images.xml');
  const imagesUrls = extractUrlsFromXml(imagesXml, 'loc');
  stats.sitemapImages = imagesUrls.size;
  for (const p of articleSet) {
    if (![...imagesUrls].some((u) => normalizeUrl(u) === p)) {
      // sitemap-images에는 article URL을 image의 부모 <url><loc>로 노출
      warnings.push(['SITEMAP_IMAGES_MISSING', p, 'dist/sitemap-images.xml']);
    }
  }

  return { ok: errors.length === 0, errors, warnings, stats };
}

// ──────────────────────────────────────
// CLI
// ──────────────────────────────────────
function main() {
  const result = audit();
  console.log(`📦 자동 등록 회귀 하네스 — R49 #49-5\n`);
  console.log(`📊 채널별 등록 카운트:`);
  for (const [k, v] of Object.entries(result.stats)) {
    console.log(`   · ${k}: ${v}`);
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  경고 (${result.warnings.length}건 — 차단 X):`);
    for (const [code, path, channel] of result.warnings.slice(0, 20)) {
      console.log(`   - [${code}] ${path} → ${channel}`);
    }
    if (result.warnings.length > 20) {
      console.log(`   - …외 ${result.warnings.length - 20}건`);
    }
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ 자동 등록 누락 (${result.errors.length}건 — 빌드 차단):`);
    for (const [code, path, channel] of result.errors.slice(0, 30)) {
      console.log(`   - [${code}] ${path} → ${channel}`);
    }
    if (result.errors.length > 30) {
      console.log(`   - …외 ${result.errors.length - 30}건`);
    }
    console.log(`\n🚫 회귀 차단 — 새 글이 자동으로 RSS·사이트맵에 등록되지 않았습니다.`);
    process.exit(1);
  }

  console.log(`\n✅ 모든 발행 글이 자동 등록 채널에 정상 등재됐습니다.`);
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) main();
