/**
 * brief.yaml → LLM prompt 매핑 (Gap 2 Step 3)
 *
 * Plan agent spec 기반 — brief 9개 섹션을 SYSTEM·USER 두 채널로 분리 주입.
 *
 * SYSTEM addition: brief 모드 강제 룰 7블록
 *   - meta.cluster (이미 base prompt 보간)
 *   - niche.do_not_say[]
 *   - content_angle.framing / not_framing
 *   - structure.intro_pattern
 *   - structure.word_count_min/target/max
 *   - verification.ymyl_disclaimer / ai_assistance_disclosure
 *   - 출력 형식 1:1 매칭 강제 (H2 개수·순서·src 인용 제한)
 *
 * USER prompt: 14블록 데이터
 *   - 차별점·페르소나·페인·primary_question
 *   - sub_questions ↔ H2 1:1 매핑
 *   - keywords·unique_value·citable_sentences (60% 강제)
 *   - primary_sources·structure.sections·FAQ·internal_links
 *
 * 빈 필드는 블록 자체 omit (placeholder 생성 X).
 */

const INTRO_PATTERN_INSTRUCTIONS = Object.freeze({
  'answer-first': 'TL;DR 직후 첫 H2에서 primary_question에 대한 정확한 결론을 1문장으로 즉시 제시. 배경 설명·서론 금지.',
  'audience-pain-first': '도입 첫 단락에서 페르소나의 surface_pain·hidden_anxiety를 정면 인식. 결론은 마지막 H2 직전.',
  'story-first': '도입을 1~2문장 구체 시나리오(시점·인물·상황)로 시작. 통계·정의는 본문 중간에.',
  'data-first': '도입에 권위 소스의 충격적 수치 1개를 인용. 그 수치의 함의를 본문에서 풀어냄.',
});

/**
 * brief를 받아 SYSTEM_PROMPT에 append할 추가 룰 블록 생성.
 * @param {object} brief 검증 통과한 brief 객체
 * @returns {string} append용 텍스트 (앞에 \n\n 없이)
 */
export function buildSystemPromptAdditions(brief) {
  if (!brief) return '';
  const blocks = [];

  // 1. niche.do_not_say
  const dontSay = (brief.niche?.do_not_say ?? []).filter((s) => s && s.length > 0);
  if (dontSay.length > 0) {
    blocks.push([
      '【절대 금지 표현】',
      '다음 표현·주장은 본문 어디에도 등장 금지:',
      ...dontSay.map((s) => `- ${s}`),
      '위반 시 출력 폐기.',
    ].join('\n'));
  }

  // 2. content_angle.framing / not_framing
  const framing = brief.content_angle?.framing;
  const notFraming = brief.content_angle?.not_framing;
  if (framing) {
    const frmBlock = [`【글 유형】 이 글은 \`${framing}\`입니다.`];
    if (notFraming) frmBlock.push(`이 글이 아닌 것: ${notFraming}. 해당 톤·내용으로 흐르면 안 됩니다.`);
    blocks.push(frmBlock.join('\n'));
  }

  // 3. structure.intro_pattern
  const introPattern = brief.structure?.intro_pattern;
  if (introPattern) {
    const detail = INTRO_PATTERN_INSTRUCTIONS[introPattern] ?? introPattern;
    blocks.push(`【도입부 패턴】 ${introPattern} — ${detail}`);
  }

  // 4. structure.word_count_min/target/max — 기존 1200~1800 override
  const wc = brief.structure;
  if (wc?.word_count_min && wc?.word_count_max) {
    blocks.push(`【글 길이】 본문 합계 한국어 어절 ${wc.word_count_min}~${wc.word_count_max} (목표 ${wc.word_count_target ?? Math.round((wc.word_count_min + wc.word_count_max) / 2)}). 1,200~1,800 기본값을 따르지 마십시오.`);
  }

  // 5. verification 의무
  const ymylRequired = brief.verification?.ymyl_disclaimer === true;
  const aiRequired = brief.verification?.ai_assistance_disclosure === true;
  const verifBlock = [];
  if (ymylRequired) verifBlock.push('본문 끝에 YMYL 면책 단락(60~120자) 의무 부착: 정보성·시점 명시·전문가 상담 권고.');
  if (aiRequired) verifBlock.push('본문 끝(또는 frontmatter 직후) AI 작성 보조 사용 공시 1문장 의무.');
  if (verifBlock.length > 0) {
    blocks.push(['【YMYL·AI 공시 의무】', ...verifBlock].join('\n'));
  }

  // 6. 출력 형식 1:1 매칭 강제 (brief 모드의 핵심)
  const sections = brief.structure?.sections ?? [];
  const faqCount = brief.structure?.faq?.count ?? 3;
  if (sections.length > 0) {
    blocks.push([
      '【brief 1:1 매칭 강제】',
      `- H2 개수는 정확히 ${sections.length}개. 추가·삭제·순서 변경 금지.`,
      '- 각 H2 텍스트는 USER 메시지 §11 항목과 글자까지 일치.',
      '- 각 H2의 본문은 그 섹션의 uses_facts_from src ID에서 온 사실만 인용. 다른 src 인용 0회.',
      '- requires_table=true 인 섹션은 markdown 표 1개 필수.',
      `- FAQ는 정확히 ${faqCount}개. must_include_questions 모두 포함.`,
      '- 위반 1건당 자동 폐기 사유.',
    ].join('\n'));
  }

  // 7. citable_sentences 60% 강제
  const citables = brief.content_angle?.citable_sentences ?? [];
  if (citables.length > 0) {
    blocks.push([
      '【AI 인용 가능 문장 보존】',
      `USER §9 citable_sentences (${citables.length}개)를 본문에 60% 이상 거의 그대로(또는 의미 동일·핵심 키워드·수치·시점 보존) 자연 삽입하라.`,
      '변형은 어순·종결어미만 0~1회 손질. 수치·법령·단위·고유명사 토큰은 글자 그대로 보존.',
    ].join('\n'));
  }

  return blocks.join('\n\n');
}

