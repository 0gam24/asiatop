/**
 * AI-likeness scorer (G8 게이트)
 *
 * 본문 markdown을 분석해 0~10 score 산출 (0=자연체, 10=강한 AI 신호).
 * 임계값 단계화:
 *   Week 1~2: < 7.0 통과 (관대)
 *   Week 3~4: < 6.0
 *   Stable:   < 5.0
 *
 * 가중 시그널 10종 (총합 max 11.5 → 정규화 0~10):
 *   S1 정형화된 인사·도입               1.5
 *   S2 과도한 마크다운 강조             1.0
 *   S3 명시적 라벨 ("결론:", "정리:")  1.0
 *   S4 일관된 단락 길이 (stddev ≤ 5)   1.5
 *   S5 둥근 숫자만                       2.0
 *   S6 "여러분" 다발 (≥3회)              1.0
 *   S7 상투적 마무리                     1.5
 *   S8 H2 명사형만                       0.5
 *   S9 외래어 과다                       0.5
 *   S10 1인칭 편집자 보이스 부재         1.5
 *
 * frontmatter는 분석에서 제외 (yaml은 신호가 아님).
 */

const SIGNAL_MAX = 11.5;

function stripFrontmatter(text) {
  if (typeof text !== 'string') return '';
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return text;
  return text.slice(end + 4).trimStart();
}

function extractParagraphs(body) {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('>') && !p.startsWith('```'));
}

