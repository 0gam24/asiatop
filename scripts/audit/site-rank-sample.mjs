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
// 실행: node scripts/audit/site-rank-sample.mjs [--write] [--limit N]
//   --write 없으면 콘솔 요약만. 있으면 docs/revenue-log/site-rank-sample-YYYY-MM-DD.json · docs/ops/naver-striking.md
// 예산: 글 수만큼 webkr 호출(약 700). 검색 API 무료 일 25,000.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { scoutMany } from './naver-scout.mjs';
import { parseArticleMeta } from './naver-ledger.mjs';
import { verdicts } from './lib/naver-hosts.mjs';

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

export function renderStriking({ rows, today, diff }) {
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
  L.push(`## 4~30위 ${pick.length}편`, '', '| 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |', '|---|---|---|---|---|');
  for (const r of pick) L.push(`| ${r.rank} | ${r.query} | ${docBand(r.webDocCount)} | ${r.publishedAt || ''} | ${r.slug} |`);
  return L.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const write = args.includes('--write');
  const limit = Number(opt('--limit') || Infinity);
  const today = kstDate();
  const targets = articleQueries().slice(0, limit);
  const byQuery = new Map();
  for (const t of targets) if (!byQuery.has(t.query)) byQuery.set(t.query, null);
  const scouted = await scoutMany([...byQuery.keys()], { news: false, delayMs: 110, onProgress: () => {} });
  for (const s of scouted) byQuery.set(s.query, s);
  const rows = targets.map((t) => {
    const s = byQuery.get(t.query);
    if (!s || s.error) return { ...t, error: s?.error || '측정 없음' };
    const v = verdicts({ ...s, rank: null }, {});
    return { slug: t.slug, cluster: t.cluster, publishedAt: t.publishedAt, query: t.query, from: t.from, rank: s.rank ?? null, ourUrl: s.ourUrl, webDocCount: s.webDocCount, open: v.verdictT2 === 'open', wallTop5: s.wallTop5 };
  });
  const summary = summarize(rows);
  const diff = diffSamples(latestSample(today), rows);
  const pct = (c) => (c.n ? `${((100 * c.top10) / c.n).toFixed(1)}%` : '-');
  console.log(`사이트 순위 표본 ${today}: 글 ${summary.n}편 · 10위 안 ${summary.top10} (${pct(summary)}) · 30위 안 ${summary.top30} · 측정 실패 ${summary.errors}`);
  for (const b of BANDS) console.log(`  웹문서 ${b}: ${summary.byBand[b].n}편 · 10위 안 ${summary.byBand[b].top10} (${pct(summary.byBand[b])})`);
  console.log(`  열림 ${summary.byOpen.open.n}편 10위 안 ${pct(summary.byOpen.open)} · 닫힘 ${summary.byOpen.closed.n}편 10위 안 ${pct(summary.byOpen.closed)}`);
  if (diff) console.log(`  지난 표본(${diff.prevDate}) 대비 10위 안 들어옴 ${diff.in10.length} · 빠짐 ${diff.out10.length}`);
  if (!write) return;
  const out = {
    note: '글마다 대표 검색어 1개의 네이버 공식 웹문서 검색 API 순위(30위까지, null = 밖). open = 우리 순위를 뺀 열림 판정(T2). 통합검색 첫 화면과 다르다. docs/28 §1-5.',
    measuredAt: today, summary, rows,
  };
  writeFileSync(path.join(LOG_DIR, `${PREFIX}${today}.json`), JSON.stringify(out, null, 1) + '\n');
  writeFileSync(STRIKING, renderStriking({ rows, today, diff }));
  console.log(`→ docs/revenue-log/${PREFIX}${today}.json · docs/ops/naver-striking.md`);
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e instanceof NaverAuthError ? '네이버 API 인증 실패' : e.message}`); process.exit(1); });
}
