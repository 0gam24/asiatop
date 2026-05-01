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
