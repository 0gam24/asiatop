#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// site-rank-sample.mjs — 사이트 전체 네이버 웹문서 순위 표본 (공식 검색 API, LLM 0)
//
// 계획: docs/28 §1-5·§3-2. 글마다 대표 검색어(frontmatter targetQuery, 없으면 keywords 첫 항목) 하나를
// 웹문서 검색 API 30위까지 재서, 사이트 전체에서 10위·30위 안에 드는 글 수와 그 검색어의 조건(결과 수·열림 판정·상위 5 벽)을 남긴다.
//   · 매주 같은 방법으로 재므로 사이트 단위로 오르내림이 보인다(빈틈 글 결과표는 targetQuery 글만 본다).
//   · 빈틈 점수(naver-pipeline.mjs exposureOf) 가중치를 이 표본으로 맞춘다(v0.2, 2026-10-07).
//   · 4~30위 글은 docs/ops/naver-striking.md 로 내보낸다. /topics 의 리프레시 후보 입력이다(구글 GSC 와 별개).
// 열림 판정은 우리 순위를 빼고 다시 낸다(우리 글이 1~3위면 scout 가 "갱신 대상"으로 닫기 때문).
// 웹문서 API 순위는 통합검색 첫 화면 순위와 다르다(docs/26 §2). 애드센스 수치는 없다.
//
// 검색량(2026-10-08 추가): 30위 안에 든 글의 검색어를 검색어 트렌드(naver-volume.mjs, 실업급여 30일 평균 = 100)로 재서 rel30 을 붙인다.
//   순위만으로는 그 자리에 사람이 오는지 모른다(docs/28 1-2). 4~30위 중 검색량이 잡히는 글을 리프레시 먼저 보게 표 맨 위에 따로 뺀다.
//   데이터랩은 작은 검색어를 0 으로 준다. 0 은 "검색 없음"이 아니라 "이 눈금으로 안 잡힘"이다.
//   --volume-only  순위는 다시 재지 않고 가장 최근 표본에 검색량만 붙여 다시 쓴다(트렌드 호출만, --write 와 함께)
// 실행: node scripts/audit/site-rank-sample.mjs [--write] [--limit N] [--volume-only]
//   --write 없으면 콘솔 요약만. 있으면 docs/revenue-log/site-rank-sample-YYYY-MM-DD.json · docs/ops/naver-striking.md
// 예산: 글 수만큼 webkr 호출(약 700). 검색 API 무료 일 25,000.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { scoutMany } from './naver-scout.mjs';
import { parseArticleMeta } from './naver-ledger.mjs';
import { verdicts } from './lib/naver-hosts.mjs';
import { measureVolume } from './naver-volume.mjs';

const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const STRIKING = path.join(ROOT, 'docs', 'ops', 'naver-striking.md');
const PREFIX = 'site-rank-sample-';

export function articleQueries(dir = ARTICLES) {
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx')).sort()) {
    const meta = parseArticleMeta(readFileSync(path.join(dir, f), 'utf8'));
    if (!meta) continue;
    const q = String(meta.targetQuery || meta.keywords[0] || '').trim();
    if (q) out.push({ slug: f.replace(/\.mdx$/, ''), cluster: meta.cluster || null, publishedAt: String(meta.publishedAt || '').slice(0, 10), query: q, from: meta.targetQuery ? 'targetQuery' : 'keywords[0]' });
  }
  return out;
}

export const docBand = (n) => (n == null ? '?' : n < 30000 ? '<3만' : n < 100000 ? '3만~10만' : n < 1000000 ? '10만~100만' : '100만+');
const BANDS = ['<3만', '3만~10만', '10만~100만', '100만+'];

export function summarize(rows) {
  const ok = rows.filter((r) => !r.error);
  const t10 = (r) => r.rank != null && r.rank <= 10;
  const t30 = (r) => r.rank != null;
  const cell = (xs) => ({ n: xs.length, top10: xs.filter(t10).length, top30: xs.filter(t30).length });
  return {
    ...cell(ok), errors: rows.length - ok.length,
    byBand: Object.fromEntries(BANDS.map((b) => [b, cell(ok.filter((r) => docBand(r.webDocCount) === b))])),
    byOpen: { open: cell(ok.filter((r) => r.open)), closed: cell(ok.filter((r) => !r.open)) },
    byCluster: Object.fromEntries([...new Set(ok.map((r) => r.cluster || '?'))].sort().map((c) => [c, cell(ok.filter((r) => (r.cluster || '?') === c))])),
  };
}

