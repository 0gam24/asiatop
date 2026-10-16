// ════════════════════════════════════════════════════════════════════════
// naver-longtail.mjs — 이 사이트가 네이버 웹문서 10위 안에 들 수 있는 롱키워드를 찾는다 (공식 API 만, LLM 0)
//
// 2026-10-16 운영자 지시: "네이버 API 데이터로 검증해서 실제 이 사이트가 상위로 갈 수 있는 롱키워드를 찾아 목록을 만들어라.
// 이제는 지식iN 질문은 중요하지 않다." 그래서 지식iN 은 부르지도 세지도 않는다.
//
// 근거 (docs/revenue-log/site-rank-sample-2026-10-12.json, 글 698편의 대표 검색어를 웹문서 API 로 30위까지 잰 값):
//   3단어 이상 · 자리 열림   87편 중 21편 10위 안 (24.1%)
//   3단어 이상 · 닫힘       101편 중  9편 (8.9%)
//   1~2단어 · 열림         254편 중 12편 (4.7%)
//   1~2단어 · 닫힘         256편 중  3편 (1.2%)
//   10/07·10/08 표본도 3단어 이상 26~27편 / 1~2단어 12~13편으로 같은 모양이다. 이 표는 실행할 때마다 가장 최근 표본에서 다시 센다.
// 같은 표본에서 10위 안 글의 검색어는 대부분 검색어 트렌드에 데이터가 없었다(종소세 사후 적발·회식비 비과세·청년도약계좌 미가입은
// 90일 동안 데이터 0). 그래서 "검색되는 말" 확인을 먼저 한다.
//
// 순서
//   1) 헤드: big-keywords.json 축 키워드·별칭 + next-wave.json 주제(꺾이는 중 제외). 자매 awoo 주제는 뺀다.
//   2) 2단어 후보: 헤드마다 블로그·웹문서 제목 100건씩에서 헤드 바로 뒤에 2번 이상 붙는 말(두 낱말이면 3단어 후보) + 의도 꼬리.
//   3) 검색어 트렌드(실업급여 최근 30일 평균 = 100, 소수 둘째 자리)로 잰다. 최근 30일 중 값이 있는 날이 MIN_ACTIVE 일 이상만 남긴다.
//   4) 3단어 후보: 남은 2단어 중 검색량 상위 MAX_BASES 개마다 블로그·웹문서 제목에서 다음 낱말 + 짧은 꼬리를 붙여 다시 잰다.
//   5) 남은 것을 웹문서 검색으로 정찰(naver-scout.mjs): 자리 열림·결과 수·상위 5 관공서·우리 순위.
//   6) 같은 조건(낱말 수 × 열림) 우리 글의 10위 안 비율로 줄 세운다. 같은 비율 안에서는 검색량 순.
//      비율은 이 사이트 표본에서 센 값이다. 전망이 아니다. 결과 수 구간 비율은 참고로만 적는다(3단어 이상 안에서는 구간별 표본이 작다).
//   2단어는 열림 4.7% 라 검색량 상위 MAX_SCOUT2 개만 정찰한다(우리 글 순위 확인용).
//
// 실행: node scripts/audit/naver-longtail.mjs [--heads "청년미래적금,국민연금"] [--max-bases 60] [--min-active 3] [--write] [--add 20]
//   드라이런(기본): docs/ops/longtail-<오늘>.json 과 LONGTAIL.md 를 쓰지 않고 stdout 에 요약만
//   --write: docs/ops/longtail-<오늘>.json · docs/ops/LONGTAIL.md 를 쓰고, 3단어 이상 새 글 후보 상위 --add 건을
//            pipeline-queue.json 에 `빈틈:<검색어>` (manual) 로 넣는다
// 예산: 헤드당 2회 + 트렌드 (후보÷4)회 + 3단어 베이스당 2회 + 정찰 건당 2회. 검색 무료 일 25,000 · 트렌드 월 30,000.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { naverSearch, naverTrend, stripTags, sleep, kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { dateAxis, alignToAxis } from './naver-volume.mjs';
import { scoutQuery } from './naver-scout.mjs';
import { buildLedger, checkCandidate, classifyFamily, normKeyword, parseArticleMeta } from './naver-ledger.mjs';
import { suffixesOf, headsOf, isChattyQuery, isSisterTopic, isCommercialLoan, sisterTopOf, exposureOf, autoPickOf, conditionOf, queriesOf, QUEUE_MIN_SCORE } from './naver-pipeline.mjs';

