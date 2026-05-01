import { describe, it, expect } from 'vitest';
import { probeAuthoritySources } from '../../scripts/gates/g3-source-probe.mjs';
import { checkAdSensePolicy } from '../../scripts/gates/g5-adsense-policy.mjs';
import { attachAndVerifyDisclosures } from '../../scripts/gates/g6-disclosure-attach.mjs';
import { checkPlagiarism } from '../../scripts/gates/g7-plagiarism.mjs';
import { checkAILikeness } from '../../scripts/gates/g8-ai-likeness.mjs';

describe('G3 — probeAuthoritySources', () => {
  it('미지의 cluster → g3-no-adapter', async () => {
    const r = await probeAuthoritySources('unknown', { keywords: [], expected_facts: [] });
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g3-no-adapter');
  });

  it('gov-support fixture sample → pass', async () => {
    const r = await probeAuthoritySources('gov-support', {
      keywords: ['청년월세'],
      expected_facts: [
        '월 20만원 지원',
        '12개월 한도',
        '2025년 7월 1일 시행',
        '소득세법 제59조 제2항',
        '만 19세부터 신청',
      ],
    }, { mock: true });
    expect(r.pass).toBe(true);
    expect(r.meta.adapter_count).toBeGreaterThan(0);
    expect(r.meta.non_empty_count).toBeGreaterThan(0);
  });

  it('fixture 누락 시 __missing__ stub으로 G3 통과 (dev 모드)', async () => {
    const r = await probeAuthoritySources('gov-support', {
      keywords: ['no-such-keyword-zzz'],
      expected_facts: ['nothing'],
    }, { mock: true });
    // __missing__.json 이 raw 데이터를 가지므로 G3 통과
    expect(r.pass).toBe(true);
    expect(r.meta.non_empty_count).toBeGreaterThan(0);
  });
});

describe('G5 — checkAdSensePolicy', () => {
  const baseBrief = { ad_policy: { promotes_specific_loan: false, contains_high_interest_loan_promotion: false, google_compliant: true, contains_financial_advice: false } };
  const baseMdx = '---\ntitle: t\n---\n\n청년월세지원 안내.';

  it('정책 모두 OK + 본문 청정 → pass', () => {
    const r = checkAdSensePolicy(baseMdx, baseBrief);
    expect(r.pass).toBe(true);
  });

  it('promotes_specific_loan=true 차단', () => {
    const r = checkAdSensePolicy(baseMdx, { ad_policy: { ...baseBrief.ad_policy, promotes_specific_loan: true } });
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('g5-promotes-loan');
  });

  it('high_interest=true 차단', () => {
    const r = checkAdSensePolicy(baseMdx, { ad_policy: { ...baseBrief.ad_policy, contains_high_interest_loan_promotion: true } });
    expect(r.reasons).toContain('g5-high-interest');
  });

  it('google_compliant=false 차단', () => {
    const r = checkAdSensePolicy(baseMdx, { ad_policy: { ...baseBrief.ad_policy, google_compliant: false } });
    expect(r.reasons).toContain('g5-not-google-compliant');
  });

  it('financial_advice=true 는 warning만', () => {
    const r = checkAdSensePolicy(baseMdx, { ad_policy: { ...baseBrief.ad_policy, contains_financial_advice: true } });
    expect(r.pass).toBe(true);
    expect(r.warnings).toContain('g5-financial-advice');
  });

  it('본문 banned keyword 차단 (수익률 보장)', () => {
    const mdx = '---\ntitle: t\n---\n\n수익률 보장 상품을 추천드립니다.';
    const r = checkAdSensePolicy(mdx, baseBrief);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g5-banned-keyword'))).toBe(true);
  });

  it('정상 본문은 통과', () => {
    const mdx = '---\ntitle: t\n---\n\n청년월세지원은 만 19세부터 신청 가능합니다.';
    const r = checkAdSensePolicy(mdx, baseBrief);
    expect(r.pass).toBe(true);
  });
});

describe('G6 — attachAndVerifyDisclosures', () => {
  const brief = {
    verification: {
      ymyl_disclaimer: true,
      ai_assistance_disclosure: true,
      data_basis_date: '2026-04-01',
    },
  };

  it('YMYL + AI 공시 부착', () => {
    const mdx = '---\ntitle: t\n---\n\n본문.';
    const r = attachAndVerifyDisclosures(mdx, brief);
    expect(r.pass).toBe(true);
    expect(r.mdx).toContain('ymyl-disclaimer');
    expect(r.mdx).toContain('ai-disclosure');
  });

  it('이미 부착돼있으면 idempotent (중복 X)', () => {
    const mdx = '---\ntitle: t\n---\n\n본문.';
    const first = attachAndVerifyDisclosures(mdx, brief);
    const second = attachAndVerifyDisclosures(first.mdx, brief);
    const ymylCount = (second.mdx.match(/ymyl-disclaimer/g) || []).length;
    expect(ymylCount).toBe(1);
  });

  it('정책 false 시 부착 안 함 + warning', () => {
    const r = attachAndVerifyDisclosures('---\ntitle: t\n---\n\n본문.', { verification: { ymyl_disclaimer: false, ai_assistance_disclosure: false } });
    expect(r.pass).toBe(true);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
    expect(r.mdx).not.toContain('ymyl-disclaimer');
  });

  it('data_basis_date 본문에 표기', () => {
    const r = attachAndVerifyDisclosures('---\ntitle: t\n---\n\n본문.', brief);
    expect(r.mdx).toContain('2026-04-01');
  });

  it('frontmatter 보존 (---으로 시작·끝)', () => {
    const mdx = '---\ntitle: 제목\nauthor: editor\n---\n\n본문 텍스트.';
    const r = attachAndVerifyDisclosures(mdx, brief);
    expect(r.mdx.startsWith('---\ntitle: 제목')).toBe(true);
    expect(r.mdx).toContain('---\n\n본문');
  });

  it('YMYL 부착 시 본문 마지막 단락 다음에 위치', () => {
    const mdx = '---\ntitle: t\n---\n\n첫 단락.\n\n둘째 단락 마지막.';
    const r = attachAndVerifyDisclosures(mdx, brief);
    const ymylIdx = r.mdx.indexOf('ymyl-disclaimer');
    const lastBodyIdx = r.mdx.lastIndexOf('둘째 단락 마지막');
    expect(ymylIdx).toBeGreaterThan(lastBodyIdx);
  });

  it('mdx 마지막 줄에 trailing newline 보존', () => {
    const mdx = '---\ntitle: t\n---\n\n본문.';
    const r = attachAndVerifyDisclosures(mdx, brief);
    expect(r.mdx.endsWith('\n')).toBe(true);
  });
});

