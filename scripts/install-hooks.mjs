#!/usr/bin/env node
/**
 * git hooks 설치 스크립트
 * pnpm install 시 자동 실행 (package.json scripts.prepare).
 *
 * 동작:
 *  1. core.hooksPath = scripts/git-hooks 설정 → 버전 관리되는 hook 활성
 *  2. Unix 계열에서 실행 권한 부여 (Windows는 git이 자동 처리)
 *
 * 안전장치:
 *  - .git 디렉토리가 없으면 (CI 등) 무시
 *  - hook 파일이 없으면 무시
 */
import { execSync } from 'node:child_process';
import { existsSync, statSync, chmodSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GIT_DIR = join(ROOT, '.git');
const HOOKS_DIR = join(ROOT, 'scripts', 'git-hooks');

function log(msg) {
  console.log(`[install-hooks] ${msg}`);
}

if (!existsSync(GIT_DIR)) {
  log('git 저장소 X — hook 설치 스킵');
  process.exit(0);
}

if (!existsSync(HOOKS_DIR)) {
  log('scripts/git-hooks 디렉토리 X — hook 설치 스킵');
  process.exit(0);
}

try {
  execSync(`git config core.hooksPath scripts/git-hooks`, { cwd: ROOT });
  log('✓ core.hooksPath = scripts/git-hooks');
} catch (e) {
  log(`⚠️ git config 설정 실패: ${e.message}`);
  process.exit(0);
}

// Unix 계열에서 hook 파일 실행 권한 부여
if (process.platform !== 'win32') {
  for (const f of readdirSync(HOOKS_DIR)) {
    const p = join(HOOKS_DIR, f);
    if (statSync(p).isFile()) {
      try {
        chmodSync(p, 0o755);
      } catch {}
    }
  }
}

log('✅ git hook 설치 완료 (pre-commit 시 시크릿 점검 자동)');
