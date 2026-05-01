#!/usr/bin/env node
/**
 * 머니룩 글 자동 생성 파이프라인 (4-pass)
 *
 * Usage:
 *   pnpm article -- --topic "토픽" --cluster tax [--slug my-slug] [--draft]
 *
 * Env:
 *   DEEPSEEK_API_KEY   — 1차 초안 생성 (필수, 미설정 시 prompt만 출력)
 *   ANTHROPIC_API_KEY  — 2차 자연화·자기정정 제거 (선택, 미설정 시 패스 3 스킵)
 *
 * Pipeline:
 *   1. 초안 생성 (DeepSeek-V3, 머니룩 시스템 프롬프트)
 *   2. 형식 정규화 (규칙 기반: YAML·H2·URL·테이블)
 *   3. 자연화 (Claude Haiku, 자기정정 어투·LLM 머리말 제거)
 *   4. 게이트 (Zod·GEO·Schema 검증)
 *
 * 산출물:
 *   src/content/articles/_drafts/{slug}.mdx (--draft 시)
 *   src/content/articles/{slug}.mdx (게이트 통과 시)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ----- args ---------------------------------------------------------------
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i < 0) {
    // `--name=value` 형식도 지원
    for (const a of args) {
      if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
    }
    return def;
  }
  return args[i + 1] ?? true;
}
let TOPIC = arg('topic');
let CLUSTER = arg('cluster');
let SLUG = arg('slug');
const BRIEF_PATH = arg('brief');
const DRAFT = args.includes('--draft');
const PROMPT_ONLY = args.includes('--prompt-only');

const { VALID_CLUSTERS } = await import('./lib/brief-loader.mjs');

// ----- brief 모드 (Gap 2 통합) --------------------------------------------
// --brief <path> 사용 시 brief.yaml에서 cluster·slug·topic 자동 파생.
// 기존 legacy 경로 (--topic --cluster --slug) 100% 호환.
let brief = null;
let briefFrontmatterInject = {};
if (BRIEF_PATH && typeof BRIEF_PATH === 'string') {
  const { loadBrief, BriefIsTemplateError } = await import('./lib/brief-loader.mjs');
  const { briefToArticleFrontmatter } = await import('./lib/auto-brief-generator.mjs');
  try {
    brief = loadBrief(BRIEF_PATH);
  } catch (e) {
    if (e instanceof BriefIsTemplateError) {
      console.error('❌ _template.yaml 은 직접 사용 불가. pnpm brief:new 로 생성 후 채워서 사용하세요.');
    } else {
      console.error(`❌ brief 로드 실패: ${e.message}`);
      if (e.issues) {
        for (const iss of e.issues.slice(0, 8)) {
          console.error(`   ${iss.path}: ${iss.message}`);
        }
      }
    }
    process.exit(1);
  }

  // 인자 충돌 검사
  if (CLUSTER && CLUSTER !== brief.meta.cluster) {
    console.error(`❌ cluster 불일치: --cluster=${CLUSTER}, brief=${brief.meta.cluster}`);
    process.exit(1);
  }
  if (SLUG && SLUG !== brief.meta.slug) {
    console.error(`❌ slug 불일치: --slug=${SLUG}, brief=${brief.meta.slug}`);
    process.exit(1);
  }
  if (TOPIC) {
    console.warn('⚠️  --topic 무시: brief.content_angle.one_line_pitch 사용');
  }

  CLUSTER = brief.meta.cluster;
  SLUG = brief.meta.slug;
  TOPIC = brief.content_angle.one_line_pitch;
  briefFrontmatterInject = briefToArticleFrontmatter(brief);
}

if (!TOPIC) {
  console.error('❌ --topic 또는 --brief 필수 (예: --topic "2026년 청년 월세 세액공제" / --brief briefs/...yaml)');
  process.exit(1);
}

if (!CLUSTER || !VALID_CLUSTERS.includes(CLUSTER)) {
  console.error(`❌ --cluster 필수 (다음 중 하나): ${VALID_CLUSTERS.join(', ')}`);
  process.exit(1);
}

// 모든 글 저자 = editor-team (머니룩 편집팀)
// 가상 전문가 페르소나(가짜 저자) 사용 금지 — editorial-policy.astro 정책
const AUTHOR = 'editor-team';

const SLUG_FINAL = SLUG ?? slugifyTopic(TOPIC);

function slugifyTopic(text) {
  return text
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
}

// ----- system prompt ------------------------------------------------------

const SYSTEM_PROMPT = `당신은 한국 직장인·청년을 대상으로 하는 생활금융 미디어 "머니룩(MoneyLook)"의 시니어 에디터입니다.
주어진 토픽으로 1편의 MDX 글 초안을 작성하세요. 본 출력은 자동 검수 파이프라인을 거쳐 발행됩니다.

【출력 규칙】
1. 첫 줄이 \`---\`로 시작. 코드블록 마크다운(\`\`\`)으로 감싸지 마세요. 메타 코멘트·해설·서두 금지.
2. 출력 순서: (1) MDX frontmatter (2) <div class="tldr"> TL;DR (3) ## H2 7~9개 (4) 본문 끝
3. 글 길이: 본문 합계 한국어 1,200~1,800 어절
4. 톤: 재기발랄하지만 정확. 종결 "~합니다" 60% / "~예요/~죠" 30% / "~?" 10%. 첫 문장은 직장인 공감 한 문장.

【YMYL 강제】
- 모든 통계·수치 옆 출처: "(국세청 2025)" 식
- 법령·요율 시점: "(2026년 4월 기준)"
- 1차 자료만: data.go.kr·law.go.kr·hometax.go.kr·bokjiro.go.kr·ecos.bok.or.kr·fss.or.kr·work24.go.kr·nps.or.kr·nhis.or.kr·korea.kr·molit.go.kr·moel.go.kr·nts.go.kr·kostat.go.kr
- 본문 ≥1회 markdown table + ≥1회 번호 절차 목록
- 본문 ≥2회 정부 링크 인라인 인용
- H1 절대 금지 (frontmatter title이 H1)

【금지 어투 — AI 탐지 회피】
- "결론적으로 말씀드리면", "이번 글에서는", "먼저"로 시작 금지
- "~할 수도 있을까요? 아닙니다." 자기정정 금지 — 정확한 결론 한 번에
- "정말 중요합니다" 강조 클리셰 금지 — 구체 수치로 대체
- "여러분", "독자분들" 호칭 금지 — 직접 진술
- 동일 표현 한 단락 1회 이내

【Frontmatter Zod 스키마】
---
title: "[20-70자, 핵심 키워드 포함]"
description: "[80-170자, SERP·SNS 메타]"
cluster: "${CLUSTER}"
author: "${AUTHOR}"
publishedAt: "2026-04-XX"
articleType: "Article"
keywords:
  - "[5-8개, 한국어 검색어]"
aiCitationQuestions:
  - "[5-8개, 자연어 질문 형태]"
sources:
  - title: "[1차 자료명]"
    url: "[https .gov.kr / .or.kr]"
  (3-5개)
dataValidAsOf: "2026년 4월"
faq:
  - q: "[질문]"
    a: "[120-220자]"
  (3-5개)
---

【TL;DR】
<div class="tldr">
### 핵심만 30초

- **[키 메시지 굵게]** — [구체 수치 포함 한 줄]
- (5개)

</div>

【H2 구성】 7~9개 권장: 정의·자격·금액·신청 절차(번호목록)·자주 누락(표)·사례 시뮬레이션·주의사항·관련 제도 비교

지금 토픽으로 작성을 시작하세요.`;

// ----- 1) DeepSeek 호출 ---------------------------------------------------

async function callDeepSeek(topic) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.warn('⚠️  DEEPSEEK_API_KEY 미설정 — prompt만 출력하고 종료');
    console.log('\n=== SYSTEM PROMPT ===\n');
    console.log(SYSTEM_PROMPT);
    console.log('\n=== USER PROMPT ===\n');
    console.log(`토픽: ${topic}\n위 시스템 규칙대로 머니룩 글 1편을 출력하세요.`);
    process.exit(0);
  }

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `토픽: ${topic}\n위 시스템 규칙대로 머니룩 글 1편을 출력하세요.` },
      ],
      temperature: 0.6,
      max_tokens: 6000,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.choices[0].message.content;
}

// ----- 2) 형식 정규화 (규칙 기반) -----------------------------------------

function normalizeFormat(raw) {
  let out = raw.trim();

  // 코드블록 wrapper 제거
  out = out.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

  // 시작이 --- 아니면 보강
  if (!out.startsWith('---')) {
    const fmIdx = out.indexOf('---');
    if (fmIdx > 0) out = out.slice(fmIdx);
  }

  // YAML 들여쓰기 보정 — keywords/aiCitationQuestions/sources/faq 항목
  const yamlListKeys = ['keywords', 'aiCitationQuestions'];
  for (const key of yamlListKeys) {
    const re = new RegExp(`^${key}:\\s*\\n((?:^[^\\s-].*\\n)+)`, 'm');
    out = out.replace(re, (m, items) => {
      const lines = items.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      return `${key}:\n${lines.map((l) => `  - ${l.replace(/^["'-]\s*/, '').replace(/^"|"$/g, '')}`).map((l) => l.startsWith('  - ')
        ? l.replace(/  - (.+)/, '  - "$1"').replace(/""/g, '"')
        : l).join('\n')}\n`;
    });
  }

  // 중복 따옴표 정리
  out = out.replace(/""([^"]+)""/g, '"$1"');

  // 본문에 H1(`#`) 발견 시 H2(`##`)로 강등
  out = out.replace(/^#\s+([^\n]+)$/gm, (m, t) => `## ${t}`);

  // H2 marker 누락 — 의문문/제목으로 끝나는 짧은 줄 자동 부착
  // (보수적으로 적용: "~인가요?" "~란?" 등 H2 후보)
  out = out.replace(
    /^([가-힣][^\n]{5,80}(?:인가요\?|란\?|되나요\?|뭔가요\?|얼마나|어떻게|받을 수|준비하는 법))$/gm,
    (m, line) => (line.startsWith('## ') ? line : `## ${line}`)
  );

  return out.trim() + '\n';
}

// ----- 3) Claude 자연화 (선택) --------------------------------------------

const REFINE_PROMPT = `다음은 머니룩(MoneyLook) 미디어용 MDX 글 초안입니다.
한국 AdSense AI 콘텐츠 탐지를 회피하도록 다음만 수정하세요. 다른 모든 것은 절대 변경 금지.

【수정 항목】
1. "결론적으로 말씀드리면", "이번 글에서는", "먼저 살펴보면" 같은 LLM 머리말 → 즉시 본론으로
2. "~할 수도 있을까요? 아닙니다." 자기정정 → 정확한 결론 한 번에
3. "정말 중요합니다", "꼭 알아두셔야 합니다" 클리셰 → 구체 수치/조건으로 교체
4. "여러분", "독자분들" 호칭 → 직접 진술 ("~합니다")
5. 한 단락 내 동일 표현 반복 → 동의어 변경
6. 부자연스러운 한국어 어순 → 자연스러운 어순

【절대 변경 금지】
- frontmatter (모든 필드)
- markdown 구조 (H2·표·목록·링크)
- 본문 통계·수치·법령 조항·출처 URL
- TL;DR 항목 수
- 문장 의미·결론

수정된 전체 MDX를 그대로 출력하세요. 코드블록·해설 금지.

[원본 시작]
{ORIGINAL}
[원본 끝]`;

async function refineWithClaude(mdx) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('⚠️  ANTHROPIC_API_KEY 미설정 — Pass 3 스킵 (자연화 미적용)');
    return mdx;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [
        { role: 'user', content: REFINE_PROMPT.replace('{ORIGINAL}', mdx) },
      ],
    }),
  });

  if (!res.ok) {
    console.warn(`⚠️  Claude API ${res.status}, 자연화 스킵: ${await res.text()}`);
    return mdx;
  }
  const json = await res.json();
  return json.content[0].text.trim() + '\n';
}

