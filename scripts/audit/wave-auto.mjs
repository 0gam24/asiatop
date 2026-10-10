// ════════════════════════════════════════════════════════════════════════
// wave-auto.mjs — 매일 자동 선점: 주제 몇 개를 골라 wave-split 으로 쪼개고, 검색량이 잡히면서 자리가 열린 세부 검색어를 대기열에 넣는다
//                 (공식 네이버 API 만, LLM 0)
//
// 왜 (2026-10-08 측정, docs/28): 웹문서 10위 안에 든 우리 글 38편의 검색어는 모두 데이터랩 검색량 0.5(실업급여 = 100) 미만이었다.
// 같은 날 손으로 주제 20개를 쪼갰더니 검색량이 잡히고 자리가 열린 검색어 5개가 나왔다(국민연금 해지 5.7 등). 이 일을 매일 자동으로 한다.
// 운영자 지시(2026-10-08): "이 사이트의 운영을 직접 맡아. 목적은 1일 100달러 애드센스 수익, 모든 걸 네이버 상위 노출·검색 유입에 집중".
//
// 고르는 주제(하루 --max-terms 개, 기본 6):
//   ① docs/ops/next-wave.json 의 지금 뜨는 중·곧 뜸·커지는 중·큰데 우리 글 적음 묶음(점수 순)
//   ② 감시 목록(next-wave-seeds.json)과 큰 키워드(big-keywords.json 축 키워드)를 돌아가며 — 마지막으로 쪼갠 날이 오래된 것부터
//   같은 주제는 7일 안에 다시 쪼개지 않는다(기록 docs/ops/radar/wave-auto-log.json). 자매 awoo 주제는 고르지 않는다.
// 큐에 넣는 기준은 wave-split.mjs 와 같다(검색량 0.5 이상만 실측, T2 열림, 점수 45 이상, 우리 글 30위 밖, 잠금 장부 VETO 아님).
//
// 실행: node scripts/audit/wave-auto.mjs [--max-terms 6] [--max 6] [--dry-run]   (naver-queue-daily.yml 이 대기열 측정 뒤 매일 실행)
// 호출: 주제당 약 2 + (후보÷4) 트렌드 + 실측 건당 3. 기본값이면 검색 약 120회·트렌드 약 40회.
// ════════════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { buildLedger, normKeyword } from './naver-ledger.mjs';
import { isSisterTopic } from './naver-pipeline.mjs';
import { splitTerm, printSplit, readJson, QUEUE } from './wave-split.mjs';

const LOG = path.join(ROOT, 'docs', 'ops', 'radar', 'wave-auto-log.json');
const WAVE = path.join(ROOT, 'docs', 'ops', 'next-wave.json');
const SEEDS = path.join(ROOT, 'docs', 'ops', 'next-wave-seeds.json');
const BIG = path.join(ROOT, 'docs', 'ops', 'big-keywords.json');
export const COOLDOWN_DAYS = 7;
const WAVE_STAGES = new Set(['rising', 'soon', 'growing', 'thin']);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

/** 오늘 쪼갤 주제를 고른다(순수 함수 — 테스트용). */
export function pickTerms({ wave, seeds, big, log, today, maxTerms }) {
  const ignore = new Set((seeds?.ignore || []).map(normKeyword));
  const last = log?.terms || {};
  const fresh = (term) => { const at = last[term]?.at; return !at || daysBetween(at, today) >= COOLDOWN_DAYS; };
  const ok = (term) => term && !ignore.has(normKeyword(term)) && !isSisterTopic(term) && fresh(term);
  const out = [];
  const add = (term, why) => { if (out.length < maxTerms && ok(term) && !out.some((x) => normKeyword(x.term) === normKeyword(term))) out.push({ term, why }); };
  const waves = (wave?.items || []).filter((w) => WAVE_STAGES.has(w.stage)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const w of waves) add(w.term, `다음 물결 ${w.stage}`);
  const pool = [
    ...(seeds?.seeds || []).map((s) => (typeof s === 'string' ? s : s.term)),
    ...(big?.axes || []).flatMap((a) => (a.keywords || []).map((k) => k.keyword)),
  ].filter(Boolean);
  const uniq = [...new Map(pool.map((t) => [normKeyword(t), t])).values()];
  uniq.sort((a, b) => String(last[a]?.at || '0000').localeCompare(String(last[b]?.at || '0000')) || a.localeCompare(b, 'ko'));
  for (const t of uniq) add(t, last[t]?.at ? `돌아가며 (지난 ${last[t].at})` : '돌아가며 (처음)');
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const maxTerms = Number(opt('--max-terms') || 6) || 6;
  const max = Number(opt('--max') || 6) || 6;
  const DRY = args.includes('--dry-run');
  const today = kstDate();
  const queue = readJson(QUEUE, null);
  if (!queue) { console.error('❌ docs/ops/pipeline-queue.json 을 읽지 못했다'); process.exit(1); }
  const log = readJson(LOG, null) || { _readme: ['wave-auto.mjs 가 주제를 마지막으로 쪼갠 날과 결과. 같은 주제는 7일 안에 다시 쪼개지 않는다.'], terms: {} };
  log.terms ||= {};
  const terms = pickTerms({ wave: readJson(WAVE, null), seeds: readJson(SEEDS, null), big: readJson(BIG, null), log, today, maxTerms });
  if (!terms.length) { console.log('오늘 쪼갤 주제 없음(모두 7일 안에 쪼갰다)'); return; }
  const entries = buildLedger();
  let added = 0; let calls = 0;
  for (const { term, why } of terms) {
    console.log(`\n── ${term} (${why})`);
    try {
      const r = await splitTerm(term, { queue, entries, max, today });
      printSplit(r, { dry: DRY });
      added += r.added.length; calls += r.calls;
      log.terms[term] = { at: today, added: r.added.map((x) => x.query), measured: r.rows.length, withVolume: r.withVol };
    } catch (e) {
      if (e instanceof NaverAuthError) throw e;
      console.error(`  ${term} 실패: ${e.message}`);
      log.terms[term] = { at: today, error: String(e.message).slice(0, 120) };
    }
  }
  console.log(`\n자동 선점 ${today}: 주제 ${terms.length}개 · 큐에 넣음 ${added}개 · 호출 약 ${calls}회${DRY ? ' (드라이런)' : ''}`);
  if (DRY) return;
  if (added) writeFileSync(QUEUE, JSON.stringify(queue, null, 1) + '\n');
  mkdirSync(path.dirname(LOG), { recursive: true });
  writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n');
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e instanceof NaverAuthError ? '네이버 API 인증 실패: ' : ''}${e.message}`); process.exit(1); });
}
