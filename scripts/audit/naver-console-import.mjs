#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-console-import.mjs: 서치어드바이저·네이버 애널리틱스 내보내기(CSV) 취합·분석 (LLM 0)
//
// 왜 수동 내보내기인가: 네이버 공식 오픈 API 목록에 애널리틱스·서치어드바이저 리포트 API 가 없다(2026-09-08 확인).
// 데이터랩과 검색 API 만 공개돼 있어, 노출·클릭 실측은 사람이 웹 콘솔에서 내보낸 파일을 넣어 주는 수밖에 없다.
//
// 운영자가 할 일 (절차 전문은 docs/revenue-log/inbox/README.md):
//   1) 서치어드바이저 → 리포트 → 검색 노출/클릭 현황 → 검색어 탭·문서 탭 각각, 기간 90일과 7일로 CSV 다운로드
//   2) (선택) 네이버 애널리틱스 → 유입분석 → 검색어 → CSV 다운로드
//   3) 요약 화면의 총 클릭·노출은 내보내기 파일에 없으니 inbox/manual-totals.txt 에 손으로 적는다
//   4) 파일을 docs/revenue-log/inbox/ 에 넣고 이 스크립트 실행
//
// 파일 구분 (파일마다 따로 판정):
//   출처 source  searchadvisor | analytics   정하는 순서: --source → 파일 이름 → 컬럼
//                파일 이름에 analytics·애널리틱스 가 있으면 애널리틱스, searchadvisor·서치어드바이저 가 있으면 서치어드바이저.
//                이름에 없으면 유입(방문) 컬럼이 있을 때만 애널리틱스, 그 밖(클릭·노출 컬럼)은 모두 서치어드바이저로 본다.
//                노출 컬럼 유무로는 정하지 않는다. 노출 컬럼 이름이 달라 못 읽은 서치어드바이저 파일이
//                애널리틱스로 둔갑해 통과하는 일을 막기 위해서다 (그런 파일은 아래 필수 헤더 검사에서 멈춘다).
//   탭   tab     keyword(검색어 탭) | document(문서 탭: '검색 웹문서'·'URL' 컬럼)
//   기간 period  파일 이름의 YYYYMMDD~YYYYMMDD, YYYY-MM-DD_YYYY-MM-DD 류 (없으면 파일 앞머리 줄). 못 읽으면 경고
//   출처·탭·기간이 모두 같은 묶음(dataset) 안에서만 값을 다룬다. 서치어드바이저와 애널리틱스 값은 더하지 않는다.
//
// 멈춤: 필수 헤더를 못 찾거나 출처를 정하지 못한 파일이 하나라도 있으면 JSON 을 쓰지 않고 종료 코드 1.
//   서치어드바이저 검색어 탭 = 검색어·클릭·노출 / 문서 탭 = 검색 웹문서(URL)·클릭·노출 / 애널리틱스 = 검색어·유입
//
// 실행: node scripts/audit/naver-console-import.mjs [--file <csv> ...] [--source searchadvisor|analytics]
//                                                  [--manual-totals <txt>] [--quiet]
//       --file 없으면 docs/revenue-log/inbox/ 의 *.csv·*.tsv·*.txt 를 전부 읽는다 (manual-totals.txt·--manual-totals 파일 제외).
// 출력:
//   docs/revenue-log/naver-console-YYYY-MM-DD.json          합계·분류별 건수·상위 문서 URL. 검색어 원문 없음 (커밋용)
//                                                           URL 로 못 읽은 문서 칸 값은 여기에 넣지 않는다 (private 에만)
//   docs/revenue-log/private/naver-console-YYYY-MM-DD.json  검색어 원문 행·분류 목록 (gitignore)
//   콘솔: 개선 후보 3분류 (검색어 목록은 콘솔과 private 에만)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const PRIVATE_DIR = path.join(LOG_DIR, 'private');
const INBOX = path.join(LOG_DIR, 'inbox');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');
const REDIRECT_MAP = path.join(ROOT, 'scripts', 'prune', 'redirect-map.json');
const SITE = 'https://asiatop.co.kr';
const MANUAL_FILE_NAME = 'manual-totals.txt';
const TOP_DOCS = 20;

const args = process.argv.slice(2);
// 값이 필요한 옵션인데 값이 없거나 다음 칸이 다른 옵션이면 멈춘다 (조용히 기본값으로 가지 않게)
const valueAt = (k, i) => { const v = args[i + 1]; if (v === undefined || v.startsWith('--')) fail(`${k} 뒤에 값이 없다`); return v; };
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? valueAt(k, i) : d; };
const optAll = (k) => args.flatMap((a, i) => (a === k ? [valueAt(k, i)] : []));
const FILES = optAll('--file');
const SOURCE = opt('--source', null);
const QUIET = args.includes('--quiet');
const MANUAL_FILE = path.resolve(ROOT, opt('--manual-totals', path.join(INBOX, MANUAL_FILE_NAME)));
if (SOURCE && !['searchadvisor', 'analytics'].includes(SOURCE)) fail(`--source 는 searchadvisor 또는 analytics (받은 값: ${SOURCE})`);