// ----- 4) 게이트 검증 -----------------------------------------------------

import { isTrustedUrl } from './lib/trusted-domains.mjs';

function gateCheck(mdx) {
  const errors = [];
  const warnings = [];

  // frontmatter 추출
  const fmMatch = mdx.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    errors.push('frontmatter 누락 또는 형식 오류');
    return { errors, warnings };
  }
  const [, fm, body] = fmMatch;

  // 필드 추출
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*"([^"]+)"`, 'm')) || [])[1];
  const title = get('title');
  const description = get('description');
  const dvOk = /^dataValidAsOf:\s*"2026년\s\d{1,2}월"/m.test(fm);
  const cluster = get('cluster');

  if (!title) errors.push('title 누락');
  else if (title.length < 20 || title.length > 70) errors.push(`title 길이 ${title.length}자 (20-70 필요)`);

  if (!description) errors.push('description 누락');
  else if (description.length < 80 || description.length > 170) errors.push(`description 길이 ${description.length}자 (80-170 필요)`);

  if (!cluster || !VALID_CLUSTERS.includes(cluster)) errors.push(`cluster 누락/오류: "${cluster}"`);
  if (!dvOk) errors.push('dataValidAsOf 형식 미일치 ("2026년 N월")');

  // sources count + .gov.kr
  const sourceUrls = [...fm.matchAll(/url:\s*"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  if (sourceUrls.length < 3) errors.push(`sources ${sourceUrls.length}개 (≥3 필요)`);
  const govCount = sourceUrls.filter((u) => isTrustedUrl(u)).length;
  if (govCount < 1) errors.push('sources에 .gov.kr / .or.kr 1차 자료 0개');

  // aiCitationQuestions count
  const aiBlock = fm.match(/aiCitationQuestions:\s*\n((?:\s+-\s+.+\n)+)/);
  const aiCount = aiBlock ? (aiBlock[1].match(/^\s+-\s/gm) || []).length : 0;
  if (aiCount < 5) errors.push(`aiCitationQuestions ${aiCount}개 (≥5 필요)`);

  // keywords count
  const kwBlock = fm.match(/keywords:\s*\n((?:\s+-\s+.+\n)+)/);
  const kwCount = kwBlock ? (kwBlock[1].match(/^\s+-/gm) || []).length : 0;
  if (kwCount < 3 || kwCount > 10) errors.push(`keywords ${kwCount}개 (3-10 필요)`);

  // 본문 H2 수 + 어절
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  if (h2Count < 6) warnings.push(`H2 ${h2Count}개 (7-9 권장)`);
  if (h2Count > 12) warnings.push(`H2 ${h2Count}개 (너무 많음)`);

  const cleanBody = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>~|-]/g, ' ');
  const wordCount = cleanBody.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 800) warnings.push(`본문 ${wordCount} 어절 (1200+ 권장)`);

  // markdown table·번호 목록
  if (!/^\s*\|.*\|/m.test(body)) warnings.push('markdown table 0회');
  if (!/^\s*\d+\.\s/m.test(body)) warnings.push('번호 목록 0회');

  // H1 금지
  if (/^#\s+\S/m.test(body)) errors.push('본문에 H1(#) 사용됨 (절대 금지)');

  // AI 탐지 패턴 (LLM 머리말·자기정정·클리셰)
  const aiSmells = [
    { pat: /결론적으로 말씀드리면/, msg: 'LLM 머리말 "결론적으로 말씀드리면"' },
    { pat: /이번 글에서는/, msg: 'LLM 머리말 "이번 글에서는"' },
    { pat: /\?\s*\n*\s*아닙니다/, msg: '자기정정 어투 "~? 아닙니다"' },
    { pat: /정말 중요합니다/, msg: '클리셰 "정말 중요합니다"' },
    { pat: /꼭 알아두셔야/, msg: '클리셰 "꼭 알아두셔야"' },
    { pat: /\b여러분\b/, msg: '호칭 "여러분"' },
    { pat: /독자분들/, msg: '호칭 "독자분들"' },
  ];
  for (const { pat, msg } of aiSmells) {
    if (pat.test(body)) warnings.push(`AI 탐지 패턴: ${msg}`);
  }

  return { errors, warnings, wordCount, h2Count, sources: sourceUrls.length, gov: govCount };
}

