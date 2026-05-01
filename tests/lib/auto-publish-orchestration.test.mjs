/**
 * 자동 발행 파이프라인 통합 테스트
 *
 * 흐름: 질문 → G0 dedup → G1 sanitize → G2 cluster → G3 source-probe
 *      → brief 골격 → (V2: LLM 4-pass) → G4 fact-verify → G5 adsense
 *      → G6 disclosure → G7 plagiarism → G8 ai-likeness
 *
 * V1 범위: 본 테스트는 Pre-LLM (G0~G3) + 골격 생성 + Post-LLM 일부
 *         (G5~G8, G4는 별도 테스트) 통합.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isDuplicate, recordSeen, _resetForTest } from '../../scripts/lib/dedup-index.mjs';
import { sanitizeQuestion } from '../../scripts/gates/g1-question-sanitize.mjs';
import { mapCluster } from '../../scripts/gates/g2-cluster-map.mjs';
import { probeAuthoritySources } from '../../scripts/gates/g3-source-probe.mjs';
import { generateBriefSkeleton } from '../../scripts/lib/auto-brief-generator.mjs';
import { checkAdSensePolicy } from '../../scripts/gates/g5-adsense-policy.mjs';
import { attachAndVerifyDisclosures } from '../../scripts/gates/g6-disclosure-attach.mjs';
import { checkPlagiarism } from '../../scripts/gates/g7-plagiarism.mjs';
import { checkAILikeness } from '../../scripts/gates/g8-ai-likeness.mjs';

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  _resetForTest();
});

describe('orchestration — 정상 질문 Pre-LLM end-to-end', () => {
  it('G0~G3 모두 통과 + brief 골격 생성', async () => {
    const question = '청년월세지원 신청 자격이 어떻게 되나요? 만 19세부터 가능한지 정확히 알려주세요.';

    // G0
    expect(isDuplicate(question)).toBe(false);

    // G1
    const g1 = sanitizeQuestion(question);
    expect(g1.pass).toBe(true);

    // G2
    const g2 = mapCluster(question);
    expect(g2.pass).toBe(true);
    expect(g2.cluster).toBe('gov-support');

    // G3
    const g3 = await probeAuthoritySources(g2.cluster, {
      keywords: g2.ranking[0].matched,
      expected_facts: [],
    }, { mock: true });
    expect(g3.pass).toBe(true);

    // brief 골격 생성
    const brief = generateBriefSkeleton({
      questionText: question,
      cluster: g2.cluster,
      matchedKeywords: g2.ranking[0].matched,
      authorityResponses: g3.responses,
    });

    expect(brief.meta.cluster).toBe('gov-support');
    expect(brief.niche.surface_pain).toContain('청년월세지원');
    expect(brief.primary_sources.length).toBeGreaterThan(0);
    expect(brief.source_question.allow_quote).toBe(false);

    // dedup 등록
    recordSeen(question, 'pending');
    expect(isDuplicate(question)).toBe(true);
  });
});

describe('orchestration — 폐기 흐름', () => {
  it('PII 포함 질문 → G1에서 폐기 (G2~G3 미실행)', () => {
    const question = '제 주민번호는 900101-1234567인데 청년월세지원 자격 알려주세요';
    const g1 = sanitizeQuestion(question);
    expect(g1.pass).toBe(false);
    expect(g1.reasons.some((r) => r.startsWith('g1-pii'))).toBe(true);
  });

  it('정치 키워드 질문 → G1 폐기', () => {
    // political-deny.json은 빈 list라 정치 키워드 미정. 대신 욕설로 검증.
    const question = '시발 이거 어떻게 신청하는거야';
    const g1 = sanitizeQuestion(question);
    expect(g1.pass).toBe(false);
    expect(g1.reasons).toContain('g1-profanity');
  });

  it('cluster 매핑 실패 → G2 폐기', () => {
    const question = '오늘 점심 뭐 먹지 추천해주세요 직장인 입맛에 맞게';
    const g2 = mapCluster(question);
    // "직장인" "추천" 등은 키워드 사전에 없음 → 점수 낮음
    expect(g2.pass).toBe(false);
  });

  it('24h 동일 질문 재진입 차단', () => {
    const question = '재진입 차단 테스트 청년월세지원 자격 문의';
    expect(isDuplicate(question)).toBe(false);
    recordSeen(question, 'rejected', 'g4-test');
    expect(isDuplicate(question)).toBe(true);
  });
});

describe('orchestration — Post-LLM 게이트 흐름 (mdx 통합)', () => {
  const cleanBrief = {
    meta: { brief_id: '2026-05-08-test', slug: 'test', cluster: 'gov-support', scheduled_publish: '2026-05-08' },
    primary_sources: [{ id: 'src1', url: 'https://www.bokjiro.go.kr/x', title: '복지로', expected_facts: ['월 20만원', '12개월', '2025년 7월 1일', '소득세법 제59조 제2항', '만 19세'], must_quote: true }],
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
    source_question: { original_text: '청년월세지원 자격이 어떻게', allow_quote: false },
  };

  const cleanMdx = `---
title: 청년월세지원
---

청년월세지원, 신청해보려는데 자격이 헷갈린다는 질문이 매주 들어온다.
편집팀이 복지로(2026년 4월 기준 운영 화면)에 직접 들어가 단계별로 확인했다.
만 19세 이상 청년이면서 본인 소득이 중위소득 60% 이하일 때 신청 가능하다.
월 20만원이 12개월 한도로 지원되며, 2025년 7월 1일 시행됐고 근거는 소득세법 제59조 제2항이다.`;

  it('G5 AdSense 정책 통과 (정상 brief + 본문)', () => {
    const g5 = checkAdSensePolicy(cleanMdx, cleanBrief);
    expect(g5.pass).toBe(true);
  });

  it('G6 면책·공시 부착 후 통과', () => {
    const g6 = attachAndVerifyDisclosures(cleanMdx, cleanBrief);
    expect(g6.pass).toBe(true);
    expect(g6.mdx).toContain('ymyl-disclaimer');
    expect(g6.mdx).toContain('ai-disclosure');
  });

  it('G7 표절 검사 — 짧은 원문은 통과', () => {
    const g7 = checkPlagiarism(cleanMdx, cleanBrief.source_question.original_text);
    expect(g7.pass).toBe(true);
  });

  it('G8 AI-likeness 통과 (편집자 보이스 포함)', () => {
    const g8 = checkAILikeness(cleanMdx, { threshold: 7.0 });
    expect(g8.pass).toBe(true);
  });

  it('전체 Post-LLM 파이프라인 (G5 → G6 → G7 → G8) 모두 통과', () => {
    const g5 = checkAdSensePolicy(cleanMdx, cleanBrief);
    expect(g5.pass).toBe(true);

    const g6 = attachAndVerifyDisclosures(cleanMdx, cleanBrief);
    expect(g6.pass).toBe(true);

    const g7 = checkPlagiarism(g6.mdx, cleanBrief.source_question.original_text);
    expect(g7.pass).toBe(true);

    const g8 = checkAILikeness(g6.mdx, { threshold: 7.0 });
    expect(g8.pass).toBe(true);
  });
});