function fail(msg, lines = [], { headerHint = false } = {}) {
  console.error(`❌ ${msg}`);
  for (const l of lines) console.error(`   ${l}`);
  console.error(`   JSON 은 쓰지 않았다.${headerHint ? ' 헤더 이름이 다르면 알려 달라, 후보 목록(COL)에 추가한다.' : ''}`);
  process.exit(1);
}
const relPath = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const warnings = [];
const warn = (m) => { warnings.push(m); console.warn(`⚠️  ${m}`); };

// ── 파일 읽기 (UTF-8·BOM·UTF-16·EUC-KR 자동 판별) ───────────────────────
function decodeFile(fp) {
  const buf = readFileSync(fp);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { text: buf.subarray(3).toString('utf8'), encoding: 'utf-8-bom' };
  if (buf[0] === 0xff && buf[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(buf.subarray(2)), encoding: 'utf-16le' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'utf-8' }; }
  catch { return { text: new TextDecoder('euc-kr').decode(buf), encoding: 'euc-kr' }; } // 엑셀 호환 한글 CSV
}

// ── CSV 파서 (따옴표·쉼표/탭 자동 판별) ─────────────────────────────────
function parseDelimited(text) {
  const s = text.replace(/^\uFEFF/, '');
  // 콘솔이 제목 줄을 붙일 수 있어 앞 5줄을 모아 구분자를 정한다
  const head = s.split(/\r?\n/).slice(0, 5).join('\n');
  const delim = (head.match(/\t/g) || []).length > (head.match(/,/g) || []).length ? '\t' : ',';
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}

// 컬럼 이름은 콘솔 버전마다 달라 후보 목록으로 찾는다. 비교 전 공백·괄호 꼬리('CTR(%)'의 '(%)')·% 를 지운다
const COL = {
  keyword: ['검색어', '키워드', '유입검색어', '검색키워드', '검색어명', 'query', 'keyword', 'searchquery'],
  page: ['검색웹문서', '웹문서', '문서', '문서url', '웹문서url', 'url', '페이지', '페이지url', '랜딩페이지', 'page', 'landingpage'],
  impressions: ['노출수', '노출', '검색노출', '노출횟수', 'impressions', 'impression'],
  clicks: ['클릭수', '클릭', '검색클릭', '클릭횟수', 'clicks', 'click'],
  visits: ['유입수', '유입', '방문수', '방문', '유입횟수', 'inflow', 'visits', 'sessions'],
  ctr: ['클릭률', 'ctr'],
  position: ['순위', '평균순위', '평균노출순위', 'position', 'rank', 'avgposition'],
};
const normHead = (h) => String(h).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[\s%]/g, '');
function findCols(header) {
  const norm = header.map(normHead);
  const out = {};
  for (const [key, names] of Object.entries(COL)) {
    const idx = norm.findIndex((h) => names.includes(h));
    if (idx >= 0) out[key] = idx;
  }
  return out;
}
// 출처·탭별 필수 컬럼 ('a|b' 는 둘 중 하나)
const REQUIRED = {
  'searchadvisor|keyword': ['keyword', 'clicks', 'impressions'],
  'searchadvisor|document': ['page', 'clicks', 'impressions'],
  'analytics|keyword': ['keyword', 'visits|clicks'],
  'analytics|document': ['page', 'visits|clicks'],
};
const LABEL = { keyword: '검색어', page: '검색 웹문서(URL)', clicks: '클릭', impressions: '노출', 'visits|clicks': '유입(또는 클릭)' };
const TOTAL_ROW = /^(합계|전체|총계|총합|total|sum)$/i;
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const cell = (r, i) => (i === undefined ? '' : String(r[i] ?? '').trim());
const pct = (a, b) => (b ? +((a / b) * 100).toFixed(2) : null);

// ── 기간 (파일 이름 → 파일 앞머리 줄) ───────────────────────────────────
function parsePeriod(text) {
  const re = /(20\d{2})[-./]?(\d{1,2})[-./]?(\d{1,2})\s*[~_\-\u2013\u2014]+\s*(20\d{2})[-./]?(\d{1,2})[-./]?(\d{1,2})/;
  const m = String(text).match(re);
  if (!m) return null;
  const mk = (y, mo, d) => { const dt = new Date(Date.UTC(+y, +mo - 1, +d)); return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d ? dt : null; };
  const a = mk(m[1], m[2], m[3]); const b = mk(m[4], m[5], m[6]);
  if (!a || !b || b < a) return null;
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(a), end: iso(b), days: Math.round((b - a) / 86400000) + 1 };
}

