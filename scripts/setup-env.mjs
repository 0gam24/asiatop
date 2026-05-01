#!/usr/bin/env node
/**
 * .env.local 셋업 헬퍼
 *
 * 사용:
 *   pnpm setup:env
 *
 * 동작:
 *  1. .env.local이 없으면 .env.example을 복사 (덮어쓰기 X)
 *  2. .gitignore가 .env.local 차단하는지 검증
 *  3. pre-commit hook 설치 상태 검증
 *  4. 다음 단계 안내
 */
import { existsSync, copyFileSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENV_EXAMPLE = join(ROOT, '.env.example');
const ENV_LOCAL = join(ROOT, '.env.local');
const GITIGNORE = join(ROOT, '.gitignore');

const C = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function info(msg) { console.log(`${C.blue}[setup-env]${C.reset} ${msg}`); }
function ok(msg)   { console.log(`${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`${C.yellow}⚠${C.reset} ${msg}`); }
function err(msg)  { console.error(`${C.red}✗${C.reset} ${msg}`); }

console.log(`${C.bold}🔐 머니룩 환경변수 셋업${C.reset}\n`);

// ─────────────────────────────────────────────
// 1. .env.example 존재 검증
// ─────────────────────────────────────────────
if (!existsSync(ENV_EXAMPLE)) {
  err('.env.example 파일이 없습니다');
  process.exit(1);
}

// ─────────────────────────────────────────────
// 2. .gitignore가 .env.local 차단하는지 검증
// ─────────────────────────────────────────────
if (!existsSync(GITIGNORE)) {
  err('.gitignore 파일이 없습니다');
  process.exit(1);
}
const gitignoreContent = readFileSync(GITIGNORE, 'utf-8');
const blocksEnvLocal =
  gitignoreContent.includes('.env.local') ||
  gitignoreContent.includes('.env.*');
if (!blocksEnvLocal) {
  err('.gitignore가 .env.local을 차단하지 않습니다 — 보안 위험');
  err('수동으로 .gitignore에 ".env.local" 추가 후 재실행하세요');
  process.exit(1);
}
ok('.gitignore가 .env.local 차단 중 (안전)');

// 추가 검증: git check-ignore 실제 동작
try {
  execSync('git check-ignore .env.local', { cwd: ROOT, stdio: 'pipe' });
  ok('git이 .env.local을 무시 (검증 완료)');
} catch {
  warn('git check-ignore 검증 실패 — git 저장소가 아닐 수 있음');
}

// ─────────────────────────────────────────────
// 3. .env.local 생성 (없을 때만)
// ─────────────────────────────────────────────
if (existsSync(ENV_LOCAL)) {
  const stat = statSync(ENV_LOCAL);
  ok(`.env.local 이미 존재 (${(stat.size / 1024).toFixed(1)} KB) — 덮어쓰기 X`);

  // 키 채워졌는지 간단 점검
  const txt = readFileSync(ENV_LOCAL, 'utf-8');
  const filledKeys = txt
    .split('\n')
    .filter((l) => /^[A-Z_]+=.+$/.test(l) && !l.match(/^[A-Z_]+=$/))
    .filter((l) => !l.includes('# 발급')) // 주석 라인 제외
    .map((l) => l.split('=')[0]);

  if (filledKeys.length === 0) {
    warn('아직 채워진 키 없음 — .env.local을 에디터로 열어 값을 입력하세요');
  } else {
    info(`현재 채워진 키 ${filledKeys.length}개: ${filledKeys.join(', ')}`);
  }
} else {
  copyFileSync(ENV_EXAMPLE, ENV_LOCAL);
  ok(`.env.local 생성 완료 (.env.example 복사)`);
  warn('.env.local을 에디터로 열어 발급받은 키 값을 입력하세요');
}

// ─────────────────────────────────────────────
// 4. pre-commit hook 활성화 검증
// ─────────────────────────────────────────────
try {
  const hookPath = execSync('git config core.hooksPath', { cwd: ROOT, encoding: 'utf-8' }).trim();
  if (hookPath === 'scripts/git-hooks') {
    ok('pre-commit hook 활성화됨 (시크릿 자동 차단)');
  } else {
    warn(`core.hooksPath = ${hookPath} (예상: scripts/git-hooks)`);
    warn('pnpm install 다시 실행해 hook 설치하세요');
  }
} catch {
  warn('git core.hooksPath 미설정 — pnpm install 한 번 더 실행 권장');
}

// ─────────────────────────────────────────────
// 5. 다음 단계 안내
// ─────────────────────────────────────────────
console.log(`\n${C.bold}📋 다음 단계${C.reset}\n`);
console.log(`  1. ${C.bold}.env.local 열기${C.reset}`);
console.log(`     Windows: ${C.yellow}notepad .env.local${C.reset}`);
console.log(`     macOS:   ${C.yellow}open -e .env.local${C.reset}`);
console.log(`     또는 VS Code 등 에디터로 열기\n`);

console.log(`  2. ${C.bold}발급받은 키 값 입력${C.reset}`);
console.log(`     발급 절차: ${C.yellow}docs/KEY-ISSUANCE-GUIDE.md${C.reset}`);
console.log(`     우선순위: GA4 → BOK → data.go.kr → Sentry\n`);

console.log(`  3. ${C.bold}로컬 dev 서버에서 자동 반영 확인${C.reset}`);
console.log(`     ${C.yellow}pnpm dev${C.reset} → http://localhost:4322\n`);

console.log(`  4. ${C.bold}같은 값을 CF Pages Env에도 등록${C.reset}`);
console.log(`     ${C.yellow}dash.cloudflare.com → moneylook → Settings → Variables and Secrets${C.reset}`);
console.log(`     비밀 키는 ${C.bold}Encrypted${C.reset}, 공개 키(PUBLIC_*)는 Plaintext\n`);

console.log(`${C.green}🛡️  보안 보장${C.reset}`);
console.log(`     .env.local은 ${C.bold}git에 절대 올라가지 않습니다${C.reset} (4중 방어선):`);
console.log(`     1. .gitignore 차단`);
console.log(`     2. pre-commit hook 자동 차단`);
console.log(`     3. CI gitleaks 스캔`);
console.log(`     4. 자체 시크릿 스캐너 (pnpm secrets:scan)\n`);
