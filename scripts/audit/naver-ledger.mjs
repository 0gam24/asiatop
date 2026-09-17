// ════════════════════════════════════════════════════════════════════════
// naver-ledger.mjs — 잠금 장부: 기존 글을 [제도 × 세그먼트 × 적용연도] × 패밀리로 분류하고, 새 후보의 중복을 판정한다 (LLM 0)
//
// 계획: docs/ops/KEYWORD-PLAN-2026-09-15.md §6-1 · 프로파일 §3.
//   패밀리 A 하기 전(대상·조건·금액·신청·계산) / B 하고 난 뒤·문제 생김(지급일·조회·감액·환수·해지·과태료·가산세)
//         V 정말인가·확정인가(정부안·개정안·폐지 여부·미정)
//   세부 주제(aspect) = 대표 키워드에서 제도 이름·세그먼트·연도·숫자·일반 의도어(방법·신청·조건…)를 뺀 나머지 낱말.
//     종합소득세 글 16편이 한 칸에 몰리던 문제(2026-09-15 드라이런)를 푼다: "종합소득세 추계신고" ≠ "종합소득세 분납".
//   운영자 결정(2026-09-15): 같은 주제라도 세부 키워드가 다르면 새 글 허용. 조건·신청·기간·계산 같은 의도어도 세부 키워드다.
//   판정 VETO = 이 세부 키워드를 이미 키워드로 쓴 글이 있거나, 제도·패밀리·세그먼트·연도에 세부 주제까지 같은 글이 있다
//        FIX  = 같은 제도 글과 coreFacts(금액·날짜·대상·근거) 핵심값이 2개 이상 겹친다 → 새 글 대신 기존 글 갱신 검토
//        PASS = 그 외. 같은 제도 글 목록은 내부 링크 후보로 돌려준다
// 글 frontmatter 에 coreFacts 가 없어(2026-09-15) 제목·description·keywords·sources 에서 뽑는다. 신규 글은 targetQuery·coreFacts 를 쓰면 그 값을 우선한다.
// 기사 파일은 읽기만 한다. 산출물은 docs/ops/cluster-intents.json 하나.
//
// 실행:
//   node scripts/audit/naver-ledger.mjs                       # 드라이런: 통계 + 사람 확인용 샘플 20, 파일 안 씀
//   node scripts/audit/naver-ledger.mjs --write               # docs/ops/cluster-intents.json 생성
//   node scripts/audit/naver-ledger.mjs --check "주휴수당 퇴사 2026" B [--facts=파일.json]
//   node scripts/audit/naver-ledger.mjs --append 파일.json    # 아직 머지 전인 초안 예약(pending, 21일 보존)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, isMain, kstDate } from './lib/naver-api.mjs';

const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');
const OUT = path.join(ROOT, 'docs', 'ops', 'cluster-intents.json');
const PENDING_KEEP_DAYS = 21;