function extractHeadings(body) {
  return body
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─────────────────────────────────────────────
// S1 — 정형화된 인사·도입
// ─────────────────────────────────────────────
function scoreFormulaicIntro(body) {
  const firstPara = extractParagraphs(body)[0] ?? '';
  const re = /^(안녕하세요|반갑습니다)[.,]\s*.{0,30}(알아보|살펴보|소개해|정리해)/;
  if (re.test(firstPara)) return 1.5;
  if (/^(오늘은|이번에는|이번 글에서는)\s+.{0,40}(알아보|살펴보)/.test(firstPara)) return 0.8;
  return 0;
}

// ─────────────────────────────────────────────
// S2 — 과도한 **굵은 글자** 다발
// ─────────────────────────────────────────────
function scoreBoldDensity(body) {
  const paragraphs = extractParagraphs(body);
  if (paragraphs.length === 0) return 0;
  const heavyParas = paragraphs.filter((p) => (p.match(/\*\*[^*]+\*\*/g) || []).length >= 2);
  const ratio = heavyParas.length / paragraphs.length;
  if (ratio >= 0.5) return 1.0;
  if (ratio >= 0.3) return 0.5;
  return 0;
}

// ─────────────────────────────────────────────
// S3 — 명시적 라벨 (결론·정리·요약)
// ─────────────────────────────────────────────
function scoreExplicitLabels(body) {
  const headings = extractHeadings(body);
  const labelRe = /^(결론|정리|요약|마무리|마치며)(?:[:：]|\s|$)/;
  const matches = headings.filter((h) => labelRe.test(h)).length;
  if (matches >= 2) return 1.0;
  if (matches === 1) return 0.5;
  return 0;
}

// ─────────────────────────────────────────────
// S4 — 단락 길이 표준편차 ≤ 5 단어
// ─────────────────────────────────────────────
function scoreParagraphUniformity(body) {
  const paragraphs = extractParagraphs(body);
  if (paragraphs.length < 3) return 0;
  const counts = paragraphs.map(wordCount);
  const sd = stdDev(counts);
  if (sd <= 3) return 1.5;
  if (sd <= 5) return 1.0;
  if (sd <= 8) return 0.3;
  return 0;
}

// ─────────────────────────────────────────────
// S5 — 둥근 숫자만 사용
// ─────────────────────────────────────────────
function scoreRoundedNumbers(body) {
  // 숫자 토큰 (콤마 있는 형식 우선 매칭, 그 외 단순 \d+)
  const numbers = (body.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || [])
    .map((s) => parseFloat(s.replace(/,/g, '')))
    .filter((n) => !Number.isNaN(n) && n >= 10);  // 한 자리·두 자리 페이지 번호 등 노이즈 제외

  if (numbers.length < 4) return 0;

  const isRound = (n) => {
    if (n === 0) return false;
    if (n % 1000000 === 0) return true;
    if (n % 100000 === 0) return true;
    if (n % 10000 === 0) return true;
    if (n % 1000 === 0) return true;
    if (n % 100 === 0) return true;
    if (n % 10 === 0 && n < 100) return true;
    return false;
  };

  const roundCount = numbers.filter(isRound).length;
  const ratio = roundCount / numbers.length;
  if (ratio >= 0.9) return 2.0;
  if (ratio >= 0.8) return 1.5;
  if (ratio >= 0.7) return 0.8;
  return 0;
}

// ─────────────────────────────────────────────
// S6 — "여러분" 다발
// ─────────────────────────────────────────────
function scoreReaderAddress(body) {
  const matches = (body.match(/여러분|독자\s?(여러분|분들|님)/g) || []).length;
  if (matches >= 5) return 1.0;
  if (matches >= 3) return 0.7;
  if (matches >= 2) return 0.3;
  return 0;
}

// ─────────────────────────────────────────────
// S7 — 상투적 마무리
// ─────────────────────────────────────────────
function scoreClicheClosing(body) {
  const paragraphs = extractParagraphs(body);
  if (paragraphs.length === 0) return 0;
  const last = paragraphs[paragraphs.length - 1];
  const re1 = /(도움이\s?(되었|되시|되셨)|바랍니다|마칩니다|마무리하|이상으로)/;
  const re2 = /감사합니다\s*\.?\s*$/;
  if (re1.test(last)) return 1.5;
  if (re2.test(last)) return 0.8;
  return 0;
}

// ─────────────────────────────────────────────
// S8 — H2가 모두 명사형 종결 (구체수치·동사·의문문 0건)
// ─────────────────────────────────────────────
function scoreH2Pattern(body) {
  const headings = extractHeadings(body);
  if (headings.length < 3) return 0;
  const hasVerb = (h) => /(나요|가요|할까|할까요|확인|적용|변경|받을\s?수|있을까)/.test(h);
  const hasNumber = (h) => /\d/.test(h);
  const hasQuestion = (h) => /\?$/.test(h);
  const distinctive = headings.filter((h) => hasVerb(h) || hasNumber(h) || hasQuestion(h)).length;
  const ratio = distinctive / headings.length;
  if (ratio === 0) return 0.5;
  return 0;
}

// ─────────────────────────────────────────────
// S9 — 외래어 ("니즈", "팁", "포인트" 등)
// ─────────────────────────────────────────────
function scoreLoanwordDensity(body) {
  const words = ['니즈', '팁', '포인트', '솔루션', '프로세스', '이슈', '메리트', '디메리트', '체크포인트'];
  let count = 0;
  for (const w of words) {
    const re = new RegExp(w, 'g');
    count += (body.match(re) || []).length;
  }
  const per1000 = count / Math.max(1, body.length / 1000);
  if (per1000 >= 5) return 0.5;
  if (per1000 >= 3) return 0.3;
  return 0;
}

// ─────────────────────────────────────────────
// S10 — 1인칭 편집자 보이스 부재 (penalty)
// ─────────────────────────────────────────────
function scoreEditorVoiceAbsence(body) {
  const re = /(편집팀이|편집부가|확인해\s?보니|찾아\s?보니|취재한\s?결과|문의해\s?보니|직접\s?확인|관련\s?법령\s?을?\s?(찾아|확인))/;
  return re.test(body) ? 0 : 1.5;
}

/**
 * 본문 분석 → AI-likeness score.
 * @param {string} text MDX (frontmatter 포함 가능)
 * @returns {{
 *   score: number,         // 0~10 정규화
 *   raw_score: number,     // 0~SIGNAL_MAX
 *   pass: boolean,         // score < threshold
 *   threshold: number,
 *   signals: string[],     // 발화된 시그널 ID
 *   breakdown: object,     // 시그널별 raw score
 *   hints: string[],       // Pass 3 재실행 힌트
 * }}
 */
export function scoreAILikeness(text, options = {}) {
  const threshold = options.threshold ?? 5.0;
  const body = stripFrontmatter(text);

  const breakdown = {
    formulaic_intro: scoreFormulaicIntro(body),
    bold_density: scoreBoldDensity(body),
    explicit_labels: scoreExplicitLabels(body),
    paragraph_uniformity: scoreParagraphUniformity(body),
    rounded_numbers: scoreRoundedNumbers(body),
    reader_address: scoreReaderAddress(body),
    cliche_closing: scoreClicheClosing(body),
    h2_pattern: scoreH2Pattern(body),
    loanword_density: scoreLoanwordDensity(body),
    editor_voice_absence: scoreEditorVoiceAbsence(body),
  };

  const raw_score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Number(((raw_score / SIGNAL_MAX) * 10).toFixed(2));

  const signals = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  const hints = [];
  if (breakdown.formulaic_intro > 0) hints.push('정형화 도입부 제거 (안녕하세요·살펴보겠습니다 등)');
  if (breakdown.bold_density > 0.5) hints.push('굵은 글자 빈도 줄이기 (단락당 평균 1회 이하)');
  if (breakdown.explicit_labels > 0) hints.push('"결론:", "정리:" 등 명시적 라벨 헤더 제거');
  if (breakdown.paragraph_uniformity > 0.5) hints.push('단락 길이 변주 — 단문·중문·장문 혼합');
  if (breakdown.rounded_numbers >= 1.5) hints.push('권위 소스 정확값 사용 (둥근 숫자로 가공 X)');
  if (breakdown.reader_address > 0.5) hints.push('"여러분" 호칭 최대 2회까지');
  if (breakdown.cliche_closing > 0) hints.push('상투적 마무리 ("도움이 되시길 바랍니다") 제거');
  if (breakdown.h2_pattern > 0) hints.push('H2에 의문문·구체 수치·동사 1개 이상 포함');
  if (breakdown.loanword_density > 0) hints.push('외래어 (니즈·팁·포인트) 1000자당 5회 미만');
  if (breakdown.editor_voice_absence > 0) hints.push('1인칭 편집자 보이스 1~2회 자연 삽입');

  return {
    score,
    raw_score: Number(raw_score.toFixed(2)),
    pass: score < threshold,
    threshold,
    signals,
    breakdown,
    hints,
  };
}
