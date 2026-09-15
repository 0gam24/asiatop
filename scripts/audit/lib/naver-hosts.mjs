// ════════════════════════════════════════════════════════════════════════
// naver-hosts.mjs — 네이버 웹문서 상위 문서의 호스트 분류와 "자리 열림" 판정 (순수 함수, 네트워크 없음)
//
// 기준: docs/ops/KEYWORD-PLAN-2026-09-15.md §4-2(분류표) · §4-4(verdict). 금융·생활 행정 분야용.
// 판정 순서가 곧 우선순위다: us → naver → tool → law → gov → public → org → press → finco → ugc → commercial.
// 실측 보정 이력:
//   2026-09-15 증권사·은행 호스트가 commercial 로 잡혀 openSlots 가 부풀었다 → finco 목록 확장 (research JSON _readme)
//   2026-09-15 운영자 결정 "범용": 자매 사이트를 따로 세지 않는다. awoo.or.kr 같은 .or.kr 정보 사이트는 commercial.
//   2026-09-15 .or.kr 을 통째로 공단으로 보니 병원·학회·지역 재단이 벽으로 잡혔다
//              → 공공기관 목록과 .re.kr 만 public(벽), 나머지 .or.kr·.ac.kr·.org 는 org(뺏을 수 있는 자리)
// ════════════════════════════════════════════════════════════════════════

export const SITE_HOST = 'asiatop.co.kr';

// host 가 목록의 도메인과 같거나 그 하위 도메인인가
const onDomain = (host, list) => list.some((d) => host === d || host.endsWith(`.${d}`));

// 조회·계산·발급 서비스. 글로는 못 이긴다(프로파일 §5-1).
export const TOOL_HOSTS = [
  'hometax.go.kr', 'wetax.go.kr', 'etax.seoul.go.kr', 'minwon.nts.go.kr', 'si4n.nhis.or.kr', 'edi.nhis.or.kr', '4insure.or.kr',
  'gov.kr', 'plus.gov.kr', 'realtyprice.kr', 'carinfo.knia.or.kr', 'car365.go.kr', 'finlife.fss.or.kr', 'credit4u.or.kr',
  'service.epost.go.kr', 'trace.epost.go.kr', 'safedriving.or.kr', 'dmv.koroad.or.kr', 'iros.go.kr', 'passport.go.kr',
  'pticalc.com', 'calculkorea.com', 'miniwebtool.com',
];
// 정보 사이트 안의 계산기 페이지(사람인·세무사 찾기 등)는 호스트가 아니라 제목·URL 로 잡는다.
// 호스트를 통째로 넣으면 같은 사이트의 안내 글까지 도구가 된다(2026-09-15 실측).
export const TOOL_TEXT = /계산기|모의\s?계산|자동\s?계산|calculator|simul/i;

// 민간 법률·노무 상담 플랫폼. 정부 운영(easylaw.go.kr·law.go.kr·1350.moel.go.kr)은 gov 로 떨어져 벽으로 센다.
export const LAW_HOSTS = ['nodong.kr', 'lawtalk.co.kr', 'lawnb.com', 'lawtextbook.co.kr', 'mylawstory.com'];

// 네이버 자사 서비스. 거래형(보험청구·부동산·증권·쇼핑)이 상위 3 에 있으면 닫힘, 지식백과는 경고만.
export const NAVER_SERVICE_HOSTS = ['pay.naver.com', 'land.naver.com', 'finance.naver.com', 'map.naver.com', 'shopping.naver.com', 'smartstore.naver.com'];
export const NAVER_REFERENCE_HOSTS = ['terms.naver.com'];

export const PRESS_HOSTS = [
  'yna.co.kr', 'chosun.com', 'joongang.co.kr', 'donga.com', 'hani.co.kr', 'khan.co.kr', 'mk.co.kr', 'hankyung.com', 'sedaily.com',
  'mt.co.kr', 'edaily.co.kr', 'fnnews.com', 'heraldcorp.com', 'asiae.co.kr', 'newsis.com', 'news1.kr', 'munhwa.com', 'dt.co.kr',
  'etnews.com', 'kmib.co.kr', 'seoul.co.kr', 'segye.com', 'nocutnews.co.kr', 'ytn.co.kr', 'sbs.co.kr', 'kbs.co.kr', 'imbc.com',
  'jtbc.co.kr', 'mbn.co.kr', 'medicaltimes.com', 'bizwatch.co.kr', 'ajunews.com', 'newspim.com', 'inews24.com', 'zdnet.co.kr',
  'ohmynews.com', 'pressian.com', 'hankookilbo.com', 'kukinews.com', 'dailian.co.kr', 'wowtv.co.kr', 'businesspost.co.kr',
  'taxtimes.co.kr', 'thebell.co.kr', 'ebn.co.kr', 'econovill.com', 'insightkorea.co.kr',
];
export const PRESS_PATTERN = /(^|\.)news|ilbo|times\.co|daily\.co|press\.co|today\.(com|co\.kr)$/;

