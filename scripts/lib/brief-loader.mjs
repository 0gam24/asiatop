/**
 * brief.yaml 로더 + Zod 스키마 라이브러리 (Gap 2 step 1)
 *
 * 목적: validate-brief.mjs의 핵심 로직을 import 가능한 함수로 추출.
 * article-pipeline.mjs가 `--brief` 인자로 brief.yaml을 받을 때 재사용.
 *
 * 사용:
 *   import { loadBrief, BriefSchema, VALID_CLUSTERS } from './scripts/lib/brief-loader.mjs';
 *   const brief = loadBrief('briefs/2026-05-08-foo.yaml');  // throws on invalid
 *
 * 정책:
 *   - 검증 실패 시 throw (호출자가 try/catch 또는 exit 처리)
 *   - _template.yaml 입력은 명시적으로 'is-template' Error 던짐 (skip 분기)
 *   - YAML round-trip은 V2 (현재는 read-only)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { isTrustedUrl as isTrustedUrlImpl } from './trusted-domains.mjs';

// ─────────────────────────────────────────────
// 12 cluster enum (src/data/clusters.ts 와 동기화)
// ─────────────────────────────────────────────
export const VALID_CLUSTERS = Object.freeze([
  'gov-support', 'tax', 'realestate', 'unemployment', 'savings',
  'insurance-labor', 'auto', 'public-services', 'office-tips',
  'credit-loan', 'insurance-personal', 'pension',
]);

export const isTrustedUrl = isTrustedUrlImpl;

// ─────────────────────────────────────────────
// Zod 스키마 (validate-brief.mjs와 동일 — 단일 진실 공급원으로 향후 통합)
// ─────────────────────────────────────────────
export const SourceSchema = z.object({
  id: z.string().regex(/^src\d+$/, 'src1, src2 형식이어야 합니다'),
  url: z.string().url('유효한 URL 이어야 합니다'),
  title: z.string().min(1, '제목이 필요합니다'),
  expected_facts: z.array(z.string().min(1)).min(1, '최소 1개 사실이 필요합니다'),
  must_quote: z.boolean(),
});

export const SectionSchema = z.object({
  h2: z.string().min(1, 'H2 제목이 필요합니다'),
  content_hint: z.string(),
  uses_facts_from: z.array(z.string().regex(/^src\d+$/)),
  requires_table: z.boolean(),
  requires_calculation: z.boolean(),
});

export const BriefSchema = z.object({
  meta: z.object({
    brief_id: z.string().min(1),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
    cluster: z.enum(VALID_CLUSTERS),
    scheduled_publish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    priority: z.enum(['high', 'medium', 'low']),
    brief_author: z.string().min(1),
    created_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  niche: z.object({
    audience_persona: z.string().min(20),
    life_context: z.string().min(20),
    surface_pain: z.string().min(10),
    hidden_anxiety: z.string().min(10),
    desired_next_action: z.string().min(10),
    do_not_say: z.array(z.string().min(1)).min(2),
    // 8차원 niche (선택 필드 — 자동 발행 파이프라인이 채움)
    search_timing: z.object({
      month: z.string().optional().default(''),
      weekday: z.string().optional().default(''),
      policy_proximity: z.string().nullable().optional().default(null),
    }).optional().default({ month: '', weekday: '', policy_proximity: null }),
    life_stage: z.enum([
      'early-career', 'pre-marriage', 'new-parent',
      'career-transition', 'pre-retirement', 'unspecified',
    ]).optional().default('unspecified'),
    employment_type: z.enum([
      'salaried', 'freelance', 'self-employed',
      'public', 'part-time', 'unspecified',
    ]).optional().default('unspecified'),
    region: z.string().optional().default('nationwide'),
    prior_attempts: z.array(z.string()).optional().default([]),
    competing_options: z.array(z.string()).optional().default([]),
    hidden_anxiety_tags: z.array(z.string()).optional().default([]),
    source_signal: z.object({
      description_length: z.number().int().min(0).default(0),
      answer_count: z.number().int().min(0).default(0),
      repeat_count: z.number().int().min(0).default(0),
      unmet_market_score: z.number().int().min(0).max(3).default(0),
    }).optional().default({ description_length: 0, answer_count: 0, repeat_count: 0, unmet_market_score: 0 }),
  }),
  reader_intent: z.object({
    primary_question: z.string().min(5),
    sub_questions: z.array(z.string().min(5)).min(3).max(7),
    competitor_options_in_mind: z.array(z.string()).min(1).max(5),
    competitor_content_weakness: z.string().min(20),
  }),
  keywords: z.object({
    primary: z.string().min(2),
    secondary: z.array(z.string()).min(2).max(5),
    longtail: z.array(z.string()).min(3).max(5),
    search_volume_estimate: z.string().optional().default(''),
    competition: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  }),
  content_angle: z.object({
    one_line_pitch: z.string().min(10),
    framing: z.enum([
      'decision-guide', 'explainer', 'how-to',
      'comparison', 'warning', 'case-study',
    ]),
    not_framing: z.string().min(5),
    unique_value: z.array(z.string().min(5)).min(2).max(4),
    citable_sentences: z.array(z.string().min(10)).min(3).max(5),
  }),
  primary_sources: z.array(SourceSchema).min(1),
  secondary_sources: z.array(SourceSchema).default([]),
  structure: z.object({
    intro_pattern: z.enum(['audience-pain-first', 'answer-first', 'story-first', 'data-first']),
    sections: z.array(SectionSchema).min(7).max(9),
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
    ymyl_disclaimer: z.literal(true),
    ai_assistance_disclosure: z.literal(true),
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
  source_question: z.object({
    original_text: z.string().optional(),
    hash: z.string().optional(),
    source_url: z.string().url().optional(),
    allow_quote: z.boolean().optional().default(false),
  }).optional(),
  update_log: z.array(z.unknown()).default([]),
});

// ─────────────────────────────────────────────
// 비즈니스 룰 검증 (Zod 외부 — cross-field 룰)
// ─────────────────────────────────────────────
export function validateBusinessRules(brief) {
  const errors = [];
  const warnings = [];

  // primary_sources URL 도메인 화이트리스트
  for (const [i, src] of (brief.primary_sources ?? []).entries()) {
    if (!isTrustedUrlImpl(src.url)) {
      errors.push({
        path: `primary_sources[${i}].url`,
        message: `신뢰 도메인 외부 URL: ${src.url}`,
      });
    }
  }
  for (const [i, src] of (brief.secondary_sources ?? []).entries()) {
    if (!isTrustedUrlImpl(src.url)) {
      warnings.push({
        path: `secondary_sources[${i}].url`,
        message: `신뢰 도메인 외부 URL (secondary는 warning): ${src.url}`,
      });
    }
  }

  // structure.sections[].uses_facts_from 의 src id 가 primary/secondary_sources에 존재하는지
  const allSrcIds = new Set([
    ...(brief.primary_sources ?? []).map((s) => s.id),
    ...(brief.secondary_sources ?? []).map((s) => s.id),
  ]);
  for (const [i, section] of (brief.structure?.sections ?? []).entries()) {
    for (const srcId of section.uses_facts_from ?? []) {
      if (!allSrcIds.has(srcId)) {
        errors.push({
          path: `structure.sections[${i}].uses_facts_from`,
          message: `src ID '${srcId}' 가 primary_sources·secondary_sources 에 없음`,
        });
      }
    }
  }

  // word_count 일관성
  const wc = brief.structure;
  if (wc) {
    if (wc.word_count_min > wc.word_count_target) {
      errors.push({ path: 'structure.word_count_min', message: 'min > target' });
    }
    if (wc.word_count_target > wc.word_count_max) {
      errors.push({ path: 'structure.word_count_target', message: 'target > max' });
    }
  }

  // 날짜 일관성
  const v = brief.verification;
  const meta = brief.meta;
  if (v && meta) {
    if (v.data_basis_date > meta.scheduled_publish) {
      warnings.push({
        path: 'verification.data_basis_date',
        message: `data_basis_date(${v.data_basis_date}) > scheduled_publish(${meta.scheduled_publish}) — 미래 데이터 인용 의심`,
      });
    }
    if (meta.scheduled_publish > v.next_review_date) {
      errors.push({
        path: 'verification.next_review_date',
        message: 'scheduled_publish > next_review_date — 발행일 이전 재검토 일정',
      });
    }
  }

  // AdSense 정책 자동 차단 (강한 룰)
  const ad = brief.ad_policy;
  if (ad) {
    if (ad.promotes_specific_loan === true) {
      errors.push({ path: 'ad_policy.promotes_specific_loan', message: '특정 대출 추천 = AdSense 위반' });
    }
    if (ad.contains_high_interest_loan_promotion === true) {
      errors.push({ path: 'ad_policy.contains_high_interest_loan_promotion', message: '고금리 대출 광고 = AdSense 위반' });
    }
    if (ad.google_compliant === false) {
      errors.push({ path: 'ad_policy.google_compliant', message: 'google_compliant=false → 발행 차단' });
    }
  }

  // brief_id 일관성: scheduled_publish + "-" + slug 와 일치
  if (meta) {
    const expectedId = `${meta.scheduled_publish}-${meta.slug}`;
    if (meta.brief_id !== expectedId) {
      errors.push({
        path: 'meta.brief_id',
        message: `'${expectedId}' 형식이어야 함 (현재: '${meta.brief_id}')`,
      });
    }
  }

  return { errors, warnings };
}

// ─────────────────────────────────────────────
// 메인 export — loadBrief
// ─────────────────────────────────────────────
export class BriefValidationError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = 'BriefValidationError';
    this.issues = issues;
  }
}
export class BriefIsTemplateError extends Error {
  constructor() {
    super('_template.yaml 은 검증 대상이 아닙니다');
    this.name = 'BriefIsTemplateError';
  }
}

/**
 * brief.yaml 로드·파싱·검증 (Zod + 비즈니스 룰).
 *
 * @param {string} pathArg 파일 경로 (절대 또는 cwd 상대)
 * @param {{ allowTemplate?: boolean }} options
 * @returns {object} 검증 통과한 brief
 * @throws {BriefValidationError|BriefIsTemplateError|Error}
 */
