#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// gap-outcomes.mjs — 빈틈 글 결과표: 고를 때의 측정값 ↔ 발행 뒤 네이버 웹문서 순위 (읽기 전용, API 호출 없음, LLM 0)
//
// docs/28-naver-gap-200-plan-2026-10.md 3-2 "대기열 항목의 점수 요소와 결과(순위)를 한 표로 묶는다".
// 고르는 규칙(3-3)은 이 표가 쌓인 뒤 측정 근거로만 고친다. 이 스크립트는 판정·추정을 하지 않고 값만 늘어놓는다.
//
// 입력: src/content/articles/*.mdx (targetQuery·publishedAt) · docs/ops/pipeline-queue.json (published 항목의 마지막 측정값)
//       docs/revenue-log/naver-rank-history.json (naver-rank-track.mjs, 공식 웹문서 검색 API 깊이 30, rank 0 = 30위 밖)
// 순위 칸: 발행 후 N일에 가장 가까운 측정(±2일 안). 측정이 없으면 빈칸.
// 실행: node scripts/audit/gap-outcomes.mjs [--write]   (--write 면 docs/ops/gap-outcomes.md 도 쓴다)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const QUEUE = path.join(ROOT, 'docs', 'ops', 'pipeline-queue.json');
const HISTORY = path.join(ROOT, 'docs', 'revenue-log', 'naver-rank-history.json');
const OUT = path.join(ROOT, 'docs', 'ops', 'gap-outcomes.md');
const DAYS = [3, 7, 14, 28];
const TOL = 2;
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fb; } };
const dayDiff = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

function posts() {
  const out = [];
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const head = readFileSync(path.join(ARTICLES, f), 'utf8').replace(/\r\n/g, '\n').split('\n---\n')[0];
    const g = (k) => head.match(new RegExp(`^${k}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'))?.[1]?.trim() ?? null;
    const q = g('targetQuery');
    if (q) out.push({ slug: f.replace(/\.mdx$/, ''), query: q, publishedAt: (g('publishedAt') || '').slice(0, 10), cluster: g('cluster') });
  }
  return out.sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : a.publishedAt > b.publishedAt ? 1 : a.query.localeCompare(b.query, 'ko')));
}

const fmtRank = (r) => (r == null ? '' : r === 0 ? '밖' : String(r));

export function rankAt(series, publishedAt, n, asOf = today) {
  // series: [{date, rank}] — 발행 후 n일에 가장 가까운 측정(±TOL). 아직 n일이 안 지났으면 빈칸
  if (dayDiff(publishedAt, asOf) < n) return null;
  let best = null;
  for (const s of series) {
    const d = dayDiff(publishedAt, s.date);
    const off = Math.abs(d - n);
    if (off <= TOL && (!best || off < best.off)) best = { off, rank: s.rank };
  }
  return best ? best.rank : null;
}

function main() {
  const hist = readJson(HISTORY, { rows: [] });
  const byKw = new Map();
  for (const r of hist.rows || []) {
    const k = norm(r.keyword);
    if (!byKw.has(k)) byKw.set(k, []);
    byKw.get(k).push({ date: String(r.date).slice(0, 10), rank: r.rank == null ? null : Number(r.rank) });
  }
  const queue = readJson(QUEUE, { items: [] });
  const qBy = new Map();
  for (const it of queue.items || []) for (const q of [it.query, ...(it.altQueries || [])]) qBy.set(norm(q), it);

  const rows = posts().map((p) => {
    const series = (byKw.get(norm(p.query)) || []).sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = series.at(-1) ?? null;
    const it = qBy.get(norm(p.query)) ?? null;
    return {
      ...p, age: p.publishedAt ? dayDiff(p.publishedAt, today) : null,
      score: it?.score ?? null, kin: it?.demand?.kinExact ?? null, rel30: it?.demand?.rel30 ?? null,
      slots: it?.serp?.openSlots ?? null, wall: it?.serp?.wallTop5 ?? null, news: it?.serp?.newsWall ?? null,
      at: Object.fromEntries(DAYS.map((n) => [n, rankAt(series, p.publishedAt, n)])),
      last, measured: series.length,
    };
  });

  const aged = rows.filter((r) => r.age != null && r.age >= 14 && r.last);
  const top10 = aged.filter((r) => r.last.rank > 0 && r.last.rank <= 10).length;
  const top30 = aged.filter((r) => r.last.rank > 0 && r.last.rank <= 30).length;
  const lines = [];
  lines.push(`# 빈틈 글 결과표 (${today})`, '');
  lines.push('`scripts/audit/gap-outcomes.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 3-2. 판정 없이 값만 늘어놓는다.', '');
  lines.push('- 순위는 네이버 공식 웹문서 검색 API(깊이 30) 기준이다. "밖" = 30위 밖. 통합검색 화면 순위와 다르다(docs/26 §2).');
  lines.push(`- 발행 3·7·14·28일 칸은 그날에 가장 가까운 측정(±${TOL}일)이다. 빈칸은 그 무렵 측정이 없었다는 뜻이다.`);
  lines.push('- 고를 때 값(점수·지식iN·검색량·빈자리·관공서·기사)은 대기열 항목의 마지막 측정값이다. 대기열에서 지워진 항목은 빈칸이다.', '');
  lines.push(`발행 14일 이상 지나고 순위 측정이 있는 글 ${aged.length}편: 마지막 측정 10위 안 ${top10}편 · 30위 안 ${top30}편`, '');
  lines.push('| 발행 | 검색어 | 점수 | 지식iN | 검색량 | 빈자리 | 관공서 | 기사 | 3일 | 7일 | 14일 | 28일 | 마지막 측정 | 글 |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const v = (x) => (x == null ? '' : String(x));
    lines.push(`| ${r.publishedAt} | ${r.query} | ${v(r.score)} | ${v(r.kin)} | ${v(r.rel30)} | ${v(r.slots)} | ${v(r.wall)} | ${v(r.news)} | ${DAYS.map((n) => fmtRank(r.at[n])).join(' | ')} | ${r.last ? `${fmtRank(r.last.rank)} (${r.last.date.slice(5)})` : ''} | ${r.slug} |`);
  }
  const md = lines.join('\n') + '\n';
  console.log(md);
  if (process.argv.includes('--write')) { writeFileSync(OUT, md); console.error(`저장: ${path.relative(ROOT, OUT)}`); }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) main();
