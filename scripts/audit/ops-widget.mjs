#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// ops-widget.mjs — "목록" 위젯 HTML 조각 생성 (읽기 전용, API 호출 없음, LLM 0)
//
// 운영자 지시(2026-10-07): "이런 식으로 오늘 빈틈 키워드를 찾아줘(awoo 목록 화면). 철저하게 데이터 중심으로."
// 출력(stdout)을 그대로 채팅 위젯(show_widget)에 넣는다. 버튼은 sendPrompt 로 채팅에 지시문을 넣는다.
// 버튼 문구는 "/" 로 시작하지 않는다(슬래시로 시작하면 데스크톱 앱에서 메시지가 도착하지 않았다. 2026-09-28 머니룩, 2026-09-25 awoo).
// 처리 절차는 .claude/commands/목록.md.
//
// 입력(전부 이미 측정된 파일):
//   docs/ops/pipeline-queue.json   오늘 빈틈 대기열 (naver-pipeline.mjs, 공식 API 측정)
//   docs/ops/DAILY-KEYWORDS.md     갱신·진단 후보(자사 4~30위) 줄
//   docs/ops/next-wave.json        다음에 크게 뜰 주제 (next-wave.mjs, 없으면 그 칸을 뺀다)
//   docs/ops/radar/eye-offset.json 운영자 눈 확인 기록 (queue-set.mjs)
//   docs/ops/cadence.json          오늘 신규 상한
//   src/content/articles/*.mdx     발행 여부(targetQuery)·오늘 발행 수 (git 추적 파일만)
//   docs/revenue-log/private/deep-*.json  최근 7일 애드센스 수익 (gitignore. 값은 stdout 에만 나가고 파일로 남기지 않는다)
//
// 실행: node scripts/audit/ops-widget.mjs [--limit=10] [--waves=6] [--count] [--no-revenue]   (pnpm audit:widget)
// 금지: 예상 수익·전망 문구. 표시하는 값은 측정값과 정의가 적힌 분류뿐이다(2026-09-30 운영자 "실제 데이터를 기준으로만").
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OPS = path.join(ROOT, 'docs', 'ops');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const PRIVATE = path.join(ROOT, 'docs', 'revenue-log', 'private');
const argv = process.argv.slice(2);
const argNum = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); const n = a ? Number(a.slice(k.length + 3)) : d; return Number.isFinite(n) && n > 0 ? n : d; };
const LIMIT = argNum('limit', 10);
const WAVES = argNum('waves', 6);
const GOAL_USD = 200; // 운영자 목표 2026-10-07 (docs/28)
const EYE_TOP = 5;

const DAY = 864e5;
const kst = (offset = 0) => new Date(Date.now() + 9 * 3600e3 + offset * DAY).toISOString().slice(0, 10);
const TODAY = kst(0);
const YDAY = kst(-1);
const md = (d) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '');
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const readJson = (p, fb = null) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fb; } };
const r1 = (x) => (x == null || !Number.isFinite(Number(x)) ? null : Math.round(Number(x) * 10) / 10);

