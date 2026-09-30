#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// index-status.mjs: 구글 색인 상태 조회 (Search Console URL Inspection API, 읽기 전용, LLM 0)
//
// !! 색인 요청(Indexing API·Request Indexing)은 절대 호출하지 않는다 !!
//    CLAUDE.md "구글 색인 재요청 자동화 금지" 원칙. 이 스크립트가 부르는 구글 주소는 두 곳뿐이다.
//      1) https://oauth2.googleapis.com/token  (access_token 갱신, scripts/lib/google-auth.mjs)
//      2) POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect  (상태 조회만)
//    토큰 범위도 webmasters.readonly 라 색인 요청은 권한상으로도 불가능하다.
//    inspect() 는 위 조회 주소 말고 다른 주소로는 요청을 보내지 않도록 막아 두었다.
//
// 무엇을 보나: 글 URL 마다 verdict·coverageState·lastCrawlTime·googleCanonical
//             (+ indexingState·pageFetchState·robotsTxtState·userCanonical)
// 대상: src/content/articles/*.mdx (draft 제외) → https://asiatop.co.kr/{cluster}/{slug}/  (slug = 파일 이름)
// 세그먼트 (한 글은 한 세그먼트에만 들어간다. 겹치는 소속은 tags 로 따로 센다):
//   googlebot-noindex  frontmatter noindex: true. 구글에서 빠지는 게 정상이라 따로 센다
//   pruning-keep       docs/audits/pruning-verdicts-2026-08-27.json 의 keep
//   pruning-noindex    같은 파일의 noindex 인데 frontmatter noindex 가 풀린 글
//   new                publishedAt 2026-08-27 이후 (회복 체제 이후 신규)
//   refresh            updatedAt 최근 30일 (publishedAt 보다 뒤인 경우만)
//   other              나머지
//
// 한도 (공식: 속성당 하루 2,000건·분당 600건): 순차 호출 + 호출 사이 최소 간격(기본 200ms, 분당 최대 300건).
//   오늘 쓴 호출 수는 private/index-status-quota.json 에 태평양 시간 날짜 기준으로 적고, 하루 1,950건에서 멈춘다.
//   --limit 으로 줄이면 세그먼트를 돌아가며 뽑고, 최근에 안 본 URL 부터 본다.
//
// 실행:
//   node scripts/audit/index-status.mjs --dry-run                 대상·세그먼트만 보여 준다 (API 안 부름, 파일 안 씀)
//   node scripts/audit/index-status.mjs --limit 3                  3건만 조회
//   node scripts/audit/index-status.mjs --segment new,refresh      해당 세그먼트만
//   --secrets-dir <dir>  .revenue-auth.json·.env.local 이 있는 폴더 (기본: 리포 루트. 워크트리에서는 원 체크아웃)
//   --delay-ms <n>       호출 사이 최소 간격 ms (기본 200, 최소 110)
//   --quiet              진행 줄 생략
// 출력:
//   docs/revenue-log/index-status-YYYY-MM-DD.json          세그먼트별 색인 비율 요약. URL 없음, 커밋용
//   docs/revenue-log/private/index-status-YYYY-MM-DD.json  URL 별 상세 (gitignore)
//   같은 날 여러 번 돌리면 상세를 URL 기준으로 합치고 요약을 다시 계산한다.
// 색인 비율의 분모는 "조회한 URL 수"(오류 제외)다. 전체 글 수는 population 으로 따로 적는다.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getGoogleAccessToken, GoogleAuthError } from '../lib/google-auth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const PRIVATE_DIR = path.join(LOG_DIR, 'private');
const VERDICTS_FILE = path.join(ROOT, 'docs', 'audits', 'pruning-verdicts-2026-08-27.json');
const QUOTA_FILE = path.join(PRIVATE_DIR, 'index-status-quota.json');

const SITE = 'https://asiatop.co.kr';
const PROPERTY = 'sc-domain:asiatop.co.kr';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const RECOVERY_START = '2026-08-27';
const REFRESH_DAYS = 30;
const DAILY_LIMIT = 2000;
const DAILY_STOP = 1950; // 공식 한도보다 조금 앞에서 멈춘다 (다른 도구·재시도 여유)