const OPS = path.join(ROOT, 'docs', 'ops');
const QUEUE = path.join(OPS, 'pipeline-queue.json');
const BIG = path.join(OPS, 'big-keywords.json');
const WAVE = path.join(OPS, 'next-wave.json');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const REPORT = path.join(OPS, 'LONGTAIL.md');

export const ANCHOR = '실업급여';
export const MIN_ACTIVE = 3;       // 최근 30일 중 검색어 트렌드에 값이 있는 날 수 하한 (검색되는 말)
export const MAX_BASES = 60;       // 3단어로 늘릴 2단어 베이스 수
export const MIN_TAIL_FREQ = 2;    // 제목 200건(블로그 100 + 웹문서 100)에서 이만큼 붙어 나와야 꼬리로 쓴다
export const MAX_SCOUT2 = 120;     // 2단어 후보 정찰 상한(검색량 순)
const TAILS1 = ['신청', '신청방법', '조건', '자격', '대상', '기간', '신청기간', '서류', '계산', '금액', '얼마', '지급일', '환급', '해지', '중도해지', '연장', '변경', '조회', '기준', '소득기준', '세금', '불이익', '납부', '감면'];
const TAILS2 = ['방법', '조건', '기간', '서류', '기준', '불이익', '계산', '신청', '대상', '금액'];

const readJson = (p, fb = null) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fb; } };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round2 = (x) => Math.round(x * 100) / 100;
const pct = (o) => (o && o.n ? Math.round((o.top10 / o.n) * 1000) / 10 : null);

// 찾아가기 검색어(기관 연락처·누리집 위치). 2026-10-12 사이트 표본에 이런 대표 검색어 글이 없어(찾기류 2편, 둘 다 30위 밖)
// 같은 조건 비율을 그대로 쓸 근거가 없다. 대기열에 자동으로 넣지 않고 따로 적는다.
export const NAVIGATIONAL = /고객센터|콜센터|전화번호|상담전화|지사\s?찾기|홈페이지|바로가기|로그인/;
export const isNavigational = (q) => NAVIGATIONAL.test(String(q || ''));
export const wordsOf = (q) => String(q || '').trim().split(/\s+/).filter(Boolean).length;
export const cellOf = (words, open) => `${words >= 3 ? '3단어 이상' : '1~2단어'} · ${open ? '열림' : '닫힘'}`;
export const bandOf = (n) => (n == null ? '?' : n < 30000 ? '3만 미만' : n < 100000 ? '3만~10만' : n < 300000 ? '10만~30만' : n < 1000000 ? '30만~100만' : '100만 이상');

