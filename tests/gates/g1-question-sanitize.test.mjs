import { describe, it, expect } from 'vitest';
import { sanitizeQuestion, redactPII } from '../../scripts/gates/g1-question-sanitize.mjs';

describe('G1 — sanitizeQuestion', () => {
  it('정상 질문은 통과한다', () => {
    const r = sanitizeQuestion('청년월세지원 신청 자격이 어떻게 되나요? 만 19세부터 가능한가요?');
    expect(r.pass).toBe(true);
    expect(r.reasons).toEqual([]);
    expect(r.meta.korean_ratio).toBeGreaterThan(0.5);
  });

  it('빈 입력 차단', () => {
    expect(sanitizeQuestion('').pass).toBe(false);
    expect(sanitizeQuestion('   ').reasons).toContain('g1-empty');
    expect(sanitizeQuestion(null).reasons).toContain('g1-empty');
  });

  it('너무 짧은 질문 차단 (10자 미만)', () => {
    const r = sanitizeQuestion('짧음');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-too-short');
  });

  it('너무 긴 질문 차단 (500자 초과)', () => {
    const long = '청년월세지원 신청 자격 '.repeat(50);
    const r = sanitizeQuestion(long);
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-too-long');
  });

  it('비한국어(한글 비율 < 30%) 차단', () => {
    const r = sanitizeQuestion('How do I apply for housing subsidy in Seoul?');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-non-korean');
  });

  it('주민등록번호 패턴 차단', () => {
    const r = sanitizeQuestion('제 주민번호는 900101-1234567 인데 청년월세 신청 가능한가요?');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-pii:rrn');
  });

  it('휴대폰 번호 차단', () => {
    const r = sanitizeQuestion('연락처는 010-1234-5678 인데 청년월세 신청 절차 알려주세요');
    expect(r.pass).toBe(false);
    expect(r.reasons.some((r) => r.startsWith('g1-pii:phone'))).toBe(true);
  });

  it('이메일 차단', () => {
    const r = sanitizeQuestion('test@example.com 으로 답변 주세요. 청년월세 자격 궁금합니다.');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-pii:email');
  });

  it('욕설 차단', () => {
    const r = sanitizeQuestion('이거 진짜 시발 어떻게 신청하는 건지 모르겠습니다');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-profanity');
  });

  it('약물 키워드 차단', () => {
    const r = sanitizeQuestion('마약 사범도 청년월세지원 신청 가능한가요?');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-prohibited');
  });

  it('성인 키워드 차단', () => {
    const r = sanitizeQuestion('성매매 전과가 있는데 청년정책 자격 영향 있나요');
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g1-adult');
  });

  it('다중 사유 동시 수집', () => {
    const r = sanitizeQuestion('010-1234-5678 시발 문의 연락');
    expect(r.pass).toBe(false);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('meta.length·meta.korean_ratio 정확 계산', () => {
    const text = '청년월세지원 신청 자격 문의드립니다 정확히 알려주세요';
    const r = sanitizeQuestion(text);
    expect(r.meta.length).toBe(text.length);
    expect(r.meta.korean_ratio).toBeGreaterThan(0.7);
  });
});

describe('G1 — redactPII', () => {
  it('주민번호 redact', () => {
    const out = redactPII('주민번호 900101-1234567 입니다');
    expect(out).toContain('<redacted:rrn>');
    expect(out).not.toContain('900101-1234567');
  });

  it('휴대폰·이메일 동시 redact', () => {
    const out = redactPII('010-1234-5678 또는 test@example.com 으로');
    expect(out).toContain('<redacted:phone>');
    expect(out).toContain('<redacted:email>');
  });

  it('PII 없으면 원문 보존', () => {
    const text = '청년월세지원 신청 자격 문의드립니다';
    expect(redactPII(text)).toBe(text);
  });
});
