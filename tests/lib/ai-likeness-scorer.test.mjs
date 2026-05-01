import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreAILikeness } from '../../scripts/lib/ai-likeness-scorer.mjs';

const FIXTURES = resolve(__dirname, '..', 'fixtures', 'ai-likeness');

describe('ai-likeness-scorer — 합성 AI 출력', () => {
  it('synthetic-ai.md 점수 ≥ 5.0', () => {
    const text = readFileSync(resolve(FIXTURES, 'synthetic-ai.md'), 'utf-8');
    const r = scoreAILikeness(text);
    expect(r.score).toBeGreaterThanOrEqual(5.0);
    expect(r.signals).toContain('formulaic_intro');
    expect(r.signals).toContain('cliche_closing');
    expect(r.signals).toContain('reader_address');
    expect(r.signals).toContain('explicit_labels');
  });

  it('synthetic-ai 임계값 5.0 fail', () => {
    const text = readFileSync(resolve(FIXTURES, 'synthetic-ai.md'), 'utf-8');
    const r = scoreAILikeness(text, { threshold: 5.0 });
    expect(r.pass).toBe(false);
  });

  it('synthetic-ai 힌트가 4개 이상 발화', () => {
    const text = readFileSync(resolve(FIXTURES, 'synthetic-ai.md'), 'utf-8');
    const r = scoreAILikeness(text);
    expect(r.hints.length).toBeGreaterThanOrEqual(4);
  });
});

describe('ai-likeness-scorer — 사람 편집 글', () => {
  it('human-edited.md 점수 ≤ 4.0', () => {
    const text = readFileSync(resolve(FIXTURES, 'human-edited.md'), 'utf-8');
    const r = scoreAILikeness(text);
    expect(r.score).toBeLessThanOrEqual(4.0);
  });

  it('human-edited 임계값 5.0 pass', () => {
    const text = readFileSync(resolve(FIXTURES, 'human-edited.md'), 'utf-8');
    const r = scoreAILikeness(text, { threshold: 5.0 });
    expect(r.pass).toBe(true);
  });

  it('human-edited 편집자 보이스 페널티 0', () => {
    const text = readFileSync(resolve(FIXTURES, 'human-edited.md'), 'utf-8');
    const r = scoreAILikeness(text);
    expect(r.breakdown.editor_voice_absence).toBe(0);
  });
});

describe('ai-likeness-scorer — 시그널 단위', () => {
  it('정형화 도입부 검출', () => {
    const text = `안녕하세요. 오늘은 청년월세지원에 대해 알아보겠습니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.formulaic_intro).toBeGreaterThan(0);
  });

  it('상투적 마무리 검출', () => {
    const text = `청년월세지원 정리. 도움이 되셨길 바랍니다. 감사합니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.cliche_closing).toBeGreaterThan(0);
  });

  it('명시적 라벨 헤더 검출', () => {
    const text = `## 결론: 정리\n\n본문.\n\n## 정리: 마무리\n\n본문.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.explicit_labels).toBeGreaterThan(0);
  });

  it('"여러분" 다발 검출', () => {
    const text = `여러분, 청년월세지원 여러분 신청 방법 여러분께 알려드립니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.reader_address).toBeGreaterThan(0);
  });

  it('편집자 보이스 부재 페널티', () => {
    const text = `청년월세지원에 대해 정리합니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.editor_voice_absence).toBe(1.5);
  });

  it('편집자 보이스 있으면 페널티 0', () => {
    const text = `편집팀이 복지로에 직접 문의해 확인했더니 다음과 같았습니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.editor_voice_absence).toBe(0);
  });

  it('정수만 사용 → 둥근 숫자 페널티', () => {
    const text = `금액은 100원, 1000원, 10000원, 100000원, 1000000원입니다.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.rounded_numbers).toBeGreaterThan(0);
  });

  it('비둥근 숫자 → 페널티 0', () => {
    const text = `987,650원, 23.7%, 1,234건, 567명, 89일.`;
    const r = scoreAILikeness(text);
    expect(r.breakdown.rounded_numbers).toBe(0);
  });
});

describe('ai-likeness-scorer V2 — 한국어 자연체 추가 시그널', () => {
  it('S11 종결어미 단조로움 (~합니다 90%+) 검출', () => {
    const text = '청년월세지원입니다. 자격은 만 19세입니다. 신청 절차는 간단합니다. 복지로에서 신청합니다. 결과는 1주일 내 통보됩니다.';
    const r = scoreAILikeness(text);
    expect(r.breakdown.sentence_endings).toBeGreaterThan(0);
  });

  it('S11 종결어미 다양 (~합니다·~예요·의문문 혼합) → 0', () => {
    const text = '청년월세지원이에요. 자격이 어떻게 되나요? 만 19세부터 가능합니다. 정확히 알려드리죠.';
    const r = scoreAILikeness(text);
    expect(r.breakdown.sentence_endings).toBe(0);
  });

  it('S13 정형 접속사 다발 (또한·더불어 1000자당 5회+) 검출', () => {
    const text = '청년월세 좋습니다. 또한 효과적입니다. 또한 유용합니다. 또한 빠릅니다. 또한 간편합니다. 또한 안전합니다. 더불어 합리적입니다.';
    const r = scoreAILikeness(text);
    expect(r.breakdown.cliche_conjunction).toBeGreaterThan(0);
  });

  it('S14 단문 비율 < 15% (모두 장문) 검출', () => {
    const text = Array.from({ length: 6 }, () =>
      '청년월세지원은 만 19세 이상 34세 이하 1인가구 청년에게 월 20만원을 12개월 한도로 지원하는 정부 정책으로 본인 가구와 원가구 소득 기준을 동시에 평가합니다.'
    ).join(' ');
    const r = scoreAILikeness(text);
    expect(r.breakdown.short_sentence_absence).toBeGreaterThan(0);
  });

  it('S15 지시어 클리셰 (이러한·다음과 같은) 검출', () => {
    const text = '청년월세지원. 이러한 제도는 유용합니다. 다음과 같은 자격이 필요합니다. 이와 같은 정책이 더 늘어나야 합니다. 이러한 흐름은 좋습니다.';
    const r = scoreAILikeness(text);
    expect(r.breakdown.deictic_cliche).toBeGreaterThan(0);
  });

  it('자연체 본문은 V2 시그널 모두 0', () => {
    const text = '청년월세지원, 신청해보려는데 자격이 헷갈린다는 질문이 매주 들어온다. 편집팀이 복지로에 직접 들어가 단계별로 확인했다. 결론부터 적으면, 만 19세 이상 34세 이하 본인 소득 중위 60% 이하 청년이 대상이다. 함정도 있어요. 다만 임차보증금 5천만 이하·월세 70만 이하만 인정. 5천1만이면 거절됩니다. 정확히 말하면, 부모님 소득까지 봅니다.';
    const r = scoreAILikeness(text);
    // V2 5개 모두 0이거나 매우 낮음
    expect(r.breakdown.sentence_endings).toBeLessThanOrEqual(0.3);
    expect(r.breakdown.cliche_conjunction).toBe(0);
    expect(r.breakdown.deictic_cliche).toBe(0);
  });
});

describe('ai-likeness-scorer — score 정규화', () => {
  it('score는 0~10 범위', () => {
    const r = scoreAILikeness('짧은 본문.');
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(10);
  });

  it('빈 본문 처리', () => {
    const r = scoreAILikeness('');
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