describe('G7 — checkPlagiarism', () => {
  it('질문 원문 미제공 시 pass', () => {
    const r = checkPlagiarism('본문 어쩌고저쩌고', null);
    expect(r.pass).toBe(true);
  });

  it('짧은 질문은 검사 스킵 (5단어 미만)', () => {
    const r = checkPlagiarism('본문', '청년월세 자격');
    expect(r.pass).toBe(true);
  });

  it('8단어+ 연속 매칭 → 차단', () => {
    const question = '청년월세지원 신청 자격이 어떻게 되는지 정확히 알려주세요 만 19세부터 가능한가요';
    const body = '청년월세지원 신청 자격이 어떻게 되는지 정확히 알려주세요 만 19세부터 가능한가요 답변드리면';
    const mdx = `---\ntitle: t\n---\n\n${body}`;
    const r = checkPlagiarism(mdx, question);
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('g7-quote-overlap'))).toBe(true);
  });

  it('재구성된 본문은 통과 (key facts만 추출)', () => {
    const question = '청년월세지원 신청 자격이 어떻게 되는지 정확히 알려주세요 만 19세부터 가능한가요';
    const body = '청년월세지원 자격은 만 19세 이상 34세 이하 청년이며 소득 기준을 충족해야 합니다.';
    const mdx = `---\ntitle: t\n---\n\n${body}`;
    const r = checkPlagiarism(mdx, question);
    expect(r.pass).toBe(true);
  });

  it('5단어+ 매칭 3건 이상 → multi-overlap 차단', () => {
    const question = '청년월세지원 신청 자격이 어떻게 되나요 그리고 신청 절차가 어떻게 되나요 추가로 소득 기준이 어떻게 되나요';
    const body = `${'청년월세지원 신청 자격이 어떻게 되나요'} ... 별도 ${'그리고 신청 절차가 어떻게 되나요'} ... 또한 ${'추가로 소득 기준이 어떻게 되나요'}`;
    const mdx = `---\ntitle: t\n---\n\n${body}`;
    const r = checkPlagiarism(mdx, question);
    // 같은 8단어+ 매칭이 발견되면 hard overlap; 아니면 soft 3+
    expect(r.pass).toBe(false);
  });

  it('meta 정보는 항상 반환 (디버깅용)', () => {
    const r = checkPlagiarism('---\ntitle: t\n---\n\n본문 내용', '질문 본문 내용 청년월세 자격');
    expect(r.meta).toBeDefined();
    expect(r.meta.body_word_count).toBeGreaterThan(0);
    expect(r.meta.question_word_count).toBeGreaterThan(0);
  });
});

describe('G8 — checkAILikeness', () => {
  it('자연체 본문 통과', () => {
    const mdx = `---\ntitle: t\n---\n\n청년월세지원, 신청해보려는데 자격이 헷갈린다는 질문이 매주 들어온다. 편집팀이 복지로에 직접 들어가 단계별로 확인했다. 결론부터 적으면, 만 19세 이상 34세 이하면서 본인 소득이 중위소득 60% 이하인 청년이 대상이다.`;
    const r = checkAILikeness(mdx);
    expect(r.pass).toBe(true);
    expect(r.score).toBeLessThan(5.0);
  });

  it('AI스러운 본문 차단 (default threshold 5.0)', () => {
    const mdx = `---\ntitle: t\n---\n\n안녕하세요. 오늘은 청년월세지원에 대해 알아보겠습니다. 여러분, **청년월세지원**은 **매우 중요한** 제도입니다. 여러분께 도움이 될 **메리트**가 큽니다. 또한 매우 유용합니다. 또한 좋습니다. 더불어 효과적입니다.\n\n## 결론\n\n도움이 되셨길 바랍니다. 감사합니다.`;
    const r = checkAILikeness(mdx);
    // V2 시그널 5종 추가로 SIGNAL_MAX 16.0 — score 정규화 후 5.0 임계 통과 가능성.
    // 더 강한 AI 시그널(S13 또한·더불어·또한 다발) 강화로 차단 보장.
    expect(r.pass).toBe(false);
    expect(r.reasons[0]).toMatch(/^g8-ai-likeness/);
  });

  it('threshold 환경변수로 조절', () => {
    const mdx = '안녕하세요. 오늘은 알아보겠습니다. 여러분 도움이 되셨길 바랍니다.';
    const lenient = checkAILikeness(mdx, { threshold: 9.0 });
    const strict = checkAILikeness(mdx, { threshold: 2.0 });
    expect(lenient.pass).toBe(true);
    expect(strict.pass).toBe(false);
  });
});
