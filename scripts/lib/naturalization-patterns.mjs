/**
 * 한국어 자연체 패턴 라이브러리 — Pass 3 (Claude Haiku 자연화) 프롬프트 주입용 상수
 *
 * REFINE_PROMPT 보강 시 import해서 system/user 프롬프트에 inline.
 *
 * 정책:
 *   - 자연체 패턴 과다 적용 시 SEO 키워드 밀도 저하 위험 → keyword density는 별도 게이트
 *   - editor-team 단일 페르소나 (가짜 author 제거 완료)
 *   - 비둥근 숫자 보존이 fact-verifier(G4)와 정합 — LLM이 둥근 숫자로 가공하면 G4 fail
 */

export const NATURALIZATION_RULES = Object.freeze([
  '본문에 등장하는 모든 수치는 권위 소스 원본을 그대로 보존한다. 둥근 수로 바꾸지 않는다 (예: 987,650원을 100만 원으로 바꾸지 말 것).',
  '편집자 1인칭 보이스를 1~2회 자연 삽입한다. 예: "편집팀이 [기관]에 직접 문의해 확인했더니", "관련 법령 [조항]을 찾아보면", "최근 [기간] [기관]에 접수된 사례를 보면".',
  '"결론:", "정리:", "요약:", "마무리:" 같은 명시적 라벨 헤더는 절대 사용하지 않는다.',
  '단락 길이를 의도적으로 변주한다. 단문(15어 이하)·중문(16~30어)·장문(30어 초과)을 혼합하고, 인접 3문장이 모두 같은 길이대에 들지 않게 한다.',
  '"도움이 되시길 바랍니다", "이상으로 마무리하겠습니다", "감사합니다." 등 상투적 마무리는 사용하지 않는다.',
  '"여러분", "독자분들", "독자 여러분" 호칭은 글 전체에서 최대 2회까지만 사용한다.',
  '외래어("니즈", "팁", "포인트", "솔루션", "프로세스", "이슈", "메리트")는 1000자당 5회 미만으로 유지한다.',
  '독자 페르소나의 life_stage 또는 prior_attempts를 본문에 최소 1회 자연스럽게 반영한다 (예: "2024년 7월 입사한 신입 직장인이 2025년 5월 결혼 준비 중이라면...").',
  'H2 헤더 중 최소 1개 이상은 의문문(?로 끝남), 구체 수치 포함, 또는 동사 종결 형태를 가져야 한다.',
  '굵은 글자(**...**)는 단락당 평균 1회 이하로 사용한다. 모든 단락에 강조가 들어가면 강조 의미가 사라진다.',
]);

export const EDITOR_VOICE_PHRASES = Object.freeze([
  '편집팀이 {기관}에 직접 문의해 확인했더니',
  '편집부가 {조항}을 찾아보면',
  '관련 법령({법률명} {조항})을 확인하면',
  '최근 {기간} {기관}에 접수된 사례를 보면',
  '독자 제보를 종합하면',
  '취재한 결과',
  '문의해보니',
]);

export const FORBIDDEN_INTRO_PATTERNS = Object.freeze([
  /^안녕하세요[.,]/,
  /^반갑습니다[.,]/,
  /^오늘은\s+.{0,40}(알아보|살펴보|소개해)/,
  /^이번에는\s+.{0,40}(알아보|살펴보|소개해)/,
  /^이번\s?글에서는/,
]);

export const FORBIDDEN_CLOSING_PATTERNS = Object.freeze([
  /도움이\s?(되었|되시|되셨)/,
  /바랍니다\s*\.?\s*$/m,
  /이상으로\s?마무리/,
  /마치겠습니다/,
  /감사합니다\s*\.?\s*$/m,
]);

export const FORBIDDEN_LABEL_HEADINGS = Object.freeze([
  /^##\s*결론[:：\s]/m,
  /^##\s*정리[:：\s]/m,
  /^##\s*요약[:：\s]/m,
  /^##\s*마무리[:：\s]/m,
  /^##\s*마치며[:：\s]/m,
]);

/**
 * REFINE_PROMPT에 주입할 룰 텍스트 생성.
 * Pass 3 (Claude) system prompt에 다음과 같이 추가:
 *   ${BASE_REFINE_PROMPT}\n\n${formatRulesForPrompt()}
 */
export function formatRulesForPrompt() {
  const numbered = NATURALIZATION_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return `## 한국어 자연체 강제 룰\n\n${numbered}`;
}
