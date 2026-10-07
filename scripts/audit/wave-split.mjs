#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// wave-split.mjs — "다음 물결" 묶음 하나를 세부 검색어로 쪼개 재고, 자리가 열린 것만 빈틈 대기열에 넣는다 (공식 API, LLM 0)
//
// 목록 위젯의 [선점 ↗] 버튼이 부른다(.claude/commands/목록.md). awoo scripts/wave-split.mjs 의 구조를 머니룩 금융 주제로 옮겼다.
// 지역 변형은 만들지 않는다(지자체 주제는 awoo 몫, 2026-09-30 운영자 결정).
//
// 순서
//   1) 변형: "{주제} {의도}"(신청·조건·대상·기간·서류·계산·환급·미납·연장·해지·변경·조회…) + 지식iN·블로그 제목 100건씩에서
//      주제 바로 뒤에 3번 이상 붙는 말(naver-pipeline.mjs mineSuffixes).
//   2) 거르기: 이미 글이 있는 targetQuery · 대기열에 있는 검색어 · 자매 awoo 주제 · 잠금 장부 VETO.
//   3) 검색어 트렌드(실업급여 = 100)로 검색량을 재고, 0.5 이상인 것만 검색량 순으로 --max 건 실측한다.
//      데이터랩이 0 으로 주는 검색어는 넣지 않는다(실제 검색 수를 모르는 글감을 늘리지 않는다, docs/28 1-2).
//   4) 실측: 웹문서 검색(naver-scout.mjs)·뉴스 7일·지식iN 같은 질문 수 → exposureOf 점수.
//   5) 자리가 열리고(T2 open) 점수 45 이상이고 우리 글이 30위 안에 없는 것만 큐에 넣는다.
//      id "빈틈:<검색어>", manual:true(파이프라인이 닫혀도 지우지 않고 hold 까지만, 21일 보존), autoPick:false
//      (선점 항목은 운영자 [발행 지시]로만 쓴다. 루틴이 자동으로 고르지 않는다).
//
// 실행: node scripts/audit/wave-split.mjs --term "연말정산" [--max 8] [--dry-run]   (pnpm audit:wave:split)
// 호출: 지식iN·블로그 2회 + 트렌드 약 (후보÷4)회 + 실측 건당 3회. 실측 상한 12건.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { naverSearch, stripTags, sleep, kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { scoutQuery } from './naver-scout.mjs';
import { measureVolume } from './naver-volume.mjs';
import { buildLedger, checkCandidate, classifyFamily, normKeyword, parseArticleMeta } from './naver-ledger.mjs';
import { exposureOf, conditionOf, kinExactCount, mineSuffixes, isSisterTopic, sisterTopOf, sisterTopReason, queriesOf, QUEUE_MIN_SCORE } from './naver-pipeline.mjs';

const QUEUE = path.join(ROOT, 'docs', 'ops', 'pipeline-queue.json');
const WAVE = path.join(ROOT, 'docs', 'ops', 'next-wave.json');
const SEEDS = path.join(ROOT, 'docs', 'ops', 'next-wave-seeds.json');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const INTENTS = ['신청', '조건', '대상', '기간', '신청기간', '서류', '계산', '환급', '미납', '연장', '해지', '변경', '조회', '지급일', '얼마', '방법'];
export const MIN_REL30 = 0.5;
const MAX_SCOUT = 12;
const readJson = (p, fb = null) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fb; } };

const serpOf = (sc) => ({
  rank: sc.rank ?? null, openSlots: sc.openSlots, wallTop5: sc.wallTop5, mainGovAbove: sc.mainGovAbove, publicAbove: sc.publicAbove,
  toolAbove: sc.toolAbove, fincoAbove: sc.fincoAbove, naverAbove: sc.naverAbove, newsWall: sc.newsWall, eyeOffset: null,
  verdictT1: sc.verdictT1, verdictT2: sc.verdictT2, warn: sc.warn || [],
  top10: (sc.above || []).slice(0, 10).map((a) => `${a.stale ? 'stale-' : ''}${a.kind}:${a.host}`),
});

