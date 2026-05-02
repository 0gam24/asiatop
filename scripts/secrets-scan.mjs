#!/usr/bin/env node
/**
 * 머니룩 시크릿 사후 스캔 — 전체 레포지토리 검사
 *
 * 사용:
 *   pnpm secrets:scan          (수동 실행)
 *   .github/workflows/secrets-scan.yml (CI 자동 실행)
 *
 * 차이 (vs pre-commit hook):
 *   - pre-commit: 스테이징 파일만, 빠르게
 *   - secrets:scan: 전체 트래킹 파일, 더 광범위
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const ROOT = process.cwd();

const SECRET_PATTERNS = [
  // Cloud
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Access Key', re: /aws_secret_access_key\s*=\s*["']?[A-Za-z0-9/+=]{40}/ },
  { name: 'GCP Service Account Private Key', re: /"private_key":\s*"-----BEGIN [A-Z ]+PRIVATE KEY-----/ },
  { name: 'Google API Key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Cloudflare Deploy Hook', re: /webhooks\/deploy_hooks\/[a-f0-9-]{36}/ },
  { name: 'Cloudflare API Token', re: /CLOUDFLARE_API_TOKEN\s*=\s*["']?[A-Za-z0-9_-]{40}/ },

  // Auth providers
  { name: 'GitHub Personal Access Token', re: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'Stripe Live Secret', re: /sk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Restricted Live', re: /rk_live_[A-Za-z0-9]{24,}/ },

  // AI providers
  { name: 'Anthropic API Key', re: /sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{80,}/ },
  { name: 'OpenAI API Key', re: /sk-[A-Za-z0-9]{48,}/ },

  // 한국 공공·금융
  { name: 'data.go.kr Key (env-style)', re: /DATA_GO_KR_KEY\s*=\s*["']?[A-Za-z0-9%/+=]{40,}/ },
  { name: 'BOK ECOS Key (env-style)', re: /BOK_API_KEY\s*=\s*["']?[A-Za-z0-9]{30,}/ },

  // Generic high-entropy assignments
  {
    name: 'High-entropy secret assignment',
    re: /(api_key|apikey|secret|password|passwd|token|access_token|refresh_token|private_key)\s*[:=]\s*["'][A-Za-z0-9_/+=-]{32,}["']/i,
  },
];

// 화이트리스트: 검수 대상 제외 (의도적 예시·정책·스캐너 본체)
// pre-commit hook의 DOC_WHITELIST_REGEX와 동기화 필수.
const WHITELIST_FILES = new Set([
  '.env.example',
  '.env.local.example',
  'SECURITY.md',
  'docs/KEY-WALKTHROUGH.md',
  'docs/KEY-ISSUANCE-GUIDE.md',
  'scripts/secrets-scan.mjs',
  'scripts/git-hooks/pre-commit',
]);

const WHITELIST_DIRS = ['node_modules/', '.git/', 'dist/', '.astro/', '.cache/'];

const SCAN_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.yml', '.yaml',
  '.astro', '.md', '.mdx',
  '.env', '.txt', '.sh',
  '',  // no extension (e.g., scripts/git-hooks/pre-commit)
]);

function getTrackedFiles() {
  // git이 추적하는 모든 파일 (gitignore 적용 후)
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' });
  return out.split('\n').filter(Boolean);
}

function shouldSkip(file) {
  if (WHITELIST_FILES.has(file)) return true;
  for (const d of WHITELIST_DIRS) {
    if (file.startsWith(d)) return true;
  }
  const ext = extname(file).toLowerCase();
  if (!SCAN_EXTENSIONS.has(ext)) return true;
  return false;
}

const files = getTrackedFiles();
const findings = [];

for (const f of files) {
  if (shouldSkip(f)) continue;

  let stat;
  try { stat = statSync(f); } catch { continue; }
  if (!stat.isFile()) continue;
  if (stat.size > 5 * 1024 * 1024) continue; // 5MB 이상 스킵

  let txt;
  try { txt = readFileSync(f, 'utf-8'); } catch { continue; }

  for (const { name, re } of SECRET_PATTERNS) {
    const lines = txt.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        findings.push({ file: f, line: i + 1, pattern: name, sample: lines[i].slice(0, 120) });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✅ 시크릿 패턴 발견 0건 — 전체 트래킹 파일 클린');
  process.exit(0);
}

console.error(`\n❌ 시크릿 패턴 ${findings.length}건 발견 — 즉시 회수 필요\n`);
for (const f of findings) {
  console.error(`  📄 ${f.file}:${f.line}`);
  console.error(`     [${f.pattern}]`);
  console.error(`     ${f.sample}\n`);
}
console.error('🛑 git history 노출 가능 — git filter-branch 또는 BFG로 제거 필요');
console.error('   참고: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository');
process.exit(1);