function latestSample(before) {
  if (!existsSync(LOG_DIR)) return null;
  const files = readdirSync(LOG_DIR).filter((f) => f.startsWith(PREFIX) && f.endsWith('.json') && f.slice(PREFIX.length, -5) < before).sort();
  if (!files.length) return null;
  try { return JSON.parse(readFileSync(path.join(LOG_DIR, files[files.length - 1]), 'utf8')); } catch { return null; }
}

export function diffSamples(prev, rows) {
  if (!prev?.rows) return null;
  const old = new Map(prev.rows.map((r) => [r.slug, r]));
  const out = { prevDate: prev.measuredAt, in10: [], out10: [] };
  for (const r of rows) {
    const p = old.get(r.slug);
    if (!p || p.query !== r.query || r.error || p.error) continue;
    const was = p.rank != null && p.rank <= 10; const now = r.rank != null && r.rank <= 10;
    if (!was && now) out.in10.push({ slug: r.slug, query: r.query, from: p.rank, to: r.rank });
    if (was && !now) out.out10.push({ slug: r.slug, query: r.query, from: p.rank, to: r.rank });
  }
  return out;
}

export const VOLUME_MIN = 0.5;

export function renderStriking({ rows, today, diff, volumeAt = null }) {
  const L = [`# 네이버 웹문서 4~30위 글 (${today})`, '',
    '`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.', '',
    '- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.',
    '- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).', ''];
  const rank = (r) => (r == null ? '밖' : String(r));
  if (diff) {
    L.push(`## 지난 표본(${diff.prevDate}) 대비 10위 안 들고 남`, '');
    if (!diff.in10.length && !diff.out10.length) L.push('- 변화 없음', '');
    for (const x of diff.out10) L.push(`- 빠짐: ${x.query} ${rank(x.from)} → ${rank(x.to)} (${x.slug})`);
    for (const x of diff.in10) L.push(`- 들어옴: ${x.query} ${rank(x.from)} → ${rank(x.to)} (${x.slug})`);
    if (diff.in10.length || diff.out10.length) L.push('');
  }
  const pick = rows.filter((r) => !r.error && r.rank != null && r.rank >= 4).sort((a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug));
  const hasVol = pick.some((r) => r.rel30 != null);
  const vol = (r) => (r.rel30 == null ? '' : String(r.rel30));
  if (hasVol) {
    const withVol = pick.filter((r) => (r.rel30 ?? 0) >= VOLUME_MIN).sort((a, b) => b.rel30 - a.rel30 || a.rank - b.rank);
    L.push(`## 4~30위 중 검색량이 잡히는 글 ${withVol.length}편 (리프레시 먼저)`, '',
      `- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(${VOLUME_MIN} 이상만, 측정 ${volumeAt || today}). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.`, '',
      '| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |', '|---|---|---|---|---|---|');
    for (const r of withVol) L.push(`| ${r.rel30} | ${r.rank} | ${r.query} | ${docBand(r.webDocCount)} | ${r.publishedAt || ''} | ${r.slug} |`);
    L.push('');
  }
  L.push(`## 4~30위 ${pick.length}편`, '', hasVol ? '| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |' : '| 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |', hasVol ? '|---|---|---|---|---|---|' : '|---|---|---|---|---|');
  for (const r of pick) L.push(hasVol
    ? `| ${r.rank} | ${r.query} | ${docBand(r.webDocCount)} | ${vol(r)} | ${r.publishedAt || ''} | ${r.slug} |`
    : `| ${r.rank} | ${r.query} | ${docBand(r.webDocCount)} | ${r.publishedAt || ''} | ${r.slug} |`);
  return L.join('\n') + '\n';
}