// ── 이 사이트의 실측 10위 안 비율 (가장 최근 사이트 순위 표본) ────────────────
export function latestSample(dir = LOG_DIR) {
  const f = readdirSync(dir).filter((x) => /^site-rank-sample-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().pop();
  return f ? { file: `docs/revenue-log/${f}`, ...readJson(path.join(dir, f), { rows: [] }) } : null;
}

export function siteRates(sample) {
  const cell = new Map();
  const band = new Map();
  for (const r of sample?.rows || []) {
    if (r.webDocCount == null) continue;
    const hit = r.rank != null && r.rank > 0 && r.rank <= 10;
    for (const [m, k] of [[cell, cellOf(wordsOf(r.query), !!r.open)], [band, bandOf(r.webDocCount)]]) {
      const o = m.get(k) || { n: 0, top10: 0 };
      o.n++; if (hit) o.top10++;
      m.set(k, o);
    }
  }
  return { cell, band };
}

// ── 검색어 트렌드: 실업급여 = 100 눈금, 반올림 둘째 자리, 값 있는 날 수 ─────────────
export async function measureFine(keywords, { delayMs = 250, onBatch } = {}) {
  const end = kstDate(new Date(Date.now() - 864e5)); // 어제(KST)까지
  const axis = dateAxis(end, 90);
  const list = [...new Set(keywords.map((k) => String(k || '').trim()).filter((k) => k && k !== ANCHOR))];
  const out = new Map();
  for (let i = 0; i < list.length; i += 4) {
    const group = list.slice(i, i + 4);
    try {
      const j = await naverTrend({ startDate: axis[0], endDate: axis[axis.length - 1], timeUnit: 'date', groups: [ANCHOR, ...group] });
      const by = new Map((j.results || []).map((r) => [r.title, { s: alignToAxis(r.data, axis), points: (r.data || []).length }]));
      const ancMean = mean((by.get(ANCHOR)?.s || []).slice(-30));
      const f = ancMean > 0 ? 100 / ancMean : 0;
      for (const k of group) {
        const o = by.get(k) || { s: axis.map(() => 0), points: 0 };
        const s30 = o.s.slice(-30);
        const r7 = mean(o.s.slice(-7)) * f;
        const p7 = mean(o.s.slice(-14, -7)) * f;
        out.set(k, { rel30: round2(mean(s30) * f), activeDays30: s30.filter((v) => v > 0).length, points90: o.points, ratio7: p7 > 0 ? round2(r7 / p7) : null });
      }
    } catch (e) {
      if (e instanceof NaverAuthError) throw e;
      for (const k of group) out.set(k, { error: String(e.message || e).slice(0, 80) });
    }
    onBatch?.(Math.min(i + 4, list.length), list.length);
    await sleep(delayMs);
  }
  return out;
}

// ── 후보: 블로그·웹문서 제목에서 앞말 바로 뒤에 붙는 말 ─────────────────────────
async function titlesOf(ep, q) {
  const j = await naverSearch(ep, q, ep === 'blog' ? { display: 100, sort: 'sim' } : { display: 100 });
  return (j.items || []).map((x) => stripTags(x.title));
}

export function mineTails(head, lists, { min = MIN_TAIL_FREQ } = {}) {
  const count = new Map();
  for (const list of lists) for (const t of list) for (const s of new Set(suffixesOf(head, t))) count.set(s, (count.get(s) || 0) + 1);
  return [...count.entries()].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([suffix, n]) => ({ suffix, n }));
}

// 꼬리가 앞말의 낱말을 되풀이하면 뺀다("청년미래적금 가입 가입")
const repeats = (base, tail) => { const b = new Set(base.split(/\s+/)); return tail.split(/\s+/).some((t) => b.has(t)); };

export function headList({ only = null } = {}) {
  if (only?.length) return only.map((h) => h.trim()).filter(Boolean);
  const set = new Map();
  for (const h of headsOf(readJson(BIG, { axes: [] }))) set.set(normKeyword(h.head), h.head);
  for (const w of readJson(WAVE, { items: [] }).items || []) if (w.stage !== 'fading') set.set(normKeyword(w.term), set.get(normKeyword(w.term)) || w.term);
  return [...set.values()].filter((h) => !isSisterTopic(h));
}

// 헤드 → cluster. 그 헤드가 제목·targetQuery·keywords 에 든 우리 글에서 가장 많은 cluster(wave-split scanArticles 와 같은 셈),
// 그런 글이 없으면 big-keywords 축의 첫 cluster, 그다음 next-wave 항목의 cluster.
export function clusterMap(heads = headList()) {
  const metas = [];
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const m = parseArticleMeta(readFileSync(path.join(ARTICLES, f), 'utf8'));
    if (m?.cluster) metas.push({ cluster: m.cluster, hay: normKeyword([m.title, m.targetQuery, ...(m.keywords || [])].join(' ')) });
  }
  const axis = new Map();
  for (const h of headsOf(readJson(BIG, { axes: [] }))) if (h.cluster) axis.set(normKeyword(h.head), h.cluster);
  for (const w of readJson(WAVE, { items: [] }).items || []) if (w.cluster && !axis.has(normKeyword(w.term))) axis.set(normKeyword(w.term), w.cluster);
  const out = new Map();
  for (const h of heads) {
    const k = normKeyword(h);
    const count = new Map();
    for (const m of metas) if (m.hay.includes(k)) count.set(m.cluster, (count.get(m.cluster) ?? 0) + 1);
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? axis.get(k) ?? null;
    if (top) out.set(k, top);
  }
  return out;
}

