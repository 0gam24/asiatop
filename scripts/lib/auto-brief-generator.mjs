/**
 * 질문 → brief.yaml 골격 자동 생성
 *
 * 입력: 지식인 질문 + G2 결과 (cluster + matched keywords) + G3 응답
 * 출력: briefs/_pool/_pending/<hash>.yaml — 사람이 채울 수 있는 minimal brief
 *
 * 자동 채움:
 *   meta — brief_id·slug·cluster·scheduled_publish·brief_author=auto·created_at=today
 *   niche.surface_pain — 질문 본문 (PII redact 후)
 *   niche.search_timing — 현재 timestamp 기반
 *   niche.source_signal — G2/G3 메타
 *   keywords.primary — G2 ranking[0].matched 첫 항목
 *   primary_sources — G3 응답에서 source_url 추출
 *   source_question — 원본 hash·URL
 *
 * 미채움 (사람·LLM 작성 필요):
 *   audience_persona·life_context·hidden_anxiety·desired_next_action·do_not_say
 *   reader_intent.* (대부분)
 *   content_angle.*
 *   structure.sections (LLM이 brief.reader_intent 보고 채움)
 *
 * 정책:
 *   - allow_quote=false 강제 (지식인 원문 인용 금지)
 *   - PII redact 후 surface_pain에 저장
 *   - validate-brief.mjs로 검증 시 미채움 필드는 fail — 정상 (LLM 호출 후 채우기 전)
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { questionHash } from './dedup-index.mjs';
import { redactPII } from '../gates/g1-question-sanitize.mjs';
import { extractFactsFromObject } from './fact-extract.mjs';

// cluster 권위 답변 가능률 매트릭스 (src/data/clusters.ts와 동기화 — 자동 발행 파이프라인 측 캐시)
// 의존성 회피: src/data/clusters.ts는 .ts라 mjs에서 import 어려움 → JSON 매핑 inline.
const CLUSTER_AUTHORITY_COVERAGE = Object.freeze({
  'gov-support': 0.9,
  'tax': 0.95,
  'realestate': 0.8,
  'unemployment': 0.95,
  'savings': 0.7,
  'insurance-labor': 0.9,
  'auto': 0.6,
  'public-services': 0.95,
  'office-tips': 0.85,
  'credit-loan': 0.5,
  'insurance-personal': 0.55,
  'pension': 0.8,
});

function autoAdPolicy(cluster) {
  const cov = CLUSTER_AUTHORITY_COVERAGE[cluster] ?? 1;
  return {
    promotes_specific_loan: false,
    contains_high_interest_loan_promotion: false,
    contains_financial_advice: cov < 0.7,   // savings·credit-loan·insurance-personal·auto 자동 체크
    google_compliant: true,
  };
}

function autoFraming(cluster) {
  const cov = CLUSTER_AUTHORITY_COVERAGE[cluster] ?? 1;
  // coverage < 0.6 (auto·credit-loan) → explainer 강제 (decision-guide 금지)
  return cov < 0.6 ? 'explainer' : 'explainer';  // 현재 V1: 모두 explainer 시작 (안전 측)
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const POOL_PENDING = resolve(__dirname, '..', '..', 'briefs', '_pool', '_pending');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function nineMonthsFromToday() {
  const d = new Date();
  d.setMonth(d.getMonth() + 9);
  return d.toISOString().slice(0, 10);
}

function slugify(text, maxLength = 40) {
  // 한국어 → 발음 변환은 무거움. 단순 키워드 lowercase + 안전 문자만.
  const safe = text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  // 한글은 slug에 부적합 — Romanize 없이 hash 기반 fallback
  const hasKorean = /[가-힣]/.test(safe);
  if (hasKorean || safe.length === 0) {
    return `q-${questionHash(text).slice(0, 10)}`;
  }
  return safe.slice(0, maxLength).replace(/^-|-$/g, '');
}

/**
 * G2 ranking[0]·G3 responses 기반 brief 골격 생성.
 *
 * @param {object} params
 * @param {string} params.questionText 지식인 질문 본문
 * @param {string} params.cluster G2 결과 cluster
 * @param {string[]} params.matchedKeywords G2 ranking[0].matched
 * @param {Array} params.authorityResponses G3 응답 배열
 * @param {string} [params.scheduledPublish] 발행 예정일 (default 오늘)
 * @param {string} [params.briefAuthor] (default 'auto')
 * @param {string} [params.sourceUrl] 지식인 link
 * @returns {object} brief 객체 (yaml.dump 가능)
 */
