#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-rank-track.mjs — 네이버 웹문서 순위 시계열 추적 (공식 검색 API, LLM 0)
//
// 왜 API 만 쓰는가: search.naver.com/robots.txt 는 `User-agent: * / Disallow: /` 로 모든 봇의 수집을 막고
// ClaudeBot 도 명시 차단한다(2026-09-08 확인). 따라서 통합검색 결과 페이지를 자동으로 긁지 않는다.
// 대신 네이버가 정식 제공하는 웹문서 검색 API 의 순위를 추적한다. 이 순위는 통합검색 첫 화면과 다르지만
// (docs/26 §2 실측), 같은 조건으로 반복 측정하므로 오르내림을 보는 데는 유효하다.
// 통합검색 첫 화면 확인은 사람이 눈으로 하고, 노출·클릭은 서치어드바이저 내보내기로 본다(naver-console-import.mjs).
//
// 실행: node scripts/audit/naver-rank-track.mjs [--keywords <txt|json>] [--limit N] [--quiet]
//       기본 대상은 (a) 최신 naver-serp JSON 에서 우리가 잡힌 키워드 (b) 최신 naver-demand 의 gap·newborn 상위
// 출력: docs/revenue-log/naver-rank-history.json (append-only 시계열) + 콘솔 변동 요약
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const HISTORY = path.join(LOG_DIR, 'naver-rank-history.json');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const KW_FILE = opt('--keywords', null);
const LIMIT = Number(opt('--limit', 40)) || 40;
const QUIET = args.includes('--quiet');

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local'); const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };
const HUB_ID = env.X_NCP_APIGW_API_KEY_ID || env.NCP_APIGW_API_KEY_ID || env.NAVER_APIHUB_CLIENT_ID;
const HUB_SECRET = env.X_NCP_APIGW_API_KEY || env.NCP_APIGW_API_KEY || env.NAVER_APIHUB_CLIENT_SECRET;
const HUB = !!(HUB_ID && HUB_SECRET);
if (!HUB && !(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET)) { console.error('❌ 네이버 API 자격증명 없음 (naver-demand.mjs 헤더 참조)'); process.exit(1); }
const API = HUB
  ? { base: 'https://naverapihub.apigw.ntruss.com', web: '/search/v1/webkr', headers: { 'X-NCP-APIGW-API-KEY-ID': HUB_ID, 'X-NCP-APIGW-API-KEY': HUB_SECRET } }
  : { base: 'https://openapi.naver.com', web: '/v1/search/webkr.json', headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function webSearch(query) {
  const u = new URL(API.base + API.web);
  u.searchParams.set('query', query);
  u.searchParams.set('display', '30'); // 30위까지 본다 (10위 밖 진입도 추적해야 개선이 보인다)
  const r = await fetch(u, { headers: API.headers });
  if (r.status === 429) { await sleep(1500); return webSearch(query); }
  if (!r.ok) throw new Error(`webkr ${r.status}`);
  return r.json();
}
const host = (link) => { try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ── 대상 키워드 ─────────────────────────────────────────────────────────
function latest(prefix) {
  const files = readdirSync(LOG_DIR).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort();
  return files.length ? JSON.parse(readFileSync(path.join(LOG_DIR, files[files.length - 1]), 'utf8')) : null;
}
function loadKeywords() {
  if (KW_FILE) {
    const raw = readFileSync(path.resolve(ROOT, KW_FILE), 'utf8');
    if (KW_FILE.endsWith('.json')) {
      const p = JSON.parse(raw);
      const arr = Array.isArray(p) ? p : (p.seeds || p.keywords || []);
      return arr.map((x) => (typeof x === 'string' ? x : x.keyword)).filter(Boolean).slice(0, LIMIT);
    }
    return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, LIMIT);
  }
  const picks = [];
  // 과거에 우리가 잡혔던 키워드는 계속 추적한다 (이탈 감지)
  const hist = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : { rows: [] };
  for (const r of hist.rows || []) if (!picks.includes(r.keyword)) picks.push(r.keyword);
  const serp = latest('naver-serp-');
  if (serp) for (const r of serp.results || []) if (r.ourRank && !picks.includes(r.keyword)) picks.push(r.keyword);
  const dem = latest('naver-demand-');
  if (dem) {
    const rows = (dem.rows || []).filter((r) => !r.error);
    for (const r of rows.filter((x) => x.ourRank).concat(
      rows.filter((x) => x.newborn).sort((a, b) => b.openness - a.openness).slice(0, 10),
      rows.filter((x) => x.gap).sort((a, b) => (b.trendRatio || 0) - (a.trendRatio || 0)).slice(0, 10),
    )) if (!picks.includes(r.keyword)) picks.push(r.keyword);
  }
  return picks.slice(0, LIMIT);
}

const keywords = loadKeywords();
if (!keywords.length) { console.error('❌ 추적 대상 키워드가 없다. pnpm audit:naver / audit:serp 를 먼저 돌리거나 --keywords 로 지정하라.'); process.exit(1); }
const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
if (!QUIET) console.log(`네이버 웹문서 순위 추적: ${keywords.length} 키워드, ${kst} KST, API = ${HUB ? 'NAVER API HUB' : '개발자센터'}\n`);

const today = [];
for (const kw of keywords) {
  try {
    const j = await webSearch(kw);
    const items = j.items || [];
    const idx = items.findIndex((i) => (i.link || '').includes('asiatop.co.kr'));
    const ours = idx >= 0 ? items[idx] : null;
    today.push({
      date: kst, keyword: kw,
      rank: idx >= 0 ? idx + 1 : 0,                       // 0 = 30위 밖
      url: ours ? (ours.link || '').split('?')[0] : '',
      top1: items[0] ? host(items[0].link) : '',
      officialTop10: items.slice(0, 10).filter((i) => /\.(go|or)\.kr/.test(i.link || '')).length,
      total: j.total ?? null,
    });
    if (!QUIET) process.stdout.write(idx >= 0 ? '·' : 'x');
  } catch (e) {
    today.push({ date: kst, keyword: kw, error: String(e.message).slice(0, 60) });
    if (!QUIET) process.stdout.write('!');
  }
  await sleep(150);
}
if (!QUIET) console.log('\n');

// ── 시계열 갱신 ─────────────────────────────────────────────────────────
mkdirSync(LOG_DIR, { recursive: true });
const hist = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : { note: '네이버 웹문서 검색 API 기준 우리 글 순위 시계열. 0 = 30위 밖. 통합검색 첫 화면과 다름(docs/26 §2).', rows: [] };
hist.rows = (hist.rows || []).filter((r) => r.date !== kst).concat(today.filter((r) => !r.error));
hist.updatedAt = new Date().toISOString();
writeFileSync(HISTORY, JSON.stringify(hist, null, 1));

// ── 변동 요약 ───────────────────────────────────────────────────────────
const byKw = new Map();
for (const r of hist.rows) {
  const a = byKw.get(r.keyword) || [];
  a.push(r); byKw.set(r.keyword, a);
}
const dates = [...new Set(hist.rows.map((r) => r.date))].sort();
const prevDate = dates.filter((d) => d < kst).pop() || null;
const fmt = (n) => (n ? `${n}위` : '권외');
const pad = (s, n) => String(s ?? '').padEnd(n);

const cur = today.filter((r) => !r.error);
const inTop10 = cur.filter((r) => r.rank && r.rank <= 10).length;
const inTop30 = cur.filter((r) => r.rank).length;

if (!QUIET) {
  console.log(`=== ${kst} 순위 (웹문서 검색 API 기준, 30위까지) ===`);
  console.log(`10위 내 ${inTop10} / 30위 내 ${inTop30} / 측정 ${cur.length} 키워드${prevDate ? ` (직전 측정 ${prevDate})` : ' (첫 측정, 다음 실행부터 변동 표시)'}`);
  if (prevDate) {
    const prev = new Map(hist.rows.filter((r) => r.date === prevDate).map((r) => [r.keyword, r.rank]));
    const up = [], down = [], entered = [], dropped = [];
    for (const r of cur) {
      const p = prev.get(r.keyword);
      if (p === undefined) continue;
      if (!p && r.rank) entered.push(`${r.keyword} → ${fmt(r.rank)}`);
      else if (p && !r.rank) dropped.push(`${r.keyword} (${fmt(p)} → 권외)`);
      else if (p && r.rank && r.rank < p) up.push(`${r.keyword} ${fmt(p)} → ${fmt(r.rank)}`);
      else if (p && r.rank && r.rank > p) down.push(`${r.keyword} ${fmt(p)} → ${fmt(r.rank)}`);
    }
    const show = (label, arr) => { if (arr.length) { console.log(`\n${label} (${arr.length})`); for (const s of arr.slice(0, 12)) console.log('  ' + s); } };
    show('신규 진입', entered); show('상승', up); show('하락', down); show('이탈', dropped);
    if (!entered.length && !up.length && !down.length && !dropped.length) console.log('변동 없음');
  }
  console.log(`\n=== 현재 순위 상위 ===`);
  console.log(pad('순위', 6), pad('키워드', 28), pad('go.kr 상위10', 13), '1위 도메인');
  for (const r of cur.filter((x) => x.rank).sort((a, b) => a.rank - b.rank).slice(0, 20)) {
    console.log(pad(fmt(r.rank), 6), pad(r.keyword.slice(0, 26), 28), pad(r.officialTop10, 13), r.top1);
  }
  const out30 = cur.filter((x) => !x.rank);
  if (out30.length) console.log(`\n30위 밖 ${out30.length}건: ${out30.slice(0, 12).map((r) => r.keyword).join(', ')}${out30.length > 12 ? ' 외' : ''}`);
  console.log(`\n→ ${path.relative(ROOT, HISTORY)} (누적 ${dates.length}회 측정)`);
  console.log('주의: 이 순위는 웹문서 검색 API 기준이라 통합검색 첫 화면 노출과 다르다(docs/26 §2). 노출·클릭 실측은 서치어드바이저 내보내기(pnpm audit:console)로 본다.');
}