function usedTargets() {
  const used = new Set();
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const m = parseArticleMeta(readFileSync(path.join(ARTICLES, f), 'utf8'));
    if (m?.targetQuery) used.add(normKeyword(m.targetQuery));
  }
  return used;
}

// 우리 글 targetQuery(2낱말 이상) 중 이 검색어를 품거나 이 검색어에 품기는 글 ("ISA 계좌 단점" ↔ "ISA 계좌 장단점").
// 있으면 새 글 대신 그 글 갱신 후보로 돌린다.
export function targetIndex(dir = ARTICLES) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue;
    const m = parseArticleMeta(readFileSync(path.join(dir, f), 'utf8'));
    if (m?.targetQuery && toks(m.targetQuery).length >= 2) out.push({ query: m.targetQuery, slug: f.replace(/\.mdx$/, ''), cluster: m.cluster ?? null });
  }
  return out;
}
export const coveredBy = (query, index) => index.find((t) => covers(t.query, query) || covers(query, t.query)) ?? null;

const serpOf = (sc) => ({
  rank: sc.rank ?? null, openSlots: sc.openSlots, wallTop5: sc.wallTop5, mainGovAbove: sc.mainGovAbove, publicAbove: sc.publicAbove,
  toolAbove: sc.toolAbove, fincoAbove: sc.fincoAbove, naverAbove: sc.naverAbove, newsWall: sc.newsWall, eyeOffset: null,
  webDocCount: sc.webDocCount ?? null, verdictT1: sc.verdictT1, verdictT2: sc.verdictT2, warn: sc.warn || [],
  top10: (sc.above || []).slice(0, 10).map((a) => `${a.stale ? 'stale-' : ''}${a.kind}:${a.host}`),
});