// ----- 5) 저장 ------------------------------------------------------------

/**
 * brief 모드일 때 frontmatter에 brief 메타 inject.
 * (brief_id, next_review_date, source_question_*, sources_verified 등)
 * 기존 frontmatter에 동일 키가 있으면 brief 우선 (감사 추적성).
 */
function injectBriefFrontmatter(mdx, inject) {
  if (!inject || Object.keys(inject).length === 0) return mdx;
  const fmMatch = mdx.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!fmMatch) return mdx;
  const [, open, fmBody, close, body] = fmMatch;

  // 기존 라인 보존 + 신규 키 추가 (단순 라인 기반 — yaml 의존 X)
  const existingKeys = new Set(
    fmBody.split('\n')
      .map((l) => l.match(/^([a-z_][a-z0-9_]*)\s*:/i)?.[1])
      .filter(Boolean),
  );

  const newLines = [];
  for (const [k, v] of Object.entries(inject)) {
    if (v === undefined || v === null || v === '') continue;
    if (existingKeys.has(k)) continue; // 충돌 시 brief 우선이 안전이지만 V1은 conservative
    const formatted = typeof v === 'string'
      ? `${k}: "${v.replace(/"/g, '\\"')}"`
      : `${k}: ${v}`;
    newLines.push(formatted);
  }
  if (newLines.length === 0) return mdx;

  return `${open}${fmBody}\n${newLines.join('\n')}${close}${body}`;
}