// ── 입력 파일 ───────────────────────────────────────────────────────────
function inputFiles() {
  if (FILES.length) return FILES.map((f) => path.resolve(ROOT, f));
  if (!existsSync(INBOX)) return [];
  const all = readdirSync(INBOX);
  const excel = all.filter((f) => /\.xlsx?$/i.test(f));
  if (excel.length) warn(`엑셀 파일은 읽지 못한다: ${excel.join(', ')}. CSV 로 받거나 엑셀에서 "CSV UTF-8" 로 저장해 넣어라`);
  return all.filter((f) => /\.(csv|tsv|txt)$/i.test(f) && f.toLowerCase() !== MANUAL_FILE_NAME).sort().map((f) => path.join(INBOX, f));
}
// 손으로 적은 총계 파일은 이름·대소문자와 상관없이 CSV 로 읽지 않는다
const samePath = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b));
const files = inputFiles().filter((fp) => !samePath(fp, MANUAL_FILE));
if (!files.length) {
  mkdirSync(INBOX, { recursive: true });
  console.error('❌ 넣을 파일이 없다.');
  console.error('   1) 서치어드바이저 → 리포트 → 검색 노출/클릭 현황 → 검색어 탭·문서 탭 → 기간 90일·7일 CSV 다운로드');
  console.error(`   2) 그 파일을 ${relPath(INBOX)}/ 에 넣고 다시 실행 (또는 --file 로 지정)`);
  console.error('   네이버 애널리틱스 유입검색어 CSV 도 같은 폴더에 넣으면 출처를 나눠 함께 기록한다.');
  process.exit(1);
}

// 출처 판정: --source → 파일 이름 → 컬럼. 노출 컬럼 유무는 쓰지 않는다 (머리말 참고)
function detectSource(name, cols) {
  if (SOURCE) return { source: SOURCE, sourceFrom: 'option' };
  const n = name.toLowerCase();
  const byName = { analytics: /analytics|애널리틱스/.test(n), searchadvisor: /searchadvisor|search-advisor|서치어드바이저/.test(n) };
  if (byName.analytics && !byName.searchadvisor) return { source: 'analytics', sourceFrom: 'filename' };
  if (byName.searchadvisor && !byName.analytics) return { source: 'searchadvisor', sourceFrom: 'filename' };
  const hasVisits = cols.visits !== undefined;
  const hasSaMetric = cols.clicks !== undefined || cols.impressions !== undefined;
  if (hasVisits && cols.impressions !== undefined) {
    return { error: '유입 컬럼과 노출 컬럼이 함께 있어 출처를 정할 수 없다. 파일 이름에 "서치어드바이저" 또는 "애널리틱스"를 넣거나 --source 로 지정' };
  }
  if (hasVisits) return { source: 'analytics', sourceFrom: 'columns' };
  if (hasSaMetric) return { source: 'searchadvisor', sourceFrom: 'columns' };
  return { error: '클릭·노출·유입 컬럼이 하나도 없다' };
}

function readOne(fp) {
  const name = path.basename(fp);
  if (!existsSync(fp)) return { error: `${name}: 파일이 없다 (${fp})` };
  const { text, encoding } = decodeFile(fp);
  const rows = parseDelimited(text);
  // 헤더가 첫 줄이 아닐 수 있다(콘솔이 제목·기간 줄을 붙임). 앞 10줄에서 차원(검색어/문서)과 지표가 함께 잡히는 줄을 헤더로 본다
  let hi = -1; let cols = {};
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const c = findCols(rows[i]);
    if ((c.keyword !== undefined || c.page !== undefined) && (c.clicks !== undefined || c.impressions !== undefined || c.visits !== undefined)) { hi = i; cols = c; break; }
  }
  if (hi < 0) return { error: `${name}: 헤더 줄을 찾지 못함 (${encoding}). 첫 줄: ${(rows[0] || []).join(' | ').slice(0, 120) || '(빈 파일)'}` };
  const tab = cols.keyword !== undefined ? 'keyword' : 'document';
  const header = rows[hi].map((h) => String(h).trim()).join(' | ').slice(0, 160);
  const src = detectSource(name, cols);
  if (src.error) return { error: `${name}: ${src.error}. 읽은 헤더: ${header}` };
  const { source, sourceFrom } = src;
  const missing = REQUIRED[`${source}|${tab}`].filter((k) => !k.split('|').some((x) => cols[x] !== undefined));
  if (missing.length) {
    const why = sourceFrom === 'columns' ? ' (출처는 컬럼으로 추정. 애널리틱스 파일이면 이름에 "애널리틱스"를 넣거나 --source analytics)' : ` (출처: ${sourceFrom === 'option' ? '--source' : '파일 이름'})`;
    return { error: `${name}: 필수 헤더 없음 (${source} ${tab} 탭: ${missing.map((k) => LABEL[k]).join(', ')})${why}. 읽은 헤더: ${header}` };
  }
  let period = parsePeriod(name); let periodFrom = period ? 'filename' : null;
  if (!period) { period = parsePeriod(rows.slice(0, hi).map((r) => r.join(' ')).join(' ')); if (period) periodFrom = 'file-head'; }
  if (!period) warn(`${name}: 파일 이름과 파일 앞머리 줄 어디에서도 기간을 못 읽었다. 이름 끝에 _20260702~20260929 처럼 기간을 붙여 달라 (이 파일은 다른 파일과 합치지 않는다)`);
  const data = rows.slice(hi + 1);
  if (!data.length) warn(`${name}: 헤더만 있고 데이터 행이 없다`);
  return { file: name, source, sourceFrom, tab, encoding, period, periodFrom, header, cols, data };
}

