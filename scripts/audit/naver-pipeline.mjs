// ════════════════════════════════════════════════════════════════════════
// naver-pipeline.mjs — 빈틈 대기열 자동 갱신: 후보 생성 → 잠금 장부 → 정찰 → 점수 → 큐·보고서 (공식 API 만, LLM 0)
//
// 계획: docs/ops/KEYWORD-PLAN-2026-09-15.md §6-2~6-5. 2026-09-17 수동 v0.1 대기열(점수식·필드)을 그대로 기계화했다.
// 신규 글의 유일한 입력원 docs/ops/pipeline-queue.json 을 채운다. 글을 쓰거나 발행하지 않는다. 승인은 운영자 몫이다.
//
// 후보
//   T2   big-keywords 의 키워드·aliases(헤드)마다 블로그·지식iN 제목 100건씩을 받아 헤드 바로 뒤에 붙는 말을 센다
//        ("확정일자" → "부여현황"). 적게 나오면 intentTemplates 로 채운다.
//   T3   docs/ops/landgrab-calendar.json 이 있으면 writeBy ≤ 오늘인 항목 (없으면 건너뛴다)
//   NEW  최신 naver-discover 뉴스 신생어. 1차 출처를 기계가 확인 못 하므로 unverified(−10, autoPick=false)
//   재측정 큐의 proposed·approved
// 거르기  잠금 장부 VETO · 이미 큐에 있는 쿼리 · 14일 안에 닫힘으로 잰 쿼리(docs/ops/radar/pipeline-seen.json)
// 측정    쿼리당 webkr + news + kin(같은 질문 수) 3회, 열린 것만 검색어 트렌드
// 점수    exposureOf (§6-3). 실유입 CSV 가 없는 동안은 지식iN 같은 질문 수가 수요 대리지표다(v0.1).
// 병합    approved·published·rejected 와 운영자가 건 hold 의 상태는 건드리지 않는다. proposed 가 재측정에서 닫히면 먼저 hold(holdBy:pipeline),
//         다음 측정에도 닫혀 있으면 사유를 적어 rejected(21일 뒤 삭제), 다시 열리면 proposed 로 되돌린다.
//         사람이 넣은 항목(id 접두 `빈틈:` 또는 manual:true)은 닫혀도 hold 까지만.
//         글 frontmatter targetQuery 가 큐 쿼리와 같으면 published 로 표시한다.
//
// 실행:
//   node scripts/audit/naver-pipeline.mjs                 # 드라이런: 측정하고 보고만, 파일 안 씀
//   node scripts/audit/naver-pipeline.mjs --write         # pipeline-queue.json · DAILY-KEYWORDS.md · radar/pipeline-seen.json
//   옵션: --t2 50 --new 20 --t3 10 --remeasure 30 (실측 예산) · --only remeasure|t2|new|t3 · --heads "확정일자,전입신고"
// 예산: 기본 헤드 약 80 × 2 + 정찰 110 × 3 + 트렌드 ≈ 호출 500. 검색 API 무료 일 25,000.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { naverSearch, stripTags, sleep, kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { scoutQuery } from './naver-scout.mjs';
import { measureVolume } from './naver-volume.mjs';
import { buildLedger, checkCandidate, classifyFamily, normKeyword, parseArticleMeta } from './naver-ledger.mjs';

const OPS = path.join(ROOT, 'docs', 'ops');
const QUEUE = path.join(OPS, 'pipeline-queue.json');
const REPORT = path.join(OPS, 'DAILY-KEYWORDS.md');
const SEEN = path.join(OPS, 'radar', 'pipeline-seen.json');
const BIG = path.join(OPS, 'big-keywords.json');
const CALENDAR = path.join(OPS, 'landgrab-calendar.json');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');

export const BUDGET = { t2: 50, t3: 10, new: 20, remeasure: 30 };
export const QUEUE_MIN_SCORE = 45;      // 이 아래는 큐에 올리지 않는다
export const AUTOPICK_MIN_SCORE = 55;   // v0.1: 45점은 운영자 지정, 55점부터 자동
export const NEW_MIN_SCORE = 55;        // 뉴스 신생어는 잡음이 많아 문턱을 높인다
export const MAX_PROPOSED = 25;
export const STALE_DAYS = 10;           // topics SKILL: measuredAt 10일 넘으면 건너뜀 → 그 전에 다시 잰다
export const KEEP_DAYS = { rejected: 21, hold: 21, published: 90 };
export const SEEN_CLOSED_DAYS = 14;

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const readJson = (p, fallback = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };

// ── 후보 생성: 제목에서 헤드 뒤에 붙는 말 ─────────────────────────────────────────
const PARTICLE = /^(에서|으로|에게|까지|부터|이랑|은|는|이|가|을|를|의|에|로|와|과|도|만|랑)(?=\s|$)/;
const VERBISH = /(면|나요|까요|는데|인데|하고|해서|해야|할까|하는|되는|되나|됩니다|습니다|입니다|어요|아요|세요|에요|예요|네요|할|한|된|될|요|함|됨|음)$/;
// 낱말 끝 조사: "경영악화로" → "경영악화". 짧은 낱말("근로"·"차이")은 건드리지 않는다.
const stripTail = (x) => (x.length >= 5 ? x.replace(/(으로|에서|에게|로|은|는|을|를|의|도|만)$/, '') : x.length >= 3 ? x.replace(/(으로|에서|에게|은|는|을|를)$/, '') : x);
// 질문 말투는 낱말 목록으로 다 못 막는다("질문드립니다"·"문의드려요")
const ASKING = /질문|문의|궁금|드립니다|드려요|부탁|여쭤|받을|받는|받은|받기/;
const SUFFIX_STOP = new Set(['질문', '문의', '관련', '관련해서', '대해', '대해서', '궁금', '궁금한', '궁금합니다', '도와주세요', '알려주세요', '부탁드립니다',
  '제가', '저는', '지금', '현재', '이번', '그리고', '그런데', '혹시', '정말', '진짜', '어떻게', '언제', '얼마나', '무엇', '뭔가요', '방법', '총정리', '정리', '안내', '후기', '및', '등', '또는']);

const escapeRe = (t) => t.replace(/[\\^$.*+?()[\]{}|]/g, (c) => `\\${c}`);
const headRegex = (head) => new RegExp(head.trim().split(/\s+/).map(escapeRe).join('\\s*'), 'i');