// ── 본체 ─────────────────────────────────────────────────────────────────
export async function findLongtails({ heads, maxBases = MAX_BASES, minActive = MIN_ACTIVE, log = () => {} }) {
  const calls = { search: 0, trend: 0 };
  const queue = readJson(QUEUE, { items: [] });
  const known = new Set((queue.items || []).flatMap(queriesOf));
  const used = usedTargets();
  const tindex = targetIndex();
  const entries = buildLedger();
  const dropped = { chatty: 0, sister: 0, used: 0, queued: 0 };
  const seen = new Set();
  const keep = (q) => {
    const k = normKeyword(q);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    if (isChattyQuery(q)) { dropped.chatty++; return false; }
    if (isSisterTopic(q)) { dropped.sister++; return false; }
    if (used.has(k)) { dropped.used++; return false; }
    if (known.has(k)) { dropped.queued++; return false; }
    return true;
  };

  // 1·2) 헤드 → 2단어(+제목에서 바로 나온 3단어) 후보
  const level1 = [];
  for (const [i, head] of heads.entries()) {
    let blog = [], web = [];
    try { blog = await titlesOf('blog', head); web = await titlesOf('webkr', head); } catch (e) { if (e instanceof NaverAuthError) throw e; log(`  제목 수집 실패 ${head}: ${e.message}`); }
    calls.search += 2;
    const mined = mineTails(head, [blog, web]).slice(0, 15).map((r) => r.suffix);
    for (const tail of [...mined, ...TAILS1]) {
      if (repeats(head, tail)) continue;
      const q = `${head} ${tail}`;
      if (keep(q)) level1.push({ query: q, head, base: head, level: 1 });
    }
    if ((i + 1) % 10 === 0) log(`  헤드 ${i + 1}/${heads.length} · 후보 ${level1.length}`);
    await sleep(120);
  }

  // 3) 검색량
  log(`검색어 트렌드 1차: 후보 ${level1.length}개`);
  const vol1 = await measureFine(level1.map((c) => c.query), { onBatch: (d, n) => { if (d % 200 === 0 || d === n) log(`  트렌드 ${d}/${n}`); } });
  calls.trend += Math.ceil(level1.length / 4);
  for (const c of level1) c.demand = vol1.get(c.query) || {};
  const alive1 = level1.filter((c) => (c.demand.activeDays30 ?? 0) >= minActive);

  // 4) 3단어로 늘리기
  const bases = alive1.filter((c) => wordsOf(c.query) === 2).sort((a, b) => (b.demand.rel30 ?? 0) - (a.demand.rel30 ?? 0)).slice(0, maxBases);
  const level2 = [];
  for (const b of bases) {
    let blog = [], web = [];
    try { blog = await titlesOf('blog', b.query); web = await titlesOf('webkr', b.query); } catch (e) { if (e instanceof NaverAuthError) throw e; }
    calls.search += 2;
    const mined = mineTails(b.query, [blog, web]).slice(0, 10).map((r) => r.suffix.split(' ')[0]);
    for (const tail of [...new Set([...mined, ...TAILS2])]) {
      if (repeats(b.query, tail)) continue;
      const q = `${b.query} ${tail}`;
      if (keep(q)) level2.push({ query: q, head: b.head, base: b.query, level: 2 });
    }
    await sleep(120);
  }
  log(`검색어 트렌드 2차: 3단어 후보 ${level2.length}개 (베이스 ${bases.length}개)`);
  const vol2 = await measureFine(level2.map((c) => c.query), { onBatch: (d, n) => { if (d % 200 === 0 || d === n) log(`  트렌드 ${d}/${n}`); } });
  calls.trend += Math.ceil(level2.length / 4);
  for (const c of level2) c.demand = vol2.get(c.query) || {};
  const byVol = (a, b) => (b.demand.rel30 ?? 0) - (a.demand.rel30 ?? 0);
  const two = alive1.filter((c) => wordsOf(c.query) < 3).sort(byVol);
  const alive = [...alive1.filter((c) => wordsOf(c.query) >= 3), ...level2.filter((c) => (c.demand.activeDays30 ?? 0) >= minActive), ...two.slice(0, MAX_SCOUT2)];
  const skippedTwo = Math.max(0, two.length - MAX_SCOUT2);

  // 5) 정찰 · 6) 비율
  const sample = latestSample();
  const rates = siteRates(sample);
  log(`정찰: ${alive.length}개 (표본 ${sample?.file ?? '없음'})`);
  const rows = [];
  for (const [i, c] of alive.entries()) {
    const sc = await scoutQuery(c.query);
    calls.search += 2;
    if (sc.error) { rows.push({ ...c, status: 'error', error: sc.error }); continue; }
    const serp = serpOf(sc);
    const open = sc.verdictT2 === 'open';
    const words = wordsOf(c.query);
    const cellKey = cellOf(words, open);
    const bandKey = bandOf(serp.webDocCount);
    const cell = rates.cell.get(cellKey) || { n: 0, top10: 0 };
    const band = rates.band.get(bandKey) || { n: 0, top10: 0 };
    const family = classifyFamily(c.query).family;
    const lg = checkCandidate(entries, { query: c.query, family });
    const sis = sisterTopOf(serp.top10);
    let status = 'new';
    if (isNavigational(c.query)) status = 'nav';
    else if (serp.rank != null && serp.rank <= 3) status = 'top3';
    else if (serp.rank != null && serp.rank <= 30) status = 'refresh';
    else if (coveredBy(c.query, tindex)) status = 'covered';
    else if (lg.verdict === 'VETO') status = 'veto';
    else if (sis) status = 'sister';
    else if (isCommercialLoan(c.query)) status = 'loan';
    rows.push({
      query: c.query, head: c.head, base: c.base, level: c.level, words, family, status,
      demand: c.demand, serp, open,
      site: { cell: cellKey, cellN: cell.n, cellTop10: cell.top10, cellRate: pct(cell), band: bandKey, bandN: band.n, bandTop10: band.top10, bandRate: pct(band) },
      ledger: { verdict: lg.verdict, program: lg.program, adjacent: (lg.adjacent || []).length, relatedSlugs: (lg.matches || []).slice(0, 5).map((x) => x.slug) },
      ...(sis ? { sisterTop: sis } : {}),
      ...(serp.rank ? { ourUrl: sc.ourUrl } : {}),
      ...(status === 'covered' ? { coveredBy: coveredBy(c.query, tindex) } : {}),
    });
    if ((i + 1) % 50 === 0) log(`  정찰 ${i + 1}/${alive.length}`);
    await sleep(150);
  }
  const order = (a, b) => (b.site.cellRate ?? 0) - (a.site.cellRate ?? 0) || (b.demand.rel30 ?? 0) - (a.demand.rel30 ?? 0);
  rows.sort(order);
  return { heads: heads.length, level1: level1.length, level2: level2.length, alive: alive.length, skippedTwo, dropped, calls, sample: sample?.file ?? null, rates, rows };
}

