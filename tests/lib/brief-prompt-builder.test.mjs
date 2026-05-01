import { describe, it, expect } from 'vitest';
import {
  buildSystemPromptAdditions,
  buildUserPromptFromBrief,
  buildRefineAdditions,
} from '../../scripts/lib/brief-prompt-builder.mjs';
import { loadBrief } from '../../scripts/lib/brief-loader.mjs';

const sample = loadBrief('tests/fixtures/briefs/sample-filled.yaml');

describe('brief-prompt-builder — buildSystemPromptAdditions', () => {
  it('null brief → 빈 문자열', () => {
    expect(buildSystemPromptAdditions(null)).toBe('');
  });

  it('do_not_say 블록 포함', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('절대 금지 표현');
    expect(r).toContain('청년 정책은 부모님 소득과 무관합니다');
  });

  it('framing/not_framing 블록', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('decision-guide');
    expect(r).toContain('이 글이 아닌 것');
  });

  it('intro_pattern 상세 명령', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('answer-first');
    expect(r).toContain('TL;DR');
  });

  it('word_count 1200~1800 override', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('1800~2800');
    expect(r).toContain('1,200~1,800 기본값을 따르지 마십시오');
  });

  it('YMYL·AI 공시 의무', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('YMYL 면책');
    expect(r).toContain('AI 작성 보조 사용 공시');
  });

  it('1:1 매칭 강제 (H2 개수)', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('H2 개수는 정확히 7개');
    expect(r).toContain('FAQ는 정확히 3개');
  });

  it('citable_sentences 60% 보존', () => {
    const r = buildSystemPromptAdditions(sample);
    expect(r).toContain('AI 인용 가능 문장 보존');
    expect(r).toContain('60% 이상');
  });
});

describe('brief-prompt-builder — buildUserPromptFromBrief', () => {
  it('null brief → throw', () => {
    expect(() => buildUserPromptFromBrief(null)).toThrow();
  });

  it('14개 헤더 모두 존재', () => {
    const r = buildUserPromptFromBrief(sample);
    for (let i = 1; i <= 14; i++) {
      expect(r).toContain(`## ${i}.`);
    }
  });

  it('차별점 (one_line_pitch) 인라인', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('본인·원가구 분기');
  });

  it('citable_sentences 모두 인라인', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('복지로에 따르면');
    expect(r).toContain('200,000원');
    expect(r).toContain('5,000만원 이하');
  });

  it('primary_sources URL 인라인', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('https://www.bokjiro.go.kr');
    expect(r).toContain('[src1]');
    expect(r).toContain('expected_facts:');
  });

  it('7개 H2 sections 모두 인라인', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('만 19~34세 1인가구 청년');
    expect(r).toContain('본인 가구 vs 원가구');
    expect(r).toContain('보증금 5천만');
  });

  it('FAQ count·must_include 인라인', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('FAQ — 정확히 3개');
    expect(r).toContain('부모님과 같이 살고 있어도');
  });

  it('재진술 (§14) 끝부분에 위치', () => {
    const r = buildUserPromptFromBrief(sample);
    const idx14 = r.lastIndexOf('## 14.');
    const idx13 = r.lastIndexOf('## 13.');
    expect(idx14).toBeGreaterThan(idx13);
    expect(r.endsWith('보존.')).toBe(true);
  });

  it('uses_facts_from src ID 1:1', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toContain('사용 가능한 출처: src1');
  });

  it('person·context 200자 truncate', () => {
    const briefLong = {
      ...sample,
      niche: { ...sample.niche, audience_persona: 'A'.repeat(500) },
    };
    const r = buildUserPromptFromBrief(briefLong);
    expect(r).toContain('AAAA');
    expect(r).toContain('…');
    // 200자 truncate 확인 — 'A'×500이 그대로 등장하지 않음
    expect(r).not.toContain('A'.repeat(300));
  });
});

describe('brief-prompt-builder — buildRefineAdditions', () => {
  it('null brief → 빈 문자열', () => {
    expect(buildRefineAdditions(null)).toBe('');
  });

  it('citable 보존 룰 + frontmatter 보존 룰', () => {
    const r = buildRefineAdditions(sample);
    expect(r).toContain('citable_sentences');
    expect(r).toContain('frontmatter');
    expect(r).toContain('변경 금지');
  });
});

describe('brief-prompt-builder — 빈 필드 omit 정책', () => {
  it('internal_links 빈 배열 → §13 블록 omit', () => {
    const briefNoLinks = { ...sample, internal_links: [] };
    const r = buildUserPromptFromBrief(briefNoLinks);
    expect(r).not.toMatch(/## 13\.\s*내부 링크/);
  });

  it('sample (internal_links 1개) → §13 노출', () => {
    const r = buildUserPromptFromBrief(sample);
    expect(r).toMatch(/## 13\.\s*내부 링크/);
  });
});
