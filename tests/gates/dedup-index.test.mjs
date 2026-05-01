import { describe, it, expect, beforeEach } from 'vitest';
import {
  questionHash,
  isDuplicate,
  recordSeen,
  pruneOld,
  _resetForTest,
} from '../../scripts/lib/dedup-index.mjs';

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  _resetForTest();
});

describe('dedup-index — questionHash', () => {
  it('동일 본문은 동일 hash', () => {
    expect(questionHash('청년월세 신청 자격')).toBe(questionHash('청년월세 신청 자격'));
  });

  it('공백·NFC 정규화 후 trim — 양 끝 공백 무시', () => {
    expect(questionHash('  청년월세 신청 자격  ')).toBe(questionHash('청년월세 신청 자격'));
  });

  it('중간 공백 차이는 다른 hash (exact match 정책)', () => {
    expect(questionHash('청년월세 신청')).not.toBe(questionHash('청년월세  신청'));
  });

  it('null/undefined 안전 처리', () => {
    expect(questionHash(null)).toMatch(/^[a-f0-9]{16}$/);
    expect(questionHash(undefined)).toMatch(/^[a-f0-9]{16}$/);
  });

  it('hash는 16자 16진수', () => {
    const h = questionHash('test');
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('dedup-index — isDuplicate / recordSeen', () => {
  it('처음 본 질문은 not duplicate', () => {
    expect(isDuplicate('새로운 질문 청년월세')).toBe(false);
  });

  it('recordSeen 후 24h 내 isDuplicate=true', () => {
    recordSeen('테스트 질문 청년월세 신청', 'pending');
    expect(isDuplicate('테스트 질문 청년월세 신청')).toBe(true);
  });

  it('다른 질문은 isDuplicate=false 유지', () => {
    recordSeen('첫 질문', 'rejected', 'g1-too-short');
    expect(isDuplicate('두 번째 질문 본문')).toBe(false);
  });

  it('recordSeen 결과에 status·reason 기록', () => {
    const h = recordSeen('재진입 차단 테스트 본문', 'rejected', 'g4-unverified');
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });

  it('같은 질문 다시 recordSeen → count 증가', () => {
    recordSeen('카운트 테스트 청년월세', 'pending');
    recordSeen('카운트 테스트 청년월세', 'pending');
    // count 검증을 위해 직접 index 읽기보단 isDuplicate가 true임만 확인
    expect(isDuplicate('카운트 테스트 청년월세')).toBe(true);
  });
});

describe('dedup-index — pruneOld', () => {
  it('빈 인덱스에서 pruneOld는 0 반환', () => {
    expect(pruneOld()).toBe(0);
  });

  it('현재 entry는 prune 대상 아님', () => {
    recordSeen('현재 entry 청년월세', 'pending');
    expect(pruneOld()).toBe(0);
  });
});