// 제목 한 줄에서 헤드 뒤 첫 낱말(1-gram)과 두 낱말(2-gram)을 뽑는다
export function suffixesOf(head, title) {
  const t = stripTags(title);
  const m = t.match(headRegex(head));
  if (!m) return [];
  let rest = t.slice(m.index + m[0].length).replace(PARTICLE, ' ');
  const toks = rest.split(/[\s·,/()[\]?!.:~"'“”‘’|<>-]+/).map((x) => stripTail(x.trim())).filter(Boolean);
  // 숫자로 시작하는 말("10년이상"·"2027")은 지식iN 말투 잡음이 많아 뺀다
  const ok = (x) => x && x.length >= 2 && x.length <= 10 && !SUFFIX_STOP.has(x) && !ASKING.test(x) && !VERBISH.test(x) && !/^\d/.test(x);
  if (!ok(toks[0])) return [];
  return ok(toks[1]) ? [toks[0], `${toks[0]} ${toks[1]}`] : [toks[0]];
}

export function mineSuffixes(head, { blogTitles = [], kinTitles = [] }, { min = 3 } = {}) {
  const count = new Map();
  const bump = (titles, key) => {
    for (const title of titles) for (const s of new Set(suffixesOf(head, title))) {
      const c = count.get(s) || { suffix: s, blogFreq: 0, kinFreq: 0 };
      c[key]++; count.set(s, c);
    }
  };
  bump(blogTitles, 'blogFreq'); bump(kinTitles, 'kinFreq');
  let rows = [...count.values()].map((c) => ({ ...c, freq: c.blogFreq + c.kinFreq })).filter((c) => c.freq >= min);
  // "조건" 과 "조건 확인" 이 같이 나오면, 2-gram 이 1-gram 빈도의 60% 이상일 때만 2-gram 을 남긴다
  rows = rows.filter((r) => {
    if (!r.suffix.includes(' ')) return true;
    const one = count.get(r.suffix.split(' ')[0]);
    return r.freq >= Math.max(min, (one ? one.blogFreq + one.kinFreq : 0) * 0.6);
  });
  return rows.sort((a, b) => b.freq - a.freq || a.suffix.localeCompare(b.suffix, 'ko'));
}

// 같은 헤드에서 "조건"·"가입조건" 처럼 한쪽이 다른 쪽을 품으면 빈도 높은 쪽으로 합치고 나머지는 altQueries 로
export function foldNearDuplicates(cands) {
  const out = [];
  for (const c of [...cands].sort((a, b) => b.freq - a.freq)) {
    const n = normKeyword(c.suffix);
    const host = out.find((o) => o.head === c.head && (normKeyword(o.suffix).includes(n) || n.includes(normKeyword(o.suffix))));
    if (host) host.altQueries.push(c.query); else out.push({ ...c, altQueries: [] });
  }
  return out;
}

// 헤드별로 한 개씩 돌아가며 뽑는다(한 헤드가 예산을 다 쓰지 않게)
export function roundRobin(groups, limit) {
  const out = [];
  for (let i = 0; out.length < limit; i++) {
    let took = false;
    for (const g of groups) if (g[i]) { out.push(g[i]); took = true; if (out.length >= limit) break; }
    if (!took) break;
  }
  return out;
}

export function headsOf(big) {
  const heads = [];
  for (const axis of big?.axes || []) for (const k of axis.keywords || []) {
    for (const h of [k.keyword, ...(k.aliases || [])]) heads.push({ head: h, axis: axis.id, cluster: (axis.clusters || [])[0] || null });
  }
  return heads;
}

export function templateSuffixes(big) {
  return Object.values(big?.intentTemplates || {}).flat().filter((s) => !s.includes('{'));
}

// 지식iN 상위 100 제목 중 쿼리의 모든 낱말을 담은 질문 수 (v0.1 "같은 질문 N건")
export function kinExactCount(query, titles) {
  const toks = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  return titles.filter((t) => { const s = stripTags(t).toLowerCase().replace(/\s+/g, ''); return toks.every((k) => s.includes(k)); }).length;
}

// ── 점수 (§6-3, v0.1 실측 9건과 같은 값이 나오게 맞춤 — tests/lib/naver-pipeline.test.mjs) ──────
export function exposureOf({ track = 'T2', serp = {}, demand = {}, ledger = {}, unverified = false, inWindow = false }) {
  const reasons = [];
  const rank = serp.rank ?? null;
  if (rank != null && rank <= 3) return { score: 0, label: '갱신', open: false, reasons: [`자사 ${rank}위 — 갱신 대상`] };
  const open = (track === 'T2' ? serp.verdictT2 : serp.verdictT1) === 'open';
  let s = 0;
  const add = (n, why) => { s += n; if (why) reasons.push(why); };
  const kin = demand.kinExact ?? 0;
  const inbound = demand.inbound7d ?? 0;
  if (kin >= 20) reasons.push(`같은 질문 ${kin}건(지식iN 상위 100)`);
  if (open) add(40, '자리 열림');
  const slots = serp.openSlots ?? 0;
  if (slots >= 4) add(15, `빈자리 ${slots}`); else if (slots >= 2) add(10); else if (slots === 1) add(5);
  const wall = serp.wallTop5 ?? 0;
  if (wall === 0) add(10, '상위 5 관공서·공단·도구 없음'); else if (wall === 1) add(5);
  if (serp.newsWall != null) { if (serp.newsWall <= 3) add(10, '뉴스 벽 없음'); else if (serp.newsWall <= 15) add(5); }
  if (serp.eyeOffset === 1) add(10, '웹문서 첫 화면(눈 확인)'); else if (serp.eyeOffset === 2) add(5);
  if (rank != null && rank <= 10) add(5, `자사 ${rank}위`); else if (rank != null && rank <= 30) add(3, `자사 ${rank}위`);
  // 수요: 실유입(서치어드바이저 CSV)이 있으면 그 값, 없으면 지식iN 같은 질문 수. 둘 중 큰 쪽 한 번만.
  const demandPts = Math.max(inbound >= 100 ? 10 : inbound >= 30 ? 5 : 0, kin >= 20 ? 10 : kin >= 5 ? 5 : 0);
  add(demandPts, inbound >= 30 ? `주간 실유입 ${inbound}` : null);
  if ((demand.ratio7 ?? 0) >= 1.5) add(5, `최근 7일 ${demand.ratio7}배`);
  if (demand.born) add(5, '신생 검색어');
  if (inWindow) add(5, '창 안');
  if ((serp.fincoAbove ?? 0) >= 4) add(-10, `금융사 ${serp.fincoAbove}`);
  if (unverified) add(-10, '1차 출처 미확인');
  if ((ledger.adjacent ?? 0) >= 1) add(-10, `비슷한 우리 글 ${ledger.adjacent}편`);
  const score = Math.max(0, Math.min(100, s));
  return { score, label: score >= 70 ? '높음' : score >= QUEUE_MIN_SCORE ? '중간' : '낮음', open, reasons: reasons.slice(0, 4) };
}

// 기계가 1차 출처를 정할 수 없는 주제: 지자체·차수가 갈리는 지원금 류는 운영자 지정이 있어야 쓴다 (v0.1 민생지원금)
const NEEDS_OPERATOR = /지원금|소비\s?쿠폰|지역화폐|상품권|바우처/;
const SALES_INTENT = /대출|보험|카드|적금|예금|계좌|통장/;
// 정책 대출이 아닌 대출 쿼리는 금소법·불법사금융 광고 가드(safe-expression)에 걸리기 쉬워 운영자가 고른다
const POLICY_LOAN = /버팀목|디딤돌|햇살론|신생아\s?특례|보금자리|특례보금자리|새희망홀씨|소액생계비/;
export const isCommercialLoan = (q) => /대출|대환|카드론|현금서비스/.test(q) && !POLICY_LOAN.test(q);

// 수요 신호: 지식iN 같은 질문 5건 · 블로그 제목 3회 · 검색량 눈금 1 · 실유입 중 하나. 없으면 자리가 열려 있어도 운영자가 고른다
export const hasDemand = (d = {}) => (d.kinExact ?? 0) >= 5 || (d.blogFreq ?? 0) >= 3 || (d.rel30 ?? 0) >= 1 || (d.inbound7d ?? 0) > 0;

export function autoPickOf({ score, track, query, unverified, ledgerVerdict, demand }) {
  if (unverified || track === 'NEW') return false;
  if (demand && !hasDemand(demand)) return false;
  if (ledgerVerdict !== 'PASS') return false;
  if (NEEDS_OPERATOR.test(query) || isCommercialLoan(query)) return false;
  return score >= AUTOPICK_MIN_SCORE;
}

export function conditionOf({ query, program, sameProgram = 0, serp = {}, unverified = false, demand = null }) {
  const parts = [];
  if (unverified) parts.push('뉴스에서 나온 말이다. 제도가 실재하는지 소관 부처 보도자료·법령 URL 을 확보한 뒤에만 쓴다. 확정 전이면 V형');
  else parts.push(`${program || query} 의 금액·기한·대상은 소관 부처·공단 공고와 법령 원문에서 확인한 뒤 단정 표기`);
  if (NEEDS_OPERATOR.test(query)) parts.push('어느 지자체·어느 차수인지 공고 URL 필요. 운영자 지정 필요');
  if (isCommercialLoan(query)) parts.push('민간 대출 주제 — 운영자 지정 필요');
  if (SALES_INTENT.test(query) || (serp.fincoAbove ?? 0) >= 4) parts.push('특정 금융사 권유·"가능" 표현 금지(금소법 가드), 정보 프레임');
  if (sameProgram > 0) parts.push(`기존 ${program} 글 ${sameProgram}편과 세부 키워드 다르게`);
  if (demand && !hasDemand(demand)) parts.push('수요 신호 없음(같은 질문·블로그 제목·검색량 모두 미미) — 운영자 지정 필요');
  return parts.join('. ');
}

// ── 큐 병합 ──────────────────────────────────────────────────────────────
const isManual = (it) => it.manual === true || String(it.id || '').startsWith('빈틈:');
export const queriesOf = (it) => [it.query, ...(it.altQueries || [])].map(normKeyword);
export const slugId = (date, query) => `gap:${date}:${String(query).trim().replace(/\s+/g, '-')}`;

const serpOfScout = (sc, eyeOffset = null) => ({
  rank: sc.rank ?? null, openSlots: sc.openSlots, wallTop5: sc.wallTop5, mainGovAbove: sc.mainGovAbove, publicAbove: sc.publicAbove,
  toolAbove: sc.toolAbove, fincoAbove: sc.fincoAbove, naverAbove: sc.naverAbove, newsWall: sc.newsWall, eyeOffset,
  verdictT1: sc.verdictT1, verdictT2: sc.verdictT2, warn: sc.warn || [],
  top10: (sc.above || []).slice(0, 10).map((a) => `${a.stale ? 'stale-' : ''}${a.kind}:${a.host}`),
});

// measured: [{ query, track, cluster, altQueries, unverified, inWindow, scout, demand, ledger:{verdict,adjacent,relatedSlugs,program,sameProgram} }]
// published: Map(normKeyword(targetQuery) → slug)
export function mergeQueue(queue, measured, { today, published = new Map() }) {
  const log = { added: [], updated: [], closed: [], published: [], dropped: [], refresh: [] };
  const byQuery = new Map();
  for (const m of measured) byQuery.set(normKeyword(m.query), m);
  const items = [];

  for (const it of queue.items || []) {
    const next = { ...it };
    const pubSlug = queriesOf(it).map((q) => published.get(q)).find(Boolean);
    if (pubSlug && !['published', 'rejected'].includes(it.status)) {
      Object.assign(next, { status: 'published', slug: it.slug || pubSlug, publishedAt: it.publishedAt || today });
      log.published.push(it.query);
    }
    const m = byQuery.get(normKeyword(it.query));
    const pipelineHold = next.status === 'hold' && it.holdBy === 'pipeline';
    if (m && !m.scout.error && (['proposed', 'approved'].includes(next.status) || pipelineHold)) {
      const serp = serpOfScout(m.scout, it.serp?.eyeOffset ?? null);
      const demand = { ...it.demand, ...m.demand };
      const ledger = { verdict: m.ledger.verdict, relatedSlugs: m.ledger.relatedSlugs };
      const ex = exposureOf({ track: it.track, serp, demand, ledger: m.ledger, unverified: !!it.unverified, inWindow: !!m.inWindow });
      Object.assign(next, { serp, demand, ledger, score: ex.score, label: ex.label, reasons: ex.reasons, measuredAt: today });
      const closedWhy = !ex.open ? (m.scout.reason || []).join(' · ') || '닫힘' : m.ledger.verdict === 'VETO' ? '잠금 장부 VETO' : ex.score < QUEUE_MIN_SCORE ? `점수 ${ex.score}` : null;
      if (ex.label === '갱신') log.refresh.push({ query: it.query, rank: serp.rank, url: m.scout.ourUrl, why: '자사 1~3위 — 새 글 금지, 갱신만' });
      if (closedWhy && next.status !== 'approved') {
        // 문턱을 하루 넘었다고 바로 버리지 않는다(뉴스 15↔16 출렁임). 첫 닫힘은 hold, 다음 측정에도 닫혀 있으면 rejected. 사람이 넣은 항목은 hold 까지만.
        const again = pipelineHold && !isManual(it);
        Object.assign(next, again ? { status: 'rejected', rejectedReason: `재측정 ${today}: ${closedWhy}`, rejectedBy: 'pipeline' } : { status: 'hold', holdBy: 'pipeline', holdReason: `재측정 ${today}: ${closedWhy}` });
        if (again) { delete next.holdBy; delete next.holdReason; }
        log.closed.push(`${it.query} (${closedWhy}) → ${again ? '내림' : '보류, 다음 측정에서 다시 봄'}`);
      } else {
        if (pipelineHold) { next.status = 'proposed'; delete next.holdBy; delete next.holdReason; }
        if (closedWhy) next.remeasureWarn = `재측정 ${today}: ${closedWhy} — 승인 항목이라 상태는 그대로`;
        else delete next.remeasureWarn;
        if (it.autoPick !== false) next.autoPick = autoPickOf({ score: ex.score, track: it.track, query: it.query, unverified: !!it.unverified, ledgerVerdict: m.ledger.verdict, demand });
        log.updated.push(it.query);
      }
    }
    // 보존 기한
    const keep = KEEP_DAYS[next.status];
    const stamp = next.status === 'published' ? next.publishedAt : next.measuredAt;
    if (keep && stamp && daysBetween(stamp, today) > keep) { log.dropped.push(it.query); continue; }
    items.push(next);
  }

  const known = new Set(items.flatMap(queriesOf));
  const room = Math.max(0, MAX_PROPOSED - items.filter((i) => i.status === 'proposed').length);
  const fresh = [];
  for (const m of measured) {
    if (m.scout.error || known.has(normKeyword(m.query)) || published.has(normKeyword(m.query))) continue;
    const serp = serpOfScout(m.scout);
    const ex = exposureOf({ track: m.track, serp, demand: m.demand, ledger: m.ledger, unverified: !!m.unverified, inWindow: !!m.inWindow });
    if (ex.label === '갱신' || (serp.rank != null && serp.rank <= 30)) { log.refresh.push({ query: m.query, rank: serp.rank, url: m.scout.ourUrl, why: serp.rank <= 3 ? '자사 1~3위 — 새 글 금지, 갱신만' : '자사 4~30위 — 새 글보다 기존 글 진단 먼저' }); continue; }
    if (!ex.open || m.ledger.verdict === 'VETO') continue;
    if (ex.score < (m.track === 'NEW' ? NEW_MIN_SCORE : QUEUE_MIN_SCORE)) continue;
    // 뉴스 제목에서 나온 말은 조각난 문구가 많다. 사람들이 실제로 묻는 말(지식iN 5건 이상)일 때만 올린다
    if (m.track === 'NEW' && (m.demand.kinExact ?? 0) < 5) continue;
    fresh.push({
      id: slugId(today, m.query), query: m.query, altQueries: (m.altQueries || []).filter((q) => !known.has(normKeyword(q))),
      track: m.track, family: classifyFamily(m.query).family, cluster: m.cluster || null, status: 'proposed',
      autoPick: autoPickOf({ score: ex.score, track: m.track, query: m.query, unverified: !!m.unverified, ledgerVerdict: m.ledger.verdict, demand: m.demand }),
      ...(m.unverified ? { unverified: true } : {}),
      score: ex.score, label: ex.label, reasons: ex.reasons,
      condition: conditionOf({ query: m.query, program: m.ledger.program, sameProgram: m.ledger.sameProgram, serp, unverified: !!m.unverified, demand: m.demand }),
      measuredAt: today, demand: m.demand, serp, ledger: { verdict: m.ledger.verdict, relatedSlugs: m.ledger.relatedSlugs },
    });
  }
  fresh.sort((a, b) => b.score - a.score || (b.demand.kinExact ?? 0) - (a.demand.kinExact ?? 0));
  for (const f of fresh.slice(0, room)) { items.push(f); log.added.push(f.query); }

  const order = { approved: 0, proposed: 1, hold: 2, published: 3, rejected: 4 };
  items.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (b.score ?? 0) - (a.score ?? 0));
  return { queue: { ...queue, updatedAt: today, items }, log };
}

// ── 보고서 ───────────────────────────────────────────────────────────────
export function renderReport({ queue, log, today, stats, tried = [] }) {
  const L = [];
  const live = queue.items.filter((i) => ['approved', 'proposed'].includes(i.status));
  const auto = live.filter((i) => i.status === 'approved' || i.autoPick);
  L.push(`# 오늘의 빈틈 키워드 — ${today}`, '');
  L.push('`scripts/audit/naver-pipeline.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 원본은 `pipeline-queue.json`.', '');
  L.push(`- 쓸 수 있는 항목 ${live.length}건 (자동 선택 가능 ${auto.length} · 운영자 지정 필요 ${live.length - auto.length})`);
  L.push(`- 이번 실행: 새로 올림 ${log.added.length} · 다시 잼 ${log.updated.length} · 닫혀서 내림 ${log.closed.length} · 발행 표시 ${log.published.length} · 기한 지나 삭제 ${log.dropped.length}`);
  if (stats) L.push(`- 측정: 헤드 ${stats.heads} · 정찰 ${stats.scouted} (열림 ${stats.open}) · 잠금 장부 VETO ${stats.veto} · API 호출 약 ${stats.calls}`);
  if (auto.length === 0) L.push('- **자동 선택 가능한 항목이 없다 → 운영자 지정이 없으면 신규 0편.**');
  L.push('', '## 상위 10', '', '| # | 검색어 | 점수 | 상태 | 이유 | 쓰기 전 확인 |', '|---|---|---|---|---|---|');
  live.slice(0, 10).forEach((i, n) => {
    const st = i.status === 'approved' ? '승인' : i.autoPick ? '자동' : '지정 필요';
    L.push(`| ${n + 1} | ${i.query}${i.altQueries?.length ? ` (+${i.altQueries.length})` : ''} | ${i.score} ${i.label} | ${st} | ${(i.reasons || []).join(' · ')} | ${String(i.condition || '').replace(/\|/g, '/')} |`);
  });
  if (log.refresh.length) {
    L.push('', '## 갱신·진단 후보 (새 글 금지)', '');
    for (const r of log.refresh.slice(0, 10)) L.push(`- ${r.query} — ${r.why}${r.url ? ` (${r.url})` : ''}`);
  }
  if (tried.length) {
    L.push('', `## 이번에 잰 새 후보 ${tried.length}건`, '', '| 검색어 | 트랙 | 결과 |', '|---|---|---|');
    for (const t of tried.slice(0, 40)) L.push(`| ${t.query} | ${t.track} | ${t.result} |`);
  }
  if (log.closed.length) { L.push('', '## 이번에 닫힌 항목', ''); for (const c of log.closed) L.push(`- ${c}`); }
  L.push('', '점수는 웹문서 검색 API 기준이다. 통합검색 첫 화면에서 웹문서 블록이 어디 있는지는 사람이 봐야 안다(계획 §4-3).', '');
  return L.join('\n');
}

// ── 입력 읽기 ────────────────────────────────────────────────────────────
function publishedTargets() {
  const m = new Map();
  for (const f of readdirSync(ARTICLES).filter((x) => x.endsWith('.mdx'))) {
    const meta = parseArticleMeta(readFileSync(path.join(ARTICLES, f), 'utf8'));
    if (meta?.targetQuery) m.set(normKeyword(meta.targetQuery), f.replace(/\.mdx$/, ''));
  }
  return m;
}

function latestLog(prefix) {
  if (!existsSync(LOG_DIR)) return null;
  const f = readdirSync(LOG_DIR).filter((x) => x.startsWith(prefix) && x.endsWith('.json')).sort().pop();
  return f ? readJson(path.join(LOG_DIR, f)) : null;
}

function inboundMap() {
  const j = latestLog('naver-console-');
  const m = new Map();
  for (const r of j?.rows || []) if (r.keyword) m.set(normKeyword(r.keyword), r.clicks || 0);
  return m;
}

// ── 실행 ─────────────────────────────────────────────────────────────────
async function titlesOf(ep, query) {
  const j = await naverSearch(ep, query, { display: 100, sort: 'sim' });
  return (j.items || []).map((x) => stripTags(x.title));
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const write = args.includes('--write');
  const only = opt('--only');
  const want = (k) => !only || only === k;
  const budget = { t2: Number(opt('--t2') ?? BUDGET.t2), t3: Number(opt('--t3') ?? BUDGET.t3), new: Number(opt('--new') ?? BUDGET.new), remeasure: Number(opt('--remeasure') ?? BUDGET.remeasure) };
  const today = kstDate();
  const queue = readJson(QUEUE, { _readme: [], items: [] });
  const big = readJson(BIG, { axes: [] });
  const seen = readJson(SEEN, { _readme: ['naver-pipeline.mjs 가 잰 쿼리의 마지막 결과. 닫힘으로 잰 쿼리는 14일 동안 다시 재지 않는다(예산을 새 후보에 쓴다).'], queries: {} });
  const entries = buildLedger();
  const published = publishedTargets();
  const inbound = inboundMap();
  const known = new Set((queue.items || []).flatMap(queriesOf));
  const stats = { heads: 0, scouted: 0, open: 0, veto: 0, calls: 0 };
  const recentlyClosed = (q) => { const s = seen.queries[normKeyword(q)]; return s && !s.open && daysBetween(s.at, today) <= SEEN_CLOSED_DAYS; };
  const ledgerOf = (query) => {
    const r = checkCandidate(entries, { query, family: classifyFamily(query).family });
    return { verdict: r.verdict, program: r.program, adjacent: (r.adjacent || []).length, sameProgram: r.verdict === 'PASS' ? entries.filter((e) => e.program === r.program).length : 0, relatedSlugs: (r.matches || []).slice(0, 5).map((x) => x.slug) };
  };

  try {
    const plan = []; // { query, track, cluster, altQueries, unverified, inWindow, hint:{blogFreq} }

    if (want('remeasure')) {
      const due = (queue.items || []).filter((i) => ['proposed', 'approved'].includes(i.status) || (i.status === 'hold' && i.holdBy === 'pipeline'))
        .sort((a, b) => String(a.measuredAt).localeCompare(String(b.measuredAt))).slice(0, budget.remeasure);
      for (const i of due) plan.push({ query: i.query, track: i.track, cluster: i.cluster, remeasure: true, inWindow: false, hint: {} });
    }

    if (want('t2') && budget.t2 > 0) {
      let heads = headsOf(big);
      if (opt('--heads')) { const pick = opt('--heads').split(',').map((s) => s.trim()); heads = pick.map((h) => heads.find((x) => x.head === h) || { head: h, axis: null, cluster: null }); }
      const tpl = templateSuffixes(big);
      const groups = [];
      for (const h of heads) {
        const [blogTitles, kinTitles] = [await titlesOf('blog', h.head), await titlesOf('kin', h.head)];
        stats.calls += 2; stats.heads++;
        const mined = mineSuffixes(h.head, { blogTitles, kinTitles });
        const rows = mined.length >= 3 ? mined : [...mined, ...tpl.filter((s) => !mined.some((m) => m.suffix === s)).map((s) => ({ suffix: s, blogFreq: 0, kinFreq: 0, freq: 0 }))];
        const cands = foldNearDuplicates(rows.map((r) => ({ ...r, head: h.head, query: `${h.head} ${r.suffix}`, cluster: h.cluster })))
          .filter((c) => !known.has(normKeyword(c.query)) && !published.has(normKeyword(c.query)) && !recentlyClosed(c.query));
        const passed = [];
        for (const c of cands) { const lg = ledgerOf(c.query); if (lg.verdict === 'VETO') { stats.veto++; continue; } passed.push({ ...c, lg }); }
        groups.push(passed);
        process.stderr.write(`\r헤드 ${stats.heads}/${heads.length}`);
        await sleep(120);
      }
      process.stderr.write('\n');
      for (const c of roundRobin(groups, budget.t2)) plan.push({ query: c.query, track: 'T2', cluster: c.cluster, altQueries: c.altQueries, inWindow: false, hint: { blogFreq: c.blogFreq } });
    }

    if (want('t3') && existsSync(CALENDAR)) {
      const cal = readJson(CALENDAR, {});
      const due = (cal.items || []).filter((x) => x.query && x.writeBy && x.writeBy <= today && !(x.closeAt && x.closeAt < today) && !known.has(normKeyword(x.query)) && !recentlyClosed(x.query));
      for (const x of due.slice(0, budget.t3)) plan.push({ query: x.query, track: 'T3', cluster: x.cluster || null, inWindow: true, hint: {} });
    }

    if (want('new')) {
      const d = latestLog('naver-discover-');
      const rows = (d?.rows || []).filter((r) => !r.existing && !known.has(normKeyword(r.keyword)) && !recentlyClosed(r.keyword)).sort((a, b) => b.hits - a.hits);
      for (const r of rows.slice(0, budget.new)) plan.push({ query: r.keyword, track: 'NEW', cluster: r.cluster || null, unverified: true, inWindow: false, hint: {} });
    }

    const uniq = [...new Map(plan.map((p) => [normKeyword(p.query), p])).values()];
    console.error(`정찰 ${uniq.length}건 (재측정 ${uniq.filter((p) => p.remeasure).length} · T2 ${uniq.filter((p) => p.track === 'T2' && !p.remeasure).length} · T3 ${uniq.filter((p) => p.track === 'T3' && !p.remeasure).length} · NEW ${uniq.filter((p) => p.track === 'NEW' && !p.remeasure).length})`);

    const measured = [];
    for (const p of uniq) {
      const existing = (queue.items || []).find((i) => normKeyword(i.query) === normKeyword(p.query));
      const scout = await scoutQuery(p.query, { eyeOffset: existing?.serp?.eyeOffset ?? null });
      const kinTitles = scout.error ? [] : await titlesOf('kin', p.query);
      stats.calls += 3; stats.scouted++;
      const lg = ledgerOf(p.query);
      const open = !scout.error && (p.track === 'T2' ? scout.verdictT2 : scout.verdictT1) === 'open';
      if (open) stats.open++;
      if (!scout.error) seen.queries[normKeyword(p.query)] = { query: p.query, at: today, open, rank: scout.rank ?? null };
      measured.push({ ...p, scout, ledger: lg, demand: { kinExact: kinExactCount(p.query, kinTitles), ...(p.hint.blogFreq != null ? { blogFreq: p.hint.blogFreq } : {}), ...(inbound.has(normKeyword(p.query)) ? { inbound7d: inbound.get(normKeyword(p.query)) } : {}) } });
      process.stderr.write(scout.error ? '!' : open ? 'o' : 'x');
      await sleep(120);
    }
    process.stderr.write('\n');

    // 검색량은 정렬·가점용이라 열린 것만 잰다
    const openOnes = measured.filter((m) => !m.scout.error && (m.track === 'T2' ? m.scout.verdictT2 : m.scout.verdictT1) === 'open');
    if (openOnes.length) {
      const vol = await measureVolume(openOnes.map((m) => m.query));
      stats.calls += Math.ceil(openOnes.length / 4);
      const byKw = new Map(vol.rows.map((r) => [r.keyword, r]));
      for (const m of openOnes) { const v = byKw.get(m.query); if (v?.measured) Object.assign(m.demand, { rel30: v.rel30, ratio7: v.ratio7, born: v.born || undefined }); }
    }

    const { queue: nextQueue, log } = mergeQueue(queue, measured, { today, published });
    nextQueue.measuredBy = 'naver-pipeline.mjs (naver-scout·naver-ledger·naver-volume + 블로그·지식iN 제목 접미어·지식iN 같은 질문 수)';
    const tried = measured.filter((m) => !m.remeasure).map((m) => {
      const sc = m.scout;
      const open = !sc.error && (m.track === 'T2' ? sc.verdictT2 : sc.verdictT1) === 'open';
      const result = sc.error ? `측정 실패: ${sc.error}` : log.added.includes(m.query) ? `올림 (${nextQueue.items.find((i) => i.query === m.query)?.score}점)`
        : sc.rank != null ? `자사 ${sc.rank}위 → 갱신·진단` : !open ? `닫힘: ${(sc.reason || []).join(' · ')}` : m.ledger.verdict === 'VETO' ? '잠금 장부 VETO' : '열렸지만 점수 미달';
      return { query: m.query, track: m.track, result };
    });
    const report = renderReport({ queue: nextQueue, log, today, stats, tried });

    if (write) {
      mkdirSync(path.dirname(SEEN), { recursive: true });
      writeFileSync(QUEUE, JSON.stringify(nextQueue, null, 1) + '\n');
      writeFileSync(REPORT, report);
      writeFileSync(SEEN, JSON.stringify(seen, null, 1) + '\n');
      console.log(`→ ${path.relative(ROOT, QUEUE)} · ${path.relative(ROOT, REPORT)}`);
    } else {
      console.log('(드라이런 — 파일 안 씀. 적용은 --write)\n');
    }
    console.log(report);
  } catch (e) {
    // 인증 실패·예상 밖 오류에는 큐를 건드리지 않는다
    console.error(`\n❌ ${e instanceof NaverAuthError ? e.message : e.stack || e.message}`);
    process.exit(1);
  }
}
