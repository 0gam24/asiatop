#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// queue-set.mjs — 목록 위젯 버튼이 바꾸는 대기열 값: 운영자 보류·해제, 눈 확인 (API 호출 없음, LLM 0)
//
// 목록 위젯(scripts/audit/ops-widget.mjs) 버튼이 채팅에 넣는 지시를 처리한다(.claude/commands/목록.md).
//   보류: <검색어> …                → --status hold
//   눈확인: "<검색어>" = <첫 화면|한 번 스크롤|그 아래>  → --eye
// 눈 확인: 네이버 통합검색에서 웹문서 묶음이 화면 어디쯤인지는 공식 API 로 잴 수 없다(search.naver.com 수집 금지).
// 운영자가 직접 보고 누른 값을 큐 항목 serp.eyeOffset 에 넣고, naver-pipeline.mjs 의 exposureOf·autoPickOf 로 점수를 다시 계산한다.
// naver-pipeline.mjs 는 재측정 때 기존 eyeOffset 을 이어 쓴다. 값 3(그 아래)은 자리가 닫힌 것으로 보고 proposed 를 hold(holdBy eye)로 돌린다.
// 운영자 hold(holdBy operator·eye)는 파이프라인이 재측정하지 않고 21일 보존 뒤 지운다(KEEP_DAYS.hold).
//
// 실행:
//   node scripts/audit/queue-set.mjs --query "건보료 차량세금" --eye 1|2|3|"첫 화면"|"한 번 스크롤"|"그 아래"|clear [--dry-run]
//   node scripts/audit/queue-set.mjs --query "건보료 등등" --status hold|proposed [--reason "…"] [--dry-run]
//   node scripts/audit/queue-set.mjs --list-eye
// 쓰는 파일: docs/ops/pipeline-queue.json, docs/ops/radar/eye-offset.json (커밋은 목록.md 절차가 한다)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exposureOf, autoPickOf } from './naver-pipeline.mjs';
import { normKeyword } from './naver-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const QUEUE = path.join(ROOT, 'docs', 'ops', 'pipeline-queue.json');
const EYE_LOG = path.join(ROOT, 'docs', 'ops', 'radar', 'eye-offset.json');
const EYE_KEEP_DAYS = 30;
const EYE_LABEL = { 1: '첫 화면', 2: '한 번 스크롤', 3: '그 아래' };

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const DRY = args.includes('--dry-run');
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fb; } };

