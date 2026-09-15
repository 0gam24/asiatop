/**
 * naver-ledger 단위 테스트 — 잠금 장부 분류·중복 판정 (docs/ops/KEYWORD-PLAN-2026-09-15.md §6-1)
 */
import { describe, it, expect } from 'vitest';
import {
  parseArticleMeta, detectProgram, detectSegments, detectAspect, detectYear, classifyFamily,
  extractCoreFacts, factOverlap, buildEntry, checkCandidate, duplicateGroups,
} from '../../scripts/audit/naver-ledger.mjs';

const mdx = ({ title, kw, desc = '설명 문장이 여기에 들어간다. 팔십 자를 채우기 위한 문장이다.', published = '2026-06-01' }) => `---
title: "${title}"
description: "${desc}"
cluster: "unemployment"
publishedAt: "${published}"
keywords:
  - "${kw}"
  - "보조 키워드"
faq:
  - q: "질문 하나?"
    a: "답."
sources:
  - title: "고용보험법 제64조"
    url: "https://www.law.go.kr/x"
---

본문
`;

describe('parseArticleMeta', () => {
  it('제목·키워드·faq·출처를 읽는다', () => {
    const m = parseArticleMeta(mdx({ title: '조기재취업수당 신청, 잔여 실업급여 50% 받는 절차', kw: '조기재취업수당' }));
    expect(m.title).toMatch(/조기재취업수당/);
    expect(m.keywords[0]).toBe('조기재취업수당');
    expect(m.faqQ).toEqual(['질문 하나?']);
    expect(m.sources[0]).toEqual({ title: '고용보험법 제64조', url: 'https://www.law.go.kr/x' });
  });
  it('CRLF 파일도 읽는다', () => {
    expect(parseArticleMeta(mdx({ title: 'a', kw: 'b' }).replace(/\n/g, '\r\n')).keywords[0]).toBe('b');
  });
  it('frontmatter 가 없으면 null', () => expect(parseArticleMeta('본문만')).toBeNull());
});

describe('detectProgram', () => {
  it('사전 별칭을 정규 이름으로', () => {
    expect(detectProgram('종소세 환급').program).toBe('종합소득세');
    expect(detectProgram('구직급여 부정수급').program).toBe('실업급여');
  });
  it('긴 제도명이 짧은 제도명보다 먼저 (조기재취업수당 ⊃ 실업급여 문맥)', () => {
    expect(detectProgram('조기재취업수당 조건').program).toBe('조기재취업수당');
  });
  it('대표 키워드에 없으면 제목에서 찾는다', () => {
    expect(detectProgram('13월 준비', '연말정산 체크리스트').program).toBe('연말정산');
  });
  it('사전 밖이면 대표 키워드 앞 두 어절(연도·금액 제거)', () => {
    const r = detectProgram('건강생활실천지원금 2026 5만원');
    expect(r.fromDictionary).toBe(false);
    expect(r.program).toBe('건강생활실천지원금');
  });
});

describe('detectSegments / detectAspect / detectYear', () => {
  it('제도 이름 속 낱말은 세그먼트가 아니다', () => {
    expect(detectSegments('조기재취업수당 조건', '조기재취업수당')).toEqual([]);
    expect(detectSegments('청년도약계좌 해지', '청년도약계좌')).toEqual([]);
  });
  it('상황·고용형태·지역을 잡는다', () => {
    expect(detectSegments('주휴수당 퇴사하는 주', '주휴수당')).toEqual(['퇴사']);
    expect(detectSegments('프리랜서 종합소득세', '종합소득세')).toEqual(['프리랜서']);
    expect(detectSegments('완주군 민생지원금', '민생지원금')).toEqual(['완주군']);
  });
  it('세부 주제는 일반 의도어·연도·숫자를 뺀 낱말', () => {
    expect(detectAspect('종합소득세 추계신고 방법 2026', '종합소득세')).toEqual(['추계신고']);
    expect(detectAspect('종합소득세 기한 후 신고 가산세', '종합소득세')).toEqual(['가산세', '기한후']);
    expect(detectAspect('조기재취업수당 조건', '조기재취업수당')).toEqual(['조건']); // 의도어도 세부 키워드 (운영자 결정 2026-09-15)
    expect(detectAspect('조기재취업수당 신청 방법', '조기재취업수당')).toEqual(['신청']);
  });
  it('연도는 제목 최댓값, 없으면 발행일에서 추정', () => {
    expect(detectYear('2025~2027 비교', '2026-01-01')).toEqual({ year: 2027, yearInferred: false });
    expect(detectYear('연차 계산', '2026-03-02')).toEqual({ year: 2026, yearInferred: true });
  });
});

