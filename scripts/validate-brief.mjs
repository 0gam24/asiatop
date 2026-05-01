#!/usr/bin/env node
/**
 * 머니룩 brief 검증 스크립트
 *
 * 사용:
 *   pnpm brief:validate <path-to-brief.yaml>
 *   node scripts/validate-brief.mjs briefs/2026-05-08-foo.yaml
 *
 * 검증 단계:
 *   1. 파일 존재
 *   2. YAML 파싱 (js-yaml — Astro core가 끌어오는 transitive)
 *   3. Zod 스키마 (구조·타입·필수 필드)
 *   4. 비즈니스 규칙
 *      - cluster ∈ 12개 enum
 *      - slug 형식 (영문 소문자·하이픈, 50자 이내)
 *      - primary_sources URL 도메인 화이트리스트 (geo-audit.mjs 동일 패턴)
 *      - structure.sections[].uses_facts_from 의 src id 가 primary_sources 에 실제 존재
 *   5. 일관성 경고 (실패 X)
 *      - keywords.primary 가 niche.surface_pain·reader_intent.primary_question 에 등장하는가
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

// ─────────────────────────────────────────────
// 색상·로깅
// ─────────────────────────────────────────────
const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
};
const ok    = (m) => console.log(`${C.green}✅${C.reset} ${m}`);
const fail  = (m) => console.error(`${C.red}❌${C.reset} ${m}`);
const warn  = (m) => console.warn(`${C.yellow}⚠️  ${m}${C.reset}`);
const info  = (m) => console.log(`${C.blue}ℹ${C.reset}  ${m}`);
const dim   = (m) => console.log(`${C.dim}${m}${C.reset}`);

// ─────────────────────────────────────────────
// 1. 입력 인자
// ─────────────────────────────────────────────
const briefPath = process.argv[2];
if (!briefPath) {
  fail('파일 경로가 필요합니다.');
  console.error(`${C.dim}사용법: node scripts/validate-brief.mjs <path-to-brief.yaml>${C.reset}`);
  process.exit(1);
}

const absPath = resolve(process.cwd(), briefPath);
if (!existsSync(absPath)) {
  fail(`파일을 찾을 수 없습니다: ${briefPath}`);
  process.exit(1);
}

// ─────────────────────────────────────────────
// 2. 클러스터 enum (src/data/clusters.ts 와 동기화)
// ─────────────────────────────────────────────
import { VALID_CLUSTERS } from './lib/brief-loader.mjs';

// ─────────────────────────────────────────────
// 3. 신뢰 도메인 화이트리스트 (scripts/lib/trusted-domains.mjs — 단일 진실 공급원)
// ─────────────────────────────────────────────
import { isTrustedUrl, TRUSTED_DOMAINS } from './lib/trusted-domains.mjs';

// ─────────────────────────────────────────────
// 4. Zod 스키마 (inline)
// ─────────────────────────────────────────────
const SourceSchema = z.object({
  id: z.string().regex(/^src\d+$/, 'src1, src2 형식이어야 합니다'),
  url: z.string().url('유효한 URL 이어야 합니다'),
  title: z.string().min(1, '제목이 필요합니다'),
  expected_facts: z.array(z.string().min(1)).min(1, '최소 1개 사실이 필요합니다'),
  must_quote: z.boolean(),
});

const SectionSchema = z.object({
  h2: z.string().min(1, 'H2 제목이 필요합니다'),
  content_hint: z.string(),
  uses_facts_from: z.array(z.string().regex(/^src\d+$/)),
  requires_table: z.boolean(),
  requires_calculation: z.boolean(),
});

const BriefSchema = z.object({
  meta: z.object({
    brief_id: z.string().min(1, 'brief_id 가 비어있습니다'),
    slug: z.string()
      .min(1, 'slug 가 비어있습니다')
      .max(50, 'slug 는 50자 이내여야 합니다')
      .regex(/^[a-z0-9-]+$/, 'slug 는 영문 소문자·숫자·하이픈만 가능합니다'),
    cluster: z.enum(VALID_CLUSTERS, {
      message: `cluster 는 다음 중 하나: ${VALID_CLUSTERS.join(', ')}`,
    }),
    scheduled_publish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
    priority: z.enum(['high', 'medium', 'low']),
    brief_author: z.string().min(1, 'brief_author 가 비어있습니다'),
    created_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식'),
  }),
  niche: z.object({
    audience_persona: z.string().min(20, '구체적인 페르소나 묘사가 필요합니다 (20자+)'),
    life_context: z.string().min(20, '맥락 설명이 필요합니다 (20자+)'),
    surface_pain: z.string().min(10, '표면 페인이 필요합니다 (10자+)'),
    hidden_anxiety: z.string().min(10, '숨은 불안이 필요합니다 (10자+)'),
    desired_next_action: z.string().min(10, '다음 행동 명시 필요 (10자+)'),
    do_not_say: z.array(z.string().min(1)).min(2, '금기 어구 최소 2개'),
  }),
  reader_intent: z.object({
    primary_question: z.string().min(5, '주 질문이 너무 짧습니다'),
    sub_questions: z.array(z.string().min(5)).min(3, '하위 질문 최소 3개').max(7, '하위 질문 최대 7개'),
    competitor_options_in_mind: z.array(z.string()).min(1).max(5),
    competitor_content_weakness: z.string().min(20, '경쟁사 약점 분석이 필요합니다'),
  }),
  keywords: z.object({
    primary: z.string().min(2, '메인 키워드가 필요합니다'),
    secondary: z.array(z.string()).min(2, '보조 키워드 최소 2개').max(5),
    longtail: z.array(z.string()).min(3, '롱테일 최소 3개').max(5),
    search_volume_estimate: z.string().optional().default(''),
    competition: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  }),
  content_angle: z.object({
    one_line_pitch: z.string().min(10, '한 줄 피치 필요'),
    framing: z.enum([
      'decision-guide', 'explainer', 'how-to',
      'comparison', 'warning', 'case-study',
    ]),
    not_framing: z.string().min(5),
    unique_value: z.array(z.string().min(5)).min(2).max(4),
    citable_sentences: z.array(z.string().min(10)).min(3).max(5),
  }),
  primary_sources: z.array(SourceSchema).min(1, '1차 자료 최소 1개 필요'),
  secondary_sources: z.array(SourceSchema).default([]),
  structure: z.object({
    intro_pattern: z.enum([
      'audience-pain-first', 'answer-first',
      'story-first', 'data-first',
    ]),
    sections: z.array(SectionSchema).min(7, 'H2 최소 7개').max(9, 'H2 최대 9개'),
    faq: z.object({
      count: z.number().int().min(3).max(7),
      must_include_questions: z.array(z.string().min(5)).min(1),
    }),
    word_count_target: z.number().int().positive(),
    word_count_min: z.number().int().positive(),
    word_count_max: z.number().int().positive(),
  }),
  internal_links: z.array(z.object({
    target_slug: z.string().min(1),
    anchor_text: z.string().min(1),
    placement: z.string().min(1),
  })).default([]),
  verification: z.object({
    data_basis_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    next_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ymyl_disclaimer: z.literal(true, { message: 'YMYL 면책 의무 (true 강제)' }),
    ai_assistance_disclosure: z.literal(true, { message: 'AI 사용 공시 의무 (true 강제)' }),
  }),
  ad_policy: z.object({
    promotes_specific_loan: z.boolean(),
    contains_high_interest_loan_promotion: z.boolean(),
    contains_financial_advice: z.boolean(),
    google_compliant: z.boolean(),
  }),
  success_metric: z.object({
    target_pv_30d: z.number().int().positive(),
    target_avg_dwell_seconds: z.number().int().positive(),
    target_search_impressions_30d: z.number().int().positive(),
    target_indexed_within_days: z.number().int().positive(),
    if_underperform: z.enum(['review-and-update', 'rewrite', 'noindex', 'delete']),
  }),
  update_log: z.array(z.unknown()).default([]),
});

// ─────────────────────────────────────────────
// 5. 검증 실행
// ─────────────────────────────────────────────
console.log(`${C.bold}🔍 brief 검증 시작${C.reset}: ${briefPath}\n`);

let raw;
try {
  raw = readFileSync(absPath, 'utf-8');
} catch (e) {
  fail(`파일 읽기 실패: ${e.message}`);
  process.exit(1);
}

let parsed;
try {
  parsed = yaml.load(raw);
} catch (e) {
  fail(`YAML 파싱 실패`);
  console.error(`   ${C.dim}${e.message}${C.reset}`);
  console.error(`   ${C.yellow}수정 제안: 들여쓰기·따옴표 확인. https://www.yamllint.com/ 에서 검증 가능${C.reset}`);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object') {
  fail('YAML 결과가 객체가 아닙니다 (빈 파일?)');
  process.exit(1);
}

// _template.yaml 자체를 검증하면 빈 값들로 실패함 — 안내 후 종료
if (basename(absPath) === '_template.yaml') {
  warn('_template.yaml 은 검증 대상이 아닙니다 (빈 값 포함).');
  info('새 brief 생성: pnpm brief:new');
  info('또는 _template.yaml 을 복사해 채운 후 검증하세요.');
  process.exit(0);
}

// Zod 검증
const result = BriefSchema.safeParse(parsed);
if (!result.success) {
  fail('스키마 검증 실패\n');
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    console.error(`  ${C.red}✗${C.reset} ${C.bold}${path}${C.reset}`);
    console.error(`     ${issue.message}`);
    if (issue.code === 'invalid_type' && 'received' in issue) {
      console.error(`     ${C.dim}받은 타입: ${issue.received}${C.reset}`);
    }
    console.error('');
  }
  process.exit(1);
}

const brief = result.data;

// ─────────────────────────────────────────────
// 6. 비즈니스 규칙 검증
// ─────────────────────────────────────────────
const errors = [];
const warnings = [];

// 6-1. brief_id 일관성: scheduled_publish + slug 와 일치
const expectedBriefId = `${brief.meta.scheduled_publish}-${brief.meta.slug}`;
if (brief.meta.brief_id !== expectedBriefId) {
  errors.push({
    field: 'meta.brief_id',
    msg: `brief_id 가 "${expectedBriefId}" 형식이어야 합니다 (현재: "${brief.meta.brief_id}")`,
    fix: `meta.brief_id 를 "${expectedBriefId}" 로 수정하세요`,
  });
}

// 6-2. primary_sources URL 도메인 화이트리스트
brief.primary_sources.forEach((src, i) => {
  if (!isTrustedUrl(src.url)) {
    errors.push({
      field: `primary_sources[${i}].url`,
      msg: `신뢰 도메인이 아닙니다: ${src.url}`,
      fix: `정부·공공기관 도메인(.go.kr, .or.kr 등)으로 교체하세요. 화이트리스트: ${TRUSTED_DOMAINS.join(', ')}`,
    });
  }
});

// 6-3. structure.sections[].uses_facts_from 의 src id 가 primary_sources 에 존재
const validSrcIds = new Set([
  ...brief.primary_sources.map((s) => s.id),
  ...brief.secondary_sources.map((s) => s.id),
]);
brief.structure.sections.forEach((sec, i) => {
  sec.uses_facts_from.forEach((srcId) => {
    if (!validSrcIds.has(srcId)) {
      errors.push({
        field: `structure.sections[${i}].uses_facts_from`,
        msg: `존재하지 않는 출처 ID: "${srcId}" (H2: "${sec.h2}")`,
        fix: `primary_sources 또는 secondary_sources 에 ${srcId} 를 추가하거나, 다른 ID 로 교체하세요. 사용 가능: ${[...validSrcIds].join(', ')}`,
      });
    }
  });
});

// 6-4. word count 일관성
if (brief.structure.word_count_min > brief.structure.word_count_target) {
  errors.push({
    field: 'structure.word_count_min',
    msg: 'word_count_min 이 word_count_target 보다 큽니다',
    fix: 'min ≤ target ≤ max 순서를 지켜주세요',
  });
}
if (brief.structure.word_count_target > brief.structure.word_count_max) {
  errors.push({
    field: 'structure.word_count_target',
    msg: 'word_count_target 이 word_count_max 보다 큽니다',
    fix: 'min ≤ target ≤ max 순서를 지켜주세요',
  });
}

// 6-5. 날짜 일관성: data_basis_date ≤ scheduled_publish ≤ next_review_date
const dPub = new Date(brief.meta.scheduled_publish);
const dBasis = new Date(brief.verification.data_basis_date);
const dReview = new Date(brief.verification.next_review_date);
if (dBasis > dPub) {
  warnings.push({
    field: 'verification.data_basis_date',
    msg: `data_basis_date 가 발행일보다 미래입니다 (data ${brief.verification.data_basis_date} > publish ${brief.meta.scheduled_publish})`,
  });
}
if (dReview <= dPub) {
  errors.push({
    field: 'verification.next_review_date',
    msg: `next_review_date 가 발행일 이후여야 합니다`,
    fix: '보통 6개월 후 날짜를 권장합니다',
  });
}

// 6-6. AdSense 정책 일관성
if (brief.ad_policy.promotes_specific_loan && brief.ad_policy.google_compliant) {
  warnings.push({
    field: 'ad_policy',
    msg: '특정 대출 홍보(true)인데 google_compliant=true. 모순 가능성 있음',
  });
}
if (brief.ad_policy.contains_high_interest_loan_promotion) {
  errors.push({
    field: 'ad_policy.contains_high_interest_loan_promotion',
    msg: '고금리 대출 홍보는 AdSense 정책 위반입니다',
    fix: '본 brief 의 콘텐츠 방향을 재검토하거나 false 로 수정하세요',
  });
}

// 6-7. 일관성 경고: primary 키워드가 페인·질문에 등장
const primaryKw = brief.keywords.primary.toLowerCase();
const haystack = (
  brief.niche.surface_pain + ' ' +
  brief.reader_intent.primary_question
).toLowerCase();
if (primaryKw && !haystack.includes(primaryKw.split(/\s+/)[0])) {
  warnings.push({
    field: 'keywords.primary',
    msg: `메인 키워드 "${brief.keywords.primary}" 의 핵심 단어가 surface_pain·primary_question 에 등장하지 않습니다`,
  });
}

// 6-8. FAQ count 와 must_include_questions 일관성
if (brief.structure.faq.must_include_questions.length > brief.structure.faq.count) {
  warnings.push({
    field: 'structure.faq',
    msg: `must_include_questions(${brief.structure.faq.must_include_questions.length}) 이 count(${brief.structure.faq.count}) 보다 많습니다`,
  });
}

// ─────────────────────────────────────────────
// 7. 결과 출력
// ─────────────────────────────────────────────
if (errors.length > 0) {
  fail(`비즈니스 규칙 검증 실패 (${errors.length}건)\n`);
  for (const e of errors) {
    console.error(`  ${C.red}✗${C.reset} ${C.bold}${e.field}${C.reset}`);
    console.error(`     ${e.msg}`);
    console.error(`     ${C.yellow}수정: ${e.fix}${C.reset}\n`);
  }
  if (warnings.length > 0) {
    console.error(`${C.yellow}경고 ${warnings.length}건도 있음 (실패 후 출력 생략)${C.reset}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.log(`${C.yellow}⚠️  경고 ${warnings.length}건 (실패 아님)${C.reset}\n`);
  for (const w of warnings) {
    warn(`${C.bold}${w.field}${C.reset}: ${w.msg}`);
  }
  console.log('');
}

// ─────────────────────────────────────────────
// 8. 성공 요약
// ─────────────────────────────────────────────
ok(`brief 유효: ${C.bold}${brief.meta.brief_id}${C.reset}\n`);
console.log(`  ${C.dim}cluster:${C.reset}            ${brief.meta.cluster}`);
console.log(`  ${C.dim}slug:${C.reset}               ${brief.meta.slug}`);
console.log(`  ${C.dim}scheduled_publish:${C.reset}  ${brief.meta.scheduled_publish}`);
console.log(`  ${C.dim}priority:${C.reset}           ${brief.meta.priority}`);
console.log(`  ${C.dim}primary_sources:${C.reset}    ${brief.primary_sources.length}개`);
console.log(`  ${C.dim}secondary_sources:${C.reset}  ${brief.secondary_sources.length}개`);
console.log(`  ${C.dim}sections (H2):${C.reset}      ${brief.structure.sections.length}개`);
console.log(`  ${C.dim}faq:${C.reset}                ${brief.structure.faq.count}개`);
console.log(`  ${C.dim}internal_links:${C.reset}     ${brief.internal_links.length}개`);
console.log(`  ${C.dim}word_count:${C.reset}         ${brief.structure.word_count_min}~${brief.structure.word_count_max} (target ${brief.structure.word_count_target})`);
console.log(`  ${C.dim}framing:${C.reset}            ${brief.content_angle.framing}`);
console.log('');
info('다음 단계 (Gap 2): pnpm article -- --brief ' + briefPath + ' (예정)');