// ── 대기열에 넣기 (3단어 이상 새 글 후보만) ───────────────────────────────────
// 한 글이 될 검색어 묶기: 같은 헤드에서 한쪽 낱말이 모두 다른 쪽 낱말 안에 들어 있으면("발급" ⊂ "발급방법", "인터넷 발급")
// 앞(순위가 높은) 항목의 altQueries 로 넣는다. 발급 경로 낱말(홈택스·인터넷·온라인·모바일·정부24·앱)은 빼고 견준다
// ("원천징수영수증 홈택스" 와 "원천징수영수증 발급" 은 같은 글). rows 는 이미 줄 세운 순서라고 본다.
const CHANNEL = new Set(['홈택스', '인터넷', '온라인', '모바일', '정부24', '앱']);
const toks = (q) => q.split(/\s+/).filter((t) => t && !CHANNEL.has(t));
const covers = (a, b) => { const tb = toks(b); return toks(a).every((t) => tb.some((x) => x.includes(t))); };
export function foldLongtails(rows) {
  const kept = [];
  for (const r of rows) {
    const host = kept.find((k) => k.head === r.head && (covers(k.query, r.query) || covers(r.query, k.query)));
    if (host) host.altQueries.push(r.query); else kept.push({ ...r, altQueries: [] });
  }
  return kept;
}

export function toQueueItem(r, today, { cluster = null } = {}) {
  const demand = { rel30: r.demand.rel30 ?? 0, ratio7: r.demand.ratio7 ?? null, activeDays30: r.demand.activeDays30 ?? 0 };
  const ex = exposureOf({ track: 'T2', query: r.query, serp: r.serp, demand, ledger: { adjacent: r.ledger.adjacent } });
  const why = `${r.site.cell} 우리 글 ${r.site.cellN}편 중 ${r.site.cellTop10}편 10위 안(${r.site.cellRate}%)`;
  return {
    id: `빈틈:${r.query}`, query: r.query, altQueries: r.altQueries || [], track: 'T2', family: r.family, cluster, status: 'proposed',
    autoPick: autoPickOf({ score: ex.score, track: 'T2', query: r.query, unverified: false, ledgerVerdict: r.ledger.verdict, demand }),
    manual: true, addedBy: 'naver-longtail', addedAt: today,
    score: ex.score, label: ex.label, reasons: [why, ...ex.reasons].slice(0, 6),
    condition: `${conditionOf({ query: r.query, program: r.ledger.program, sameProgram: 0, serp: r.serp, demand })}. 롱키워드 항목(앞말 "${r.base}")`,
    measuredAt: today, demand, serp: r.serp, ledger: { verdict: r.ledger.verdict, relatedSlugs: r.ledger.relatedSlugs },
    longtail: { words: r.words, site: r.site },
  };
}

