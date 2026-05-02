/**
 * passage-chunking.mjs 단위 테스트 — R48 #48-5
 *
 * AI 답변 엔진 인용 청크 룰 회귀 차단:
 *   - H2 직후 한 줄 정의 검출 (isOneLineDefinition)
 *   - H2 청크 추출 + 첫 paragraph 추출 (extractH2Chunks)
 */
import { describe, it, expect } from 'vitest';
import {
  isOneLineDefinition,
  extractH2Chunks,
} from '../../scripts/audit/passage-chunking.mjs';

describe('isOneLineDefinition — 한 줄 정의 패턴', () => {
  it('정상 정의 통과', () => {
    expect(isOneLineDefinition('청년월세지원은 만 19~34세 청년에게 월 20만원을 12개월 지원합니다.')).toBe(true);
    expect(isOneLineDefinition('근로장려금은 저소득 근로자 가구의 근로의욕을 높이는 환급형 세액공제다.')).toBe(true);
  });

  it('80자 초과 → false', () => {
    const long = '청년월세지원은 만 19~34세 청년에게 월 20만원을 12개월 한도로 지원하며 본인 소득이 중위소득 60% 이하일 때 신청 가능하고 거주지 요건도 충족해야 합니다.';
    expect(long.length).toBeGreaterThan(80);
    expect(isOneLineDefinition(long)).toBe(false);
  });

  it('10자 미만 → false', () => {
    expect(isOneLineDefinition('짧음.')).toBe(false);
  });

  it('정의문 종결 어미 없으면 false', () => {
    expect(isOneLineDefinition('청년월세지원은 만 19~34세 청년에게 지원되는데')).toBe(false);
    expect(isOneLineDefinition('자격 조건 안내')).toBe(false);
  });
});

describe('extractH2Chunks — H2 + 첫 paragraph 추출', () => {
  it('단순 H2 + paragraph', () => {
    const body = `## 자격 조건

만 19세 이상 청년이면서 본인 소득이 중위소득 60% 이하일 때 신청 가능합니다.

추가 설명...`;
    const chunks = extractH2Chunks(body);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('자격 조건');
    expect(chunks[0].firstParagraph).toMatch(/만 19세 이상/);
  });

  it('여러 H2 + 코드블록 무시', () => {
    const body = `## 첫 번째

첫 정의입니다.

\`\`\`js
## 코드 안 H2 무시
\`\`\`

## 두 번째

두 번째 정의입니다.`;
    const chunks = extractH2Chunks(body);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBe('첫 번째');
    expect(chunks[1].heading).toBe('두 번째');
  });

  it('리스트·표는 paragraph로 보지 않음', () => {
    const body = `## 신청 절차

- 1단계
- 2단계

여기는 paragraph 아님 (이전이 리스트).

## 다음 섹션`;
    const chunks = extractH2Chunks(body);
    expect(chunks).toHaveLength(2);
    // 첫 H2 이후 첫 줄이 리스트라 firstParagraph는 null
    expect(chunks[0].firstParagraph).toBeNull();
  });

  it('H2가 없는 본문 → 빈 배열', () => {
    const body = `# H1만 있음

본문 paragraph.`;
    expect(extractH2Chunks(body)).toEqual([]);
  });

  it('H2 직후 빈 줄 후 paragraph', () => {
    const body = `## 헤딩


정의입니다.`;
    const chunks = extractH2Chunks(body);
    expect(chunks[0].firstParagraph).toBe('정의입니다.');
  });
});