export function parseEye(v) {
  const s = String(v ?? '').replace(/["']/g, '').trim();
  if (/^clear$|^지움$|^삭제$/i.test(s)) return 0;
  if (/^[123]$/.test(s)) return Number(s);
  const n = s.replace(/\s+/g, '');
  if (n === '첫화면') return 1;
  if (n === '한번스크롤' || n === '한번') return 2;
  if (n === '그아래' || n === '아래') return 3;
  return null;
}

// 항목에 남은 값으로 exposureOf 를 다시 부른다. 저장되지 않는 입력(인접 글 수·창 안)은 reasons 에서 되살린다.
export function rescore(it, eyeOffset) {
  const reasons = it.reasons || [];
  const adjacent = Number((reasons.find((r) => /비슷한 우리 글 \d+편/.test(r)) || '').match(/(\d+)편/)?.[1] || 0);
  const inWindow = reasons.includes('창 안');
  const base = { track: it.track, demand: it.demand || {}, ledger: { ...(it.ledger || {}), adjacent }, unverified: !!it.unverified, inWindow };
  const before = exposureOf({ ...base, serp: { ...(it.serp || {}) } });
  const after = exposureOf({ ...base, serp: { ...(it.serp || {}), eyeOffset: eyeOffset || null } });
  // 다시 계산한 옛 점수가 저장된 점수와 같을 때만 새 계산을 믿는다. 다르면 눈 확인 가점만 바꾼다.
  if (before.score === it.score) return after;
  const bonus = (v) => (v === 1 ? 10 : v === 2 ? 5 : 0);
  const score = Math.max(0, Math.min(100, (it.score ?? 0) - bonus(it.serp?.eyeOffset) + bonus(eyeOffset)));
  return { score, label: score >= 70 ? '높음' : score >= 45 ? '중간' : '낮음', reasons: it.reasons, open: after.open };
}

function findItem(queue, query) {
  const q = normKeyword(query);
  return (queue.items || []).find((it) => [it.query, ...(it.altQueries || [])].some((x) => normKeyword(x) === q));
}

function saveEye(query, value) {
  const log = readJson(EYE_LOG, null) || {
    _readme: ['목록 위젯의 눈 확인 기록(scripts/audit/queue-set.mjs). 운영자가 네이버 통합검색에서 웹문서 묶음 위치를 직접 보고 누른 값이다. 1 첫 화면 · 2 한 번 스크롤 · 3 그 아래.', '큐 항목 serp.eyeOffset 이 원본이고 이 파일은 날짜 표시용이다. 30일 지난 기록은 저장할 때 지운다.'],
    entries: {},
  };
  log.entries ||= {};
  if (value) log.entries[query] = { value, label: EYE_LABEL[value], at: today };
  else delete log.entries[query];
  for (const [k, e] of Object.entries(log.entries)) if (!e?.at || daysBetween(e.at, today) > EYE_KEEP_DAYS) delete log.entries[k];
  if (!DRY) { mkdirSync(path.dirname(EYE_LOG), { recursive: true }); writeFileSync(EYE_LOG, JSON.stringify(log, null, 2) + '\n'); }
}

function main() {
  if (args.includes('--list-eye')) {
    const log = readJson(EYE_LOG, { entries: {} });
    const rows = Object.entries(log.entries || {}).sort((a, b) => (a[1].at < b[1].at ? 1 : -1));
    if (!rows.length) console.log('눈 확인 기록 없음');
    for (const [q, e] of rows) console.log(`${e.at}  ${e.label ?? EYE_LABEL[e.value]}  ${q}`);
    return;
  }
  const query = opt('--query');
  if (!query) { console.error('❌ --query "<검색어>" 가 필요하다'); process.exit(2); }
  const queue = readJson(QUEUE, null);
  if (!queue) { console.error('❌ docs/ops/pipeline-queue.json 을 읽지 못했다'); process.exit(1); }
  const it = findItem(queue, query);
  if (!it) { console.error(`❌ 대기열에 "${query}" 가 없다(query·altQueries 기준). 오늘 목록에서 다시 확인`); process.exit(1); }
  let msg = '';

  if (opt('--eye') !== undefined) {
    const v = parseEye(opt('--eye'));
    if (v == null) { console.error('❌ --eye 는 1·2·3·첫 화면·한 번 스크롤·그 아래·clear 중 하나'); process.exit(2); }
    const was = it.score;
    const ex = rescore(it, v);
    it.serp = { ...(it.serp || {}), eyeOffset: v || null };
    Object.assign(it, { score: ex.score, label: ex.label, reasons: ex.reasons });
    // autoPick=false 는 지킨다(naver-pipeline.mjs 재측정과 같은 규칙). 자매 상위로 꺼진 것만 다시 계산
    if (it.autoPick !== false || it.sisterTop != null) {
      it.autoPick = autoPickOf({ score: ex.score, track: it.track, query: it.query, unverified: !!it.unverified, ledgerVerdict: it.ledger?.verdict, demand: it.demand });
    }
    if (v === 3 && it.status === 'proposed') {
      Object.assign(it, { status: 'hold', holdBy: 'eye', holdAt: today, holdReason: `${today}: 웹문서 묶음이 첫 화면 아래(운영자 눈 확인)` });
    } else if (v !== 3 && it.status === 'hold' && it.holdBy === 'eye') {
      it.status = 'proposed'; delete it.holdBy; delete it.holdAt; delete it.holdReason;
    }
    saveEye(it.query, v);
    msg = v ? `눈 확인 "${it.query}" = ${EYE_LABEL[v]} · 점수 ${was} → ${it.score}${it.status === 'hold' ? ' · 보류로 돌림' : ''}` : `눈 확인 "${it.query}" 지움 · 점수 ${was} → ${it.score}`;
  } else if (opt('--status')) {
    const s = opt('--status');
    if (!['hold', 'proposed'].includes(s)) { console.error('❌ --status 는 hold 또는 proposed'); process.exit(2); }
    if (['approved', 'published', 'rejected'].includes(it.status)) { console.log(`"${it.query}" 는 ${it.status} 상태라 바꾸지 않았다`); return; }
    if (s === 'hold') {
      Object.assign(it, { status: 'hold', holdBy: 'operator', holdAt: today, holdReason: `${today}: ${opt('--reason') || '운영자 보류(목록 버튼)'}` });
      msg = `"${it.query}" 보류 (21일 보존, 파이프라인이 다시 재지 않음)`;
    } else {
      if (it.status === 'hold' && it.holdBy === 'sister') { console.log(`"${it.query}" 는 자매 사이트 주제라 보류를 풀지 않았다`); return; }
      it.status = 'proposed'; delete it.holdBy; delete it.holdAt; delete it.holdReason;
      msg = `"${it.query}" 보류 해제 (다음 측정부터 다시 잰다)`;
    }
  } else {
    console.error('❌ --eye 또는 --status 가 필요하다'); process.exit(2);
  }
  if (!DRY) writeFileSync(QUEUE, JSON.stringify(queue, null, 1) + '\n'); // naver-pipeline.mjs 와 같은 들여쓰기(1)
  console.log(`${DRY ? '[드라이런] ' : ''}${msg}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (isMain) main();
