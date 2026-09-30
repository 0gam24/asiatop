#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// publish-cadence.mjs (발행 캐던스 가드 — 구글 회복 P0, 2026-08-26)
//
// 2026-08-18 구글 스팸 업데이트 사이트 단위 억제의 핵심 원인은 "일 3~4편
// 기계적 발행" 풋프린트다. 본 가드는 신규 글(publishedAt >= 2026-08-27)을
// 날짜(publishedAt 기준)별로 세어, 그 날짜에 적용되는 하루 상한을 넘으면
// 빌드·CI 를 차단한다.
//
// 2026-09-30 개정 (운영자 결정: 단계적 네이버 성장): 고정 1편 대신 단계 캐던스.
// 하루 상한의 단일 기준(SSoT)은 docs/ops/cadence.json 의 history 다. 어떤 날짜의
// 상한은 effectiveFrom 이 그 날짜 이하인 항목 중 가장 늦은 항목의 maxPerDay 이므로,
// 과거 날짜는 당시 상한(1편)으로 검사한다. 파일이 없거나 깨지면 가장 보수적인
// 1편으로 검사하고 경고한다. 단계 변경은 운영자 승인으로만 한다.
//
// - 리프레시(updatedAt 갱신)는 집계하지 않는다 — 신규 publishedAt 만 검사.
// - 규칙 발효일 이전 발행분(685편 히스토리)은 검사 대상 아님.
// - pnpm build 체인 선두에서 실행 → CI·Cloudflare 배포 자동 차단.
//
// 실행: node scripts/audit/publish-cadence.mjs  (또는 pnpm audit:cadence)
// ════════════════════════════════════════════════════════════════════════

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const CADENCE_REL = 'docs/ops/cadence.json';
const CADENCE_FILE = join(ROOT, ...CADENCE_REL.split('/'));

// 규칙 발효일 — 이 날짜 이후 publishedAt 글만 검사 (히스토리 소급 금지)
const RULE_DATE = '2026-08-27';
// 가장 보수적인 하루 상한. cadence.json 이 없거나 깨졌을 때, 적용 항목이 없는 날짜에 쓴다.
const FALLBACK_MAX = 1;
// 파일 값이 이보다 크면 깨진 것으로 본다 (최고 단계 C = 일 4편). 더 올리려면 이 값도 함께 바꾸는 PR 이 필요하다.
const HARD_MAX = 4;

const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // 2026-02-30 같은 날짜 거부
};

// cadence.json 을 읽어 effectiveFrom 오름차순 이력을 돌려준다. 문제가 있으면 { error }.
function loadCadence() {
  if (!existsSync(CADENCE_FILE)) return { error: `${CADENCE_REL} 없음` };
  let data;
  try {
    data = JSON.parse(readFileSync(CADENCE_FILE, 'utf8'));
  } catch (e) {
    return { error: `${CADENCE_REL} JSON 파싱 실패 (${e.message})` };
  }
  const history = data?.history;
  if (!Array.isArray(history) || history.length === 0) return { error: `${CADENCE_REL} history 배열이 없거나 비어 있음` };
  const seen = new Set();
  for (const [i, h] of history.entries()) {
    const at = `${CADENCE_REL} history[${i}]`;
    if (!h || typeof h !== 'object') return { error: `${at} 형식 오류` };
    if (typeof h.stage !== 'string' || !h.stage) return { error: `${at}.stage 누락` };
    if (!isDate(h.effectiveFrom)) return { error: `${at}.effectiveFrom 이 YYYY-MM-DD 날짜가 아님 (${JSON.stringify(h.effectiveFrom)})` };
    if (!Number.isInteger(h.maxPerDay) || h.maxPerDay < 1 || h.maxPerDay > HARD_MAX) {
      return { error: `${at}.maxPerDay 는 1~${HARD_MAX} 정수여야 함 (${JSON.stringify(h.maxPerDay)})` };
    }
    const stageMax = data.stages?.[h.stage]?.maxPerDay;
    if (stageMax !== undefined && stageMax !== h.maxPerDay) {
      return { error: `${at}.maxPerDay(${h.maxPerDay}) 가 stages.${h.stage}.maxPerDay(${stageMax}) 와 다름` };
    }
    if (seen.has(h.effectiveFrom)) return { error: `${at}.effectiveFrom ${h.effectiveFrom} 중복` };
    seen.add(h.effectiveFrom);
  }
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return { history: sorted, currentStage: data.currentStage };
}