const parsed = files.map(readOne);
const bad = parsed.filter((p) => p.error);
if (bad.length) fail(`필수 헤더나 출처를 확인하지 못한 파일 ${bad.length}개`, bad.map((b) => b.error), { headerHint: true });

// ── 우리 자산 ───────────────────────────────────────────────────────────
function loadInventory() {
  const out = [];
  for (const f of readdirSync(ART_DIR).filter((x) => x.endsWith('.mdx'))) {
    const s = readFileSync(path.join(ART_DIR, f), 'utf8');
    const fm = s.split('---')[1] || '';
    const g = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    out.push({ slug: f.replace(/\.mdx$/, ''), cluster: g('cluster').trim(), text: `${g('title')} ${g('description')}` });
  }
  return out;
}
const STOP = new Set(['방법', '조건', '신청', '기간', '계산', '확인', '비교', '조회', '발급', '기준', '차이', '추천', '한도']);
// 후보를 전부 채점해 가장 많이 겹치는 글을 고른다. 첫 일치를 그냥 쓰면 "실업급여 조건" 이
// 예술인 고용보험 글에 붙는 식의 오매칭이 난다 (2026-09-08 확인).
function match(keyword, inv) {
  const toks = keyword.split(/\s+/).filter((t) => t.length >= 2 && !STOP.has(t));
  if (!toks.length) return { slug: null, score: 0, ambiguous: false };
  const core = [...toks].sort((a, b) => b.length - a.length)[0];
  const scored = [];
  for (const a of inv) {
    if (!a.text.includes(core)) continue;
    // 핵심 토큰 + 나머지 토큰(앞 2글자) 이 제목·설명에 몇 개나 있나
    let score = 2;
    for (const t of toks) if (t !== core && a.text.includes(t.slice(0, 2))) score += 1;
    // 원문 키워드가 통째로 들어 있으면 확실한 매칭
    if (a.text.includes(keyword)) score += 3;
    scored.push({ slug: a.slug, score, len: a.text.length });
  }
  if (!scored.length) return { slug: null, score: 0, ambiguous: false };
  scored.sort((x, y) => y.score - x.score || x.len - y.len);
  const top = scored[0];
  // 같은 점수의 글이 여럿이고 겹친 토큰이 핵심 하나뿐이면 확신할 수 없다
  const tied = scored.filter((s) => s.score === top.score).length;
  return { slug: top.slug, score: top.score, ambiguous: top.score <= 2 && tied > 1 };
}
function latest(prefix) {
  const fs = readdirSync(LOG_DIR).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort();
  return fs.length ? JSON.parse(readFileSync(path.join(LOG_DIR, fs[fs.length - 1]), 'utf8')) : null;
}

const inv = loadInventory();
const invBySlug = new Map(inv.map((a) => [a.slug, a]));
const articlePaths = new Set(inv.map((a) => `/${a.cluster}/${a.slug}/`));
const clusterSet = new Set(inv.map((a) => a.cluster));
const prunedPaths = new Set(existsSync(REDIRECT_MAP) ? (JSON.parse(readFileSync(REDIRECT_MAP, 'utf8')).redirects || []).map((r) => r.from) : []);
const histPath = path.join(LOG_DIR, 'naver-rank-history.json');
const hist = existsSync(histPath) ? JSON.parse(readFileSync(histPath, 'utf8')) : { rows: [] };
const lastDate = [...new Set((hist.rows || []).map((r) => r.date))].sort().pop();
const rankMap = new Map((hist.rows || []).filter((r) => r.date === lastDate).map((r) => [r.keyword, r.rank]));
const demand = latest('naver-demand-');
const demandMap = new Map(((demand && demand.rows) || []).filter((r) => !r.error).map((r) => [r.keyword, r]));

// ── 묶음(dataset): 출처·탭·기간이 같은 파일끼리 ──────────────────────────
const datasets = [];
const byKey = new Map();
for (const f of parsed) {
  const pk = f.period ? `${f.period.start}~${f.period.end}` : `unknown:${f.file}`;
  const key = `${f.source}|${f.tab}|${pk}`;
  if (byKey.has(key)) {
    // 같은 조건의 파일이 둘이면 같은 내보내기를 두 번 받은 것으로 보고 더하지 않는다
    warn(`${f.file}: ${byKey.get(key).files[0]} 와 출처·탭·기간이 같아 건너뜀 (값을 두 번 세지 않는다)`);
    f.skipped = true;
    continue;
  }
  const ds = { key, source: f.source, tab: f.tab, period: f.period, files: [f.file], f };
  byKey.set(key, ds); datasets.push(ds);
}