// ── 글 frontmatter (필요한 칸만) ─────────────────────────────────────────
function frontmatter(text) {
  const t = text.replace(/\r\n/g, '\n');
  if (!t.startsWith('---')) return {};
  const end = t.indexOf('\n---', 3);
  const out = {};
  for (const line of t.slice(4, end < 0 ? undefined : end).split('\n')) {
    const m = line.match(/^(title|publishedAt|updatedAt|targetQuery|cluster):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function gitTracked() {
  try { return new Set(execFileSync('git', ['ls-files', 'src/content/articles'], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((l) => l.trim().split('/').pop()).filter(Boolean)); }
  catch { return null; }
}
function addedBySubject(file) {
  try { return execFileSync('git', ['log', '--diff-filter=A', '--format=%s', '-1', '--', `src/content/articles/${file}`], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

function loadArticles() {
  const tracked = gitTracked();
  const out = [];
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const fm = frontmatter(readFileSync(path.join(ARTICLES, f), 'utf8'));
    out.push({ file: f, slug: f.replace(/\.mdx$/, ''), tracked: !tracked || tracked.has(f), ...fm });
  }
  return out;
}

// ── 오늘 상한 (cadence.json — publish-cadence.mjs 와 같은 규칙: effectiveFrom ≤ 날짜 중 가장 늦은 항목) ──────────
function capFor(date) {
  const c = readJson(path.join(OPS, 'cadence.json'), null);
  const h = (c?.history || []).filter((x) => x.effectiveFrom <= date).sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1)).pop();
  return h ? { max: h.maxPerDay, stage: h.stage } : { max: 1, stage: '?' };
}

function publishCount(articles) {
  const count = (day) => {
    const list = articles.filter((a) => a.tracked && a.publishedAt === day);
    let routine = 0;
    for (const a of list) if (/사이클/.test(addedBySubject(a.file))) routine++;
    return { total: list.length, routine, manual: list.length - routine, list };
  };
  return { today: count(TODAY), yday: count(YDAY), cap: capFor(TODAY) };
}

function countLine(pc) {
  const t = pc.today;
  return `오늘 신규 ${t.total}건(루틴 ${t.routine} · 수동 ${t.manual}) · 어제 ${pc.yday.total}건 · 오늘 상한 ${pc.cap.max}편(${pc.cap.stage}단계)`;
}

// ── 애드센스 최근 7일 (비공개 로그, stdout 전용) ─────────────────────────
function revenue7() {
  if (argv.includes('--no-revenue') || !existsSync(PRIVATE)) return null;
  const files = readdirSync(PRIVATE).filter((f) => /^deep-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) return null;
  const j = readJson(path.join(PRIVATE, files.at(-1)), null);
  const d = (j?.site_daily_30d || []).slice(-7);
  if (d.length < 7) return null;
  const avg = d.reduce((s, r) => s + Number(r.ESTIMATED_EARNINGS || 0), 0) / d.length;
  return { avg, from: d[0].DATE, to: d.at(-1).DATE };
}

// ── 빈틈 대기열 ────────────────────────────────────────────────────────
const KIND = { gov: '관공서', 'stale-gov': '관공서', public: '공공기관', org: '단체', press: '언론', 'stale-press': '언론', ugc: '커뮤니티·위키', commercial: '일반 사이트', 'stale-commercial': '일반 사이트', tool: '계산기·도구', finco: '금융사', law: '법률', naver: '네이버', sister: '자매 사이트', ours: '우리' };
function top10Line(top10 = []) {
  const c = new Map();
  for (const x of top10) { const k = KIND[String(x).split(':')[0]] ?? '기타'; c.set(k, (c.get(k) ?? 0) + 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
}

function designationReason(it) {
  const c = String(it.condition || '');
  const out = [];
  if (/민간 대출/.test(c)) out.push('민간 대출');
  if (/수요 신호 없음/.test(c)) out.push('질문·검색량 적음');
  if ((it.reasons || []).some((r) => /자매 사이트/.test(r))) out.push('awoo가 3위 안');
  if (/지자체·어느 차수|지원금/.test(c) && !out.length) out.push('지원금류');
  if (it.ledger?.verdict && it.ledger.verdict !== 'PASS') out.push(`장부 ${it.ledger.verdict}`);
  return out.join(' · ') || '자동 선택 꺼짐';
}

function refreshCandidates() {
  let text = '';
  try { text = readFileSync(path.join(OPS, 'DAILY-KEYWORDS.md'), 'utf8'); } catch { return []; }
  const rank = new Map();
  for (const m of text.matchAll(/^\|\s*([^|]+?)\s*\|\s*T\d\s*\|\s*자사 (\d+)위/gm)) rank.set(m[1], Number(m[2]));
  const sec = text.split('## 갱신·진단 후보')[1]?.split('\n## ')[0] ?? '';
  const out = [];
  for (const m of sec.matchAll(/^- (.+?) — .*?\((https:\/\/asiatop\.co\.kr\/[^)\s]+)\)/gm)) out.push({ query: m[1], url: m[2], rank: rank.get(m[1]) ?? null });
  return out;
}

// ── HTML 조각 ──────────────────────────────────────────────────────────
const btn = (label, prompt, cls = '') => `<button type="button"${cls ? ` class="${cls}"` : ''} onclick="${esc(`sendPrompt(${JSON.stringify(prompt)})`)}">${esc(label)}</button>`;
const EYE = { 1: '첫 화면', 2: '한 번 스크롤', 3: '그 아래' };

function gapRow(it, idx, eyeLog) {
  const d = it.demand || {};
  const s = it.serp || {};
  const hi = (it.score ?? 0) >= 70;
  const facts = [
    `지식iN 같은 질문 ${d.kinExact ?? 0}건`,
    `뺏을 수 있는 자리 ${s.openSlots ?? 0}`,
    `위 5개 중 관공서·공단·도구 ${s.wallTop5 ?? 0}`,
    s.newsWall != null ? `최근 7일 기사 ${s.newsWall}건` : null,
    (d.ratio7 ?? 0) >= 1.5 ? `최근 7일 검색 ${d.ratio7}배` : null,
  ].filter(Boolean).join(' · ');
  const vol = (d.rel30 ?? 0) > 0 ? `검색량 ${r1(d.rel30)} (실업급여 = 100)` : '검색량 데이터랩에 안 잡힘';
  const rank = s.rank ? `우리 글 ${s.rank}위` : '우리 글 30위 밖';
  const comp = top10Line(s.top10);
  const ev = it.serp?.eyeOffset ?? null;
  const evAt = eyeLog?.entries?.[it.query]?.at ?? null;
  let eye = '';
  if (idx < EYE_TOP) {
    const b = [1, 2, 3].map((v) => btn(EYE[v], `눈확인: "${it.query}" = ${EYE[v]}. 목록 갱신`, ev === v ? 'on' : '')).join('');
    eye = `<div class="eye"><span class="mut">${ev ? `눈 확인됨${evAt ? ` ${md(evAt)}` : ''}: ${EYE[ev]}` : '네이버에서 직접 보고 눌러 주세요 · 웹문서 묶음이 어디쯤?'}</span>${b}</div>`;
  }
  return `<div class="row"><div class="l">
<div><span class="q">${esc(it.query)}</span><span class="tag ${hi ? 't-hi' : 't-mid'}">${hi ? '높음' : '중간'} ${it.score}</span>${it.status === 'approved' ? '<span class="tag t-acc">승인됨</span>' : ''}${it.wave ? `<span class="tag t-acc">${esc(`선점 · ${it.wave}`)}</span>` : ''}</div>
<div class="sub">${esc(facts)}</div>
<div class="mut">${esc(`${vol} · ${rank}${comp ? ` · 위 10개: ${comp}` : ''}`)}</div>
${eye}</div><div class="btns">${btn('발행 지시 ↗', `발행: ${it.query}. 목록 버튼 지시, 큐 id ${it.id}`)}${btn('보류', `보류: ${it.query}. 목록 버튼, 큐를 hold 로`)}</div></div>`;
}

const STAGE = { rising: ['지금 뜨는 중', 't-hi'], soon: ['곧 뜸', 't-mid'], growing: ['커지는 중', 't-acc'], thin: ['큰데 우리 글 적음', 't-mid'] };
function waveRow(w) {
  const [label, cls] = STAGE[w.stage] ?? ['', ''];
  const parts = [
    `지금 ${r1(w.level)}`,
    w.growth != null ? `직전 3주의 ${w.growth}배` : (w.fromZero ? '직전 3주 0에서 새로 잡힘' : null),
    `우리 글 ${w.posts}개${w.lastPost ? `(마지막 ${md(w.lastPost)})` : ''}`,
    w.season && w.season.up >= 1.5 ? `작년엔 ${w.season.peakMonth}월에 ${w.season.up}배로 커짐` : null,
    w.calendar ? `달력 ${md(w.calendar.peakDate)} ${w.calendar.event}` : null,
    w.queued ? `목록에 ${w.queued}건` : null,
  ].filter(Boolean).join(' · ');
  const act = w.posts <= 2
    ? btn('선점 ↗', `선점: "${w.term}" 다음 물결. 세부 검색어로 쪼개 빈틈 목록에 넣기`)
    : btn('갱신 ↗', `갱신: "${w.term}" 다음 물결. 이 주제 기존 글 갱신 후보 보기`);
  return `<div class="row"><div class="l"><div><span class="q">${esc(w.term)}</span><span class="tag ${cls}">${esc(label)}</span></div><div class="sub">${esc(parts)}</div></div><div class="btns">${act}${btn('보류', `보류: "${w.term}" 물결. 감시 목록에서 빼기`)}</div></div>`;
}

function render() {
  const articles = loadArticles();
  const usedQ = new Set(articles.filter((a) => a.targetQuery).map((a) => norm(a.targetQuery)));
  const todayQ = new Set(articles.filter((a) => a.targetQuery && a.publishedAt === TODAY).map((a) => norm(a.targetQuery)));
  const pc = publishCount(articles);
  const queue = readJson(path.join(OPS, 'pipeline-queue.json'), { items: [] });
  const eyeLog = readJson(path.join(OPS, 'radar', 'eye-offset.json'), { entries: {} });
  const wave = readJson(path.join(OPS, 'next-wave.json'), null);
  const fresh = queue.updatedAt === TODAY;
  const isUsed = (it) => [it.query, ...(it.altQueries || [])].some((q) => usedQ.has(norm(q)));
  const live = (queue.items || []).filter((it) => it.measuredAt === queue.updatedAt && (it.score ?? 0) >= 45);
  const isWave = (it) => it.manual === true || String(it.id || '').startsWith('빈틈:');
  const picks = live.filter((it) => (it.status === 'approved' || (it.status === 'proposed' && (it.autoPick || isWave(it)))) && !isUsed(it))
    .sort((a, b) => (a.status === 'approved' ? 0 : 1) - (b.status === 'approved' ? 0 : 1) || b.score - a.score || (b.demand?.kinExact ?? 0) - (a.demand?.kinExact ?? 0));
  const shown = picks.slice(0, LIMIT);
  const manual = live.filter((it) => it.status === 'proposed' && !it.autoPick && !isWave(it) && !isUsed(it)).sort((a, b) => b.score - a.score);
  const publishedToday = (queue.items || []).filter((it) => [it.query, ...(it.altQueries || [])].some((q) => todayQ.has(norm(q))));
  const sister = (queue.items || []).filter((it) => it.status === 'hold' && it.holdBy === 'sister');
  const refresh = refreshCandidates();
  const rev = revenue7();

  const h = [];
  h.push(`<h2 class="sr-only">${esc(`${TODAY} 네이버 빈틈 글감 ${picks.length}건과 다음에 크게 뜰 주제`)}</h2>`);
  h.push(`<style>
.w{font-size:14px;line-height:1.55}
.hd{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--text-secondary);padding:2px 0 10px}
.goal{background:var(--surface-1);border-radius:var(--radius);padding:10px 14px;margin:0 0 6px}
.goal .g1{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px}
.bar{height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin:8px 0 2px}
.bar>span{display:block;height:100%;min-width:3px;background:#1D9E75}
.row{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;padding:11px 0;border-top:0.5px solid var(--border)}
.l{min-width:0;flex:1}
.q{font-weight:500;font-size:15px}
.tag{font-size:12px;margin-left:8px}
.t-hi{color:var(--text-success)}.t-mid{color:var(--text-warning)}.t-acc{color:var(--text-accent)}
.sub{color:var(--text-secondary);font-size:13px}
.mut{color:var(--text-muted);font-size:12px}
.btns{display:flex;gap:6px;flex-shrink:0}
.eye{margin-top:5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.eye button,.chips button{font-size:12px;padding:2px 8px;height:auto}
.eye button.on{border-color:var(--border-accent);color:var(--text-accent)}
.sec{margin:18px 0 4px;font-size:13px;color:var(--text-secondary);font-weight:500}
.note{font-size:12px;color:var(--text-muted);padding:8px 0 0;border-top:0.5px solid var(--border)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
</style>`);
  h.push('<div class="w">');
  h.push(`<div class="hd"><span>${esc(`오늘 쓸 글감 ${picks.length}건 · 자리 잡을 수 있는 것 중 점수 순 · 큐 ${md(queue.updatedAt)} 측정`)}</span><span>${esc(countLine(pc))}</span></div>`);
  if (!fresh) h.push(`<div class="sub" style="color:var(--text-danger);padding:0 0 8px">${esc(`오늘(${md(TODAY)}) 측정분이 아직 없습니다. 큐는 ${queue.updatedAt ?? '없음'} 측정입니다.`)}</div>`);
  if (rev) {
    const pct = Math.min(100, (rev.avg / GOAL_USD) * 100);
    h.push(`<div class="goal"><div class="g1"><span style="font-weight:500">목표 하루 ${GOAL_USD}달러</span><span>${esc(`최근 7일 하루 평균 $${rev.avg.toFixed(2)} (${md(rev.from)}~${md(rev.to)} 애드센스 측정)`)}</span></div><div class="bar"><span style="width:${pct.toFixed(2)}%"></span></div></div>`);
  }
  if (!shown.length) h.push(`<div class="row"><div class="sub">${esc('자동으로 고를 수 있는 오늘 글감이 없습니다. 아래 운영자 지정 글감이나 다음 물결의 선점으로 채울 수 있습니다.')}</div></div>`);
  shown.forEach((it, i) => h.push(gapRow(it, i, eyeLog)));
  if (picks.length > shown.length) h.push(`<div class="mut" style="padding:6px 0">${esc(`점수 순 ${shown.length}건만 보였습니다. 나머지 ${picks.length - shown.length}건: ${picks.slice(shown.length).map((x) => `${x.query} ${x.score}`).join(' · ')}`)}</div>`);

  const notes = [];
  if (publishedToday.length) notes.push(`<div>${esc(`오늘 발행됨: ${publishedToday.map((x) => x.query).join(' · ')}`)}</div>`);
  if (manual.length) notes.push(`<div style="margin-top:6px">${esc(`운영자가 지정해야 쓰는 글감 ${manual.length}건 (누르면 발행 지시)`)}<div class="chips">${manual.map((x) => btn(`${x.query} ${x.score} · ${designationReason(x)}`, `발행: ${x.query}. 목록 버튼 지시(운영자 지정), 큐 id ${x.id}`)).join('')}</div></div>`);
  if (refresh.length) notes.push(`<div style="margin-top:6px">${esc('새 글 대신 기존 글을 고칠 후보 (오늘 측정에서 우리 글이 4~30위)')}<div class="chips">${refresh.map((x) => btn(`${x.query}${x.rank ? ` · 우리 ${x.rank}위` : ''}`, `갱신: "${x.query}" 기존 글 ${x.url} 진단·갱신 후보 보기`)).join('')}</div></div>`);
  if (sister.length) notes.push(`<div style="margin-top:6px">${esc(`자매 사이트 awoo 주제라 뺀 것: ${sister.map((x) => x.query).join(' · ')}`)}</div>`);
  if (notes.length) h.push(`<div class="note">${notes.join('')}</div>`);

  if (wave?.items?.length) {
    const ws = wave.items.filter((w) => STAGE[w.stage]).slice(0, WAVES);
    const fading = wave.items.filter((w) => w.stage === 'fading');
    h.push(`<div class="sec">${esc(`다음에 크게 뜰 주제 · 묶음 검색량(실업급여 = 100) · ${md(wave.meta?.measuredAt)} 측정`)}</div>`);
    if (!ws.length) h.push(`<div class="mut">${esc('지금 뜨는 중·곧 뜸·커지는 중인 묶음이 없습니다.')}</div>`);
    for (const w of ws) h.push(waveRow(w));
    if (fading.length) h.push(`<div class="mut" style="padding:6px 0;border-top:0.5px solid var(--border)">${esc(`꺾이는 중: ${fading.map((w) => `${w.term} ${w.growth}배`).join(' · ')}. 새 글보다 기존 글 갱신만`)}</div>`);
    h.push(`<div class="mut" style="padding-top:4px">${esc('지금 뜨는 중 = 최근 7일이 직전 3주의 1.4배 이상·크기 8 이상 / 곧 뜸 = 작년 이맘때 한두 달 뒤 1.5배 이상 / 커지는 중 = 1.2배 이상 / 꺾이는 중 = 0.6배 이하. 크기는 실업급여 최근 28일 평균 = 100')}</div>`);
  } else {
    h.push(`<div class="sec">${esc('다음에 크게 뜰 주제: 자료 없음 (pnpm audit:wave)')}</div>`);
  }
  h.push('</div>');
  return h.join('\n');
}

if (argv.includes('--count')) {
  console.log(countLine(publishCount(loadArticles())));
} else {
  console.log(render());
}