describe('classifyFamily', () => {
  it('V: 정부안·개정안', () => expect(classifyFamily('실업급여 주 6일 지급 정부안').family).toBe('V'));
  it('B: 환수·과태료·기한후·부정수급', () => {
    expect(classifyFamily('근로장려금 환수 통지, 이의신청은').family).toBe('B');
    expect(classifyFamily('전입신고 14일 지나면 과태료 얼마').family).toBe('B');
  });
  it('B 의 감액은 사유·통지일 때만 (최저임금 90% 감액 가능 조건은 A)', () => {
    expect(classifyFamily('수습기간 급여, 최저임금 90% 감액 언제 가능한가').family).toBe('A');
    expect(classifyFamily('근로장려금 감액 이유').family).toBe('B');
  });
  it('그 외는 A', () => expect(classifyFamily('종부세 주택 수 산정 제외 신청 9월 16일부터').family).toBe('A'));
});

describe('coreFacts', () => {
  it('제목·설명에서 금액·날짜를 뽑는다', () => {
    const cf = extractCoreFacts({ title: '청년 월세 20만원, 9월 30일까지', description: '최대 12개월', sources: [] });
    expect(cf.amount).toBe('20만원');
    expect(cf.deadline).toBe('9월30일');
  });
  it('겹침 개수', () => {
    expect(factOverlap({ amount: '20만원', deadline: '9월30일', who: '청년' }, { amount: '20만원', deadline: '9월30일' }).n).toBe(2);
  });
});

describe('checkCandidate', () => {
  const entries = [
    buildEntry('early-reemployment-allowance-application', mdx({ title: '조기재취업수당 신청, 잔여 실업급여 50% 받는 절차', kw: '조기재취업수당' })),
    buildEntry('weekly-holiday-allowance-calculation', mdx({ title: '주휴수당 계산법, 주 15시간 이상 개근하면 받는 하루치', kw: '주휴수당' })),
    buildEntry('unemployment-fraud-cases', mdx({ title: '실업급여 부정수급 사례와 처벌', kw: '실업급여 부정수급' })),
    buildEntry('youth-rent-support', mdx({ title: '청년월세 20만원 지원, 9월 30일까지 신청', kw: '청년월세 지원' })),
  ];

  it('이미 키워드로 쓴 세부 키워드면 VETO (띄어쓰기·연도 무시)', () => {
    const r = checkCandidate(entries, { query: '2026 조기재취업 수당', family: 'A' });
    expect(r.verdict).toBe('VETO');
    expect(r.matches[0].slug).toBe('early-reemployment-allowance-application');
  });
  it('같은 주제라도 세부 키워드가 다르면 PASS (조기재취업수당 조건 ≠ 신청)', () => {
    const r = checkCandidate(entries, { query: '조기재취업수당 조건', family: 'A' });
    expect(r.verdict).toBe('PASS');
    expect(r.matches.map((m) => m.slug)).toContain('early-reemployment-allowance-application');
  });
  it('세그먼트가 다르면 PASS + 같은 제도 글을 내부 링크 후보로 (주휴수당 퇴사하는 주)', () => {
    const r = checkCandidate(entries, { query: '주휴수당 퇴사하는 주', family: 'A' });
    expect(r.verdict).toBe('PASS');
    expect(r.matches.map((m) => m.slug)).toContain('weekly-holiday-allowance-calculation');
  });
  it('같은 세부 키워드는 패밀리가 달라도 VETO, 세부 키워드를 더하면 PASS', () => {
    expect(checkCandidate(entries, { query: '실업급여 부정수급', family: 'A' }).verdict).toBe('VETO');
    expect(checkCandidate(entries, { query: '실업급여 부정수급 신고 포상금', family: 'A' }).verdict).toBe('PASS');
  });
  it('세부 주제가 달라도 핵심값이 2개 겹치면 FIX', () => {
    const r = checkCandidate(entries, { query: '청년월세 이사', family: 'A', facts: { amount: '20만원', deadline: '9월30일' } });
    expect(r.verdict).toBe('FIX');
  });
  it('같은 조합 그룹을 찾는다', () => {
    const dup = [...entries, buildEntry('unemployment-fraud-penalty', mdx({ title: '실업급여 부정수급 처벌 수위', kw: '실업급여 부정수급' }))];
    expect(duplicateGroups(dup).map((g) => g.slugs.length)).toEqual([2]);
  });
});
