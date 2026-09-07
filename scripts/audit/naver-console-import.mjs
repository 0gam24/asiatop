#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-console-import.mjs — 서치어드바이저·네이버 애널리틱스 내보내기(CSV) 취합·분석 (LLM 0)
//
// 왜 수동 내보내기인가: 네이버 공식 오픈 API 목록에 애널리틱스·서치어드바이저 리포트 API 가 없다(2026-09-08 확인).
// 데이터랩과 검색 API 만 공개돼 있어, 노출·클릭 실측은 사람이 웹 콘솔에서 내보낸 파일을 넣어 주는 수밖에 없다.
//
// 운영자가 할 일 (월 1회):
//   1) 서치어드바이저 → 리포트 → 검색 노출/클릭 현황 → 검색어 탭 → CSV 다운로드
//   2) (선택) 네이버 애널리틱스 → 유입분석 → 검색어 → CSV 다운로드
//   3) 파일을 docs/revenue-log/inbox/ 에 넣고 이 스크립트 실행
//
// 실행: node scripts/audit/naver-console-import.mjs [--file <csv>] [--source searchadvisor|analytics] [--quiet]
//       --file 없으면 docs/revenue-log/inbox/*.csv 를 전부 읽는다.
// 출력: docs/revenue-log/naver-console-YYYY-MM-DD.json + 콘솔 분석 (개선 후보 3분류)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const INBOX = path.join(LOG_DIR, 'inbox');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FILE = opt('--file', null);
const SOURCE = opt('--source', null);
const QUIET = args.includes('--quiet');

// ── CSV 파서 (따옴표·BOM·쉼표/탭 자동 판별) ─────────────────────────────
function parseDelimited(text) {
  const s = text.replace(/^﻿/, '');
  const firstLine = s.split(/\r?\n/)[0] || '';
  const delim = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? '\t' : ',';
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

// 컬럼 이름은 콘솔 버전마다 다르므로 후보 목록으로 찾는다
const COL = {
  keyword: ['검색어', '키워드', '유입검색어', '검색 키워드', 'query', 'keyword'],
  impressions: ['노출수', '노출', '노출 수', 'impressions', 'impression'],
  clicks: ['클릭수', '클릭', '클릭 수', '유입수', '방문수', 'clicks', 'click'],
  ctr: ['클릭률', 'ctr', 'CTR'],
  position: ['순위', '평균순위', '평균 순위', 'position', 'rank'],
  page: ['페이지', 'url', 'URL', '문서', '랜딩페이지'],
};
function findCols(header) {
  const norm = header.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, ''));
  const out = {};
  for (const [key, names] of Object.entries(COL)) {
    const idx = norm.findIndex((h) => names.some((n) => h === n.toLowerCase().replace(/\s+/g, '')));
    if (idx >= 0) out[key] = idx;
  }
  return out;
}
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };

// ── 입력 파일 ───────────────────────────────────────────────────────────
function inputFiles() {
  if (FILE) return [path.resolve(ROOT, FILE)];
  if (!existsSync(INBOX)) return [];
  return readdirSync(INBOX).filter((f) => /\.(csv|tsv|txt)$/i.test(f)).map((f) => path.join(INBOX, f));
}
const files = inputFiles();
if (!files.length) {
  mkdirSync(INBOX, { recursive: true });
  console.error('❌ 넣을 파일이 없다.');
  console.error(`   1) 서치어드바이저 → 리포트 → 검색 노출/클릭 현황 → 검색어 탭 → CSV 다운로드`);
  console.error(`   2) 그 파일을 ${path.relative(ROOT, INBOX)}/ 에 넣고 다시 실행 (또는 --file 로 지정)`);
  console.error(`   네이버 애널리틱스 유입검색어 CSV 도 같은 폴더에 넣으면 함께 취합한다.`);
  process.exit(1);
}