// 검색어 탭 (서치어드바이저·애널리틱스 공통)
function keywordDataset(ds) {
  const { f } = ds;
  const metric = f.source === 'searchadvisor' ? 'clicks' : (f.cols.visits !== undefined ? 'visits' : 'clicks');
  const hasImpr = f.cols.impressions !== undefined;
  const agg = new Map();
  for (const r of f.data) {
    const kw = cell(r, f.cols.keyword);
    if (!kw || kw.length > 60 || TOTAL_ROW.test(kw)) continue;
    const cur = agg.get(kw) || { keyword: kw, clicks: 0, impressions: 0, visits: 0, position: null };
    if (f.cols.clicks !== undefined) cur.clicks += num(r[f.cols.clicks]);
    if (hasImpr) cur.impressions += num(r[f.cols.impressions]);
    if (f.cols.visits !== undefined) cur.visits += num(r[f.cols.visits]);
    if (f.cols.position !== undefined) { const p = num(r[f.cols.position]); if (p) cur.position = cur.position ? Math.min(cur.position, p) : p; }
    agg.set(kw, cur);
  }
  const rows = [...agg.values()].map((r) => {
    const m = match(r.keyword, inv);
    const d = demandMap.get(r.keyword);
    return {
      keyword: r.keyword,
      ...(f.source === 'searchadvisor' ? { impressions: r.impressions, clicks: r.clicks, ctr: r.impressions ? pct(r.clicks, r.impressions) : null } : { [metric]: r[metric] }),
      consolePosition: r.position, apiRank: rankMap.get(r.keyword) ?? null,
      ourArticle: m.slug, matchScore: m.score, matchAmbiguous: m.ambiguous ? 1 : 0,
      cluster: m.slug ? (invBySlug.get(m.slug) || {}).cluster : null,
      kinTotal: d ? d.kinTotal : null, official: d ? d.official : null,
    };
  }).sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0) || (b[metric] ?? 0) - (a[metric] ?? 0));

  const act = (r) => r[metric] ?? 0;
  const medCtr = (() => {
    const xs = rows.filter((r) => (r.impressions ?? 0) >= 30 && r.ctr != null).map((r) => r.ctr).sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  })();
  const lists = {
    // ① 노출은 되는데 클릭이 안 붙는다 → 제목·설명 문제 (운영자 지정 P4 트랙). 노출 컬럼이 있어야 판단 가능
    ctrGap: hasImpr ? rows.filter((r) => r.ourArticle && r.impressions >= 30 && medCtr !== null && r.ctr !== null && r.ctr < medCtr * 0.5).sort((a, b) => b.impressions - a.impressions) : [],
    // ② 클릭(유입)이 나는데 순위가 낮다 → 그 글 리프레시
    refresh: rows.filter((r) => r.ourArticle && act(r) >= 1 && r.apiRank && r.apiRank > 5).sort((a, b) => act(b) - act(a)),
    // ③ 노출·클릭이 있는데 우리 글이 없다 → 신규 후보
    newTopic: rows.filter((r) => !r.ourArticle && ((hasImpr && r.impressions >= 10) || act(r) >= 1)).sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0) || act(b) - act(a)),
  };
  const sum = (k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  const totals = { keywords: rows.length, ...(f.source === 'searchadvisor' ? { impressions: sum('impressions'), clicks: sum('clicks') } : { [metric]: sum(metric) }), withArticle: rows.filter((r) => r.ourArticle).length };
  if (totals.impressions) totals.ctr = pct(totals.clicks, totals.impressions);
  return { ...ds, metric, rows, lists, medianCtr: medCtr, totals };
}