export const FINCO_HOSTS = [
  'toss.im', 'banksalad.com', 'kbthink.com', 'kakaobank.com', 'kbstar.com', 'wooribank.com', 'kebhana.com', 'hanabank.com',
  'shinhan.com', 'ibk.co.kr', 'nonghyup.com', 'kfcc.co.kr', 'epostbank.go.kr', 'cheongjubank.com', 'miraeasset.com', 'kbsec.com',
  'shinhansec.com', 'samsungpop.com', 'nhqv.com', 'kiwoom.com', 'truefriend.com', 'daishin.com', 'hanwhawm.com', 'finda.co.kr',
  'samsungfire.com', 'dbins.co.kr', 'hi.co.kr', 'kbinsure.co.kr', 'meritzfire.com', 'hanwhalife.com', 'cardif.co.kr',
  'kakaopay.com', 'hyundaicard.com', 'kbcard.com', 'hanacard.co.kr', 'shinhancard.com', 'samsungcard.com', 'lottecard.co.kr', 'bccard.com',
];
export const FINCO_PATTERN = /(card|bank|insur|securities|(^|\.)sec\.)/;

export const UGC_HOSTS = ['blog.naver.com', 'cafe.naver.com', 'in.naver.com', 'kin.naver.com', 'post.naver.com', 'tistory.com', 'brunch.co.kr', 'namu.wiki', 'wikipedia.org', 'velog.io', 'dcinside.com', 'clien.net', 'ppomppu.co.kr', 'theqoo.net', 'linkareer.com'];

// 공단·공공기관·금융 협회. 이 목록과 .re.kr(정부출연연)만 public(벽)이다.
export const PUBLIC_HOSTS = [
  'nhis.or.kr', 'nps.or.kr', 'kinfa.or.kr', 'khug.or.kr', 'hira.or.kr', 'comwel.or.kr', 'kcomwel.or.kr', 'kdic.or.kr', 'fss.or.kr',
  'bok.or.kr', 'reb.or.kr', 'silson24.or.kr', 'koroad.or.kr', 'kidi.or.kr', 'knia.or.kr', 'kead.or.kr', 'kosha.or.kr', 'keis.or.kr',
  'hrdkorea.or.kr', 'kosmes.or.kr', 'semas.or.kr', 'sbiz.or.kr', 'lh.or.kr', 'kotra.or.kr', 'ccrs.or.kr', 'ccfk.or.kr', 'kftc.or.kr',
  'kofia.or.kr', 'klia.or.kr', 'kfb.or.kr', 'crefia.or.kr', 'fsb.or.kr', 'energyv.or.kr', 'kgs.or.kr', 'seoullabor.or.kr', 'kosaf.or.kr',
  'kcredit.or.kr', 'kodit.or.kr', 'kibo.or.kr', 'koreg.or.kr', 'kipa.or.kr',
];

// .or.kr 이지만 기관이 아닌 정보 사이트(상업으로 센다)
export const OR_KR_INFO_SITES = ['awoo.or.kr'];

export const KINDS = ['us', 'naver', 'tool', 'law', 'gov', 'public', 'org', 'press', 'finco', 'ugc', 'commercial'];

export function hostOf(link) {
  try { return new URL(link).hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, ''); } catch { return ''; }
}

export function classifyHost(host, text = '') {
  const h = (host || '').toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  if (!h) return 'commercial';
  if (onDomain(h, [SITE_HOST])) return 'us';
  if (onDomain(h, NAVER_SERVICE_HOSTS) || onDomain(h, NAVER_REFERENCE_HOSTS)) return 'naver';
  if (onDomain(h, TOOL_HOSTS) || TOOL_TEXT.test(text)) return 'tool';
  if (onDomain(h, LAW_HOSTS)) return 'law';
  if (/\.go\.kr$/.test(h) || onDomain(h, ['korea.kr'])) return 'gov';
  if (onDomain(h, PUBLIC_HOSTS) || /\.re\.kr$/.test(h)) return 'public';
  if (onDomain(h, OR_KR_INFO_SITES)) return 'commercial';
  if ((/\.(or|ac)\.kr$/.test(h) || /\.org$/.test(h)) && !onDomain(h, UGC_HOSTS)) return 'org';
  if (onDomain(h, PRESS_HOSTS) || PRESS_PATTERN.test(h)) return 'press';
  if (onDomain(h, FINCO_HOSTS) || FINCO_PATTERN.test(h)) return 'finco';
  if (onDomain(h, UGC_HOSTS) || /(^|\.)community\./.test(h)) return 'ugc';
  return 'commercial';
}

