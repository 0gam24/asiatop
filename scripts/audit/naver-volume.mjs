#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-volume.mjs — 네이버 검색량을 한 눈금으로 재기 (검색어 트렌드 API, LLM 0)
//
// 계획: docs/ops/KEYWORD-PLAN-2026-09-15.md §4-5.
// 트렌드 API 의 ratio 는 "그 호출 안에서 가장 큰 값 = 100" 이라 호출끼리 비교가 안 된다.
// 그래서 호출마다 기준어(실업급여)를 함께 넣고, 기준어 최근 30일 평균 = 100 으로 환산한다.
//   rel30 · recent7 · prev7  기준어 눈금 값 (실업급여 30일 평균 = 100)
//   ratio7                   recent7 / prev7 (≥1.5 = 상승)
//   firstSeenDaysAgo         90일 창에서 처음 0 이 아닌 날로부터 며칠 (API 가 0 인 날을 빼고 주므로 축에 맞춰 0 을 채운 뒤 센다)
//   born                     firstSeenDaysAgo ≤ 14 이고 그 뒤 활동일 ≥ 3 (awoo 의 "창 길이 = 신생일" 버그를 피한다)
//   sparse                   최근 30일 중 0 이 아닌 날 < 5 — 값이 작아 눈금이 거칠다. 0 이어도 "수요 없음"이 아니다.
// 검색량은 정렬용이다. 발행 게이트로 쓰지 않는다(계획 §2-3).
//
// 실행: node scripts/audit/naver-volume.mjs [--query "a,b"] [--file 파일] [--anchor 실업급여] [--out 파일] [--stdout]
//   기본 대상: docs/ops/big-keywords.json 의 축 키워드
// 출력: docs/ops/radar/volume-YYYY-MM-DD.json
// 예산: 키워드 4개 + 기준어 = 호출 1회. 트렌드 무료 월 30,000 호출.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { naverTrend, naverClient, sleep, kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';

export const WINDOW_DAYS = 90;
export const BORN_DAYS = 14;

// endDate(YYYY-MM-DD) 포함, 과거로 days 일
export function dateAxis(endDate, days) {
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(end - i * 864e5).toISOString().slice(0, 10));
  return out;
}