// 문서 탭
function normPath(raw) {
  let s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) {
    try { const u = new URL(s); if (!/(^|\.)asiatop\.co\.kr$/i.test(u.hostname)) return null; s = u.pathname; } catch { return null; }
  } else if (/^(www\.)?asiatop\.co\.kr/i.test(s)) s = s.replace(/^(www\.)?asiatop\.co\.kr/i, '') || '/';
  if (!s.startsWith('/')) return null;
  s = s.split(/[?#]/)[0];
  try { s = decodeURI(s); } catch { /* 그대로 */ }
  if (!/\.[a-z0-9]+$/i.test(s) && !s.endsWith('/')) s += '/';
  return s;
}
function kindOf(p) {
  if (!p) return 'unknown';
  if (p === '/') return 'home';
  if (articlePaths.has(p)) return 'article';
  if (prunedPaths.has(p)) return 'pruned';
  const seg = p.match(/^\/([^/]+)\/$/);
  if (seg && clusterSet.has(seg[1])) return 'hub';
  return 'other';
}
function documentDataset(ds) {
  const { f } = ds;
  const metric = f.source === 'searchadvisor' ? 'clicks' : (f.cols.visits !== undefined ? 'visits' : 'clicks');
  const agg = new Map();
  for (const r of f.data) {
    const raw = cell(r, f.cols.page);
    if (!raw || TOTAL_ROW.test(raw)) continue;
    const p = normPath(raw);
    const k = p ?? `raw:${raw}`;
    const cur = agg.get(k) || { path: p, raw: p ? null : raw.slice(0, 200), clicks: 0, impressions: 0, visits: 0 };
    if (f.cols.clicks !== undefined) cur.clicks += num(r[f.cols.clicks]);
    if (f.cols.impressions !== undefined) cur.impressions += num(r[f.cols.impressions]);
    if (f.cols.visits !== undefined) cur.visits += num(r[f.cols.visits]);
    agg.set(k, cur);
  }
  const rows = [...agg.values()].map((d) => ({
    url: d.path ? `${SITE}${d.path}` : d.raw, kind: kindOf(d.path),
    ...(f.source === 'searchadvisor' ? { clicks: d.clicks, impressions: d.impressions, ctr: d.impressions ? pct(d.clicks, d.impressions) : null } : { [metric]: d[metric] }),
  })).sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0) || (b.impressions ?? 0) - (a.impressions ?? 0));
  const sum = (arr, k) => arr.reduce((a, r) => a + (r[k] ?? 0), 0);
  const keys = f.source === 'searchadvisor' ? ['clicks', 'impressions'] : [metric];
  const byKind = {};
  for (const k of ['article', 'hub', 'home', 'pruned', 'other', 'unknown']) {
    const arr = rows.filter((r) => r.kind === k);
    if (arr.length) byKind[k] = { documents: arr.length, ...Object.fromEntries(keys.map((x) => [x, sum(arr, x)])) };
  }
  const medCtr = (() => {
    const xs = rows.filter((r) => (r.impressions ?? 0) >= 30 && r.ctr != null).map((r) => r.ctr).sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  })();
  const lists = {
    // 노출 대비 클릭이 중앙값의 절반 미만인 우리 글 (제목·설명 후보, P4 트랙)
    lowCtr: rows.filter((r) => r.kind === 'article' && (r.impressions ?? 0) >= 30 && medCtr !== null && r.ctr !== null && r.ctr < medCtr * 0.5),
    // 프루닝(301)된 주소인데 아직 네이버에서 노출·클릭이 잡힌다
    prunedWithTraffic: rows.filter((r) => r.kind === 'pruned' && ((r.impressions ?? 0) > 0 || (r[metric] ?? 0) > 0)),
    // 우리 글 목록에도 프루닝 목록에도 없는 주소 (오타 URL·옛 주소 확인용)
    unknownPaths: rows.filter((r) => r.kind === 'other' || r.kind === 'unknown'),
  };
  const totals = { documents: rows.length, ...Object.fromEntries(keys.map((x) => [x, sum(rows, x)])) };
  if (totals.impressions) totals.ctr = pct(totals.clicks, totals.impressions);
  return { ...ds, metric, rows, lists, medianCtr: medCtr, byKind, totals };
}

// 보기 좋게: 서치어드바이저 먼저, 검색어 탭 먼저, 긴 기간 먼저
const order = (d) => [d.source === 'searchadvisor' ? 0 : 1, d.tab === 'keyword' ? 0 : 1, -(d.period?.days ?? 0)];
datasets.sort((a, b) => { const x = order(a); const y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
const built = datasets.map((ds) => (ds.tab === 'keyword' ? keywordDataset(ds) : documentDataset(ds)));

// ── 요약 화면 총계 (손으로 적은 값) ─────────────────────────────────────
function readManualTotals() {
  if (!existsSync(MANUAL_FILE)) return [];
  const out = new Map();
  for (const line of decodeFile(MANUAL_FILE).text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const m = l.match(/(\d+)\s*일[^0-9클노]*?(클릭|노출)[^0-9]*([\d,]+)/);
    if (!m) { warn(`${MANUAL_FILE_NAME}: 못 읽은 줄 "${l.slice(0, 40)}" (예: 90일 클릭 1234)`); continue; }
    const days = Number(m[1]);
    const cur = out.get(days) || { days };
    cur[m[2] === '클릭' ? 'clicks' : 'impressions'] = num(m[3]);
    out.set(days, cur);
  }
  return [...out.values()].sort((a, b) => b.days - a.days);
}
const manualTotals = readManualTotals();
const saDatasets = built.filter((d) => d.source === 'searchadvisor');
if (saDatasets.length && !manualTotals.length) warn(`요약 화면 총 클릭이 없다. ${relPath(MANUAL_FILE)} 에 "90일 클릭 N", "7일 클릭 N" 을 적으면 내보내기가 전체의 몇 %를 담았는지 계산한다`);
for (const d of saDatasets) {
  if (!d.period) continue;
  const mt = manualTotals.find((m) => Math.abs(m.days - d.period.days) <= 2);
  if (!mt) continue;
  d.manualTotal = mt;
  d.exportShare = { clicks: mt.clicks ? pct(d.totals.clicks ?? 0, mt.clicks) : null, impressions: mt.impressions ? pct(d.totals.impressions ?? 0, mt.impressions) : null };
}

// ── 저장 ────────────────────────────────────────────────────────────────
const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const outFile = path.join(LOG_DIR, `naver-console-${kst}.json`);
const privFile = path.join(PRIVATE_DIR, `naver-console-${kst}.json`);
const countLists = (lists) => Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length]));

