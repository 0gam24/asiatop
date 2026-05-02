#!/usr/bin/env node
/**
 * Passage Chunking 감사 — R48 #48-5
 *
 * AI 답변 엔진(ChatGPT·Perplexity·Google AI Overviews·Gemini)은 본문에서
 * "한 줄 정의 + 핵심 수치 + 출처 + 갱신일" 청크를 추출해 인용한다.
 * 본 감사기는 글 본문이 다음 청킹 패턴을 따르는지 검증.
 *
 * 검증 항목 (자동 발행 글에 한해 critical, 기존 글은 warn):
 *   C1 (warn)     H2 ≥ 3 — 청크 진입점 충분
 *   C2 (warn)     H2 직후 첫 단락이 80자 이내 한 줄 정의 형태 (자동 발행 강제)
 *   C3 (warn)     본문 어딘가에 핵심 수치 인용 (\d+(원|만원|%|년|개월|일)|\d+년\s*\d+월) ≥ 3
 *   C4 (info)     <dfn> 1차 정의 격리 시도 — 권고 수준 (강제 X)
 *
 * 사용:
 *   node scripts/audit/passage-chunking.mjs           # 모든 글 감사 (warn 출력)
 *   node scripts/audit/passage-chunking.mjs --strict  # critical violation 시 exit 1
 *   node scripts/audit/passage-chunking.mjs --auto-only  # aiAssisted=true 글만 감사
 *
 * V1: 기존 108글에 대해 warn만. 자동 발행 글(aiAssisted=true) 등장 시 strict 토글.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

const STRICT = process.argv.includes('--strict');
const AUTO_ONLY = process.argv.includes('--auto-only');

/**
 * 한 줄 정의 청크 패턴 (≤ 80자, 명확한 정의문).
 * - 끝이 "이다·이며·다·요·합니다" 등으로 종료
 * - 길이 ≤ 80자 (중복 청킹 방지)
 */
function isOneLineDefinition(text) {
  const stripped = text.trim();
  if (stripped.length > 80) return false;
  if (stripped.length < 10) return false;
  return /(이다|이며|이다\.|입니다|다\.|요\.|니다\.|니다)$/.test(stripped);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) yield full;
  }
}

function parseArticle(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;
  const [, frontmatter, body] = fmMatch;
  return { frontmatter, body };
}

function extractFrontmatterField(frontmatter, field) {
  const re = new RegExp(`^${field}:\\s*(.*)$`, 'm');
  const m = frontmatter.match(re);
  return m ? m[1].trim() : null;
}

/**
 * H2 청크 추출 — 각 H2 다음 첫 paragraph (빈 줄 전까지).
 * 코드블록·HTML 블록·표·리스트는 paragraph로 보지 않음.
 */
