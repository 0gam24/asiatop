#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// claims-guard.mjs — 허위 신뢰 주장 회귀 가드 (docs/23 §3-3 PR-B)
//
// 2026-06-11 자동 발행 파이프라인 폐기 후, 비콘텐츠 경로(템플릿·공개 페이지·
// 에이전트 프롬프트)에 폐기된 파이프라인의 현재형 서술("8단계 자동 검증을
// 거치며…")이 재유입되는 것을 차단한다. 과거형 서술("발행 당시 10단계
// 게이트(G0~G9)를 통과했습니다")만 허용.
//
// 실행: node scripts/audit/claims-guard.mjs   (위반 발견 시 exit 1)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// 금지 패턴 — 전부 "폐기된 8단계/G0~G8 표기" 또는 현재형 허위 서술의 시그니처.
// 통일된 사실: 과거 파이프라인 = "10단계 자동 검증 게이트(G0~G9)" + 과거형.
const FORBIDDEN = [
  { re: /8단계 자동 검증/, why: '폐기 파이프라인 표기 (정본: 10단계 G0~G9 + 과거형)' },
  { re: /8단계 (안전 )?게이트/, why: '폐기 파이프라인 표기' },
  { re: /G0~G8/, why: '폐기 단계 표기 (정본: G0~G9)' },
  { re: /검증 게이트.{0,20}(통과합니다|거치며|거칩니다|매칭합니다|매칭됩니다)/, why: '폐기 파이프라인의 현재형 서술' },
];

// 스캔 대상 — 콘텐츠 본문(MDX)은 제외 ("신청 절차 8단계" 등 무관 매치 방지)
const SCAN_DIRS = ['src', 'public', 'scripts', '.claude'];
const SKIP = [
  path.join('src', 'content', 'articles'), // 본문 MDX — 무관 도메인 표현
  path.join('public', 'network-mirror.json'), // 빌드 생성물 (외부 소스 미러)
  path.join('scripts', 'audit', 'claims-guard.mjs'), // 자기 자신
  'node_modules',
  'dist',
];
const EXT = new Set(['.astro', '.ts', '.tsx', '.mjs', '.js', '.json', '.md', '.txt', '.xml']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(ROOT, p);
    if (SKIP.some((s) => rel.startsWith(s))) continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(name))) yield p;
  }
}

const violations = [];
for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir);
  try { statSync(abs); } catch { continue; }
  for (const file of walk(abs)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const { re, why } of FORBIDDEN) {
        if (re.test(line)) {
          violations.push({ file: path.relative(ROOT, file), line: i + 1, why, text: line.trim().slice(0, 120) });
        }
      }
    });
  }
}

if (violations.length) {
  console.error(`\n🚫 claims-guard: 허위/폐기 신뢰 주장 ${violations.length}건 검출\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} — ${v.why}\n    ${v.text}`);
  }
  console.error('\n과거 파이프라인 언급은 반드시 과거형 + "10단계 자동 검증 게이트(G0~G9)" 표기 (docs/23 §3-3).');
  process.exit(1);
}
console.log('✅ claims-guard: 허위 신뢰 주장 0건');