export function renderReport(res, { today, added = [] }) {
  const L = [];
  const fmtN = (n) => (n == null ? '?' : n >= 10000 ? `${Math.round(n / 10000)}만` : String(n));
  L.push(`# 롱키워드 목록 (${today})`);
  L.push('');
  L.push('`node scripts/audit/naver-longtail.mjs --write` 가 만든다. 네이버 공식 API(블로그·웹문서 검색, 검색어 트렌드)만 쓴다. 지식iN 은 쓰지 않는다(2026-10-16 운영자 지시).');
  L.push('');
  L.push(`- 헤드 ${res.heads}개 → 후보 ${res.level1 + res.level2}개(2단어 ${res.level1} · 3단어 ${res.level2}) → 최근 30일 중 ${MIN_ACTIVE}일 이상 검색된 말 ${res.alive}개 → 정찰 ${res.rows.length}개`);
  L.push(`- 줄 세우는 기준: 같은 조건(낱말 수 × 자리 열림) 우리 글의 웹문서 10위 안 비율(${res.sample}), 같은 비율 안에서는 검색량 순. 비율은 지난 실측이다. 전망이 아니다.`);
  if (res.skippedTwo) L.push(`- 2단어 후보 중 검색량 하위 ${res.skippedTwo}개는 정찰하지 않았다(2단어·열림 10위 안 비율이 낮아 상한 ${MAX_SCOUT2}개만).`);
  L.push('- 검색량은 실업급여 최근 30일 평균 = 100 눈금(검색어 트렌드). 값 있는 날 = 최근 30일 중 데이터가 있는 날 수.');
  L.push('');
  L.push('| 조건 | 우리 글 | 10위 안 | 비율 |');
  L.push('|---|---|---|---|');
  for (const [k, o] of [...res.rates.cell.entries()].sort((a, b) => pct(b[1]) - pct(a[1]))) L.push(`| ${k} | ${o.n} | ${o.top10} | ${pct(o)}% |`);
  L.push('');
  const sect = (title, rows) => {
    L.push(`## ${title} (${rows.length})`);
    L.push('');
    if (!rows.length) { L.push('없음'); L.push(''); return; }
    L.push('| # | 검색어 | 같은 조건 10위 안 | 결과 수 | 상위 5 관공서 | 검색량 | 값 있는 날 | 우리 순위 |');
    L.push('|---|---|---|---|---|---|---|---|');
    rows.forEach((r, i) => L.push(`| ${i + 1} | ${r.query} | ${r.site.cell} ${r.site.cellRate}% | ${fmtN(r.serp.webDocCount)} | ${r.serp.wallTop5 ?? '?'} | ${r.demand.rel30} | ${r.demand.activeDays30}/30 | ${r.serp.rank ?? '30위 밖'} |`));
    L.push('');
  };
  sect('새 글 후보 · 3단어 이상', res.rows.filter((r) => r.status === 'new' && r.words >= 3));
  sect('새 글 후보 · 2단어', res.rows.filter((r) => r.status === 'new' && r.words < 3));
  sect('우리 글이 4~30위 · 기존 글 갱신', res.rows.filter((r) => r.status === 'refresh'));
  sect('이미 쓴 글의 검색어와 겹침 · 기존 글 갱신', res.rows.filter((r) => r.status === 'covered'));
  sect('같은 세부 주제 글이 이미 있음 · 기존 글 갱신(잠금 장부)', res.rows.filter((r) => r.status === 'veto'));
  sect('이미 3위 안', res.rows.filter((r) => r.status === 'top3'));
  sect('운영자 지정 · 민간 대출', res.rows.filter((r) => r.status === 'loan'));
  sect('찾아가기 검색어 · 같은 종류 우리 글이 표본에 없어 비율 근거 없음(운영자 지정)', res.rows.filter((r) => r.status === 'nav'));
  sect('자매 사이트가 상위 3위 안', res.rows.filter((r) => r.status === 'sister'));
  if (added.length) { L.push(`대기열에 넣음 ${added.length}건: ${added.map((x) => x.query).join(' · ')}`); L.push(''); }
  L.push(`호출: 검색 ${res.calls.search}회 · 트렌드 ${res.calls.trend}회. 뺀 후보: 질문 말투 ${res.dropped.chatty} · 자매 주제 ${res.dropped.sister} · 이미 쓴 검색어 ${res.dropped.used} · 이미 대기열 ${res.dropped.queued}`);
  return L.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const WRITE = args.includes('--write');
  const only = opt('--heads') ? opt('--heads').split(',') : null;
  const maxBases = Number(opt('--max-bases') || MAX_BASES) || MAX_BASES;
  const minActive = Number(opt('--min-active') || MIN_ACTIVE) || MIN_ACTIVE;
  const addN = Number(opt('--add') || 20) || 20;
  const today = kstDate();
  const heads = headList({ only });
  console.log(`[longtail] 헤드 ${heads.length}개 · 3단어 베이스 상한 ${maxBases} · 값 있는 날 ${minActive}일 이상${WRITE ? '' : ' · 드라이런'}`);
  const res = await findLongtails({ heads, maxBases, minActive, log: (m) => console.log(m) });
  const added = [];
  if (WRITE) {
    const queue = readJson(QUEUE, null);
    if (!queue) throw new Error('docs/ops/pipeline-queue.json 을 읽지 못했다');
    // 3단어 이상·열림 새 글 후보 중 대기열 점수 문턱(45) 이상만 넣는다(문턱 아래는 다음 날 파이프라인 재측정에서 보류로 돌아간다)
    const clusters = clusterMap(heads);
    // 한 글이 될 검색어는 묶어서 한 항목으로(앞 항목의 altQueries)
    for (const r of foldLongtails(res.rows.filter((x) => x.status === 'new' && x.words >= 3 && x.open))) {
      if (added.length >= addN) break;
      const item = toQueueItem(r, today, { cluster: clusters.get(normKeyword(r.head)) ?? null });
      if (item.score < QUEUE_MIN_SCORE) continue;
      if (!item.cluster) item.condition += '. cluster 미정, 운영자 지정 필요';
      queue.items.push(item);
      added.push(item);
    }
    if (added.length) writeFileSync(QUEUE, JSON.stringify(queue, null, 1) + '\n');
    const out = path.join(OPS, `longtail-${today}.json`);
    const { rates, ...rest } = res;
    writeFileSync(out, JSON.stringify({ note: '네이버 공식 API 실측(블로그·웹문서 검색, 검색어 트렌드). 지식iN 미사용. site = 같은 조건 우리 글의 웹문서 10위 안 실측 비율.', measuredAt: new Date().toISOString(), ...rest, rates: { cell: Object.fromEntries(rates.cell), band: Object.fromEntries(rates.band) } }, null, 1) + '\n');
    writeFileSync(REPORT, renderReport(res, { today, added }));
    console.log(`[longtail] 씀: ${path.relative(ROOT, out)} · ${path.relative(ROOT, REPORT)} · 대기열 +${added.length}`);
  }
  const fresh = res.rows.filter((r) => r.status === 'new' && r.words >= 3);
  console.log(`[longtail] 정찰 ${res.rows.length} · 3단어 이상 새 글 후보 ${fresh.length} · 호출 검색 ${res.calls.search} · 트렌드 ${res.calls.trend}`);
  for (const r of fresh.slice(0, 30)) console.log(`  ${r.site.cellRate}% ${r.query} | 결과 ${r.serp.webDocCount} | 관공서 ${r.serp.wallTop5} | 검색량 ${r.demand.rel30} (${r.demand.activeDays30}/30일)`);
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e instanceof NaverAuthError ? '네이버 API 인증 실패: ' : ''}${e.message}`); process.exit(1); });
}