// 제목 속 연도가 모두 올해보다 이전이면 옛 문서. 연도가 없으면 판단하지 않는다.
export function isStale(title, year) {
  const yrs = (String(title || '').match(/20\d{2}/g) || []).map(Number);
  return yrs.length > 0 && Math.max(...yrs) < year;
}

export function classifyItems(items, { year = new Date().getFullYear() } = {}) {
  return (items || []).map((it, i) => {
    const title = String(it.title || '');
    const host = it.host || hostOf(it.link);
    const kind = classifyHost(host, `${title} ${it.link || ''}`);
    return { r: i + 1, host, kind, stale: kind !== 'us' && isStale(title, year), title: title.slice(0, 80) };
  });
}

// 상위 문서 구성 요약. 입력은 classifyItems 결과(순위순, 최대 30).
export function summarize(above) {
  const top10 = above.slice(0, 10);
  const top5 = above.slice(0, 5);
  const top3 = above.slice(0, 3);
  const n = (arr, kinds) => arr.filter((a) => kinds.includes(a.kind)).length;
  const ours = above.find((a) => a.kind === 'us');
  return {
    rank: ours ? ours.r : null,
    openSlots: top10.filter((a) => ['commercial', 'ugc', 'org'].includes(a.kind) || (a.stale && a.kind !== 'us')).length,
    mainGovAbove: n(top5, ['gov']),
    publicAbove: n(top5, ['public']),
    wallTop5: n(top5, ['gov', 'public', 'tool']),
    toolAbove: n(top10, ['tool']),
    lawAbove: n(top10, ['law']),
    fincoAbove: n(top10, ['finco']),
    naverAbove: top3.filter((a) => a.kind === 'naver' && !onDomain(a.host, NAVER_REFERENCE_HOSTS)).length,
    naverRefAbove: top3.filter((a) => a.kind === 'naver' && onDomain(a.host, NAVER_REFERENCE_HOSTS)).length,
    kindsTop10: Object.fromEntries(KINDS.map((k) => [k, n(top10, [k])])),
  };
}

// §4-4 verdict. newsWall(뉴스 7일 기사 수)·eyeOffset(사람 확인 1/2/3)은 없으면 조건에서 뺀다.
export const THRESHOLDS = {
  T2: { tool: 2, wallTop5: 3, naverTop3: 0, openSlotsMin: 1, newsWall: 15 },
  // T1 은 뉴스 허용치만 넓다. 상위 5 에 벽이 4개면 잘해야 5~6위라 최상단 목표에 못 미친다(2026-09-15 청년미래적금 중도해지 실측).
  T1: { tool: 2, wallTop5: 3, naverTop3: 0, openSlotsMin: 0, newsWall: 40, newsWarn: 15 },
  fincoWarn: 4,
};

export function verdicts(s, { newsWall = null, eyeOffset = null } = {}) {
  const reason = [];
  const warn = [];
  if (s.rank != null && s.rank <= 3) {
    return { verdictT1: 'closed', verdictT2: 'closed', reason: [`자사 ${s.rank}위 — 갱신 대상`], warn };
  }
  const check = (t) => {
    const fail = [];
    if (s.toolAbove > t.tool) fail.push(`도구 ${s.toolAbove}`);
    if (s.wallTop5 > t.wallTop5) fail.push(`상위5 관공서·공단·도구 ${s.wallTop5}`);
    if (s.naverAbove > t.naverTop3) fail.push(`네이버 서비스 상위3 ${s.naverAbove}`);
    if (s.openSlots < t.openSlotsMin) fail.push('빈자리 0');
    if (newsWall != null && newsWall > t.newsWall) fail.push(`7일 기사 ${newsWall}`);
    if (eyeOffset === 3) fail.push('웹문서 블록이 첫 화면 아래(사람 확인)');
    return fail;
  };
  const f2 = check(THRESHOLDS.T2);
  const f1 = check(THRESHOLDS.T1);
  for (const x of new Set([...f1, ...f2])) reason.push(x);
  if (newsWall != null && newsWall > THRESHOLDS.T1.newsWarn && newsWall <= THRESHOLDS.T1.newsWall) warn.push(`뉴스 블록 경고 (7일 기사 ${newsWall})`);
  if (s.naverRefAbove > 0) warn.push('네이버 지식백과 상위 3 — 정의형 쿼리는 지식백과 블록이 먼저 선다');
  if (s.fincoAbove >= THRESHOLDS.fincoWarn) warn.push(`금융사 ${s.fincoAbove} — 상업 의도, 광고 블록이 위에 설 수 있다`);
  if (s.rank != null && s.rank <= 30) warn.push(`자사 ${s.rank}위 — 새 글보다 기존 글 진단 먼저`);
  return { verdictT1: f1.length ? 'closed' : 'open', verdictT2: f2.length ? 'closed' : 'open', reason, warn };
}
