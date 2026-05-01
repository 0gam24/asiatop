#!/usr/bin/env node
/**
 * 머니룩 새 brief 생성 헬퍼
 *
 * 사용:
 *   pnpm brief:new
 *   node scripts/new-brief.mjs
 *
 * 동작:
 *   1. 인터랙티브 prompt (readline) 또는 --cluster --slug --date 인자
 *   2. /briefs/_template.yaml 읽음
 *   3. meta 섹션 자동 채움 (brief_id, cluster, slug, scheduled_publish, brief_author, created_at)
 *   4. /briefs/{brief_id}.yaml 으로 저장
 *   5. 다음 단계 안내
 *
 * 외부 의존성 추가 X — Node 내장 readline·child_process 만 사용.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BRIEFS_DIR = resolve(ROOT, 'briefs');
const TEMPLATE_PATH = resolve(BRIEFS_DIR, '_template.yaml');

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
};
const ok = (m) => console.log(`${C.green}✅${C.reset} ${m}`);
const fail = (m) => { console.error(`${C.red}❌${C.reset} ${m}`); process.exit(1); };
const info = (m) => console.log(`${C.blue}ℹ${C.reset}  ${m}`);
const dim = (m) => console.log(`${C.dim}${m}${C.reset}`);

import { VALID_CLUSTERS } from './lib/brief-loader.mjs';

// ─────────────────────────────────────────────
// 1. 입력 수집 (CLI 인자 우선, 부족하면 인터랙티브)
// ─────────────────────────────────────────────
function getArg(flag) {
  // Supports "--flag value" and "--flag=value" (GNU long-option style).
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag && args[i + 1] !== undefined) return args[i + 1];
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return null;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getGitUserName() {
  // 우선순위: env GIT_USER → git config user.name → "unknown"
  if (process.env.GIT_USER) return process.env.GIT_USER;
  try {
    const name = execSync('git config user.name', { cwd: ROOT, encoding: 'utf-8' }).trim();
    if (name) return name;
  } catch {}
  return 'unknown';
}

function isValidSlug(s) {
  return /^[a-z0-9-]+$/.test(s) && s.length >= 1 && s.length <= 50;
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

const rl = createInterface({ input: stdin, output: stdout });

async function ask(question, validator, defaultValue) {
  const suffix = defaultValue ? ` ${C.dim}(기본: ${defaultValue})${C.reset}` : '';
  while (true) {
    const ans = (await rl.question(`${question}${suffix}: `)).trim() || defaultValue || '';
    if (!ans) {
      console.error(`  ${C.red}값이 필요합니다${C.reset}`);
      continue;
    }
    const result = validator(ans);
    if (result === true) return ans;
    console.error(`  ${C.red}${result}${C.reset}`);
  }
}

// ─────────────────────────────────────────────
// 2. 템플릿 존재 확인
// ─────────────────────────────────────────────
if (!existsSync(TEMPLATE_PATH)) {
  fail(`템플릿이 없습니다: briefs/_template.yaml\n   먼저 _template.yaml 을 생성하세요.`);
}

// ─────────────────────────────────────────────
// 3. 입력 수집
// ─────────────────────────────────────────────
console.log(`${C.bold}📝 새 brief 생성${C.reset}\n`);

let cluster = getArg('--cluster');
let slug = getArg('--slug');
let scheduledPublish = getArg('--date');

if (!cluster) {
  console.log(`${C.dim}사용 가능한 클러스터:${C.reset}`);
  VALID_CLUSTERS.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  cluster = await ask('cluster (12개 중 하나)', (s) => {
    return VALID_CLUSTERS.includes(s) ? true : `12개 enum 중 하나여야 합니다: ${VALID_CLUSTERS.join(', ')}`;
  });
}
if (!VALID_CLUSTERS.includes(cluster)) {
  fail(`잘못된 cluster: ${cluster}\n   사용 가능: ${VALID_CLUSTERS.join(', ')}`);
}

if (!slug) {
  slug = await ask('slug (영문 소문자·하이픈, 50자 이내)', (s) => {
    return isValidSlug(s) ? true : '영문 소문자·숫자·하이픈만, 50자 이내여야 합니다';
  });
}
if (!isValidSlug(slug)) {
  fail(`잘못된 slug: ${slug}\n   영문 소문자·숫자·하이픈만, 50자 이내`);
}

if (!scheduledPublish) {
  scheduledPublish = await ask(
    '발행 예정일 (YYYY-MM-DD)',
    (s) => isValidDate(s) ? true : 'YYYY-MM-DD 형식이어야 합니다',
    todayISO(),
  );
}
if (!isValidDate(scheduledPublish)) {
  fail(`잘못된 날짜: ${scheduledPublish}`);
}

rl.close();

// ─────────────────────────────────────────────
// 4. 자동 채움 값 생성
// ─────────────────────────────────────────────
const briefId = `${scheduledPublish}-${slug}`;
const createdAt = todayISO();
const briefAuthor = getGitUserName();
const outPath = resolve(BRIEFS_DIR, `${briefId}.yaml`);

// 출력 파일 중복 검사
if (existsSync(outPath)) {
  fail(`이미 존재하는 brief: ${briefId}.yaml\n   다른 slug 또는 날짜를 사용하세요.`);
}

// ─────────────────────────────────────────────
// 5. 템플릿 읽기·meta 섹션 자동 채움
// ─────────────────────────────────────────────
let template;
try {
  template = readFileSync(TEMPLATE_PATH, 'utf-8');
} catch (e) {
  fail(`템플릿 읽기 실패: ${e.message}`);
}

// meta 섹션의 빈 따옴표를 정규식으로 정확히 치환
// (다른 섹션 영향 X — 라인 단위 매칭)
function replaceMetaField(txt, field, value) {
  // 라인이 정확히 "  field: \"\"" 또는 "  field: \"기존값\"" 패턴
  const re = new RegExp(`^(\\s*${field}:\\s*)"[^"]*"`, 'm');
  if (!re.test(txt)) {
    throw new Error(`템플릿에서 meta.${field} 라인을 찾을 수 없습니다`);
  }
  return txt.replace(re, `$1"${value}"`);
}

let filled = template;
try {
  filled = replaceMetaField(filled, 'brief_id', briefId);
  filled = replaceMetaField(filled, 'slug', slug);
  filled = replaceMetaField(filled, 'cluster', cluster);
  filled = replaceMetaField(filled, 'scheduled_publish', scheduledPublish);
  filled = replaceMetaField(filled, 'brief_author', briefAuthor);
  filled = replaceMetaField(filled, 'created_at', createdAt);
} catch (e) {
  fail(`템플릿 치환 실패: ${e.message}`);
}

// ─────────────────────────────────────────────
// 6. 저장
// ─────────────────────────────────────────────
if (!existsSync(BRIEFS_DIR)) {
  mkdirSync(BRIEFS_DIR, { recursive: true });
}

try {
  writeFileSync(outPath, filled, 'utf-8');
} catch (e) {
  fail(`파일 저장 실패: ${e.message}`);
}

// ─────────────────────────────────────────────
// 7. 출력
// ─────────────────────────────────────────────
const relPath = `briefs/${briefId}.yaml`;
console.log('');
ok(`새 brief 생성됨: ${C.bold}${relPath}${C.reset}\n`);
console.log(`  ${C.dim}brief_id:${C.reset}           ${briefId}`);
console.log(`  ${C.dim}cluster:${C.reset}            ${cluster}`);
console.log(`  ${C.dim}slug:${C.reset}               ${slug}`);
console.log(`  ${C.dim}scheduled_publish:${C.reset}  ${scheduledPublish}`);
console.log(`  ${C.dim}brief_author:${C.reset}       ${briefAuthor}`);
console.log(`  ${C.dim}created_at:${C.reset}         ${createdAt}\n`);

console.log(`${C.bold}📋 다음 단계${C.reset}`);
console.log(`  1. 에디터로 ${C.yellow}${relPath}${C.reset} 열기`);
console.log(`  2. niche·reader_intent·keywords·content_angle·primary_sources·structure 채우기 (10~15분)`);
console.log(`  3. 검증: ${C.yellow}pnpm brief:validate ${relPath}${C.reset}`);
console.log(`  4. (Gap 2 예정) ${C.yellow}pnpm article -- --brief ${relPath}${C.reset}\n`);