const publicOut = {
  pulledAt: new Date().toISOString(),
  kstDate: kst,
  note: '합계·분류별 건수·상위 문서 URL 만 둔다. 검색어 원문 행은 private 파일에만 있다. 서치어드바이저(searchadvisor)와 애널리틱스(analytics) 값은 더하지 않고 묶음(dataset)별로 따로 적는다.',
  privateDetail: `${relPath(privFile)} (gitignore)`,
  files: parsed.map((f) => ({ file: f.file, source: f.source, sourceFrom: f.sourceFrom, tab: f.tab, period: f.period, periodFrom: f.periodFrom, encoding: f.encoding, dataRows: f.data.length, header: f.header, ...(f.skipped ? { skipped: true } : {}) })),
  manualTotals,
  datasets: built.map((d) => ({
    source: d.source, tab: d.tab, period: d.period, files: d.files, metric: d.metric,
    totals: d.totals, medianCtr: d.medianCtr,
    ...(d.byKind ? { byKind: d.byKind } : {}),
    categories: countLists(d.lists),
    ...(d.manualTotal ? { manualTotal: d.manualTotal, exportShare: d.exportShare } : {}),
    // URL 로 못 읽은 칸 값(kind unknown)은 무엇이 들었는지 모르니 커밋 파일에 싣지 않는다. 건수는 byKind.unknown 에 있다
    ...(d.tab === 'document' ? { topDocuments: d.rows.filter((r) => r.kind !== 'unknown').slice(0, TOP_DOCS) } : {}),
  })),
  warnings,
};
// 커밋 파일에 검색어 행이 섞이지 않았는지 마지막으로 확인한다
(function assertNoKeywordRows(o) {
  if (Array.isArray(o)) { o.forEach(assertNoKeywordRows); return; }
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    if (['keyword', 'rows', 'lists', 'query'].includes(k)) fail(`커밋 파일에 검색어 행이 섞였다 (키: ${k}). 코드 확인 필요`);
    assertNoKeywordRows(o[k]);
  }
})(publicOut);

// naver-pipeline.mjs 의 inboundMap() 은 커밋 폴더(docs/revenue-log)의 최신 naver-console-*.json 에서 rows[].keyword·clicks 를 읽는다.
// 커밋 파일에는 이제 검색어 행이 없어서 그 입력(inbound7d)은 비어 있다. 기간 7일 전후의 서치어드바이저 검색어 묶음을
// 같은 모양으로 private 에만 둔다. 파이프라인이 private 을 읽게 할지는 운영자 결정 대기
// (GitHub Actions 에는 private 파일이 없어 로컬과 Actions 의 입력이 달라진다)
const inbound = saDatasets.filter((d) => d.tab === 'keyword' && d.period && d.period.days <= 8).sort((a, b) => b.period.end.localeCompare(a.period.end))[0];
const privateOut = {
  pulledAt: publicOut.pulledAt, kstDate: kst,
  note: '검색어 원문·분류 목록. gitignore 대상이라 커밋되지 않는다',
  datasets: built.map((d) => ({ source: d.source, tab: d.tab, period: d.period, files: d.files, metric: d.metric, totals: d.totals, lists: d.lists, rows: d.rows })),
  rowsFrom: inbound ? `${inbound.source} ${inbound.tab} ${inbound.period.start}~${inbound.period.end}` : null,
  rows: inbound ? inbound.rows.map((r) => ({ keyword: r.keyword, clicks: r.clicks, impressions: r.impressions })) : [],
};

mkdirSync(PRIVATE_DIR, { recursive: true });
writeFileSync(privFile, JSON.stringify(privateOut, null, 1));
writeFileSync(outFile, JSON.stringify(publicOut, null, 1) + '\n');