// ─────────────────────────────────────────────
// USER prompt 14블록
// ─────────────────────────────────────────────

function truncate(s, n) {
  if (typeof s !== 'string') return '';
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

function blockHeader(num, title) {
  return `## ${num}. ${title}`;
}

function buildPersonaBlock(brief) {
  const persona = brief.niche?.audience_persona;
  const context = brief.niche?.life_context;
  if (!persona && !context) return null;
  const lines = [blockHeader(2, '페르소나')];
  if (persona) lines.push(`- 대상: ${truncate(persona.trim(), 200)}`);
  if (context) lines.push(`- 맥락: ${truncate(context.trim(), 200)}`);
  return lines.join('\n');
}

function buildPainBlock(brief) {
  const surface = brief.niche?.surface_pain;
  const hidden = brief.niche?.hidden_anxiety;
  const next = brief.niche?.desired_next_action;
  if (!surface && !hidden && !next) return null;
  const lines = [blockHeader(3, '페인 포인트')];
  if (surface) lines.push(`- 표면: ${surface.trim()}`);
  if (hidden) lines.push(`- 숨은 불안: ${hidden.trim()}`);
  if (next) lines.push(`- 다음 행동: ${next.trim()}`);
  return lines.join('\n');
}

function buildSubQuestionMappingBlock(brief) {
  const subQs = brief.reader_intent?.sub_questions ?? [];
  if (subQs.length === 0) return null;
  return [
    blockHeader(5, '하위 질문 ↔ H2 1:1 매핑 (필수)'),
    ...subQs.map((q, i) => `- Q${i + 1}: ${q}  →  H2[${i + 1}] 응답`),
  ].join('\n');
}

function buildCompetitorBlock(brief) {
  const opts = brief.reader_intent?.competitor_options_in_mind ?? [];
  const weakness = brief.reader_intent?.competitor_content_weakness;
  if (opts.length === 0 && !weakness) return null;
  const lines = [blockHeader(6, '경쟁 옵션·기존 글 약점')];
  if (opts.length > 0) lines.push(`- 동시 비교 중: ${opts.join(', ')}`);
  if (weakness) lines.push(`- 1페이지 약점: ${weakness.trim()}`);
  lines.push('→ 본문은 위 약점을 정면 해결할 것.');
  return lines.join('\n');
}

function buildKeywordsBlock(brief) {
  const k = brief.keywords ?? {};
  if (!k.primary && (!k.secondary || k.secondary.length === 0)) return null;
  const lines = [blockHeader(7, '키워드')];
  if (k.primary) lines.push(`- primary: ${k.primary}  (title·H2·도입부 어딘가에 정확 일치 1회 이상)`);
  if (k.secondary?.length > 0) lines.push(`- secondary: ${k.secondary.join(', ')}`);
  if (k.longtail?.length > 0) lines.push(`- longtail: ${k.longtail.join(', ')}`);
  return lines.join('\n');
}

function buildCitablesBlock(brief) {
  const citables = brief.content_angle?.citable_sentences ?? [];
  if (citables.length === 0) return null;
  return [
    blockHeader(9, 'AI 인용 가능 문장 (citable_sentences) — 본문에 그대로 또는 의미 동일하게 포함'),
    ...citables.map((c, i) => `${i + 1}. "${c}"`),
    '※ 위 문장 중 60% 이상을 본문 어딘가에 거의 그대로 또는 의미 동일하게 자연 삽입할 것. 수치·법령·단위는 보존.',
  ].join('\n');
}

function buildSourcesBlock(brief) {
  const primary = brief.primary_sources ?? [];
  const secondary = brief.secondary_sources ?? [];
  if (primary.length === 0) return null;
  const lines = [blockHeader(10, '1차 자료 (G4 fact-verifier 매칭 풀) — 본문의 모든 수치·날짜·법령·금액 토큰은 이 expected_facts 안 토큰 중 하나여야 함')];
  for (const s of primary) {
    lines.push(`[${s.id}] ${s.title} — ${s.url}`);
    if (s.expected_facts?.length > 0) {
      lines.push('  expected_facts: (본문 토큰 매칭 풀 — 외부 토큰 추가 금지)');
      for (const f of s.expected_facts) lines.push(`   - ${f}`);
    }
    if (s.must_quote === true) lines.push('  → 본문에 직접 인용 의무');
  }
  lines.push('');
  lines.push('※ G4 매칭 룰: 본문에 등장하는 amount(원/만원)·percent(%)·count_unit(일/개월/년)·date(YYYY년 N월)·law(법령명 제N조) 토큰은');
  lines.push('   각 출처의 expected_facts 안에 있는 토큰과 정확히 일치해야 합니다.');
  lines.push('   외부 일반 지식·추정값·근사값 사용 X. 단, "약 N", "대략 N", "보통 N" 표현은 approximate 분류로 분모 제외 — 정확 토큰을 모르면 이 표현 사용.');
  if (secondary.length > 0) {
    lines.push('\n2차 자료 (선택 인용):');
    for (const s of secondary) {
      lines.push(`[${s.id}] ${s.title} — ${s.url}`);
    }
  }
  return lines.join('\n');
}

function buildStructureBlock(brief) {
  const sections = brief.structure?.sections ?? [];
  if (sections.length === 0) return null;
  const lines = [blockHeader(11, `H2 시퀀스 — 정확히 ${sections.length}개·이 순서·이 제목으로 작성`)];
  sections.forEach((sec, i) => {
    lines.push(`${i + 1}. ${sec.h2}`);
    if (sec.content_hint) lines.push(`   · 다룰 내용: ${sec.content_hint}`);
    if (sec.uses_facts_from?.length > 0) {
      lines.push(`   · 사용 가능한 출처: ${sec.uses_facts_from.join(', ')} (다른 출처 인용 금지)`);
    }
    if (sec.requires_table) lines.push('   · 표 필수: 예 — markdown 표 1개');
    if (sec.requires_calculation) lines.push('   · 계산 시뮬: 예 — 숫자 예시 1건');
  });
  return lines.join('\n');
}

function buildFaqBlock(brief) {
  const faq = brief.structure?.faq;
  if (!faq) return null;
  const lines = [blockHeader(12, `FAQ — 정확히 ${faq.count}개`)];
  if (faq.must_include_questions?.length > 0) {
    lines.push('반드시 포함:');
    for (const q of faq.must_include_questions) lines.push(`- "${q}"`);
  }
  return lines.join('\n');
}

function buildInternalLinksBlock(brief) {
  const links = brief.internal_links ?? [];
  if (links.length === 0) return null;
  return [
    blockHeader(13, '내부 링크 (본문에 자연 삽입)'),
    ...links.map((l) => `- /articles/${l.target_slug} — 앵커 "${l.anchor_text}" — 위치: ${l.placement}`),
  ].join('\n');
}

/**
 * brief를 LLM USER prompt로 변환.
 * 빈 블록 자동 omit. 14블록 → 데이터 채워진 N블록 + §14 재진술.
 */
export function buildUserPromptFromBrief(brief) {
  if (!brief) throw new Error('brief is required');

  const blocks = [];

  // 1. 차별점
  const pitch = brief.content_angle?.one_line_pitch;
  if (pitch) blocks.push(`${blockHeader(1, '차별점 (one_line_pitch)')}\n${pitch.trim()}`);

  // 2. 페르소나
  const persona = buildPersonaBlock(brief);
  if (persona) blocks.push(persona);

  // 3. 페인
  const pain = buildPainBlock(brief);
  if (pain) blocks.push(pain);

  // 4. 답해야 할 핵심 질문
  const primaryQ = brief.reader_intent?.primary_question;
  if (primaryQ) blocks.push(`${blockHeader(4, '답해야 할 핵심 질문')}\n${primaryQ.trim()}`);

  // 5. 하위 질문 ↔ H2 1:1
  const subMap = buildSubQuestionMappingBlock(brief);
  if (subMap) blocks.push(subMap);

  // 6. 경쟁 옵션
  const compet = buildCompetitorBlock(brief);
  if (compet) blocks.push(compet);

  // 7. 키워드
  const kw = buildKeywordsBlock(brief);
  if (kw) blocks.push(kw);

  // 8. unique_value
  const uniques = brief.content_angle?.unique_value ?? [];
  if (uniques.length > 0) {
    blocks.push([
      blockHeader(8, '차별 가치 (unique_value)'),
      ...uniques.map((u) => `- ${u}`),
    ].join('\n'));
  }

  // 9. citable_sentences
  const citables = buildCitablesBlock(brief);
  if (citables) blocks.push(citables);

  // 10. primary_sources
  const sources = buildSourcesBlock(brief);
  if (sources) blocks.push(sources);

  // 11. structure.sections H2
  const structure = buildStructureBlock(brief);
  if (structure) blocks.push(structure);

  // 12. FAQ
  const faq = buildFaqBlock(brief);
  if (faq) blocks.push(faq);

  // 13. 내부 링크
  const internal = buildInternalLinksBlock(brief);
  if (internal) blocks.push(internal);

  // 14. 재진술 (필수) — R57·R95-7 G4 매칭률 70% 통과 의무 + approximate 강제
  const expectedFactsCount = (brief.primary_sources ?? []).reduce(
    (sum, s) => sum + (s.expected_facts?.length ?? 0),
    0,
  );
  const factsThin = expectedFactsCount < 5;
  blocks.push([
    blockHeader(14, '재진술 — G4 fact-verifier 매칭률 70% 통과 의무'),
    '위 brief를 정확히 따르세요.',
    '- H2 제목·개수·순서는 §11 그대로.',
    '- 본문의 사실 토큰 70% 이상이 §10 expected_facts 안 토큰과 정확 일치해야 합니다 (G4 통과 임계).',
    '  · 일치 안 하면 자동 폐기. 외부 일반 지식·추정 수치 금지.',
    '  · expected_facts 에 없는 사실을 꼭 인용해야 하면 "약 N" / "대략 N" / "보통 N" approximate 표현 사용 (G4 분모 제외).',
    // R95-7 — expected_facts 풀이 빈약 (5개 미만) 일 때 강제 approximate 룰
    factsThin
      ? [
          '',
          `🔴 **R95-7 critical**: §10 expected_facts 가 ${expectedFactsCount}개 (5 미만)로 풀이 빈약합니다.`,
          '   → 본문의 **모든 amount/percent/금액/요율 수치를 approximate 표현으로 작성** 강제:',
          '   · 정확 수치 (예: "100,000원", "7.09%", "5억 원") 사용 **절대 금지**',
          '   · 모두 "약 10만 원 수준", "대략 7% 내외", "5억 원 안팎" 식으로 작성',
          '   · 표·계산 시뮬에도 정확 수치 대신 "약 N" 사용',
          '   · 위반 시 G4 자동 폐기 (matched=0 / approximate=N → denom 0 pass 보장)',
          '   · 정확 수치가 정말 필요하면 §10 expected_facts 풀의 토큰만 사용',
        ].join('\n')
      : '',
    citables ? '- §9 citable_sentences를 본문에 60%+ 포함하세요.' : '',
    '- 어순·종결어미 자연화는 OK. 수치·법령·URL 토큰은 보존.',
  ].filter(Boolean).join('\n'));

  // 15. R78 — GEO/SEO 고급화 자동 부착 (6 에이전트 합의)
  //   AI 답변 엔진 (Perplexity·ChatGPT·Bing Copilot) 인용 + AdSense E-E-A-T 강화.
  //   본문 무결성 영향 0 (수치 토큰 보존), DOM +50-80 (안전 한계 안), CWV 영향 0.
  blocks.push([
    blockHeader(15, 'GEO·SEO 고급화 자동 부착 규칙 (필수)'),
    '본문 구조에 다음 5가지를 반드시 포함:',
    '',
    '**1. H2 직후 direct answer blockquote (모든 H2)**',
    '   각 H2 다음 줄에 1-2 문장 직답을 다음 형식으로:',
    '   `> **답:** [핵심 결론 1-2 문장. 금액·기간·요율은 **굵게**]`',
    '   → AI 답변 엔진이 발췌하는 단위. 인용률 30-40% ↑.',
    '',
    '**2. chunk markers HTML 주석 (각 H2 직전)**',
    '   각 H2 시작 줄 바로 위에:',
    '   `<!-- chunk:Q1 -->` (Q1, Q2, ... H2 순서대로)',
    '   → RAG 벡터 청킹 정확도 ↑. DOM 영향 0 (주석).',
    '',
    '**3. inline citation 강화 (통계·법령·요율 모두)**',
    '   숫자·법령·정책 인용 끝에 다음 형식으로 출처 명시:',
    '   `[근거: 국세청 고시 2026-12]` 또는 `(법제처, 2026.04)`',
    '   → E-E-A-T·AI 인용·G4 매칭 동시 강화. §10 expected_facts 토큰 보존.',
    '',
    '**4. TLDR 박스 직전 신뢰 1줄**',
    '   본문 첫 줄 (TLDR div 시작 직전) 다음 1줄을 정확히:',
    '   `> 📊 데이터 기준 {dataValidAsOf 값} · 정부공식 출처 N개 인용 · 8단계 자동 검증 (G0~G8) 통과`',
    '   → 가시 신뢰 신호. AdSense E-E-A-T 직격.',
    '',
    '**5. 본문 말미 운영자 박스 (마지막 H2 + 출처 §10 사이)**',
    '   다음 정확한 마크다운 박스를 글 끝에 부착 (§10 출처 박스 직전):',
    '   `<div class="operator-box">`',
    '   `**운영자 김준혁** · 스마트데이터샵 (사업자등록 406-06-34485)`',
    '   ``',
    '   `본 글은 머니룩 자동검증시스템(G0~G8) 통과 정보 제공입니다. 자격증 보유 전문가가 작성한 자문이 아닙니다. 정확한 신청 자격·요율은 신청 직전 [관련 공식 기관] 안내에서 재확인 바랍니다. 사실 오류는 24시간 안 정정합니다.`',
    '   `</div>`',
    '   → AdSense "Who runs this site" + YMYL 면책 동시.',
    '',
    '**제약**: 위 5가지는 H2 개수·순서 변경 X (§11). 본문 분량 ↑ 허용.',
  ].join('\n'));

  return blocks.join('\n\n');
}

/**
 * REFINE_PROMPT (Pass 3 Claude) brief 모드 추가 보존 룰.
 * 기존 REFINE_PROMPT 끝에 append.
 */
export function buildRefineAdditions(brief) {
  if (!brief) return '';
  const blocks = [];

  blocks.push([
    '【brief 모드 추가 보존 룰】',
    '- brief.content_angle.citable_sentences 의 모든 문장은 본문에서 의미·수치·법령·시점 보존. 어순·종결어미 외 변경 금지.',
    '- frontmatter `keywords`/`sources`/`dataValidAsOf`/`faq` 모두 변경 금지.',
    '- H2 제목·개수·순서 변경 금지 (brief.structure.sections 와 1:1).',
    '- expected_facts 의 모든 수치·법령·URL 토큰 보존.',
  ].join('\n'));

  return blocks.join('\n\n');
}