// ── 우리 자산 ───────────────────────────────────────────────────────────
function loadInventory() {
  const out = [];
  for (const f of readdirSync(ART_DIR).filter((x) => x.endsWith('.mdx'))) {
    const s = readFileSync(path.join(ART_DIR, f), 'utf8');
    const fm = s.split('---')[1] || '';
    const g = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [])[1] || '';
    out.push({ slug: f.replace(/\.mdx$/, ''), cluster: g('cluster'), text: `${g('title')} ${g('description')}` });
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
const histPath = path.join(LOG_DIR, 'naver-rank-history.json');
const hist = existsSync(histPath) ? JSON.parse(readFileSync(histPath, 'utf8')) : { rows: [] };
const lastDate = [...new Set((hist.rows || []).map((r) => r.date))].sort().pop();
const rankMap = new Map((hist.rows || []).filter((r) => r.date === lastDate).map((r) => [r.keyword, r.rank]));
const demand = latest('naver-demand-');
const demandMap = new Map(((demand && demand.rows) || []).filter((r) => !r.error).map((r) => [r.keyword, r]));

// ── 취합 ────────────────────────────────────────────────────────────────
const agg = new Map();
const readFiles = [];
for (const fp of files) {
  const rows = parseDelimited(readFileSync(fp, 'utf8'));
  if (rows.length < 2) { readFiles.push({ file: path.basename(fp), rows: 0, note: '데이터 행 없음' }); continue; }
  // 헤더가 첫 줄이 아닐 수 있어(콘솔이 제목 줄을 붙임) 앞 5줄에서 키워드 컬럼이 잡히는 줄을 헤더로 본다
  let hi = -1, cols = {};
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const c = findCols(rows[i]);
    if (c.keyword !== undefined) { hi = i; cols = c; break; }
  }
  if (hi < 0) { readFiles.push({ file: path.basename(fp), rows: 0, note: '검색어 컬럼을 찾지 못함 (헤더 확인 필요)' }); continue; }
  const src = SOURCE || (cols.impressions !== undefined ? 'searchadvisor' : 'analytics');
  let n = 0;
  for (const r of rows.slice(hi + 1)) {
    const kw = String(r[cols.keyword] ?? '').trim();
    if (!kw || kw.length > 60) continue;
    const cur = agg.get(kw) || { keyword: kw, impressions: 0, clicks: 0, position: null, sources: new Set() };
    if (cols.impressions !== undefined) cur.impressions += num(r[cols.impressions]);
    if (cols.clicks !== undefined) cur.clicks += num(r[cols.clicks]);
    if (cols.position !== undefined) { const p = num(r[cols.position]); if (p) cur.position = cur.position ? Math.min(cur.position, p) : p; }
    cur.sources.add(src);
    agg.set(kw, cur); n++;
  }
  readFiles.push({ file: path.basename(fp), rows: n, source: src, header: rows[hi].join(' | ').slice(0, 120) });
}

const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const rows = [...agg.values()].map((r) => {
  const m = match(r.keyword, inv);
  const d = demandMap.get(r.keyword);
  return {
    keyword: r.keyword, impressions: r.impressions, clicks: r.clicks,
    ctr: r.impressions ? +((r.clicks / r.impressions) * 100).toFixed(2) : null,
    consolePosition: r.position, apiRank: rankMap.get(r.keyword) ?? null,
    ourArticle: m.slug, matchScore: m.score, matchAmbiguous: m.ambiguous ? 1 : 0,
    cluster: m.slug ? (inv.find((a) => a.slug === m.slug) || {}).cluster : null,
    kinTotal: d ? d.kinTotal : null, official: d ? d.official : null,
    sources: [...r.sources],
  };
}).sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);

mkdirSync(LOG_DIR, { recursive: true });
const outFile = path.join(LOG_DIR, `naver-console-${kst}.json`);
const totals = {
  keywords: rows.length,
  impressions: rows.reduce((a, r) => a + r.impressions, 0),
  clicks: rows.reduce((a, r) => a + r.clicks, 0),
  withArticle: rows.filter((r) => r.ourArticle).length,
};
writeFileSync(outFile, JSON.stringify({ pulledAt: new Date().toISOString(), kstDate: kst, files: readFiles.map((f) => ({ ...f })), totals, rows }, null, 1));