function extractH2Chunks(body) {
  const chunks = [];
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let inHtmlBlock = false;
  let currentH2 = null;
  let firstParagraph = null;
  let collectingPara = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^\s*<[A-Za-z]/.test(line) || /^\s*<\//.test(line)) {
      inHtmlBlock = /^\s*<(?!\/)/.test(line);
      continue;
    }

    const h2Match = line.match(/^##\s+(.+?)\s*$/);
    if (h2Match) {
      if (currentH2 !== null) {
        chunks.push({ heading: currentH2, firstParagraph });
      }
      currentH2 = h2Match[1].replace(/[*_`]/g, '');
      firstParagraph = null;
      collectingPara = true;
      continue;
    }

    if (collectingPara && currentH2 !== null) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (firstParagraph) collectingPara = false;
        continue;
      }
      if (
        /^[-*>|]/.test(trimmed) ||
        /^#/.test(trimmed) ||
        /^<[A-Za-z]/.test(trimmed)
      ) {
        collectingPara = false;
        continue;
      }
      firstParagraph = (firstParagraph ?? '') + (firstParagraph ? ' ' : '') + trimmed;
    }
  }
  if (currentH2 !== null) {
    chunks.push({ heading: currentH2, firstParagraph });
  }
  return chunks;
}

function auditArticle(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseArticle(content);
  if (!parsed) return null;

  const aiAssisted = extractFrontmatterField(parsed.frontmatter, 'aiAssisted') === 'true';
  if (AUTO_ONLY && !aiAssisted) return null;

  const chunks = extractH2Chunks(parsed.body);
  const issues = [];

  // C1 — H2 ≥ 3
  if (chunks.length < 3) {
    issues.push({
      level: aiAssisted ? 'critical' : 'warn',
      rule: 'C1',
      msg: `H2 ${chunks.length}개 (≥ 3 권장 — AI 청크 진입점 부족)`,
    });
  }

  // C2 — H2 직후 첫 paragraph 한 줄 정의
  let definitionChunkCount = 0;
  for (const c of chunks) {
    if (c.firstParagraph && isOneLineDefinition(c.firstParagraph)) {
      definitionChunkCount++;
    }
  }
  const defRatio = chunks.length > 0 ? definitionChunkCount / chunks.length : 0;
  if (chunks.length >= 3 && defRatio < 0.4) {
    issues.push({
      level: aiAssisted ? 'critical' : 'warn',
      rule: 'C2',
      msg: `H2 직후 한 줄 정의 ${definitionChunkCount}/${chunks.length} (40% 권장 — AI 인용 청크 부족)`,
    });
  }

  // C3 — 핵심 수치 인용 ≥ 3
  const numericMatches =
    parsed.body.match(/\d+(?:원|만원|%|년|개월|일|시간|분)|\d{4}년\s*\d{1,2}월/g) ?? [];
  const uniqueNumeric = new Set(numericMatches).size;
  if (uniqueNumeric < 3) {
    issues.push({
      level: 'warn',
      rule: 'C3',
      msg: `핵심 수치 ${uniqueNumeric}개 (≥ 3 권장 — quotable fact 부족)`,
    });
  }

  // C4 — <dfn> 사용 (info)
  const dfnCount = (parsed.body.match(/<dfn[\s>]/g) ?? []).length;
  if (dfnCount === 0) {
    issues.push({
      level: 'info',
      rule: 'C4',
      msg: `<dfn> 1차 정의 격리 미사용 (권고 — AI 인용 정확도 ↑)`,
    });
  }

  return {
    file: relative(ROOT, filePath).replace(/\\/g, '/'),
    aiAssisted,
    h2Count: chunks.length,
    definitionRatio: defRatio,
    numericCount: uniqueNumeric,
    dfnCount,
    issues,
  };
}

function main() {
  const reports = [];
  for (const file of walk(ARTICLES_DIR)) {
    const r = auditArticle(file);
    if (r) reports.push(r);
  }

  const totals = {
    articles: reports.length,
    autoArticles: reports.filter((r) => r.aiAssisted).length,
    critical: reports.reduce((s, r) => s + r.issues.filter((i) => i.level === 'critical').length, 0),
    warn: reports.reduce((s, r) => s + r.issues.filter((i) => i.level === 'warn').length, 0),
    info: reports.reduce((s, r) => s + r.issues.filter((i) => i.level === 'info').length, 0),
  };

  console.log(`📦 Passage Chunking 감사 — ${totals.articles}글 (자동 발행 ${totals.autoArticles}건)\n`);

  for (const r of reports) {
    if (r.issues.length === 0) continue;
    const tag = r.aiAssisted ? '🤖 auto' : '👤 manual';
    console.log(`  ${tag} ${r.file}`);
    for (const i of r.issues) {
      const icon = i.level === 'critical' ? '❌' : i.level === 'warn' ? '⚠️ ' : 'ℹ️ ';
      console.log(`     ${icon} [${i.rule}] ${i.msg}`);
    }
  }

  console.log(
    `\n📊 결과 — critical ${totals.critical}건 · warn ${totals.warn}건 · info ${totals.info}건`,
  );

  if (STRICT && totals.critical > 0) {
    console.log(`\n🚫 strict 모드: critical violation ${totals.critical}건 → exit 1`);
    process.exit(1);
  }
  if (AUTO_ONLY && totals.critical > 0) {
    console.log(`\n🚫 auto-only: 자동 발행 글에 critical violation → exit 1`);
    process.exit(1);
  }
  console.log(`\n✅ 통과 (V1: 기존 글 warn 허용. 자동 발행 글 도입 시 strict 활성)`);
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) main();

export { auditArticle, isOneLineDefinition, extractH2Chunks };
