import { describe, it, expect } from 'vitest';
import {
  loadBrief,
  validateBrief,
  validateBusinessRules,
  BriefSchema,
  VALID_CLUSTERS,
  isTrustedUrl,
  BriefIsTemplateError,
  BriefValidationError,
} from '../../scripts/lib/brief-loader.mjs';

describe('brief-loader — exports', () => {
  it('VALID_CLUSTERS는 12개', () => {
    expect(VALID_CLUSTERS.length).toBe(12);
  });

  it('isTrustedUrl 정부 도메인 통과', () => {
    expect(isTrustedUrl('https://www.law.go.kr/test')).toBe(true);
    expect(isTrustedUrl('https://ecos.bok.or.kr/api')).toBe(true);
  });

  it('isTrustedUrl 민간 도메인 차단', () => {
    expect(isTrustedUrl('https://example.com/test')).toBe(false);
  });

  it('BriefSchema는 Zod schema', () => {
    expect(BriefSchema).toBeDefined();
    expect(typeof BriefSchema.safeParse).toBe('function');
  });
});

describe('brief-loader — loadBrief', () => {
  it('_template.yaml은 BriefIsTemplateError 던짐', () => {
    expect(() => loadBrief('briefs/_template.yaml')).toThrow(BriefIsTemplateError);
  });

  it('allowTemplate=true 시 template도 로드 시도 (검증은 실패할 것)', () => {
    expect(() => loadBrief('briefs/_template.yaml', { allowTemplate: true }))
      .toThrow(BriefValidationError);
  });

  it('존재하지 않는 파일은 일반 Error', () => {
    expect(() => loadBrief('briefs/no-such-brief.yaml')).toThrow(/찾을 수 없습니다/);
  });
});

describe('brief-loader — validateBrief (non-throw API)', () => {
  it('_template.yaml → isTemplate=true', () => {
    const r = validateBrief('briefs/_template.yaml');
    expect(r.pass).toBe(false);
    expect(r.isTemplate).toBe(true);
  });

  it('없는 파일 → errors[0].message에 사유', () => {
    const r = validateBrief('briefs/no-such.yaml');
    expect(r.pass).toBe(false);
    expect(r.errors[0].message).toMatch(/찾을 수 없습니다/);
  });
});

describe('brief-loader — sample fixture', () => {
  it('tests/fixtures/briefs/sample-filled.yaml 정상 로드 + 검증 통과', () => {
    const r = validateBrief('tests/fixtures/briefs/sample-filled.yaml');
    expect(r.pass).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.brief.meta.cluster).toBe('gov-support');
    expect(r.brief.niche.life_stage).toBe('early-career');
    expect(r.brief.niche.competing_options.length).toBeGreaterThan(0);
    expect(r.brief.source_question.allow_quote).toBe(false);
  });

  it('sample brief의 niche 8차원 모두 채워짐', () => {
    const r = validateBrief('tests/fixtures/briefs/sample-filled.yaml');
    const n = r.brief.niche;
    expect(n.search_timing.month).toBeTruthy();
    expect(n.life_stage).not.toBe('unspecified');
    expect(n.employment_type).not.toBe('unspecified');
    expect(n.region).not.toBe('nationwide');
    expect(n.hidden_anxiety_tags.length).toBeGreaterThan(0);
    expect(n.source_signal.unmet_market_score).toBeGreaterThanOrEqual(0);
  });

  it('sample brief는 fact-verifier가 사용할 토큰을 가진 expected_facts 포함', () => {
    const r = validateBrief('tests/fixtures/briefs/sample-filled.yaml');
    const facts = r.brief.primary_sources.flatMap((s) => s.expected_facts);
    expect(facts.some((f) => /\d+원/.test(f) || /원/.test(f))).toBe(true);
    expect(facts.some((f) => /\d+개월|\d+년|\d+세/.test(f))).toBe(true);
  });
});

describe('brief-loader — validateBusinessRules', () => {
  const validBrief = {
    meta: {
      brief_id: '2026-05-08-test-slug',
      slug: 'test-slug',
      cluster: 'gov-support',
      scheduled_publish: '2026-05-08',
      priority: 'high',
      brief_author: 'editor',
      created_at: '2026-05-01',
    },
    primary_sources: [{ id: 'src1', url: 'https://www.law.go.kr/x', title: 'X', expected_facts: ['f1'], must_quote: true }],
    secondary_sources: [],
    structure: {
      sections: [{ h2: 'h', content_hint: '', uses_facts_from: ['src1'], requires_table: false, requires_calculation: false }],
      word_count_min: 1500,
      word_count_target: 2000,
      word_count_max: 2500,
      faq: { count: 3, must_include_questions: ['q?'] },
      intro_pattern: 'answer-first',
    },
    verification: {
      data_basis_date: '2026-04-01',
      next_review_date: '2026-11-01',
      ymyl_disclaimer: true,
      ai_assistance_disclosure: true,
    },
    ad_policy: {
      promotes_specific_loan: false,
      contains_high_interest_loan_promotion: false,
      contains_financial_advice: false,
      google_compliant: true,
    },
  };

  it('정상 brief → errors 0', () => {
    const r = validateBusinessRules(validBrief);
    expect(r.errors).toEqual([]);
  });

  it('promotes_specific_loan=true → 차단', () => {
    const bad = { ...validBrief, ad_policy: { ...validBrief.ad_policy, promotes_specific_loan: true } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'ad_policy.promotes_specific_loan')).toBe(true);
  });

  it('google_compliant=false → 차단', () => {
    const bad = { ...validBrief, ad_policy: { ...validBrief.ad_policy, google_compliant: false } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'ad_policy.google_compliant')).toBe(true);
  });

  it('brief_id 불일치 → 차단', () => {
    const bad = { ...validBrief, meta: { ...validBrief.meta, brief_id: 'wrong-id' } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'meta.brief_id')).toBe(true);
  });

  it('uses_facts_from의 src ID 누락 → 차단', () => {
    const bad = { ...validBrief, structure: { ...validBrief.structure, sections: [{ ...validBrief.structure.sections[0], uses_facts_from: ['src99'] }] } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path.startsWith('structure.sections'))).toBe(true);
  });

  it('word_count min > target → 차단', () => {
    const bad = { ...validBrief, structure: { ...validBrief.structure, word_count_min: 3000 } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'structure.word_count_min')).toBe(true);
  });

  it('next_review_date < scheduled_publish → 차단', () => {
    const bad = { ...validBrief, verification: { ...validBrief.verification, next_review_date: '2025-01-01' } };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'verification.next_review_date')).toBe(true);
  });

  it('primary_sources URL 신뢰 도메인 외 → 차단', () => {
    const bad = { ...validBrief, primary_sources: [{ ...validBrief.primary_sources[0], url: 'https://example.com/x' }] };
    const r = validateBusinessRules(bad);
    expect(r.errors.some((e) => e.path === 'primary_sources[0].url')).toBe(true);
  });
});