// API 는 값이 0 인 날짜를 생략한다. 축에 맞춰 빈 날을 0 으로 채운다.
export function alignToAxis(data, axis) {
  const m = new Map((data || []).map((d) => [d.period, Number(d.ratio) || 0]));
  return axis.map((d) => m.get(d) ?? 0);
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

export function summarizeSeries(series, anchorSeries) {
  const ancMean = mean(anchorSeries.slice(-30));
  const f = ancMean > 0 ? 100 / ancMean : null;
  const last30 = series.slice(-30);
  const recent7 = f == null ? null : mean(series.slice(-7)) * f;
  const prev7 = f == null ? null : mean(series.slice(-14, -7)) * f;
  const firstIdx = series.findIndex((v) => v > 0);
  const firstSeenDaysAgo = firstIdx < 0 ? null : series.length - firstIdx;
  const activeAfterFirst = firstIdx < 0 ? 0 : series.slice(firstIdx).filter((v) => v > 0).length;
  const activeDays30 = last30.filter((v) => v > 0).length;
  return {
    rel30: f == null ? null : round1(mean(last30) * f),
    recent7: round1(recent7),
    prev7: round1(prev7),
    ratio7: recent7 != null && prev7 > 0 ? Math.round((recent7 / prev7) * 100) / 100 : null,
    firstSeenDaysAgo,
    born: firstSeenDaysAgo != null && firstSeenDaysAgo <= BORN_DAYS && activeAfterFirst >= 3,
    sparse: activeDays30 < 5,
    activeDays30,
  };
}

export async function measureVolume(keywords, { anchor = '실업급여', endDate = null, days = WINDOW_DAYS, delayMs = 250, onBatch } = {}) {
  const end = endDate || kstDate(new Date(Date.now() - 864e5)); // 어제(KST)까지 — 오늘 값은 덜 찼다
  const axis = dateAxis(end, days);
  const list = [...new Set(keywords.map((k) => String(k || '').trim()).filter((k) => k && k !== anchor))];
  const rows = new Map();
  for (let i = 0; i < list.length; i += 4) {
    const group = list.slice(i, i + 4);
    try {
      const j = await naverTrend({ startDate: axis[0], endDate: axis[axis.length - 1], timeUnit: 'date', groups: [anchor, ...group] });
      const byTitle = new Map((j.results || []).map((r) => [r.title, alignToAxis(r.data, axis)]));
      const anc = byTitle.get(anchor) || axis.map(() => 0);
      for (const k of group) rows.set(k, { keyword: k, measured: byTitle.has(k), ...summarizeSeries(byTitle.get(k) || axis.map(() => 0), anc) });
      if (!rows.has(anchor)) rows.set(anchor, { keyword: anchor, measured: true, anchor: true, ...summarizeSeries(anc, anc) });
    } catch (e) {
      if (e instanceof NaverAuthError) throw e;
      for (const k of group) rows.set(k, { keyword: k, measured: false, error: String(e.message).slice(0, 80) });
    }
    onBatch?.(Math.min(i + 4, list.length), list.length);
    await sleep(delayMs);
  }
  return { measuredAt: new Date().toISOString(), api: naverClient().label, anchor, window: { start: axis[0], end: axis[axis.length - 1], days }, rows: [...rows.values()] };
}

export function bigKeywordSeeds(file = path.join(ROOT, 'docs', 'ops', 'big-keywords.json')) {
  if (!existsSync(file)) return [];
  const j = JSON.parse(readFileSync(file, 'utf8'));
  return (j.axes || []).flatMap((a) => (a.keywords || []).map((k) => k.keyword));
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  let keywords = [];
  if (opt('--query')) keywords = opt('--query').split(',');
  else if (opt('--file')) keywords = readFileSync(path.resolve(ROOT, opt('--file')), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  else keywords = bigKeywordSeeds();
  if (!keywords.length) { console.error('❌ 대상 키워드가 없다 (--query / --file / docs/ops/big-keywords.json)'); process.exit(2); }
  try {
    const res = await measureVolume(keywords, { anchor: opt('--anchor') || '실업급여', onBatch: (d, t) => process.stderr.write(`\r트렌드 ${d}/${t}`) });
    process.stderr.write('\n');
    res._readme = ['naver-volume.mjs 산출. 값은 기준어 최근 30일 평균 = 100 눈금. 검색량은 정렬용이며 발행 게이트가 아니다.', 'measured:false 는 API 실패, sparse:true 는 값이 작아 눈금이 거칠다는 뜻(0 ≠ 수요 없음).'];
    const json = JSON.stringify(res, null, 1) + '\n';
    if (args.includes('--stdout')) { console.log(json); } else {
      const out = opt('--out') ? path.resolve(ROOT, opt('--out')) : path.join(ROOT, 'docs', 'ops', 'radar', `volume-${kstDate()}.json`);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, json);
      const top = res.rows.filter((r) => r.measured && !r.anchor).sort((a, b) => (b.rel30 ?? 0) - (a.rel30 ?? 0));
      console.log(`검색량 ${res.rows.length}개 (${res.window.start}~${res.window.end}, ${res.anchor}=100) → ${path.relative(ROOT, out)}`);
      for (const r of top.slice(0, 15)) console.log(`  ${String(r.rel30).padStart(6)}  ${r.ratio7 != null && r.ratio7 >= 1.5 ? '↑' : ' '}${r.born ? '신생' : '    '}  ${r.keyword}`);
      const failed = res.rows.filter((r) => !r.measured).length;
      if (failed) console.log(`  측정 실패 ${failed}개`);
    }
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}
