/**
 * validate-schema.mjs 단위 테스트
 *
 * R47 P1-C: QAPage·ClaimReview 검증기 회귀 차단.
 * 자동 발행 글이 dist/ 빌드 후 깨진 JSON-LD를 production으로 흘리는 시나리오 차단.
 *
 * 검증:
 *   - QAPage: mainEntity.Question + acceptedAnswer 구조
 *   - ClaimReview: itemReviewed.Claim + reviewRating + datePublished ISO
 *   - 정상 케이스 0 errors
 *   - 비정상 케이스 명시적 reason 포함
 */
import { describe, it, expect } from 'vitest';
import { VALIDATORS, validateEntity } from '../../scripts/validate-schema.mjs';

describe('validate-schema — VALIDATORS 등록', () => {
  it('QAPage·ClaimReview 검증기 모두 등록', () => {
    expect(typeof VALIDATORS.QAPage).toBe('function');
    expect(typeof VALIDATORS.ClaimReview).toBe('function');
  });

  it('기존 5중 schema(Article·BreadcrumbList·FAQPage·Person·Organization) 유지', () => {
    expect(typeof VALIDATORS.Article).toBe('function');
    expect(typeof VALIDATORS.BreadcrumbList).toBe('function');
    expect(typeof VALIDATORS.FAQPage).toBe('function');
    expect(typeof VALIDATORS.Person).toBe('function');
    expect(typeof VALIDATORS.Organization).toBe('function');
  });
});

describe('validate-schema — QAPage 정상', () => {
  it('완전한 QAPage 통과', () => {
    const entity = {
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: '청년월세지원 자격이 어떻게 되나요?',
        text: '청년월세지원 자격이 어떻게 되나요?',
        upvoteCount: 12,
        answerCount: 1,
        acceptedAnswer: {
          '@type': 'Answer',
          text: '만 19세 이상 청년이면서 본인 소득이 중위소득 60% 이하일 때 신청 가능합니다.',
          dateCreated: '2026-05-01T09:00:00.000Z',
        },
      },
    };
    const r = validateEntity('test/qa-page.html', entity);
    expect(r.errors).toEqual([]);
  });
});

describe('validate-schema — QAPage 회귀', () => {
  it('mainEntity 누락 → 명시적 fail', () => {
    const entity = { '@type': 'QAPage' };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.errors[0].msg).toMatch(/mainEntity/);
  });

  it('mainEntity가 Question이 아니면 fail', () => {
    const entity = {
      '@type': 'QAPage',
      mainEntity: { '@type': 'Article', name: '잘못된 type' },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /Question 필요/.test(e.msg))).toBe(true);
  });

  it('Question.name·text 둘 다 누락 → fail', () => {
    const entity = {
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        acceptedAnswer: { '@type': 'Answer', text: '답' },
      },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /name 또는 text/.test(e.msg))).toBe(true);
  });

  it('acceptedAnswer 누락 → fail', () => {
    const entity = {
      '@type': 'QAPage',
      mainEntity: { '@type': 'Question', name: '질문' },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /acceptedAnswer/.test(e.msg))).toBe(true);
  });

  it('Answer.text 누락 → fail', () => {
    const entity = {
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: '질문',
        acceptedAnswer: { '@type': 'Answer' }, // text 없음
      },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /Answer\.text/.test(e.msg))).toBe(true);
  });
});

describe('validate-schema — ClaimReview 정상', () => {
  it('완전한 ClaimReview 통과', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://asiatop.co.kr/gov-support/test#verification',
      datePublished: '2026-05-01T09:00:00.000Z',
      author: { '@id': 'https://asiatop.co.kr/about#editor' },
      claimReviewed: '청년월세지원 자격은 만 19~34세이며 중위소득 60% 이하다.',
      itemReviewed: {
        '@type': 'Claim',
        appearance: [
          { '@type': 'CreativeWork', url: 'https://www.bokjiro.go.kr/x', name: '복지로' },
          { '@type': 'CreativeWork', url: 'https://www.law.go.kr/y', name: '법제처' },
        ],
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: 5,
        bestRating: 5,
        alternateName: '권위 데이터 1:1 매칭 검증 통과',
      },
    };
    const r = validateEntity('test/claim-review.html', entity);
    expect(r.errors).toEqual([]);
  });
});

describe('validate-schema — ClaimReview 회귀', () => {
  it('url 누락 → fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      datePublished: '2026-05-01T00:00:00Z',
      author: { '@id': 'x' },
      claimReviewed: 'c',
      itemReviewed: { '@type': 'Claim' },
      reviewRating: { '@type': 'Rating', ratingValue: 5 },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /url 누락/.test(e.msg))).toBe(true);
  });

  it('datePublished ISO 형식 오류 → fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://example.com/x',
      datePublished: '잘못된-날짜',
      author: { '@id': 'x' },
      claimReviewed: 'c',
      itemReviewed: { '@type': 'Claim' },
      reviewRating: { '@type': 'Rating', ratingValue: 5 },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /datePublished ISO 형식/.test(e.msg))).toBe(true);
  });

  it('itemReviewed가 Claim이 아니면 fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://example.com/x',
      datePublished: '2026-05-01T00:00:00Z',
      author: { '@id': 'x' },
      claimReviewed: 'c',
      itemReviewed: { '@type': 'Article' },
      reviewRating: { '@type': 'Rating', ratingValue: 5 },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /Claim 필요/.test(e.msg))).toBe(true);
  });

  it('appearance URL 형식 오류 → fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://example.com/x',
      datePublished: '2026-05-01T00:00:00Z',
      author: { '@id': 'x' },
      claimReviewed: 'c',
      itemReviewed: {
        '@type': 'Claim',
        appearance: [{ '@type': 'CreativeWork', url: 'not-a-url' }],
      },
      reviewRating: { '@type': 'Rating', ratingValue: 5 },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /appearance.*url 형식/.test(e.msg))).toBe(true);
  });

  it('reviewRating.ratingValue 누락 → fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://example.com/x',
      datePublished: '2026-05-01T00:00:00Z',
      author: { '@id': 'x' },
      claimReviewed: 'c',
      itemReviewed: { '@type': 'Claim' },
      reviewRating: { '@type': 'Rating' },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /ratingValue 누락/.test(e.msg))).toBe(true);
  });

  it('claimReviewed 비문자열 → fail', () => {
    const entity = {
      '@type': 'ClaimReview',
      url: 'https://example.com/x',
      datePublished: '2026-05-01T00:00:00Z',
      author: { '@id': 'x' },
      claimReviewed: 12345,
      itemReviewed: { '@type': 'Claim' },
      reviewRating: { '@type': 'Rating', ratingValue: 5 },
    };
    const r = validateEntity('test/broken.html', entity);
    expect(r.errors.some((e) => /claimReviewed 문자열/.test(e.msg))).toBe(true);
  });
});

describe('validate-schema — 격리 (전역 errors 누수 차단)', () => {
  it('연속 validateEntity 호출 시 누적 X', () => {
    const broken = { '@type': 'QAPage' };
    const r1 = validateEntity('p1', broken);
    const r2 = validateEntity('p2', broken);
    // 각 호출은 자기 페이지 결과만 반환해야 함
    expect(r1.errors.every((e) => e.page === 'p1')).toBe(true);
    expect(r2.errors.every((e) => e.page === 'p2')).toBe(true);
  });
});