// 세그먼트 배정 순서 (앞에 있는 소속이 이긴다)
const SEGMENTS = ['googlebot-noindex', 'pruning-keep', 'pruning-noindex', 'new', 'refresh', 'other'];
// --limit 으로 일부만 볼 때 돌아가며 뽑는 순서 (중요한 쪽 먼저)
const ROTATION = ['new', 'refresh', 'pruning-keep', 'other', 'pruning-noindex', 'googlebot-noindex'];
const SEGMENT_RULES = {
  'googlebot-noindex': 'frontmatter noindex: true (구글에서 빠지는 게 정상)',
  'pruning-keep': 'pruning-verdicts-2026-08-27 keep',
  'pruning-noindex': 'pruning-verdicts-2026-08-27 noindex 인데 frontmatter noindex 가 풀린 글',
  new: `publishedAt >= ${RECOVERY_START}`,
  refresh: `updatedAt 최근 ${REFRESH_DAYS}일 (publishedAt 보다 뒤)`,
  other: '나머지',
};

// ── 옵션 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
if (args.includes('--help') || args.includes('-h')) {
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split(/\r?\n/);
  console.log(src.slice(2, src.findIndex((l, i) => i > 2 && l.startsWith('// ════'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const DRY = args.includes('--dry-run');
const QUIET = args.includes('--quiet');
const SECRETS_DIR = path.resolve(opt('--secrets-dir', ROOT));
const LIMIT = opt('--limit', null) === null ? null : Number(opt('--limit'));
if (LIMIT !== null && !(Number.isInteger(LIMIT) && LIMIT > 0)) die('--limit 은 1 이상의 정수');
const DELAY = Math.max(110, Number(opt('--delay-ms', 200)) || 200);
const SEG_FILTER = parseSegments(opt('--segment', 'all'));

function die(msg, code = 1) { console.error(`\n❌ ${msg}`); process.exit(code); }
function parseSegments(v) {
  if (!v || v === 'all') return new Set(SEGMENTS);
  const alias = { keep: 'pruning-keep', 'noindex-verdict': 'pruning-noindex', noindex: 'googlebot-noindex', refreshed: 'refresh' };
  const out = new Set();
  for (const raw of String(v).split(',').map((s) => s.trim()).filter(Boolean)) {
    const s = alias[raw] || raw;
    if (!SEGMENTS.includes(s)) die(`알 수 없는 세그먼트: ${raw} (가능: ${SEGMENTS.join(', ')}, all)`);
    out.add(s);
  }
  return out;
}

// ── 날짜 ────────────────────────────────────────────────────────────────
const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
// 구글 API 하루 한도는 태평양 시간 자정에 초기화된다
const ptToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 글 목록·세그먼트 ────────────────────────────────────────────────────
function frontmatterOf(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}
function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim() : '';
}
const ymdOf = (v) => (String(v).match(/^\d{4}-\d{2}-\d{2}/) || [])[0] || '';

function loadVerdicts() {
  const m = new Map();
  if (!existsSync(VERDICTS_FILE)) { console.warn(`⚠️  ${path.relative(ROOT, VERDICTS_FILE)} 없음. pruning 세그먼트가 비어 있게 된다`); return m; }
  for (const v of JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')).verdicts || []) m.set(v.slug, v.action);
  return m;
}

function loadArticles() {
  const verdicts = loadVerdicts();
  const refreshFrom = addDays(kstToday(), -REFRESH_DAYS);
  const out = [];
  for (const f of readdirSync(ART_DIR).filter((x) => x.endsWith('.mdx')).sort()) {
    const fm = frontmatterOf(readFileSync(path.join(ART_DIR, f), 'utf8'));
    if (/^true$/i.test(field(fm, 'draft'))) continue;
    const slug = f.replace(/\.mdx$/, '');
    const cluster = field(fm, 'cluster');
    if (!cluster) { console.warn(`⚠️  cluster 없음, 건너뜀: ${f}`); continue; }
    const publishedAt = ymdOf(field(fm, 'publishedAt'));
    const updatedAt = ymdOf(field(fm, 'updatedAt'));
    const verdict = verdicts.get(slug) || null;
    const tags = [];
    if (/^true$/i.test(field(fm, 'noindex'))) tags.push('googlebot-noindex');
    if (verdict === 'keep') tags.push('pruning-keep');
    if (verdict === 'noindex') tags.push('pruning-noindex');
    if (publishedAt && publishedAt >= RECOVERY_START) tags.push('new');
    if (updatedAt && updatedAt >= refreshFrom && updatedAt > publishedAt) tags.push('refresh');
    const segment = SEGMENTS.find((s) => tags.includes(s)) || 'other';
    if (segment === 'other') tags.push('other');
    out.push({ url: `${SITE}/${cluster}/${slug}/`, slug, cluster, publishedAt, updatedAt: updatedAt || null, pruningVerdict: verdict, segment, tags });
  }
  return out;
}

// 지난 상세 파일에서 URL 별 마지막 조회 시각 (최근에 안 본 URL 을 먼저 보기 위해)
function lastInspectedMap() {
  const m = new Map();
  if (!existsSync(PRIVATE_DIR)) return m;
  for (const f of readdirSync(PRIVATE_DIR).filter((x) => /^index-status-\d{4}-\d{2}-\d{2}\.json$/.test(x))) {
    try {
      for (const r of JSON.parse(readFileSync(path.join(PRIVATE_DIR, f), 'utf8')).rows || []) {
        if (r.error || !r.inspectedAt) continue;
        if (!m.has(r.url) || m.get(r.url) < r.inspectedAt) m.set(r.url, r.inspectedAt);
      }
    } catch { /* 깨진 파일은 무시 */ }
  }
  return m;
}

function buildPlan(articles, last) {
  const bySeg = new Map(ROTATION.map((s) => [s, []]));
  for (const a of articles) if (SEG_FILTER.has(a.segment)) bySeg.get(a.segment).push(a);
  const changed = (a) => a.updatedAt || a.publishedAt || '';
  for (const list of bySeg.values()) {
    list.sort((x, y) => (last.get(x.url) || '').localeCompare(last.get(y.url) || '') || changed(y).localeCompare(changed(x)) || x.slug.localeCompare(y.slug));
  }
  const queues = [...bySeg.values()].filter((l) => l.length);
  const plan = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) plan.push(q.shift());
  return LIMIT ? plan.slice(0, LIMIT) : plan;
}

// ── 호출 한도 장부 ──────────────────────────────────────────────────────
function readQuota() {
  const day = ptToday();
  let q = {};
  try { q = JSON.parse(readFileSync(QUOTA_FILE, 'utf8')); } catch { /* 처음 */ }
  return { day, used: q.day === day ? Number(q.used) || 0 : 0 };
}
function writeQuota(q) {
  mkdirSync(PRIVATE_DIR, { recursive: true });
  writeFileSync(QUOTA_FILE, JSON.stringify({ day: q.day, used: q.used, note: `태평양 시간 날짜 기준 URL Inspection 호출 수 (공식 한도 하루 ${DAILY_LIMIT}건, ${DAILY_STOP}건에서 멈춤)` }, null, 1));
}

// ── API (조회 전용) ─────────────────────────────────────────────────────
class StopRun extends Error {}   // 한도·권한 문제. 더 불러도 소용없다
class UrlError extends Error {}  // 그 URL 만 실패. 다음 URL 로 넘어간다

async function inspect(token, url, quota) {
  const endpoint = INSPECT_URL;
  // 조회 주소 말고는 절대 부르지 않는다 (색인 요청 API 차단)
  if (endpoint !== 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect') throw new StopRun('조회 주소가 아니다. 호출 중단');
  let waitedForMinute = false;
  for (let attempt = 1; ; attempt++) {
    quota.used++; writeQuota(quota); // 실패한 시도도 보수적으로 센다
    let r;
    try {
      r = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        // languageCode 는 en-US 고정: coverageState 문구가 바뀌지 않아야 날짜별로 비교할 수 있다
        body: JSON.stringify({ inspectionUrl: url, siteUrl: PROPERTY, languageCode: 'en-US' }),
      });
    } catch (e) {
      if (attempt < 3) { await sleep(2000 * attempt); continue; }
      throw new UrlError(`네트워크 오류: ${e.message}`);
    }
    if (r.ok) return r.json();
    const text = (await r.text()).replace(/\s+/g, ' ').slice(0, 300);
    if (r.status === 429) {
      // 분당 한도면 1분 쉬고 한 번 더. 그래도 429 면 하루 한도로 보고 멈춘다
      if (!waitedForMinute && !/per day|PerDay/i.test(text)) { waitedForMinute = true; await sleep(61_000); continue; }
      throw new StopRun(`호출 한도 초과 (429): ${text}`);
    }
    if (r.status === 401 || r.status === 403) throw new StopRun(`권한 오류 (${r.status}): ${text}`);
    if (r.status >= 500 && attempt < 3) { await sleep(2000 * attempt); continue; }
    throw new UrlError(`HTTP ${r.status}: ${text}`);
  }
}

const isIndexed = (s) => s.verdict === 'PASS' || /^(submitted and indexed|indexed)/i.test(s.coverageState || '');

function toRow(a, res) {
  const s = res?.inspectionResult?.indexStatusResult || {};
  return {
    url: a.url, slug: a.slug, cluster: a.cluster, segment: a.segment, tags: a.tags,
    inspectedAt: new Date().toISOString(),
    indexed: isIndexed(s),
    verdict: s.verdict || null,
    coverageState: s.coverageState || null,
    indexingState: s.indexingState || null,
    pageFetchState: s.pageFetchState || null,
    robotsTxtState: s.robotsTxtState || null,
    lastCrawlTime: s.lastCrawlTime || null,
    googleCanonical: s.googleCanonical || null,
    userCanonical: s.userCanonical || null,
    canonicalMismatch: Boolean(s.googleCanonical && s.googleCanonical !== a.url),
    crawledAs: s.crawledAs || null,
    inspectionResultLink: res?.inspectionResult?.inspectionResultLink || null,
  };
}

// ── 요약 (URL 없이 숫자만) ─────────────────────────────────────────────
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
function emptyBucket(population) {
  return { population, inspected: 0, indexed: 0, notIndexed: 0, rate: null, errors: 0, neverCrawled: 0, crawledLast30d: 0, canonicalMismatch: 0, verdicts: {}, coverageStates: {} };
}
function addTo(b, r, crawlFrom) {
  if (r.error) { b.errors++; return; }
  b.inspected++;
  if (r.indexed) b.indexed++; else b.notIndexed++;
  const v = r.verdict || 'UNKNOWN'; b.verdicts[v] = (b.verdicts[v] || 0) + 1;
  const c = r.coverageState || 'UNKNOWN'; b.coverageStates[c] = (b.coverageStates[c] || 0) + 1;
  if (!r.lastCrawlTime) b.neverCrawled++; else if (r.lastCrawlTime.slice(0, 10) >= crawlFrom) b.crawledLast30d++;
  if (r.canonicalMismatch) b.canonicalMismatch++;
}
function finish(b) {
  b.rate = pct(b.indexed, b.inspected);
  b.coverageStates = Object.fromEntries(Object.entries(b.coverageStates).sort((x, y) => y[1] - x[1]));
  return b;
}
function summarize(rows, articles) {
  const crawlFrom = addDays(kstToday(), -30);
  const count = (pred) => articles.filter(pred).length;
  const bySegment = Object.fromEntries(SEGMENTS.map((s) => [s, emptyBucket(count((a) => a.segment === s))]));
  const byTag = Object.fromEntries(SEGMENTS.map((s) => [s, emptyBucket(count((a) => a.tags.includes(s)))]));
  const totals = emptyBucket(articles.length);
  const indexable = emptyBucket(count((a) => a.segment !== 'googlebot-noindex'));
  for (const r of rows) {
    addTo(bySegment[r.segment] || (bySegment[r.segment] = emptyBucket(0)), r, crawlFrom);
    for (const t of r.tags || []) if (byTag[t]) addTo(byTag[t], r, crawlFrom);
    addTo(totals, r, crawlFrom);
    if (r.segment !== 'googlebot-noindex') addTo(indexable, r, crawlFrom);
  }
  for (const b of [...Object.values(bySegment), ...Object.values(byTag), totals, indexable]) finish(b);
  return { totals, indexable, bySegment, byTag };
}

// ── 실행 ────────────────────────────────────────────────────────────────
const kst = kstToday();
const articles = loadArticles();
const byUrl = new Map(articles.map((a) => [a.url, a]));
const plan = buildPlan(articles, lastInspectedMap());
const pad = (s, n) => String(s ?? '').padEnd(n);

console.log(`구글 색인 조회 (URL Inspection, 읽기 전용) · ${kst} KST · 속성 ${PROPERTY}`);
console.log(`글 ${articles.length}편 · 조회 계획 ${plan.length}건${LIMIT ? ` (--limit ${LIMIT})` : ''}${SEG_FILTER.size < SEGMENTS.length ? ` · 세그먼트 ${[...SEG_FILTER].join(',')}` : ''}`);
for (const s of SEGMENTS) console.log(`  ${pad(s, 18)} 전체 ${pad(articles.filter((a) => a.segment === s).length, 4)} 이번 ${plan.filter((a) => a.segment === s).length}`);

if (!existsSync(path.join(ROOT, '.gitignore')) || !readFileSync(path.join(ROOT, '.gitignore'), 'utf8').includes('docs/revenue-log/private/')) {
  console.warn('⚠️  .gitignore 에 docs/revenue-log/private/ 가 없다. 상세 파일이 커밋되지 않게 먼저 확인하라');
}

if (DRY) {
  console.log('\n(드라이런: API 를 부르지 않고 파일도 쓰지 않는다)');
  for (const a of plan.slice(0, 30)) console.log(`  ${pad(a.segment, 18)} ${a.url}`);
  if (plan.length > 30) console.log(`  … 외 ${plan.length - 30}건`);
  process.exit(0);
}
if (!plan.length) die('조회할 URL 이 없다 (--segment 확인)');

const quota = readQuota();
const room = DAILY_STOP - quota.used;
if (room <= 0) die(`오늘(태평양 시간 ${quota.day}) 이미 ${quota.used}건을 불렀다. 한도 보호로 멈춘다`);
if (plan.length > room) { console.warn(`⚠️  오늘 남은 여유 ${room}건. 계획을 ${room}건으로 줄인다`); plan.length = room; }

let token;
try {
  ({ accessToken: token } = await getGoogleAccessToken({ secretsDir: SECRETS_DIR, requiredScope: SCOPE }));
} catch (e) {
  die(e instanceof GoogleAuthError ? e.message : `인증 실패: ${e.message}`);
}

const rows = [];
let stopped = null;
const startedAt = new Date().toISOString();
for (let i = 0; i < plan.length; i++) {
  const a = plan[i];
  const t0 = Date.now();
  try {
    rows.push(toRow(a, await inspect(token, a.url, quota)));
  } catch (e) {
    if (e instanceof StopRun) { stopped = e.message; break; }
    rows.push({ url: a.url, slug: a.slug, cluster: a.cluster, segment: a.segment, tags: a.tags, inspectedAt: new Date().toISOString(), error: e.message.slice(0, 300) });
  }
  const r = rows[rows.length - 1];
  if (!QUIET) console.log(`  [${i + 1}/${plan.length}] ${pad(a.segment, 18)} ${r.error ? `오류 ${r.error.slice(0, 60)}` : `${r.indexed ? '색인' : '미색인'} · ${r.coverageState} · 마지막 크롤 ${r.lastCrawlTime ? r.lastCrawlTime.slice(0, 10) : '없음'}`}  ${a.slug}`);
  const wait = DELAY - (Date.now() - t0);
  if (wait > 0 && i < plan.length - 1) await sleep(wait);
}

// 같은 날 상세와 합친다 (새 오류가 앞선 성공을 덮지 않게)
mkdirSync(PRIVATE_DIR, { recursive: true });
const detailPath = path.join(PRIVATE_DIR, `index-status-${kst}.json`);
const summaryPath = path.join(LOG_DIR, `index-status-${kst}.json`);
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const merged = new Map(((readJson(detailPath) || {}).rows || []).map((r) => [r.url, r]));
for (const r of rows) { const prev = merged.get(r.url); if (!r.error || !prev || prev.error) merged.set(r.url, r); }
// 세그먼트는 오늘 글 목록 기준으로 다시 붙인다 (그사이 frontmatter 가 바뀌었을 수 있다)
const allRows = [...merged.values()].map((r) => { const a = byUrl.get(r.url); return a ? { ...r, segment: a.segment, tags: a.tags } : r; })
  .sort((x, y) => SEGMENTS.indexOf(x.segment) - SEGMENTS.indexOf(y.segment) || x.url.localeCompare(y.url));

const run = { startedAt, finishedAt: new Date().toISOString(), limit: LIMIT, segments: [...SEG_FILTER], planned: plan.length, inspected: rows.filter((r) => !r.error).length, errors: rows.filter((r) => r.error).length, stopped };
const prevSummary = readJson(summaryPath);
const runs = [...((prevSummary && prevSummary.runs) || []), run];

writeFileSync(detailPath, JSON.stringify({ kstDate: kst, property: PROPERTY, note: 'URL 별 상세. gitignore 대상이라 커밋되지 않는다', rows: allRows }, null, 1));

const summary = summarize(allRows, articles);
writeFileSync(summaryPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  kstDate: kst,
  property: PROPERTY,
  api: 'Search Console URL Inspection API (urlInspection/index:inspect, 읽기 전용. 색인 요청 안 함)',
  note: `rate = indexed / inspected (분모는 조회한 URL 수, 오류 제외). population = 그 묶음의 전체 글 수. bySegment 는 겹치지 않게 한 글을 한 곳에만, byTag 는 소속을 모두 센다. indexable 은 googlebot-noindex 를 뺀 합계.`,
  segmentRules: SEGMENT_RULES,
  coverage: { population: articles.length, inspected: summary.totals.inspected, complete: summary.totals.inspected >= articles.length },
  totals: summary.totals,
  indexable: summary.indexable,
  bySegment: summary.bySegment,
  byTag: summary.byTag,
  runs,
  detail: `${path.relative(ROOT, detailPath).replace(/\\/g, '/')} (gitignore)`,
}, null, 1) + '\n');

// ── 콘솔 요약 ──
console.log(`\n세그먼트별 색인 비율 (오늘 합산, 분모 = 조회 수)`);
console.log('  ' + pad('세그먼트', 18) + pad('전체', 6) + pad('조회', 6) + pad('색인', 6) + pad('비율', 8) + '미색인 주요 상태');
for (const [s, b] of Object.entries(summary.bySegment)) {
  if (!b.inspected && !b.errors) continue;
  const top = Object.entries(b.coverageStates).filter(([k]) => !/^(submitted and indexed|indexed)/i.test(k)).slice(0, 2).map(([k, n]) => `${k} ${n}`).join(' · ');
  console.log('  ' + pad(s, 18) + pad(b.population, 6) + pad(b.inspected, 6) + pad(b.indexed, 6) + pad(b.rate === null ? '-' : `${b.rate}%`, 8) + (top || '-'));
}
const t = summary.indexable;
console.log(`\n색인 대상 글(googlebot-noindex 제외): 조회 ${t.inspected} · 색인 ${t.indexed} · 비율 ${t.rate ?? '-'}% · 크롤 기록 없음 ${t.neverCrawled} · 구글이 다른 canonical 선택 ${t.canonicalMismatch}`);
console.log(`오늘 호출 ${quota.used}건 (태평양 시간 ${quota.day}, 한도 ${DAILY_LIMIT})`);
console.log(`→ ${path.relative(ROOT, summaryPath)}\n→ ${path.relative(ROOT, detailPath)} (gitignore)`);
if (stopped) die(`중간에 멈춤: ${stopped}. 여기까지 결과는 저장했다`, 2);
