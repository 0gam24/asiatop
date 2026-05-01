import { describe, it, expect } from 'vitest';
import { verifyFacts, summarizeForAudit } from '../../scripts/lib/fact-verifier.mjs';

const sampleBrief = {
  meta: { cluster: 'gov-support' },
  primary_sources: [
    {
      id: 'src1',
      url: 'https://www.bokjiro.go.kr/policy/youth-housing',
      title: '청년월세지원',
      expected_facts: [
        '월 20만원 지원',
        '12개월 한도',
        '2025년 7월 1일 시행',
        '소득세법 제59조 제2항',
        '만 19세부터 신청',
      ],
    },
  ],
  keywords: { secondary: ['청년월세'] },
};

describe('fact-verifier — 본문 사실 모두 권위 매칭 → pass', () => {
  it('정상 본문 통과', async () => {
    const mdx = `---
title: 청년월세지원
---

청년월세지원은 만 19세부터 신청 가능하며, 월 20만원이 12개월 한도로 지원됩니다.
2025년 7월 1일 시행됐고 근거는 소득세법 제59조 제2항입니다.
`;
    const r = await verifyFacts(mdx, sampleBrief);
    expect(r.pass).toBe(true);
    expect(r.match_rate).toBe(1);
    expect(r.unmatched.length).toBe(0);
  });
});

describe('fact-verifier — 환각 검출', () => {
  it('권위에 없는 수치는 unmatched → pass=false', async () => {
    const mdx = `---
title: 청년월세지원
---

청년월세지원은 월 20만원이 12개월 한도로 지원됩니다.
하지만 실제로는 월 99만원까지 받을 수 있습니다.`;
    const r = await verifyFacts(mdx, sampleBrief);
    expect(r.pass).toBe(false);
    expect(r.unmatched.some((u) => u.token.normalized === '990000')).toBe(true);
  });

  it('환각 날짜 검출', async () => {
    const mdx = `---
title: 청년월세지원
---

2099년 1월 1일부터 시행됩니다.`;
    const r = await verifyFacts(mdx, sampleBrief);
    expect(r.pass).toBe(false);
  });
});

describe('fact-verifier — 근사 표현 통과', () => {
  it('약 100만원은 approximate 분류 (분모 제외)', async () => {
    const mdx = `---
title: test
---

월 20만원 지원이며, 1년차에는 약 240만원 수준입니다.
12개월 한도로 만 19세부터 신청 가능합니다.`;
    const r = await verifyFacts(mdx, sampleBrief);
    // 약 240만원은 approximate, 분모 제외라 pass 가능
    expect(r.approximate.length).toBeGreaterThan(0);
  });
});

describe('fact-verifier — authorityFetch 통합', () => {
  it('mock fetch 응답을 권위 풀에 추가', async () => {
    const mdx = `---
title: test
---

기준금리 3.5% 적용`;
    const briefMinimal = {
      meta: { cluster: 'savings' },
      primary_sources: [{ id: 's1', url: 'https://ecos.bok.or.kr', title: 'BOK', expected_facts: [] }],
      keywords: { secondary: ['기준금리'] },
    };
    const r = await verifyFacts(mdx, briefMinimal, {
      authorityFetch: async () => [{
        source_id: 's1',
        source_url: 'https://ecos.bok.or.kr',
        raw: { rate: '3.5%' },
      }],
      mock: true,
    });
    expect(r.pass).toBe(true);
  });

  it('authorityFetch 실패 → pass=false', async () => {
    const mdx = `---
title: test
---

월 20만원 지원`;
    const briefMinimal = {
      meta: { cluster: 'gov-support' },
      primary_sources: [{ id: 's1', url: 'https://test', title: 'test', expected_facts: [] }],
      keywords: { secondary: [] },
    };
    const r = await verifyFacts(mdx, briefMinimal, {
      authorityFetch: async () => { throw new Error('network fail'); },
      mock: false,
    });
    expect(r.pass).toBe(false);
    expect(r.stats.error).toContain('network fail');
  });
});

describe('fact-verifier — frontmatter inject', () => {
  it('통과 시 sources_verified=true', async () => {
    const mdx = `---
title: test
---

월 20만원 지원이며 12개월 한도, 2025년 7월 1일 시행, 만 19세부터.`;
    const r = await verifyFacts(mdx, sampleBrief);
    expect(r.injected_frontmatter.sources_verified).toBe(true);
    expect(r.injected_frontmatter.verified_facts_count).toBeGreaterThan(0);
    expect(r.injected_frontmatter.fact_verification_at).toBeDefined();
  });

  it('실패 시 sources_verified=false', async () => {
    const mdx = `---
title: test
---

월 99만원 지원`;
    const r = await verifyFacts(mdx, sampleBrief);
    expect(r.injected_frontmatter.sources_verified).toBe(false);
  });
});

describe('summarizeForAudit', () => {
  it('audit 형식 직렬화 — unmatched 최대 10개', async () => {
    const mdx = `---\ntitle: t\n---\n\n월 99만원 적용`;
    const r = await verifyFacts(mdx, sampleBrief);
    const audit = summarizeForAudit(r);
    expect(audit.pass).toBe(false);
    expect(Array.isArray(audit.unmatched)).toBe(true);
    expect(audit.unmatched.length).toBeLessThanOrEqual(10);
  });
});
