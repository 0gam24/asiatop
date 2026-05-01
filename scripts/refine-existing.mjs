#!/usr/bin/env node
/**
 * 기존 글 AI 탐지 위험도 점수화 + 자동 보정 (규칙 기반)
 *
 * Usage:
 *   pnpm refine                       # 60편 모두 점수 (수정 안 함, 리포트만)
 *   pnpm refine -- --slug <name>      # 1편 점수 + 보정
 *   pnpm refine -- --all --fix        # 60편 점수 + 자동 보정
 *
 * 보정 항목 (규칙 기반, API 키 불필요):
 *   - LLM 머리말 제거 ("결론적으로 말씀드리면" 등)
 *   - 자기정정 어투 제거 ("~? 아닙니다.")
 *   - 클리셰 교체 ("정말 중요합니다" → 삭제 또는 "구체 수치 제시")
 *   - 호칭 정리 ("여러분" → 삭제)
 *
 * 위험도 점수 (0~100, 높을수록 AdSense 탐지 위험):
 *   +20 LLM 머리말 등장
 *   +15 자기정정 어투
 *   +10 클리셰 (×횟수)
 *   +10 호칭 ("여러분" 등)
 *   +5 동일 단락 동일 표현 반복
 *   +5 sources < 3
 *   +10 .gov.kr 0개
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'src/content/articles');

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  return args[i + 1] ?? true;
}
const SLUG = arg('slug');
const ALL = args.includes('--all');
const FIX = args.includes('--fix');

const AI_PATTERNS = [
  { pat: /결론적으로 말씀드리면[,\s]*/g, msg: 'LLM 머리말', score: 20, replace: '' },
  { pat: /이번 글에서는[,\s]*/g, msg: 'LLM 머리말', score: 20, replace: '' },
  { pat: /먼저 살펴보면[,\s]*/g, msg: 'LLM 머리말', score: 20, replace: '' },
  { pat: /자, 그럼[,\s]*/g, msg: 'LLM 전환', score: 15, replace: '' },
  { pat: /([가-힣\s]{3,30}\?)\s*\n*\s*아닙니다\.\s*/g, msg: '자기정정', score: 15, replace: '' },
  { pat: /정말 중요합니다\.?/g, msg: '클리셰', score: 10, replace: '' },
  { pat: /꼭 알아두셔야 합니다\.?/g, msg: '클리셰', score: 10, replace: '' },
  { pat: /반드시 기억하세요\.?/g, msg: '클리셰', score: 10, replace: '' },
  { pat: /\b여러분[,\s]?/g, msg: '호칭 여러분', score: 10, replace: '' },
  { pat: /독자분들[,\s]?/g, msg: '호칭 독자분들', score: 10, replace: '' },
  { pat: /이렇게 보면[,\s]*/g, msg: '메타 코멘트', score: 8, replace: '' },
  { pat: /지금까지 살펴본/g, msg: '메타 코멘트', score: 8, replace: '본 글의' },
];

function scoreArticle(file, raw) {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;
  const [, fm, body] = fmMatch;

  const findings = [];
  let score = 0;

  for (const { pat, msg, score: s } of AI_PATTERNS) {
    const matches = body.match(pat);
    if (matches && matches.length > 0) {
      const totalScore = s * matches.length;
      score += Math.min(totalScore, 30); // 단일 패턴 최대 30점 캡
      findings.push({ msg, count: matches.length, score: Math.min(totalScore, 30) });
    }
  }

  // 동일 표현 한 단락 반복 (간단 버전: 같은 문장 시작 6단어 중복)
  const paragraphs = body.split(/\n\s*\n/);
  let dupCount = 0;
  for (const p of paragraphs) {
    const sentences = p.split(/[.!?。]\s+/);
    const starts = new Set();
    for (const s of sentences) {
      const head = s.replace(/[#*_`>~|-]/g, '').trim().split(/\s+/).slice(0, 4).join(' ');
      if (head.length > 8) {
        if (starts.has(head)) dupCount++;
        else starts.add(head);
      }
    }
  }
  if (dupCount > 0) {
    score += Math.min(dupCount * 3, 15);
    findings.push({ msg: '동일 문두 반복', count: dupCount, score: Math.min(dupCount * 3, 15) });
  }

  // sources, .gov.kr
  const sourceUrls = [...fm.matchAll(/url:\s*["']?(https?:\/\/[^"'\s]+)/g)].map((m) => m[1]);
  if (sourceUrls.length < 3) {
    score += 5;
    findings.push({ msg: `sources ${sourceUrls.length}개 (<3)`, count: 1, score: 5 });
  }
  const govDoms = ['.go.kr', '.or.kr', 'korea.kr'];
  const govCount = sourceUrls.filter((u) => govDoms.some((d) => u.includes(d))).length;
  if (govCount === 0) {
    score += 10;
    findings.push({ msg: '.gov.kr/.or.kr 0개', count: 1, score: 10 });
  }

  score = Math.min(score, 100);
  return { file, score, findings };
}

function fixArticle(raw) {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return raw;
  const [, fm, body] = fmMatch;

  let fixed = body;
  let changes = 0;
  for (const { pat, replace } of AI_PATTERNS) {
    const before = fixed;
    fixed = fixed.replace(pat, replace);
    if (fixed !== before) changes++;
  }

  // 빈 줄 정리
  fixed = fixed.replace(/\n{3,}/g, '\n\n').trim() + '\n';

  return { mdx: `---\n${fm}\n---\n\n${fixed}`, changes };
}

function listFiles() {
  if (SLUG) return [`${SLUG}.mdx`];
  return readdirSync(DIR).filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));
}

const files = listFiles();
const results = [];

for (const f of files) {
  const path = join(DIR, f);
  const raw = readFileSync(path, 'utf-8');
  const score = scoreArticle(f, raw);
  if (!score) continue;

  if (FIX && score.score > 0) {
    const { mdx, changes } = fixArticle(raw);
    if (changes > 0) {
      writeFileSync(path, mdx, 'utf-8');
      score.fixed = changes;
    }
  }
  results.push(score);
}

results.sort((a, b) => b.score - a.score);

console.log(`\n📊 AI 탐지 위험도 점수 (${files.length}편)\n`);

const dist = { high: 0, med: 0, low: 0, clean: 0 };
for (const r of results) {
  if (r.score === 0) dist.clean++;
  else if (r.score < 15) dist.low++;
  else if (r.score < 35) dist.med++;
  else dist.high++;
}
console.log(`   🟢 0   (안전): ${dist.clean}편`);
console.log(`   🟡 1-14 (낮음): ${dist.low}편`);
console.log(`   🟠 15-34(중간): ${dist.med}편`);
console.log(`   🔴 35+  (높음): ${dist.high}편\n`);

if (results.some((r) => r.score >= 15)) {
  console.log(`📋 위험 점수 15+ 글:`);
  for (const r of results.filter((x) => x.score >= 15)) {
    console.log(`   ${String(r.score).padStart(3)} pts  ${r.file.padEnd(45)} ${r.fixed ? `[${r.fixed} 수정]` : ''}`);
    for (const f of r.findings) {
      console.log(`         · ${f.msg} ×${f.count} (+${f.score}점)`);
    }
  }
}

if (FIX) {
  const fixed = results.filter((r) => r.fixed).length;
  console.log(`\n✅ 보정 완료: ${fixed}편`);
}

process.exit(results.some((r) => r.score >= 35) && !FIX ? 1 : 0);