const cadence = loadCadence();
if (cadence.error) {
  console.warn(`⚠️ [publish-cadence] ${cadence.error}. 가장 보수적인 일 ${FALLBACK_MAX}편 상한으로 검사합니다.`);
} else {
  const last = cadence.history.at(-1);
  if (cadence.currentStage !== undefined && cadence.currentStage !== last.stage) {
    console.warn(
      `⚠️ [publish-cadence] ${CADENCE_REL} currentStage(${cadence.currentStage}) 가 history 마지막 단계(${last.stage}) 와 다릅니다. 검사는 history 기준입니다.`,
    );
  }
}

// 그 날짜(YYYY-MM-DD, KST)에 적용되는 상한과 단계 이름
function capFor(date) {
  let hit = null;
  if (!cadence.error) for (const h of cadence.history) if (h.effectiveFrom <= date) hit = h;
  return hit ? { max: hit.maxPerDay, label: `${hit.stage}단계` } : { max: FALLBACK_MAX, label: '기본값' };
}

const byDate = new Map(); // 'YYYY-MM-DD' → [slug, ...]

for (const name of readdirSync(ARTICLES_DIR)) {
  if (!/\.mdx?$/.test(name)) continue;
  const text = readFileSync(join(ARTICLES_DIR, name), 'utf8');
  const pub = text.match(/^publishedAt:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!pub || pub < RULE_DATE) continue;
  if (!byDate.has(pub)) byDate.set(pub, []);
  byDate.get(pub).push(name.replace(/\.mdx?$/, ''));
}

const violations = [...byDate.entries()]
  .map(([date, slugs]) => ({ date, slugs, ...capFor(date) }))
  .filter((v) => v.slugs.length > v.max)
  .sort((a, b) => a.date.localeCompare(b.date));

// 오늘(KST) 상한과 다음 예정 변경을 출력에 함께 보여준다
const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const today = capFor(todayKst);
const next = cadence.error ? null : cadence.history.find((h) => h.effectiveFrom > todayKst);
const capSummary =
  `오늘(${todayKst} KST) 상한 일 ${today.max}편(${today.label})` +
  (next ? `, ${next.effectiveFrom}부터 일 ${next.maxPerDay}편(${next.stage}단계)` : '') +
  (cadence.error ? '' : `, 기준 ${CADENCE_REL}`);

if (violations.length > 0) {
  console.error(
    `❌ [publish-cadence] 하루 상한을 넘긴 발행일 ${violations.length}건. 신규 글 캐던스 위반 (검사 시작 ${RULE_DATE}, ${capSummary})`,
  );
  for (const v of violations) {
    console.error(`   ${v.date}: ${v.slugs.length}편 (그날 상한 ${v.max}편, ${v.label}): ${v.slugs.join(', ')}`);
  }
  console.error('   신규 글은 그 날짜의 상한까지만 냅니다. 넘친 글은 이번 PR 에서 빼거나 publishedAt 을 다음 날로 미루세요.');
  console.error(`   상한 변경은 운영자 승인으로만 합니다 (${CADENCE_REL} history 에 항목 추가).`);
  process.exit(1);
}

const total = [...byDate.values()].reduce((n, s) => n + s.length, 0);
console.log(
  `✅ [publish-cadence] 통과: ${RULE_DATE} 이후 신규 ${total}편, 날짜별 상한 위반 0건 (${capSummary})`,
);