// 30위 안 글의 검색어에 rel30(검색어 트렌드, 실업급여 = 100)을 붙인다. 측정 실패한 검색어는 rel30 을 비운다.
export async function attachVolume(rows) {
  const qs = [...new Set(rows.filter((r) => !r.error && r.rank != null).map((r) => r.query))];
  if (!qs.length) return { measured: 0, calls: 0, window: null };
  const res = await measureVolume(qs);
  const by = new Map(res.rows.filter((x) => x.measured && !x.anchor).map((x) => [x.keyword, x]));
  for (const r of rows) {
    const v = by.get(r.query);
    if (v) { r.rel30 = v.rel30 ?? 0; r.ratio7 = v.ratio7 ?? null; }
  }
  return { measured: by.size, calls: Math.ceil(qs.length / 4), window: res.window };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const write = args.includes('--write');
  const limit = Number(opt('--limit') || Infinity);
  const today = kstDate();
  if (args.includes('--volume-only')) {
    const prev = latestSample('9999-12-31');
    if (!prev?.rows) { console.error('❌ 이전 표본이 없다. 먼저 순위를 재라'); process.exit(1); }
    const v = await attachVolume(prev.rows);
    console.log(`검색량: 30위 안 검색어 ${v.measured}개 (트렌드 ${v.calls}회, ${v.window?.start}~${v.window?.end}) · 순위 표본 ${prev.measuredAt}`);
    if (!write) return;
    prev.volumeMeasuredAt = today;
    writeFileSync(path.join(LOG_DIR, `${PREFIX}${prev.measuredAt}.json`), JSON.stringify(prev, null, 1) + '\n');
    writeFileSync(STRIKING, renderStriking({ rows: prev.rows, today: prev.measuredAt, volumeAt: today, diff: diffSamples(latestSample(prev.measuredAt), prev.rows) }));
    console.log(`→ docs/revenue-log/${PREFIX}${prev.measuredAt}.json · docs/ops/naver-striking.md (검색량 ${today})`);
    return;
  }
  const targets = articleQueries().slice(0, limit);
  const byQuery = new Map();
  for (const t of targets) if (!byQuery.has(t.query)) byQuery.set(t.query, null);
  const scouted = await scoutMany([...byQuery.keys()], { news: false, delayMs: 110, onProgress: () => {} });
  for (const s of scouted) byQuery.set(s.query, s);
  const rows = targets.map((t) => {
    const s = byQuery.get(t.query);
    if (!s || s.error) return { ...t, error: s?.error || '측정 없음' };
    const v = verdicts({ ...s, rank: null }, {});
    return { slug: t.slug, cluster: t.cluster, publishedAt: t.publishedAt, query: t.query, from: t.from, rank: s.rank ?? null, ourUrl: s.ourUrl, webDocCount: s.webDocCount, open: v.verdictT2 === 'open', wallTop5: s.wallTop5, rel30: null };
  });
  const vinfo = await attachVolume(rows);
  console.log(`검색량: 30위 안 검색어 ${vinfo.measured}개 (트렌드 ${vinfo.calls}회)`);
  const summary = summarize(rows);
  const diff = diffSamples(latestSample(today), rows);
  const pct = (c) => (c.n ? `${((100 * c.top10) / c.n).toFixed(1)}%` : '-');
  console.log(`사이트 순위 표본 ${today}: 글 ${summary.n}편 · 10위 안 ${summary.top10} (${pct(summary)}) · 30위 안 ${summary.top30} · 측정 실패 ${summary.errors}`);
  for (const b of BANDS) console.log(`  웹문서 ${b}: ${summary.byBand[b].n}편 · 10위 안 ${summary.byBand[b].top10} (${pct(summary.byBand[b])})`);
  console.log(`  열림 ${summary.byOpen.open.n}편 10위 안 ${pct(summary.byOpen.open)} · 닫힘 ${summary.byOpen.closed.n}편 10위 안 ${pct(summary.byOpen.closed)}`);
  if (diff) console.log(`  지난 표본(${diff.prevDate}) 대비 10위 안 들어옴 ${diff.in10.length} · 빠짐 ${diff.out10.length}`);
  if (!write) return;
  const out = {
    note: '글마다 대표 검색어 1개의 네이버 공식 웹문서 검색 API 순위(30위까지, null = 밖). open = 우리 순위를 뺀 열림 판정(T2). rel30 = 30위 안 글만 잰 검색어 트렌드 최근 30일(실업급여 = 100, 0 은 안 잡힘). 통합검색 첫 화면과 다르다. docs/28 §1-5.',
    measuredAt: today, summary, rows,
  };
  writeFileSync(path.join(LOG_DIR, `${PREFIX}${today}.json`), JSON.stringify(out, null, 1) + '\n');
  writeFileSync(STRIKING, renderStriking({ rows, today, diff, volumeAt: today }));
  console.log(`→ docs/revenue-log/${PREFIX}${today}.json · docs/ops/naver-striking.md`);
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e instanceof NaverAuthError ? '네이버 API 인증 실패' : e.message}`); process.exit(1); });
}
