import { describe, it, expect } from 'vitest';
import { generateBriefSkeleton } from '../../scripts/lib/auto-brief-generator.mjs';

describe('auto-brief-generator — generateBriefSkeleton', () => {
  const baseInput = {
    questionText: '청년월세지원 신청 자격이 어떻게 되나요? 만 19세부터 가능한지 정확히 알려주세요.',
    cluster: 'gov-support',
    matchedKeywords: ['청년월세지원', '청년월세'],
    authorityResponses: [
      { source_id: 'data-go-kr', source_url: 'https://www.data.go.kr/api/youth' },
      { source_id: 'welfare-go-kr', source_url: 'https://www.bokjiro.go.kr/x' },
    ],
  };

  it('meta 자동 채움', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.meta.cluster).toBe('gov-support');
    expect(b.meta.scheduled_publish).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(b.meta.brief_id).toBe(`${b.meta.scheduled_publish}-${b.meta.slug}`);
    expect(b.meta.brief_author).toBe('auto');
  });

  it('한국어 질문 → hash 기반 slug', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.meta.slug).toMatch(/^q-[a-f0-9]{10}$/);
  });

  it('niche.surface_pain은 PII redact된 본문', () => {
    const b = generateBriefSkeleton({
      ...baseInput,
      questionText: '주민번호 900101-1234567 인데 청년월세지원 자격 어떻게 되나요?',
    });
    expect(b.niche.surface_pain).toContain('<redacted:rrn>');
    expect(b.niche.surface_pain).not.toContain('900101-1234567');
  });

  it('search_timing 자동 채움', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.niche.search_timing.month).toMatch(/^\d{2}$/);
    expect(b.niche.search_timing.weekday).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });

  it('source_signal.description_length = 질문 길이', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.niche.source_signal.description_length).toBe(baseInput.questionText.length);
  });

  it('keywords.primary = matchedKeywords[0]', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.keywords.primary).toBe('청년월세지원');
  });

  it('primary_sources = G3 응답에서 추출', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.primary_sources.length).toBe(2);
    expect(b.primary_sources[0].url).toBe('https://www.data.go.kr/api/youth');
    expect(b.primary_sources[0].id).toBe('src1');
  });

  it('source_question.allow_quote = false 강제', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.source_question.allow_quote).toBe(false);
  });

  it('source_question.hash는 16자', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.source_question.hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('verification 정책 강제 (ymyl + AI 둘 다 true)', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.verification.ymyl_disclaimer).toBe(true);
    expect(b.verification.ai_assistance_disclosure).toBe(true);
  });

  it('ad_policy 기본값 안전 (모두 google_compliant)', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.ad_policy.google_compliant).toBe(true);
    expect(b.ad_policy.promotes_specific_loan).toBe(false);
  });

  it('coverage 0.5 cluster (credit-loan) → contains_financial_advice 자동 true', () => {
    const b = generateBriefSkeleton({ ...baseInput, cluster: 'credit-loan' });
    expect(b.ad_policy.contains_financial_advice).toBe(true);
  });

  it('coverage 0.9 cluster (gov-support) → contains_financial_advice false', () => {
    const b = generateBriefSkeleton({ ...baseInput, cluster: 'gov-support' });
    expect(b.ad_policy.contains_financial_advice).toBe(false);
  });

  it('coverage 0.55 cluster (insurance-personal) → contains_financial_advice true (안전 측)', () => {
    const b = generateBriefSkeleton({ ...baseInput, cluster: 'insurance-personal' });
    expect(b.ad_policy.contains_financial_advice).toBe(true);
  });

  it('structure.sections 7개 (Zod min 충족)', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.structure.sections.length).toBe(7);
  });

  it('next_review_date > scheduled_publish', () => {
    const b = generateBriefSkeleton(baseInput);
    expect(b.verification.next_review_date > b.meta.scheduled_publish).toBe(true);
  });
});