// ── 분석: 개선 후보 3분류 ───────────────────────────────────────────────
const pad = (s, n) => String(s ?? '').padEnd(n);
const medCtr = (() => {
  const xs = rows.filter((r) => r.impressions >= 30 && r.ctr !== null).map((r) => r.ctr).sort((a, b) => a - b);
  return xs.length ? xs[Math.floor(xs.length / 2)] : null;
})();

// ① 노출은 되는데 클릭이 안 붙는다 → 제목·설명 문제 (운영자 지정 P4 트랙)
const ctrGap = rows.filter((r) => r.ourArticle && r.impressions >= 30 && medCtr !== null && r.ctr !== null && r.ctr < medCtr * 0.5)
  .sort((a, b) => b.impressions - a.impressions);
// ② 클릭이 나는데 순위가 낮다 → 그 글 리프레시
const refresh = rows.filter((r) => r.ourArticle && r.clicks >= 1 && r.apiRank && r.apiRank > 5)
  .sort((a, b) => b.clicks - a.clicks);
// ③ 노출·클릭이 있는데 우리 글이 없다 → 신규 후보
const newTopic = rows.filter((r) => !r.ourArticle && (r.impressions >= 10 || r.clicks >= 1))
  .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);

if (!QUIET) {
  console.log(`서치어드바이저·애널리틱스 취합: ${kst} KST`);
  for (const f of readFiles) console.log(`  ${f.file}: ${f.rows}행${f.source ? ` (${f.source})` : ''}${f.note ? ` — ${f.note}` : ''}`);
  console.log(`\n합계: 검색어 ${totals.keywords} · 노출 ${totals.impressions.toLocaleString()} · 클릭 ${totals.clicks.toLocaleString()} · 우리 글이 있는 검색어 ${totals.withArticle}`);
  if (medCtr !== null) console.log(`노출 30 이상 검색어의 중앙값 클릭률: ${medCtr}%`);

  const show = (title, arr, cols) => {
    console.log(`\n=== ${title} (${arr.length}건) ===`);
    if (!arr.length) { console.log('  해당 없음'); return; }
    console.log('  ' + cols.head);
    for (const r of arr.slice(0, 15)) console.log('  ' + cols.row(r));
  };
  const mark = (r) => r.ourArticle + (r.matchAmbiguous ? ' (매칭 불확실, 확인 필요)' : '');
  show('① 노출은 되는데 클릭이 안 붙는다 (제목·설명 개선 후보, P4 운영자 트랙)', ctrGap, {
    head: pad('노출', 7) + pad('클릭', 6) + pad('클릭률', 8) + pad('검색어', 26) + '글',
    row: (r) => pad(r.impressions, 7) + pad(r.clicks, 6) + pad(r.ctr + '%', 8) + pad(r.keyword.slice(0, 24), 26) + mark(r),
  });
  show('② 클릭은 나는데 우리 순위가 낮다 (리프레시 후보)', refresh, {
    head: pad('클릭', 6) + pad('노출', 7) + pad('API순위', 8) + pad('검색어', 26) + '글',
    row: (r) => pad(r.clicks, 6) + pad(r.impressions, 7) + pad(r.apiRank + '위', 8) + pad(r.keyword.slice(0, 24), 26) + mark(r),
  });
  show('③ 수요는 있는데 우리 글이 없다 (신규 후보, 카니발리제이션 대조 필요)', newTopic, {
    head: pad('노출', 7) + pad('클릭', 6) + pad('지식iN', 8) + pad('go.kr', 7) + '검색어',
    row: (r) => pad(r.impressions, 7) + pad(r.clicks, 6) + pad(r.kinTotal ?? '-', 8) + pad(r.official ?? '-', 7) + r.keyword,
  });
  console.log(`\n→ ${path.relative(ROOT, outFile)}`);
  console.log('다음: ①은 docs/24 P4 트랙(제목·메타 전용 도구)으로 운영자 승인 후, ②는 /topics 리프레시 후보로, ③은 1차 출처 확인 후 신규 후보로 넘긴다.');
}