async function titlesOf(ep, query) {
  const j = await naverSearch(ep, query, { display: 100, sort: 'sim' });
  return (j.items || []).map((x) => stripTags(x.title));
}

function usedTargets() {
  const out = new Set();
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const m = parseArticleMeta(readFileSync(path.join(ARTICLES, f), 'utf8'));
    if (m?.targetQuery) out.add(normKeyword(m.targetQuery));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const term = String(opt('--term') || '').replace(/["']/g, '').trim();
  const max = Math.min(Number(opt('--max') || 8) || 8, MAX_SCOUT);
  const DRY = args.includes('--dry-run');
  const today = kstDate();
  if (!term) { console.error('❌ --term "<주제>" 가 필요하다'); process.exit(2); }
  if (isSisterTopic(term)) { console.error(`❌ "${term}" 은 자매 사이트 awoo 주제다(2026-09-30 운영자 결정). 쪼개지 않는다`); process.exit(2); }

  const wave = readJson(WAVE, { items: [] });
  const w = (wave.items || []).find((x) => normKeyword(x.term) === normKeyword(term)) ?? null;
  const seed = (readJson(SEEDS, { seeds: [] }).seeds || []).find((s) => normKeyword(s.term) === normKeyword(term)) ?? null;
  const cluster = seed?.cluster ?? w?.cluster ?? null;

  const queue = readJson(QUEUE, null);
  if (!queue) { console.error('❌ docs/ops/pipeline-queue.json 을 읽지 못했다'); process.exit(1); }
  const known = new Set((queue.items || []).flatMap(queriesOf));
  const used = usedTargets();
  const entries = buildLedger();
  let calls = 0;

  // 1) 변형
  const [kinTitles, blogTitles] = [await titlesOf('kin', term), await titlesOf('blog', term)];
  calls += 2;
  const mined = mineSuffixes(term, { blogTitles, kinTitles }, { min: 3 }).slice(0, 12).map((r) => r.suffix);
  const variants = [...new Set([...mined, ...INTENTS].map((s) => `${term} ${s}`))];

  // 2) 거르기
  const skipped = [];
  const cands = [];
  for (const q of variants) {
    const k = normKeyword(q);
    if (used.has(k)) { skipped.push([q, '이미 이 검색어로 쓴 글이 있음']); continue; }
    if (known.has(k)) { skipped.push([q, '이미 대기열에 있음']); continue; }
    if (isSisterTopic(q)) { skipped.push([q, '자매 awoo 주제']); continue; }
    const fam = classifyFamily(q).family;
    const r = checkCandidate(entries, { query: q, family: fam });
    if (r.verdict === 'VETO') { skipped.push([q, '같은 세부 주제 글이 이미 있음(잠금 장부)']); continue; }
    cands.push({ query: q, family: fam, ledger: { verdict: r.verdict, program: r.program, adjacent: (r.adjacent || []).length, sameProgram: r.verdict === 'PASS' ? entries.filter((e) => e.program === r.program).length : 0, relatedSlugs: (r.matches || []).slice(0, 5).map((x) => x.slug) } });
  }

  // 3) 검색량
  const vol = cands.length ? await measureVolume(cands.map((c) => c.query)) : { rows: [] };
  calls += Math.ceil(cands.length / 4);
  const volBy = new Map((vol.rows || []).map((r) => [normKeyword(r.keyword), r]));
  for (const c of cands) {
    const v = volBy.get(normKeyword(c.query)) || {};
    c.demand = { rel30: v.rel30 ?? 0, ratio7: v.ratio7 ?? null, born: !!v.born };
  }
  const withVol = cands.filter((c) => (c.demand.rel30 ?? 0) >= MIN_REL30).sort((a, b) => b.demand.rel30 - a.demand.rel30);
  for (const c of cands.filter((x) => (x.demand.rel30 ?? 0) < MIN_REL30)) skipped.push([c.query, `검색량 ${c.demand.rel30 ?? 0} (${MIN_REL30} 미만)`]);
  for (const c of withVol.slice(max)) skipped.push([c.query, `검색량 ${c.demand.rel30}, 실측 상한 ${max}건 밖`]);

  // 4) 실측 · 5) 큐
  const added = [];
  const rows = [];
  for (const c of withVol.slice(0, max)) {
    const sc = await scoutQuery(c.query);
    const kin = sc.error ? [] : await titlesOf('kin', c.query);
    calls += 3;
    if (sc.error) { rows.push([c.query, c.demand.rel30, '측정 실패', sc.error]); continue; }
    const serp = serpOf(sc);
    const demand = { ...c.demand, kinExact: kinExactCount(c.query, kin) };
    const ex = exposureOf({ track: 'T2', serp, demand, ledger: c.ledger });
    const open = sc.verdictT2 === 'open';
    let result;
    if (serp.rank != null && serp.rank <= 30) result = `우리 글 ${serp.rank}위, 새 글 대신 기존 글 갱신`;
    else if (!open) result = `닫힘: ${(sc.reason || []).join(' · ') || '자리 없음'}`;
    else if (ex.score < QUEUE_MIN_SCORE) result = `열렸지만 점수 ${ex.score}`;
    else {
      const sis = sisterTopOf(serp.top10);
      const item = {
        id: `빈틈:${c.query}`, query: c.query, altQueries: [], track: 'T2', family: c.family, cluster, status: 'proposed',
        autoPick: false, manual: true, addedBy: 'wave-split', wave: term,
        score: ex.score, label: ex.label, reasons: sis ? [...ex.reasons, sisterTopReason(sis)] : ex.reasons,
        condition: `${conditionOf({ query: c.query, program: c.ledger.program, sameProgram: c.ledger.sameProgram, serp, demand })}. 선점 항목(다음 물결 "${term}"), 운영자 [발행 지시]로만 쓴다`,
        measuredAt: today, demand, serp, ledger: { verdict: c.ledger.verdict, relatedSlugs: c.ledger.relatedSlugs },
        ...(sis ? { sisterTop: sis.rank } : {}),
      };
      if (!cluster) item.condition += '. cluster 미정, 운영자 지정 필요';
      queue.items.push(item);
      added.push(item);
      result = `넣음 (점수 ${ex.score})`;
    }
    rows.push([c.query, c.demand.rel30, result, `지식iN ${demand.kinExact} · 빈자리 ${serp.openSlots ?? 0} · 관공서 ${serp.wallTop5 ?? 0}`]);
    await sleep(150);
  }

  if (added.length && !DRY) {
    queue.updatedAt = queue.updatedAt || today;
    writeFileSync(QUEUE, JSON.stringify(queue, null, 1) + '\n');
  }
  console.log(`선점 "${term}" · 변형 ${variants.length}개 · 검색량 ${MIN_REL30} 이상 ${withVol.length}개 · 실측 ${rows.length}개 · 큐에 넣음 ${added.length}개${DRY ? ' (드라이런, 큐 그대로)' : ''}`);
  console.log('\n| 검색어 | 검색량 | 결과 | 근거 |\n|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.join(' | ')} |`);
  if (skipped.length) {
    console.log(`\n뺀 것 ${skipped.length}개:`);
    for (const [q, why] of skipped.slice(0, 30)) console.log(`- ${q}: ${why}`);
    if (skipped.length > 30) console.log(`- … 외 ${skipped.length - 30}개`);
  }
  console.log(`\n호출 약 ${calls}회 (지식iN·블로그·웹문서·뉴스·트렌드)`);
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e instanceof NaverAuthError ? '네이버 API 인증 실패: ' : ''}${e.message}`); process.exit(1); });
}
