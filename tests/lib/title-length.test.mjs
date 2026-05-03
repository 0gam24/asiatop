/**
 * title-length audit 단위 테스트 — R50-2
 */
import { describe, it, expect } from 'vitest';
import { classifyTitle } from '../../scripts/audit/title-length.mjs';

describe('classifyTitle — Naver SA SERP 한도', () => {
  it('빈 title → critical (empty)', () => {
    expect(classifyTitle('').level).toBe('critical');
    expect(classifyTitle(undefined).level).toBe('critical');
    expect(classifyTitle(null).level).toBe('critical');
  });

  it('35자 이하 → pass', () => {
    expect(classifyTitle('짧은 제목입니다').level).toBe('pass');
    expect(classifyTitle('a'.repeat(35)).level).toBe('pass');
  });

  it('35자 초과 ~ 40자 이하 → warn', () => {
    expect(classifyTitle('a'.repeat(36)).level).toBe('warn');
    expect(classifyTitle('a'.repeat(40)).level).toBe('warn');
  });

  it('40자 초과 → critical', () => {
    expect(classifyTitle('a'.repeat(41)).level).toBe('critical');
    expect(classifyTitle('a'.repeat(80)).level).toBe('critical');
  });

  it('reason 메시지에 길이 포함', () => {
    expect(classifyTitle('a'.repeat(45)).reason).toMatch(/45자/);
    expect(classifyTitle('a'.repeat(38)).reason).toMatch(/38자/);
  });

  it('한국어 글자도 정확히 카운트', () => {
    // 한글 1자 = 1 char (UTF-16 code unit 단위)
    const ko30 = '청년월세지원으로 받을 수 있는 월 20만원';
    expect(ko30.length).toBeGreaterThan(15);
    const r = classifyTitle(ko30);
    expect(['pass', 'warn']).toContain(r.level);
  });
});