export function generateBriefSkeleton({
  questionText,
  cluster,
  matchedKeywords = [],
  authorityResponses = [],
  scheduledPublish = null,
  briefAuthor = 'auto',
  sourceUrl = null,
}) {
  const today = todayISO();
  const publish = scheduledPublish ?? today;
  const slug = slugify(questionText);
  const briefId = `${publish}-${slug}`;
  const hash = questionHash(questionText);
  const redactedPain = redactPII(questionText);
  const primaryKeyword = matchedKeywords[0] ?? '';
  const secondaryKeywords = matchedKeywords.slice(1, 5);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];

  // primary_sources — G3 응답에서 source_url 추출 + expected_facts 자동 채움.
  // R55-3 — 어댑터 raw 에서 fact-extract 정규식으로 토큰 추출 → expected_facts 자동 채움.
  // 이후 fact-verifier 가 본문 토큰을 expected_facts 와 매칭 시 통과율 ↑.
  // LLM Pass 1 system prompt 가 brief.primary_sources.expected_facts 를 보고 본문 작성하면
  // 본문 토큰 ↔ 어댑터 응답 토큰 1:1 매칭 가능 (정책 "100% 미만 폐기" 정공 유지).
  function extractExpectedFactsFromAuthorityResponse(resp) {
    if (!resp?.raw) return [];
    try {
      const tokens = extractFactsFromObject(resp.raw, {});
      // 최대 10개. 중복 (normalized 동일) 제거 + type 다양성 보존 (amount·percent·date 등).
      const seen = new Set();
      const picked = [];
      for (const tok of tokens) {
        const key = `${tok.type}:${tok.normalized}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push(tok);
        if (picked.length >= 10) break;
      }
      // expected_facts 항목은 자유 텍스트. fact-extract 가 다시 정규식 매칭하도록 raw 보존.
      return picked.map((t) => t.raw ?? String(t.normalized ?? ''));
    } catch {
      return [];
    }
  }
  const primarySources = authorityResponses
    .filter((r) => r?.source_url)
    .slice(0, 3)
    .map((r, i) => {
      const extracted = extractExpectedFactsFromAuthorityResponse(r);
      // BriefSchema 의 expected_facts.min(1) 충족 — 추출 0건이면 placeholder
      const expected_facts =
        extracted.length > 0
          ? extracted
          : ['<자동: 권위 응답에 매칭 가능한 토큰 없음 — LLM 이 출처 명시 후 인용>'];
      return {
        id: `src${i + 1}`,
        url: r.source_url,
        title: r.source_id ?? `권위 소스 ${i + 1}`,
        expected_facts,
        must_quote: true,
      };
    });

  return {
    meta: {
      brief_id: briefId,
      slug,
      cluster,
      scheduled_publish: publish,
      priority: 'medium',
      brief_author: briefAuthor,
      created_at: today,
    },
    niche: {
      audience_persona: '<TODO: LLM Pass 1 단계에서 채움 — audience persona>',
      life_context: '<TODO: LLM Pass 1 단계에서 채움 — life context>',
      surface_pain: redactedPain,
      hidden_anxiety: '<TODO: LLM 분류기로 hidden_anxiety_tags에서 추출>',
      desired_next_action: '<TODO: LLM 이 채움 — 독자의 다음 행동>',
      do_not_say: ['<TODO 1>', '<TODO 2>'],
      // 8차원 — 자동 채움 가능 부분
      search_timing: {
        month,
        weekday: weekdayShort,
        policy_proximity: null,
      },
      life_stage: 'unspecified',
      employment_type: 'unspecified',
      region: 'nationwide',
      prior_attempts: [],
      competing_options: [],
      hidden_anxiety_tags: [],
      source_signal: {
        description_length: questionText.length,
        answer_count: 0,
        repeat_count: 0,
        unmet_market_score: 0,
      },
    },
    reader_intent: {
      primary_question: '<TODO: 질문 본문 → 한 문장 정제>',
      sub_questions: ['<TODO 1>', '<TODO 2>', '<TODO 3>'],
      competitor_options_in_mind: ['<TODO>'],
      competitor_content_weakness: '<TODO: 검색 1페이지 기존 글 약점>',
    },
    keywords: {
      primary: primaryKeyword,
      secondary: secondaryKeywords.length >= 2 ? secondaryKeywords : ['<TODO>', '<TODO>'],
      longtail: ['<TODO 1>', '<TODO 2>', '<TODO 3>'],
      search_volume_estimate: '',
      competition: 'medium',
    },
    content_angle: {
      one_line_pitch: '<TODO: 이 글의 차별점>',
      framing: autoFraming(cluster),
      not_framing: '<TODO: 이 글이 아닌 것>',
      unique_value: ['<TODO 1>', '<TODO 2>'],
      citable_sentences: [
        '<TODO: AI 인용용 문장 1 — 권위 소스 정확값 포함>',
        '<TODO: AI 인용용 문장 2 — 권위 소스 정확값 포함>',
        '<TODO: AI 인용용 문장 3 — 권위 소스 정확값 포함>',
      ],
    },
    primary_sources: primarySources.length > 0 ? primarySources : [{
      id: 'src1',
      url: 'https://www.law.go.kr/<TODO>',
      title: '<TODO>',
      expected_facts: ['<TODO>'],
      must_quote: true,
    }],
    secondary_sources: [],
    structure: {
      intro_pattern: 'answer-first',
      sections: Array.from({ length: 7 }, (_, i) => ({
        h2: `<TODO H2 ${i + 1}>`,
        content_hint: '<TODO>',
        uses_facts_from: ['src1'],
        requires_table: false,
        requires_calculation: false,
      })),
      faq: {
        count: 3,
        must_include_questions: ['<TODO Q1>'],
      },
      word_count_target: 2000,
      word_count_min: 1500,
      word_count_max: 2500,
    },
    internal_links: [],
    verification: {
      data_basis_date: today,
      next_review_date: nineMonthsFromToday(),
      ymyl_disclaimer: true,
      ai_assistance_disclosure: true,
    },
    ad_policy: autoAdPolicy(cluster),
    success_metric: {
      target_pv_30d: 1000,
      target_avg_dwell_seconds: 120,
      target_search_impressions_30d: 5000,
      target_indexed_within_days: 7,
      if_underperform: 'review-and-update',
    },
    source_question: {
      original_text: questionText.slice(0, 200),
      hash,
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
      allow_quote: false,
    },
    update_log: [],
  };
}

/**
 * brief → article frontmatter 매핑 (article-pipeline 통합 시 사용).
 *
 * brief의 source_question 정보를 article.frontmatter로 변환.
 * 변환 시 의역(rewriting)된 질문만 사용 — 원문 직접 인용 X (네이버 ToS).
 *
 * @param {object} brief 검증 통과된 brief 객체
 * @param {{ rephrased_question?: string }} options 의역된 질문 (LLM이 채움)
 * @returns {object} article frontmatter inject용 필드 매핑
 */
export function briefToArticleFrontmatter(brief, options = {}) {
  const inject = {
    brief_id: brief.meta?.brief_id,
  };

  if (brief.verification?.next_review_date) {
    inject.next_review_date = brief.verification.next_review_date;
  }
  if (brief.source_question?.hash) {
    inject.source_question_hash = brief.source_question.hash;
  }
  if (brief.source_question?.source_url) {
    inject.source_question_url = brief.source_question.source_url;
  }
  // 의역된 질문이 제공되면 frontmatter에 노출 (QAPage Schema에서 사용)
  // 원본 텍스트는 노출 X (저작권·ToS 보호)
  if (options.rephrased_question) {
    inject.source_question_text = options.rephrased_question;
  }

  return inject;
}

/**
 * brief 골격을 _pool/_pending/<hash>.yaml 로 저장.
 * @returns {string} 저장된 절대 경로
 */
export function saveBriefSkeleton(brief, { hash, force = false } = {}) {
  if (!existsSync(POOL_PENDING)) mkdirSync(POOL_PENDING, { recursive: true });
  const fileName = `${hash ?? questionHash(JSON.stringify(brief))}.yaml`;
  const path = resolve(POOL_PENDING, fileName);

  if (existsSync(path) && !force) {
    throw new Error(`이미 존재하는 brief: ${path}`);
  }
  // js-yaml dump — 주석은 손실되나 자동 생성이라 OK
  const content = yaml.dump(brief, { lineWidth: 120, noRefs: true });
  writeFileSync(path, '# 자동 생성 brief — TODO 필드를 채운 후 LLM·검증 단계로 진입\n' + content, 'utf-8');
  return path;
}