function saveArticle(mdx) {
  const targetDir = DRAFT
    ? join(ROOT, 'src/content/articles/_drafts')
    : join(ROOT, 'src/content/articles');
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  const target = join(targetDir, `${SLUG_FINAL}.mdx`);
  if (existsSync(target)) {
    console.error(`❌ 이미 존재: ${target}`);
    process.exit(1);
  }
  // brief 메타 inject (brief 모드만)
  const finalMdx = injectBriefFrontmatter(mdx, briefFrontmatterInject);
  writeFileSync(target, finalMdx, 'utf-8');
  return target;
}

// ----- main ---------------------------------------------------------------

(async () => {
  console.log(`🚀 머니룩 글 파이프라인 시작`);
  console.log(`   토픽: ${TOPIC}`);
  console.log(`   클러스터: ${CLUSTER}`);
  console.log(`   저자: ${AUTHOR}`);
  console.log(`   슬러그: ${SLUG_FINAL}`);
  console.log(`   초안 저장: ${DRAFT ? '_drafts/' : '정식 위치'}`);
  console.log('');

  // PASS 1
  console.log('📝 PASS 1 — DeepSeek 초안 생성…');
  let mdx;
  try {
    mdx = await callDeepSeek(TOPIC);
  } catch (e) {
    console.error(`❌ PASS 1 실패: ${e.message}`);
    process.exit(1);
  }

  // PASS 2
  console.log('🔧 PASS 2 — 형식 정규화…');
  mdx = normalizeFormat(mdx);

  // PASS 3
  console.log('✨ PASS 3 — Claude 자연화 (자기정정·LLM 머리말 제거)…');
  mdx = await refineWithClaude(mdx);
  mdx = normalizeFormat(mdx); // 자연화 후 재검증

  // PASS 4
  console.log('🔍 PASS 4 — 게이트 검증…');
  const result = gateCheck(mdx);

  console.log('');
  console.log('📊 검증 결과');
  console.log(`   본문 어절: ${result.wordCount}`);
  console.log(`   H2: ${result.h2Count}개`);
  console.log(`   sources: ${result.sources}개 (.gov.kr ${result.gov}개)`);
  console.log(`   ⚠️  경고: ${result.warnings.length}건`);
  console.log(`   ❌ 실패: ${result.errors.length}건`);

  if (result.warnings.length) {
    console.log('\n⚠️  경고:');
    result.warnings.forEach((w) => console.log(`   · ${w}`));
  }

  if (result.errors.length) {
    console.log('\n❌ 실패:');
    result.errors.forEach((e) => console.log(`   · ${e}`));
    console.log('\n🚫 게이트 미통과 — 초안만 저장합니다.');
    const target = saveArticle(mdx);
    console.log(`📄 ${target}`);
    process.exit(1);
  }

  // ----- PASS 5 — G4 fact-verifier (brief 모드만) ------------------------
  // brief.primary_sources의 expected_facts와 본문 사실 토큰을 1:1 매칭.
  // 환각·근거 없는 수치 발견 시 폐기 (재시도 X).
  // legacy 모드(--topic --cluster --slug)는 brief 없으므로 PASS 5 스킵.
  if (brief) {
    console.log('\n🔬 PASS 5 — G4 fact-verifier (권위 데이터 1:1 매칭)…');
    const { verifyFacts, summarizeForAudit } = await import('./lib/fact-verifier.mjs');
    const { fetchAllForCluster } = await import('./lib/authority-sources/index.mjs');

    const factResult = await verifyFacts(mdx, brief, {
      authorityFetch: (cluster, query) => fetchAllForCluster(cluster, query, {
        mock: process.env.MOCK_AUTHORITY !== '0',
      }),
      mock: process.env.MOCK_AUTHORITY !== '0',
    });

    console.log(`   매칭률: ${(factResult.match_rate * 100).toFixed(1)}%`);
    console.log(`   매칭: ${factResult.matched.length}건 / 미매칭: ${factResult.unmatched.length}건 / 근사: ${factResult.approximate.length}건`);

    if (!factResult.pass) {
      console.log('\n❌ G4 fact-verifier 미통과 — 환각·근거 없는 수치 발견:');
      const audit = summarizeForAudit(factResult);
      audit.unmatched.slice(0, 5).forEach((u) => {
        console.log(`   · [${u.type}] "${u.raw}" (line ${u.line}) — ${u.reason}`);
      });
      console.log('\n🚫 자동 폐기 정책: 재시도 X. 다음 cron이 새 질문 픽업.');
      // DRAFT 모드는 _drafts/ 저장 (디버깅용), 정식은 폐기
      if (DRAFT) {
        const target = saveArticle(mdx);
        console.log(`📄 (디버깅용 draft 저장) ${target}`);
      }
      process.exit(2);
    }

    // G4 통과 시 frontmatter에 검증 메타 inject
    Object.assign(briefFrontmatterInject, factResult.injected_frontmatter);
    console.log(`   ✅ sources_verified=true · verified_facts_count=${factResult.matched.length}`);
  }

  // ----- PASS 6 — G5·G6·G7·G8 순차 (brief 모드만) -------------------------
  if (brief) {
    const { checkAdSensePolicy } = await import('./gates/g5-adsense-policy.mjs');
    const { attachAndVerifyDisclosures } = await import('./gates/g6-disclosure-attach.mjs');
    const { checkPlagiarism } = await import('./gates/g7-plagiarism.mjs');
    const { checkAILikeness } = await import('./gates/g8-ai-likeness.mjs');

    // G5 AdSense
    console.log('\n🛡️  G5 — AdSense 정책 검사…');
    const g5 = checkAdSensePolicy(mdx, brief);
    if (g5.warnings.length) {
      g5.warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
    }
    if (!g5.pass) {
      console.log('❌ G5 미통과:');
      g5.reasons.forEach((r) => console.log(`   · ${r}`));
      console.log('🚫 자동 폐기 (AdSense 위반 사전 차단).');
      process.exit(3);
    }
    console.log(`   ✅ 외부 링크 ${g5.meta.external_url_count}개`);

    // G6 면책·AI 공시 부착 (mdx mutate)
    console.log('\n📋 G6 — YMYL 면책·AI 공시 부착…');
    const g6 = attachAndVerifyDisclosures(mdx, brief);
    if (!g6.pass) {
      console.log('❌ G6 부착 실패:');
      g6.reasons.forEach((r) => console.log(`   · ${r}`));
      process.exit(4);
    }
    mdx = g6.mdx;
    console.log('   ✅ 면책·공시 부착 완료');

    // G7 표절 검사 (지식인 원문이 있을 때만)
    const questionText = brief.source_question?.original_text;
    if (questionText) {
      console.log('\n🔍 G7 — 표절·저작권 검사…');
      const g7 = checkPlagiarism(mdx, questionText);
      if (!g7.pass) {
        console.log('❌ G7 미통과 — 지식인 원문 인용 발견:');
        g7.reasons.forEach((r) => console.log(`   · ${r}`));
        if (g7.overlaps.length > 0) {
          console.log(`   매칭 window: "${g7.overlaps[0].window.slice(0, 50)}..."`);
        }
        console.log('🚫 자동 폐기 (네이버 ToS·저작권 보호).');
        process.exit(5);
      }
      console.log(`   ✅ hard overlap 0건, soft overlap ${g7.meta.soft_overlap_count}건`);
    }

    // G8 AI-likeness
    console.log('\n🤖 G8 — AI-likeness scorer…');
    const g8 = checkAILikeness(mdx);
    console.log(`   score: ${g8.score.toFixed(1)} / threshold ${g8.threshold}`);
    if (!g8.pass) {
      console.log(`❌ G8 미통과 — score ${g8.score} >= ${g8.threshold}`);
      console.log('   힌트:');
      g8.hints.forEach((h) => console.log(`   · ${h}`));
      console.log('🚫 자동 폐기 (AI 티 검출).');
      process.exit(6);
    }
    // G8 결과 frontmatter에 기록
    briefFrontmatterInject.ai_likeness = g8.score;
    if (g8.signals.length > 0) briefFrontmatterInject.ai_signals = JSON.stringify(g8.signals);
  }

  const target = saveArticle(mdx);
  console.log(`\n✅ 게이트 통과. 저장: ${target}`);
  console.log('   다음: pnpm build → pnpm validate:schema → pnpm audit:geo');
})();