// ── 콘솔 ────────────────────────────────────────────────────────────────
if (!QUIET) {
  const pad = (s, n) => String(s ?? '').padEnd(n);
  const share = (v) => (v == null ? '-' : `${v}%`);
  const per = (p) => (p ? `${p.start}~${p.end} (${p.days}일)` : '기간 모름');
  console.log(`서치어드바이저·애널리틱스 취합: ${kst} KST`);
  for (const f of parsed) console.log(`  ${f.file}: ${f.source} · ${f.tab === 'keyword' ? '검색어' : '문서'} 탭 · ${per(f.period)} · ${f.data.length}행 · ${f.encoding}${f.skipped ? ' (건너뜀)' : ''}`);
  for (const d of built) {
    const t = d.totals;
    const metricLine = d.source === 'searchadvisor' ? `노출 ${(t.impressions ?? 0).toLocaleString()} · 클릭 ${(t.clicks ?? 0).toLocaleString()}` : `${d.metric === 'visits' ? '유입' : '클릭'} ${(t[d.metric] ?? 0).toLocaleString()}`;
    console.log(`\n[${d.source} · ${d.tab === 'keyword' ? '검색어' : '문서'} · ${per(d.period)}] ${d.tab === 'keyword' ? `검색어 ${t.keywords}` : `문서 ${t.documents}`} · ${metricLine}`);
    if (d.manualTotal) console.log(`  요약 화면 총계 대비 내보내기 비율: 클릭 ${share(d.exportShare.clicks)} · 노출 ${share(d.exportShare.impressions)}`);
    if (d.tab === 'document') {
      console.log(`  종류별: ${Object.entries(d.byKind).map(([k, v]) => `${k} ${v.documents}`).join(' · ')} · 클릭률 낮은 글 ${d.lists.lowCtr.length} · 프루닝 주소 유입 ${d.lists.prunedWithTraffic.length}`);
      for (const r of d.rows.slice(0, 5)) console.log(`  ${pad(r[d.metric], 6)} ${r.url}`);
    } else {
      console.log(`  우리 글이 있는 검색어 ${t.withArticle} · 분류 ① ${d.lists.ctrGap.length} ② ${d.lists.refresh.length} ③ ${d.lists.newTopic.length}${d.medianCtr !== null ? ` · 노출 30 이상 중앙값 클릭률 ${d.medianCtr}%` : ''}`);
    }
  }

  // 자세한 목록은 가장 긴 기간의 검색어 묶음 하나만 (built 는 서치어드바이저·긴 기간 순으로 정렬돼 있다)
  const main = built.find((d) => d.tab === 'keyword');
  if (main) {
    const act = main.metric;
    const show = (title, arr, cols) => {
      console.log(`\n=== ${title} (${arr.length}건) ===`);
      if (!arr.length) { console.log('  해당 없음'); return; }
      console.log('  ' + cols.head);
      for (const r of arr.slice(0, 15)) console.log('  ' + cols.row(r));
    };
    const mark = (r) => r.ourArticle + (r.matchAmbiguous ? ' (매칭 불확실, 확인 필요)' : '');
    console.log(`\n자세한 목록: ${main.source} 검색어 ${per(main.period)}`);
    if (main.source === 'searchadvisor') {
      show('① 노출은 되는데 클릭이 안 붙는다 (제목·설명 개선 후보, P4 운영자 트랙)', main.lists.ctrGap, {
        head: pad('노출', 7) + pad('클릭', 6) + pad('클릭률', 8) + pad('검색어', 26) + '글',
        row: (r) => pad(r.impressions, 7) + pad(r.clicks, 6) + pad(r.ctr + '%', 8) + pad(r.keyword.slice(0, 24), 26) + mark(r),
      });
    }
    show('② 클릭은 나는데 우리 순위가 낮다 (리프레시 후보)', main.lists.refresh, {
      head: pad(act === 'visits' ? '유입' : '클릭', 6) + pad('노출', 7) + pad('API순위', 8) + pad('검색어', 26) + '글',
      row: (r) => pad(r[act], 6) + pad(r.impressions ?? '-', 7) + pad(r.apiRank + '위', 8) + pad(r.keyword.slice(0, 24), 26) + mark(r),
    });
    show('③ 수요는 있는데 우리 글이 없다 (신규 후보, 카니발리제이션 대조 필요)', main.lists.newTopic, {
      head: pad('노출', 7) + pad(act === 'visits' ? '유입' : '클릭', 6) + pad('지식iN', 8) + pad('go.kr', 7) + '검색어',
      row: (r) => pad(r.impressions ?? '-', 7) + pad(r[act], 6) + pad(r.kinTotal ?? '-', 8) + pad(r.official ?? '-', 7) + r.keyword,
    });
  }
  console.log(`\n→ ${relPath(outFile)} (합계·건수·상위 문서 URL, 커밋용)`);
  console.log(`→ ${relPath(privFile)} (검색어 원문, gitignore)`);
  console.log('다음: ①은 docs/24 P4 트랙(제목·메타 전용 도구)으로 운영자 승인 후, ②는 /topics 리프레시 후보로, ③은 1차 출처 확인 후 신규 후보로 넘긴다.');
}