// ── frontmatter 최소 파서 (이 저장소 글의 규칙적인 YAML 만 다룬다) ─────────────────
const unquote = (v) => {
  const t = String(v ?? '').trim();
  if (/^".*"$/.test(t)) return t.slice(1, -1).replace(/\\"/g, '"');
  if (/^'.*'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  return t;
};

export function parseArticleMeta(mdx) {
  const text = String(mdx || '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return null;
  const lines = text.slice(4, end).split('\n');
  const meta = { keywords: [], faqQ: [], sources: [], coreFacts: null };
  let list = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const top = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (top) {
      const [, key, rest] = top;
      list = null;
      if (rest === '' || rest === '|' || rest === '>') list = key;
      else meta[key] = unquote(rest);
      continue;
    }
    if (list === 'keywords') { const m = line.match(/^\s*-\s*(.+)$/); if (m) meta.keywords.push(unquote(m[1])); }
    else if (list === 'faq') { const m = line.match(/^\s*-?\s*q:\s*(.+)$/); if (m) meta.faqQ.push(unquote(m[1])); }
    else if (list === 'sources') {
      const t = line.match(/^\s*-?\s*title:\s*(.+)$/); if (t) meta.sources.push({ title: unquote(t[1]) });
      const u = line.match(/^\s*url:\s*(.+)$/); if (u && meta.sources.length) meta.sources[meta.sources.length - 1].url = unquote(u[1]);
    } else if (list === 'coreFacts') {
      const m = line.match(/^\s+(who|amount|rate|deadline|effectiveDate|basis):\s*(.+)$/);
      if (m) { meta.coreFacts ||= {}; meta.coreFacts[m[1]] = unquote(m[2]); }
    }
  }
  return meta;
}

// ── 제도 사전 (앞선 항목이 우선. 긴 이름을 짧은 이름보다 먼저) ────────────────────
export const PROGRAMS = [
  ['조기재취업수당', /조기\s?재취업\s?수당/], ['국민취업지원제도', /국민취업지원/], ['국민내일배움카드', /내일배움카드/],
  ['실업급여', /실업\s?급여|구직\s?급여/], ['주휴수당', /주휴\s?수당/], ['휴일근로수당', /휴일\s?근로\s?수당/],
  ['연차', /연차(휴가|수당| 미사용| 사용| 발생| 강제|\b)/], ['퇴직금', /퇴직금/], ['퇴직연금', /퇴직연금|IRP/i], ['최저임금', /최저\s?임금/],
  ['통상임금', /통상\s?임금/], ['포괄임금제', /포괄\s?임금/], ['권고사직', /권고\s?사직/], ['육아기 근로시간 단축', /육아기\s?근로시간/],
  ['육아휴직', /육아\s?휴직/], ['출산휴가', /출산\s?(전후\s?)?휴가/], ['산재보험', /산재\s?보험|산업재해/], ['고용보험', /고용\s?보험/],
  ['자녀장려금', /자녀\s?장려금/], ['근로장려금', /근로\s?장려금/], ['연말정산', /연말\s?정산|13월의\s?월급/],
  ['종합소득세', /종합\s?소득세|종소세/], ['원천징수', /원천\s?징수/], ['부가가치세', /부가\s?가치세|부가세/],
  ['양도소득세', /양도\s?소득세|양도세/], ['종합부동산세', /종합\s?부동산세|종부세/], ['재산세', /재산세/], ['취득세', /취득세/],
  ['증여세', /증여세|부담부\s?증여/], ['상속세', /상속세/], ['자동차세', /자동차세/], ['개별소비세', /개별\s?소비세|개소세/],
  ['법인세', /법인세/], ['현금영수증', /현금\s?영수증/], ['신용카드 소득공제', /신용카드\s?(소득\s?)?공제/],
  ['월세 세액공제', /월세\s?(세액\s?)?공제/], ['자녀세액공제', /자녀\s?세액\s?공제/], ['의료비 세액공제', /의료비\s?(세액\s?)?공제/],
  ['교육비 세액공제', /교육비\s?(세액\s?)?공제/], ['부양가족 공제', /부양\s?가족/], ['연금저축', /연금\s?저축|개인\s?연금/],
  ['노란우산공제', /노란우산/], ['연금소득세', /연금\s?소득/], ['사업소득', /사업\s?소득|기타\s?소득/], ['청년수당', /청년\s?수당/], ['경정청구', /경정\s?청구/], ['환경개선부담금', /환경개선\s?부담금/], ['지역개발채권', /지역개발\s?채권/],
  ['피부양자', /피부양자/], ['임의계속가입', /임의\s?계속\s?가입/], ['건강보험료', /건강\s?보험료|건보료|건강보험.{0,8}(료율|정산)/],
  ['본인부담상한제', /본인부담\s?상한/], ['재난적의료비', /재난적\s?의료비/], ['기초연금', /기초\s?연금/],
  ['국민연금', /국민\s?연금/], ['4대보험', /4대\s?보험/],
  ['실손보험', /실손|실비\s?보험/], ['자동차보험', /자동차\s?보험|자차|운전자\s?범위|마일리지\s?특약|자동차\s?사고|교통\s?사고/], ['운전자보험', /운전자\s?보험/],
  ['치아보험', /치아\s?보험/], ['암보험', /암\s?보험/], ['어린이보험', /어린이\s?보험/], ['종신보험', /종신\s?보험/],
  ['청년도약계좌', /청년\s?도약\s?계좌/], ['청년미래적금', /청년\s?미래\s?적금/], ['청년희망적금', /청년\s?희망\s?적금/],
  ['ISA', /\bISA\b|개인종합자산관리/i], ['CMA', /\bCMA\b/i], ['ETF', /\bETF\b/i], ['예금자보호', /예금자\s?보호/],
  ['신용점수', /신용\s?점수|신용\s?등급/], ['마이너스통장', /마이너스\s?통장/], ['비상금대출', /비상금\s?대출/], ['햇살론', /햇살론/],
  ['신용회복', /신용회복/], ['리볼빙', /리볼빙/], ['기준금리', /기준\s?금리/],
  ['신생아 특례대출', /신생아\s?특례/], ['버팀목', /버팀목/], ['디딤돌', /디딤돌/], ['전세보증보험', /전세\s?(보증금\s?)?반환\s?보증|전세\s?보증\s?보험|HUG\s?보증/i],
  ['전세사기', /전세\s?사기/], ['청년월세', /청년\s?월세/], ['전입신고', /전입\s?신고/], ['확정일자', /확정\s?일자/], ['전월세 신고제', /전월세\s?신고/],
  ['중개수수료', /중개\s?(보수|수수료)/], ['상가임대차', /상가\s?(임대차|권리금)/], ['청약', /청약|분양권|가점제/],
  ['기준 중위소득', /기준\s?중위\s?소득/], ['기초생활수급', /기초\s?생활|생계\s?급여|의료\s?급여|주거\s?급여/],
  ['아동수당', /아동\s?(기본\s?)?수당/], ['부모급여', /부모\s?급여/], ['첫만남이용권', /첫만남/], ['양육수당', /양육\s?수당/],
  ['양육비 선지급', /양육비\s?선지급/], ['아이돌봄', /아이\s?돌봄/], ['출산지원금', /출산\s?(지원금|장려금)/],
  ['에너지바우처', /에너지\s?바우처/], ['민생지원금', /민생\s?(회복\s?)?(지원금|쿠폰)|소비\s?쿠폰/], ['온누리상품권', /온누리/],
  ['운전면허', /운전\s?면허|적성\s?검사/], ['자동차 검사', /자동차\s?(정기\s?)?검사|정기\s?점검/], ['자동차 명의이전', /명의\s?이전|자동차\s?명의/],
  ['여권', /여권/], ['증명서 발급', /등본|초본|증명서\s?발급|본인서명|민원24|정부24/], ['국민비서', /국민비서/], ['기후동행카드', /기후동행/],
];
const SYN = [[/종소세/g, '종합소득세'], [/구직급여/g, '실업급여'], [/건보료/g, '건강보험료'], [/양도세/g, '양도소득세'], [/종부세/g, '종합부동산세'], [/추후\s?납부/g, '추납']];

export function detectProgram(primary, title = '') {
  for (const src of [primary, title]) {
    const s = String(src || '');
    let best = null;
    for (const [name, re] of PROGRAMS) {
      const m = s.match(re);
      if (m && (best == null || m.index < best.index)) best = { name, index: m.index };
    }
    if (best) return { program: best.name, fromDictionary: true };
  }
  // 사전에 없으면 대표 키워드 앞 두 어절(연도·금액·날짜 제거)을 제도 이름으로 쓴다
  let p = String(primary || title || '').replace(/20\d{2}년?|\d[\d,.]*\s?(만|억)?\s?원|\d+(\.\d+)?%|\d{1,2}월(\s?\d{1,2}일)?|D-\d+/g, ' ');
  for (const [re, to] of SYN) p = p.replace(re, to);
  const words = p.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return { program: words.join(' ') || '(미상)', fromDictionary: false };
}

// ── 세그먼트 ─────────────────────────────────────────────────────────────
const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
export const SEGMENTS = [
  ['출생연도', /(19|20)\d{2}년생/g],
  ['연령', /\d{2}세(\s?이상|\s?미만|\s?이하)?|[2-7]0대|청년|고령|노인|어르신|중장년|신혼/g],
  ['고용형태', /프리랜서|일용직?|단시간|아르바이트|알바|계약직|정규직|플랫폼\s?노동|자영업자?|개인사업자|사업자|직장인|공무원|군인|예술인|특고|배달/g],
  ['가구', /\d인\s?가구|1인|맞벌이|외벌이|한부모|다자녀|저소득|차상위|부부|배우자|자녀/g],
  ['사업장', /5인\s?미만|상시\s?\d+인/g],
  ['상황', /퇴사|이직|휴직|수급\s?중|해외|이사|결혼|출산|사망|상속|이혼|폐업|실직|해고|중도|만기|재취업/g],
  ['지역', new RegExp(`(${SIDO.join('|')})(특별시|광역시|도)?|[가-힣]{1,3}군(?![가-힣])`, 'g')],
];
// program 을 주면 그 제도 이름 부분을 먼저 지운다. "조기재취업수당"의 "재취업", "청년도약계좌"의 "청년"이 세그먼트로 잡히던 문제(2026-09-15).
export function detectSegments(text, program = null) {
  const out = new Set();
  let s = String(text || '');
  if (program) {
    const entry = PROGRAMS.find(([name]) => name === program);
    if (entry) s = s.replace(new RegExp(entry[1].source, entry[1].flags.includes('g') ? entry[1].flags : entry[1].flags + 'g'), ' ');
  }
  for (const [, re] of SEGMENTS) for (const m of s.matchAll(re)) out.add(m[0].replace(/\s+/g, ''));
  return [...out].sort();
}

// ── 세부 주제 ────────────────────────────────────────────────────────────
// 운영자 결정(2026-09-15): "같은 주제라도 세부 키워드가 다르면 문제없다." → 조건·신청·기간·계산·비교 같은 의도어도
// 세부 키워드로 센다("조기재취업수당 조건" ≠ "조기재취업수당 신청"). 여기엔 뜻을 바꾸지 않는 군더더기만 남긴다.
export const ASPECT_STOP = new Set(['방법', '총정리', '정리', '가이드', '완벽', '핵심', '팁', '꿀팁', '올해', '내년', '최신', '안내', '받는', '받기', '하는', '하면', '되나요', '하나요', '정확히', '한눈에', '알아보기', '신고', '납부']);
// 세부 키워드 비교용 정규화: 띄어쓰기·연도 무시
export const normKeyword = (s) => String(s || '').toLowerCase().replace(/20\d{2}년?/g, '').replace(/\s+/g, '');
export function detectAspect(primary, program) {
  let s = String(primary || '').replace(/기한\s+후/g, '기한후').replace(/중도\s+해지/g, '중도해지');
  const entry = PROGRAMS.find(([name]) => name === program);
  s = entry ? s.replace(entry[1], ' ') : s.replace(program, ' ');
  for (const [, re] of SEGMENTS) s = s.replace(re, ' ');
  s = s.replace(/20\d{2}년?|\d[\d,.]*\s?(만|억|천)?\s?원|\d+(\.\d+)?%|\d{1,2}월(\s?\d{1,2}일)?|D-\d+|\d+/g, ' ');
  const toks = s.split(/[\s·,/()\-]+/)
    .map((t) => t.replace(/(으로|은|는|이|가|을|를|의|에|로|와|과|도|만)$/, ''))
    .filter((t) => t.length >= 2 && !ASPECT_STOP.has(t));
  return [...new Set(toks)].sort();
}

export function detectYear(title, publishedAt) {
  const yrs = (String(title || '').match(/20\d{2}/g) || []).map(Number);
  if (yrs.length) return { year: Math.max(...yrs), yearInferred: false };
  const y = Number(String(publishedAt || '').slice(0, 4));
  return { year: Number.isFinite(y) && y > 2000 ? y : null, yearInferred: true };
}

// ── 패밀리 ──────────────────────────────────────────────────────────────
export const FAMILY_RE = {
  V: /정부안|입법\s?예고|개정안|확정\s?(전|여부)|루머|가짜|사실\s?(아니|무근)|폐지\s?(여부|되|하|설|논의)|연장\s?(여부|되나|논의)|아직\s?(아니|미정|안\s)|미정|검토\s?중|추진/,
  B: /지급일|입금일|조회|안\s?들어|미지급|감액\s?(이유|사유|됐|된|통지)|환수|이의\s?신청|경정|기한\s?후|해지|추징|과태료|가산세|못\s?받|거절|탈락|취소|반납|정정|분납|놓쳤|지났|지나면|늦게|연체|부정\s?수급|수정\s?신고|사후/,
};
export function classifyFamily(title, primary = '') {
  const s = `${title} ${primary}`;
  const v = s.match(FAMILY_RE.V);
  if (v) return { family: 'V', evidence: v[0] };
  const b = s.match(FAMILY_RE.B);
  if (b) return { family: 'B', evidence: b[0] };
  return { family: 'A', evidence: 'default' };
}

// ── coreFacts ────────────────────────────────────────────────────────────
const MONEY = /\d[\d,.]*\s?(만|억|천)?\s?원|\d+(\.\d+)?\s?%/g;
const DATE = /(20\d{2}[.\-년]\s?)?\d{1,2}[.\-월]\s?\d{1,2}일?|D-\d+/g;
const norm = (x) => String(x).replace(/\s+/g, '').replace(/,/g, '');
export function extractCoreFacts(meta) {
  if (meta.coreFacts) {
    const cf = meta.coreFacts;
    return { who: cf.who || null, amount: cf.amount || cf.rate || null, deadline: cf.deadline || cf.effectiveDate || null, basis: cf.basis || null, declared: true };
  }
  const text = `${meta.title || ''} ${meta.description || ''}`;
  const amounts = [...new Set((text.match(MONEY) || []).map(norm))].slice(0, 3);
  const dates = [...new Set((text.match(DATE) || []).map(norm).filter((d) => !/^\d{1,2}\.\d{1,2}$/.test(d) || /월|일/.test(d)))].slice(0, 3);
  const who = detectSegments(meta.title, meta._program).slice(0, 3);
  const basis = meta.sources?.[0]?.title ? meta.sources[0].title.slice(0, 60) : null;
  return { who: who.length ? who.join('·') : null, amount: amounts.length ? amounts.join('·') : null, deadline: dates.length ? dates.join('·') : null, basis, declared: false };
}
const factTokens = (cf) => {
  const t = new Set();
  for (const k of ['amount', 'deadline']) for (const x of String(cf?.[k] || '').split('·').filter(Boolean)) t.add(`${k}:${norm(x)}`);
  for (const x of String(cf?.who || '').split('·').filter(Boolean)) t.add(`who:${norm(x)}`);
  return t;
};
export function factOverlap(a, b) {
  const A = factTokens(a); let n = 0; const hit = [];
  for (const x of factTokens(b)) if (A.has(x)) { n++; hit.push(x); }
  return { n, hit };
}

// ── 장부 생성 ────────────────────────────────────────────────────────────
export function buildEntry(slug, mdx) {
  const meta = parseArticleMeta(mdx);
  if (!meta) return null;
  const primary = meta.targetQuery || meta.keywords[0] || '';
  const { program, fromDictionary } = detectProgram(primary, meta.title);
  const segments = detectSegments(`${meta.title} ${primary}`, program);
  const aspect = detectAspect(primary, program);
  const { year, yearInferred } = detectYear(meta.title, meta.publishedAt);
  const fam = classifyFamily(meta.title, primary);
  const coreFacts = extractCoreFacts({ ...meta, _program: program });
  const reviewReason = [];
  if (!fromDictionary) reviewReason.push('제도 사전 밖');
  return {
    slug, path: `src/content/articles/${slug}.mdx`, cluster: meta.cluster || null, title: meta.title || '',
    publishedAt: meta.publishedAt || null, updatedAt: meta.updatedAt || null,
    targetQuery: primary, keywordSet: [...new Set([primary, ...meta.keywords].map(normKeyword).filter(Boolean))],
    program, aspect, segments, year, yearInferred,
    family: fam.family, familyEvidence: fam.evidence,
    coreFacts, coreFactsKeys: ['who', 'amount', 'deadline', 'basis'].filter((k) => coreFacts[k]),
    needsReview: reviewReason.length > 0, reviewReason,
  };
}

export function buildLedger(dir = ARTICLES) {
  const entries = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx')).sort()) {
    const e = buildEntry(f.replace(/\.mdx$/, ''), readFileSync(path.join(dir, f), 'utf8'));
    if (e) entries.push(e);
  }
  return entries;
}

const keyOf = (e) => `${e.program}|${(e.aspect || []).join(',')}|${e.family}|${e.segments.join(',')}|${e.year ?? ''}`;

// 같은 제도·패밀리·세그먼트·연도 그룹 (이미 벌어진 겹침)
export function duplicateGroups(entries) {
  const g = new Map();
  for (const e of entries) { const k = keyOf(e); if (!g.has(k)) g.set(k, []); g.get(k).push(e); }
  return [...g.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ key: k, slugs: v.map((x) => x.slug) }));
}

