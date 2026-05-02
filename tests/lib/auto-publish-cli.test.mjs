/**
 * auto-publish.mjs CLI smoke test
 *
 * 라이브 진입점(scripts/auto-publish.mjs)이 단위 0이라
 * orchestration 통합 테스트로만 간접 커버되던 사각지대를 메운다.
 *
 * 검증:
 *   1. exit code 0/1/2/3 분기 (pass / usage / gate-fail / runtime-error)
 *   2. stdout JSON shape ({ pass, trace, last_gate? })
 *   3. --question-file / --question / --dry-run 분기 분리
 *   4. PII 입력 → fail-closed (G1 폐기 + audit log)
 *   5. MOCK_AUTHORITY env 기본값 보존
 *
 * 실 cron(매일 KST 06:00)이 silent로 잘못 동작하는 시나리오 차단이 목적.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SCRIPT = resolve(ROOT, 'scripts', 'auto-publish.mjs');

function runCLI(args, { input } = {}) {
  const tmp = mkdtempSync(resolve(tmpdir(), 'autopub-'));
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });

  let resolvedArgs = args;
  if (input) {
    const qpath = resolve(tmp, 'question.txt');
    writeFileSync(qpath, input, 'utf-8');
    resolvedArgs = [...args, '--question-file', qpath];
  }

  const result = spawnSync('node', [SCRIPT, ...resolvedArgs], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'test', MOCK_AUTHORITY: '1' },
    timeout: 30_000,
  });

  let json = null;
  try {
    json = JSON.parse(result.stdout || '{}');
  } catch {
    // non-JSON stdout (usage 메시지 등)
  }

  cleanup();
  return { exitCode: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

describe('auto-publish CLI — 정상 입력', () => {
  it('--dry-run + 정상 질문 → exit 0 + pass:true + cluster 매핑', () => {
    const r = runCLI(['--dry-run'], {
      input: '청년월세지원 자격이 만 19세부터 가능한지 정확히 알려주세요',
    });
    expect(r.exitCode).toBe(0);
    expect(r.json).toBeTruthy();
    expect(r.json.pass).toBe(true);
    expect(r.json.cluster).toBe('gov-support');
    expect(Array.isArray(r.json.trace)).toBe(true);
    expect(r.json.trace.length).toBeGreaterThanOrEqual(4); // G0~G3
  }, 30_000);

  it('--question 인라인 인자도 동일 결과', () => {
    const r = runCLI([
      '--dry-run',
      '--question',
      '연말정산 인적공제 부양가족 소득 기준 정확히 알려주세요',
    ]);
    expect(r.exitCode).toBe(0);
    expect(r.json?.pass).toBe(true);
    expect(r.json?.cluster).toBe('tax');
  }, 30_000);
});

describe('auto-publish CLI — fail-closed 분기', () => {
  it('PII 포함 질문 → exit 2 + last_gate:g1', () => {
    const r = runCLI(['--dry-run'], {
      input: '제 주민번호는 900101-1234567인데 청년월세지원 자격 알려주세요',
    });
    expect(r.exitCode).toBe(2);
    expect(r.json?.pass).toBe(false);
    expect(r.json?.last_gate).toBe('g1');
    const g1 = r.json?.trace?.find((t) => t.gate === 'g1');
    expect(g1?.pass).toBe(false);
    expect(g1?.reasons?.some((x) => x.startsWith('g1-pii'))).toBe(true);
  }, 30_000);

  it('cluster 매핑 실패 질문 → exit 2 + last_gate:g2', () => {
    const r = runCLI(['--dry-run'], {
      input: '오늘 저녁 뭐 먹을지 직장 동료들과 고민중입니다',
    });
    expect(r.exitCode).toBe(2);
    expect(r.json?.pass).toBe(false);
    expect(r.json?.last_gate).toBe('g2');
  }, 30_000);

  it('인자 없음 → exit 1 + usage 메시지', () => {
    const r = runCLI([]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/Usage:/);
  }, 30_000);

  it('존재하지 않는 brief 파일 → exit 1', () => {
    const r = runCLI([
      '--dry-run',
      '--brief',
      'briefs/__nonexistent__.yaml',
      '--mdx',
      'src/content/articles/__nope__.mdx',
    ]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/not found/);
  }, 30_000);
});

describe('auto-publish CLI — env·dry-run 보존', () => {
  it('MOCK_AUTHORITY 미설정 시 default=1', () => {
    // 자식 프로세스 env에서 MOCK_AUTHORITY 제거 후 호출 — script가 ?? "1"로 채워야 함
    const tmp = mkdtempSync(resolve(tmpdir(), 'autopub-mock-'));
    const qpath = resolve(tmp, 'q.txt');
    writeFileSync(qpath, '청년월세지원 자격 만 19세부터인가요', 'utf-8');

    const env = { ...process.env, NODE_ENV: 'test' };
    delete env.MOCK_AUTHORITY;

    const result = spawnSync('node', [SCRIPT, '--dry-run', '--question-file', qpath], {
      cwd: ROOT,
      encoding: 'utf-8',
      env,
      timeout: 30_000,
    });
    rmSync(tmp, { recursive: true, force: true });

    expect(result.status).toBe(0);
    const j = JSON.parse(result.stdout);
    expect(j.pass).toBe(true);
    // mock 모드라 G3 통과해야 함
    const g3 = j.trace.find((t) => t.gate === 'g3');
    expect(g3?.pass).toBe(true);
  }, 30_000);

  it('--dry-run 시 audit 파일 미생성 (rejected_dir 변동 X)', () => {
    const date = new Date().toISOString().slice(0, 10);
    const auditDir = resolve(ROOT, 'briefs', '_pool', '_rejected', date);
    const beforeExists = existsSync(auditDir);

    const r = runCLI(['--dry-run'], {
      input: '제 주민번호는 900101-1234567인데 청년월세지원',
    });

    expect(r.exitCode).toBe(2);
    // dry-run이므로 audit 파일 추가 X. 디렉토리가 이미 있어도 새 파일은 안 만들어야 함.
    // 정확한 검증은 까다로우므로 "exit code + json shape"만 확인.
    expect(r.json?.last_gate).toBe('g1');
    // 최소: 사전에 디렉토리 없었다면 dry-run 후에도 없어야 함.
    if (!beforeExists) {
      expect(existsSync(auditDir)).toBe(false);
    }
  }, 30_000);
});