export function loadBrief(pathArg, options = {}) {
  const absPath = resolve(process.cwd(), pathArg);
  if (!existsSync(absPath)) {
    throw new Error(`brief 파일을 찾을 수 없습니다: ${pathArg}`);
  }

  if (basename(absPath) === '_template.yaml' && !options.allowTemplate) {
    throw new BriefIsTemplateError();
  }

  const raw = readFileSync(absPath, 'utf-8');
  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    throw new Error(`YAML 파싱 실패: ${e.message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML 결과가 객체가 아닙니다 (빈 파일?)');
  }

  const result = BriefSchema.safeParse(parsed);
  if (!result.success) {
    throw new BriefValidationError(
      `스키마 검증 실패 (${result.error.issues.length}건)`,
      result.error.issues.map((iss) => ({ path: iss.path.join('.'), message: iss.message })),
    );
  }
  const brief = result.data;

  const business = validateBusinessRules(brief);
  if (business.errors.length > 0) {
    throw new BriefValidationError(
      `비즈니스 룰 검증 실패 (${business.errors.length}건)`,
      business.errors,
    );
  }

  // warnings은 throw X — 호출자가 별도 처리
  return brief;
}

/**
 * 검증 결과를 errors+warnings 객체로 반환 (throw 안 함). CLI·UI용.
 */
export function validateBrief(pathArg, options = {}) {
  try {
    const brief = loadBrief(pathArg, options);
    const business = validateBusinessRules(brief);
    return {
      pass: true,
      brief,
      errors: [],
      warnings: business.warnings,
    };
  } catch (e) {
    if (e instanceof BriefIsTemplateError) {
      return { pass: false, brief: null, errors: [], warnings: [], isTemplate: true };
    }
    if (e instanceof BriefValidationError) {
      return { pass: false, brief: null, errors: e.issues, warnings: [] };
    }
    return { pass: false, brief: null, errors: [{ path: '', message: e.message }], warnings: [] };
  }
}
