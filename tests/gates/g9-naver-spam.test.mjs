/**
 * G9 Naver 스팸 게이트 단위 테스트 — R50-7
 */
import { describe, it, expect } from 'vitest';
import { checkNaverSpam, jaroSimilarity } from '../../scripts/gates/g9-naver-spam.mjs';

const baseBrief = {
  keywords: ['청년월세지원'],
  meta: { slug: '2026-test-article' },
};

const baseFrontmatter = `---
title: test
---
`;

describe('G9 — R1 키워드 반복률', () => {
  it('정상 본문 (반복률 < 3%) → pass', () => {
    const body = '청년월세지원은 정부가 청년에게 월세를 지원하는 제도입니다. ' +
      '신청 자격은 만 19~34세 청년이며 본인 소득이 중위소득 60% 이하일 때 ' +
      '신청 가능합니다. 월 20만원이 12개월 한도로 지원되며 신청 후 약 30일 ' +
      '내에 결과가 통보됩니다. 자세한 내용은 복지로 사이트에서 확인할 수 있습니다.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(true);
  });

  it('과도한 반복 (> 3%) → reject', () => {
    const body = Array(20).fill('청년월세지원').join(' ') + ' 정상 문장 50자 정도 추가합니다.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-keyword-density'))).toBe(true);
  });
});

describe('G9 — R2 숨김 텍스트', () => {
  it('display:none → reject', () => {
    const body = '<div style="display:none">숨겨진 키워드 청년월세지원</div>';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-hidden-text:display-none'))).toBe(true);
  });

  it('font-size:0 → reject', () => {
    const body = '<span style="font-size:0px">숨김</span>';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-hidden-text:font-size-zero'))).toBe(true);
  });

  it('정상 표현은 통과', () => {
    const body = '정상 텍스트입니다. CSS 안에 display 같은 단어가 있어도 style 속성 아니면 OK.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.reasons.filter((x) => x.startsWith('g9-hidden-text'))).toEqual([]);
  });
});

describe('G9 — R3 doorway 패턴', () => {
  it('완전 동일 slug 비교 X (skip)', () => {
    const r = checkNaverSpam(baseFrontmatter + '본문', baseBrief, {
      otherSlugs: ['2026-test-article'],
    });
    expect(r.reasons.filter((x) => x.startsWith('g9-doorway'))).toEqual([]);
  });

  it('similarity > 0.85 → reject', () => {
    const r = checkNaverSpam(baseFrontmatter + '본문', baseBrief, {
      otherSlugs: ['2026-test-articlex'], // 매우 유사
    });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-doorway'))).toBe(true);
  });

  it('similarity 0.75~0.85 → warning만', () => {
    const r = checkNaverSpam(baseFrontmatter + '본문', baseBrief, {
      otherSlugs: ['2025-different-slug'],
    });
    expect(r.reasons.filter((x) => x.startsWith('g9-doorway:'))).toEqual([]);
  });
});

describe('G9 — R4 LLM signature', () => {
  it('"Sure! Here\'s..." 시작 → reject', () => {
    const body = 'Sure! Here is the article about 청년월세지원.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-llm-signature'))).toBe(true);
  });

  it('"As an AI assistant" → reject', () => {
    const body = '본문\n\nAs an AI assistant, I cannot provide medical advice.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g9-llm-signature:as-an-ai'))).toBe(true);
  });

  it('정상 한국어 본문 → pass', () => {
    const body = '청년월세지원은 만 19세 이상 청년이 월세를 정부 지원으로 받을 수 있는 제도입니다.';
    const r = checkNaverSpam(baseFrontmatter + body, baseBrief);
    expect(r.reasons.filter((x) => x.startsWith('g9-llm-signature'))).toEqual([]);
  });
});

describe('jaroSimilarity', () => {
  it('동일 문자열 → 1', () => {
    expect(jaroSimilarity('hello', 'hello')).toBe(1);
  });

  it('완전 다른 문자열 → 낮음', () => {
    expect(jaroSimilarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('유사 slug → 높음', () => {
    const sim = jaroSimilarity('youth-housing-support-2026', 'youth-housing-support-2025');
    expect(sim).toBeGreaterThan(0.9);
  });

  it('빈 문자열 → 0', () => {
    expect(jaroSimilarity('', 'abc')).toBe(0);
    expect(jaroSimilarity('abc', '')).toBe(0);
  });
});