// ── 후보 판정 ────────────────────────────────────────────────────────────
export function checkCandidate(entries, { query, family, facts = null }) {
  const { program } = detectProgram(query, query);
  const segments = detectSegments(query, program);
  const aspect = detectAspect(query, program);
  const { year } = detectYear(query, null);
  const fam = String(family || 'A').toUpperCase();
  const same = entries.filter((e) => e.program === program);
  const sameSeg = (e) => e.segments.join(',') === segments.join(',');
  const sameYear = (e) => year == null || e.year == null || e.year === year;
  const sameAspect = (e) => (e.aspect || []).join(',') === aspect.join(',');
  const overlapsAspect = (e) => { const ea = e.aspect || []; return ea.length > 0 && aspect.length > 0 && (ea.every((t) => aspect.includes(t)) || aspect.every((t) => ea.includes(t))); };
  // ① 이 세부 키워드를 이미 키워드 목록에 넣고 쓴 글 ② 제도·세부 주제·패밀리·세그먼트·연도가 모두 같은 글
  const nq = normKeyword(query);
  const targeted = entries.filter((e) => (e.keywordSet || []).includes(nq));
  const veto = [...new Set([...targeted, ...same.filter((e) => e.family === fam && sameSeg(e) && sameYear(e) && sameAspect(e))])];
  if (veto.length) return { verdict: 'VETO', program, aspect, segments, year, family: fam, reason: targeted.length ? '이 세부 키워드로 이미 쓴 글이 있다 → 새 글 대신 기존 글 갱신' : '같은 제도·세부 주제·패밀리·세그먼트·연도 글이 이미 있다 → 새 글 대신 기존 글 갱신', matches: veto.map((e) => ({ slug: e.slug, title: e.title })) };
  if (facts) {
    const fix = same.map((e) => ({ e, o: factOverlap(e.coreFacts, facts) })).filter((x) => x.o.n >= 2);
    if (fix.length) return { verdict: 'FIX', program, aspect, segments, year, family: fam, reason: 'coreFacts 핵심값 2개 이상 겹침 → 각도를 바꾸거나 기존 글 갱신', matches: fix.map((x) => ({ slug: x.e.slug, title: x.e.title, overlap: x.o.hit })) };
  }
  const adjacent = same.filter((e) => e.family === fam && sameYear(e) && overlapsAspect(e));
  return {
    verdict: 'PASS', program, aspect, segments, year, family: fam,
    reason: same.length ? `같은 제도 글 ${same.length}편 — 내부 링크 후보${adjacent.length ? `, 세부 주제가 겹치는 인접 글 ${adjacent.length}편(각도 차이 확인)` : ''}` : '같은 제도 글 없음',
    adjacent: adjacent.map((e) => ({ slug: e.slug, title: e.title, aspect: e.aspect, segments: e.segments })),
    matches: same.slice(0, 8).map((e) => ({ slug: e.slug, title: e.title, family: e.family, aspect: e.aspect })),
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────
function loadPending() {
  if (!existsSync(OUT)) return [];
  try { return JSON.parse(readFileSync(OUT, 'utf8')).pending || []; } catch { return []; }
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.findIndex((a) => a === k || a.startsWith(`${k}=`)); if (i < 0) return undefined; return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1]; };
  const entries = buildLedger();

  if (opt('--check')) {
    const i = args.indexOf('--check');
    const query = args[i + 1];
    const family = args[i + 2] && !args[i + 2].startsWith('--') ? args[i + 2] : 'A';
    const facts = opt('--facts') ? JSON.parse(readFileSync(path.resolve(ROOT, opt('--facts')), 'utf8')) : null;
    const pendingAsEntries = loadPending().map((p) => ({ ...p, segments: p.segments || [], coreFacts: p.coreFacts || {} }));
    const r = checkCandidate([...entries, ...pendingAsEntries], { query, family, facts });
    console.log(JSON.stringify(r, null, 1));
    process.exit(r.verdict === 'VETO' ? 3 : 0);
  }

  const today = kstDate();
  const slugs = new Set(entries.map((e) => e.slug));
  let pending = loadPending().filter((p) => !slugs.has(p.slug) && (Date.parse(today) - Date.parse(p.addedAt || today)) / 864e5 <= PENDING_KEEP_DAYS);
  if (opt('--append')) {
    const add = JSON.parse(readFileSync(path.resolve(ROOT, opt('--append')), 'utf8'));
    for (const a of Array.isArray(add) ? add : [add]) {
      const { program } = detectProgram(a.targetQuery || a.title, a.title);
      pending.push({ slug: a.slug, title: a.title, targetQuery: a.targetQuery, program: a.program || program, aspect: a.aspect || detectAspect(a.targetQuery || a.title, a.program || program), segments: a.segments || detectSegments(`${a.title} ${a.targetQuery || ''}`, a.program || program), year: a.year ?? detectYear(a.title, today).year, family: a.family || classifyFamily(a.title, a.targetQuery).family, coreFacts: a.coreFacts || {}, addedAt: today });
    }
  }

  const byFamily = entries.reduce((m, e) => ((m[e.family] = (m[e.family] || 0) + 1), m), {});
  const review = entries.filter((e) => e.needsReview);
  const groups = duplicateGroups(entries);
  const programs = entries.reduce((m, e) => ((m[e.program] = (m[e.program] || 0) + 1), m), {});
  const meta = {
    generatedAt: new Date().toISOString(), articles: entries.length, byFamily,
    fromDictionary: entries.filter((e) => !e.reviewReason.includes('제도 사전 밖')).length,
    needsReview: review.length, duplicateGroups: groups.length, programs: Object.keys(programs).length,
    _readme: ['잠금 장부. naver-ledger.mjs 가 기사 frontmatter 에서 다시 만든다(수작업 편집은 덮인다).', '예약(pending)은 --append 로 넣고 머지되거나 21일 지나면 빠진다.', '판정: --check "<제도 세그먼트 연도>" <A|B|V> [--facts=파일]. VETO 종료 코드 3.'],
  };

  if (!args.includes('--write') && !opt('--append')) {
    console.log(`잠금 장부 드라이런 — 글 ${entries.length}편 (파일 안 씀, --write 로 생성)`);
    console.log(`패밀리 A ${byFamily.A || 0} · B ${byFamily.B || 0} · V ${byFamily.V || 0}`);
    console.log(`제도 사전 적중 ${meta.fromDictionary}/${entries.length} · 제도 ${meta.programs}개 · 확인 필요 ${review.length} · 같은 조합 그룹 ${groups.length}`);
    console.log('\n제도별 글 수 상위 15');
    for (const [p, n] of Object.entries(programs).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(3)}  ${p}`);
    console.log('\n같은 조합 그룹 상위 10 (이미 겹친 글 — 갱신·통합 검토 후보)');
    for (const g of groups.sort((a, b) => b.slugs.length - a.slugs.length).slice(0, 10)) console.log(`  ${g.slugs.length}편  ${g.key}\n        ${g.slugs.join(', ')}`);
    // 결정적 샘플: slug 해시 순으로 20편
    const h = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const sample = [...entries].sort((a, b) => h(a.slug) - h(b.slug)).slice(0, 20);
    console.log('\n사람 확인용 샘플 20');
    for (const e of sample) console.log(`  [${e.family}] ${e.program} / ${(e.aspect || []).join('·') || '-'} | 세그먼트 ${e.segments.join('·') || '-'} | ${e.year}${e.yearInferred ? '(추정)' : ''} | ${e.title.slice(0, 44)}${e.needsReview ? ' ⚠' + e.reviewReason.join('/') : ''}`);
    process.exit(0);
  }

  writeFileSync(OUT, JSON.stringify({ meta, entries, pending, duplicateGroups: groups }, null, 1) + '\n');
  console.log(`→ ${path.relative(ROOT, OUT)} (글 ${entries.length} · 예약 ${pending.length} · 같은 조합 그룹 ${groups.length})`);
}
