#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-demand.mjs — 네이버 검색 API 로 "지금 네이버에서 찾는 주제" 를 측정 (LLM 0)
// 배경: 2026-08-18 구글 억제 이후 GSC rising 이 0 → 신규 주제 입력원이 사라짐.
//       네이버는 건강(일 245클릭)하므로 네이버 수요를 1차 입력으로 쓴다 (docs/24 보완).
//
// 인증 (둘 중 하나, .env.local):
//   A. NAVER API HUB (NCP) — NAVER_APIHUB_CLIENT_ID / NAVER_APIHUB_CLIENT_SECRET  ← 권장 (docs/25 §9-1)
//      도메인 naverapihub.apigw.ntruss.com, 헤더 X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY, 경로 /search/v1/<type>.
//      검색어 트렌드(데이터랩)까지 측정한다 (trendRatio = 최근 4주 vs 직전 4주 상대 관심도).
//   B. 네이버 개발자센터 — NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (검색 API 만, 트렌드 없음).
//      2026-06-29 공지: 개발자센터 검색·트렌드 API 는 HUB 로 이관, 신규 신청 2026-07-31 차단, 기존 키 2027-06-30 종료.
// 실행: node scripts/audit/naver-demand.mjs [--seeds <json|txt>] [--calendar <json>] [--limit N] [--quiet]
// 출력: 콘솔 표 + docs/revenue-log/naver-demand-YYYY-MM-DD.json
//
// 키워드당 측정 (검색 API 4종, 각 1회):
//   kinTotal     지식iN 누적 질문 수             → 장기 수요 (사람들이 실제로 묻는가)
//   blogPerDay   최신 블로그 20건이 며칠에 걸쳤나   → 지금 열기·경쟁 (하루 20건이면 과열)
//   newsPerDay   최신 뉴스 20건의 일 평균          → 시의성 (제도 변경·마감 뉴스)
//   official     웹문서 상위 10 중 go.kr/or.kr 수  → 1차 출처 확보 가능성 (fabrication-zero)
//   ourRank      웹문서 상위 10 중 asiatop.co.kr 순위 → 우리 현재 노출 (0 = 없음)
//   existing     인벤토리에서 키워드 토큰이 제목에 겹치는 글 (카니발리제이션 힌트)
// 점수 (투명·단순): demand = ln(kinTotal+1) + min(blogPerDay,10)/10·3 + min(newsPerDay,5)/5·2
//   ⇒ 0~약 17. 정렬용일 뿐 절대 기준 아님. 판단은 /topics·content-strategist 가 한다.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');

// ── args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SEEDS_FILE = opt('--seeds', null);
const CAL_FILE = opt('--calendar', null);
const LIMIT = Number(opt('--limit', 0)) || 0;
const QUIET = args.includes('--quiet');

// ── auth ────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };
const HUB = !!(env.NAVER_APIHUB_CLIENT_ID && env.NAVER_APIHUB_CLIENT_SECRET);
if (!HUB && !(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET)) {
  console.error('❌ 네이버 API 자격증명 없음. NAVER API HUB(ncloud.com → NAVER API HUB → Application 등록, 검색 API + 검색어 트렌드 선택) 의');
  console.error('   Client ID/Secret 을 .env.local 에 NAVER_APIHUB_CLIENT_ID / NAVER_APIHUB_CLIENT_SECRET 로 넣으세요 (docs/25 §9-1).');
  console.error('   개발자센터 키(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)도 2027-06-30 까지는 동작합니다.');
  process.exit(1);
}
const API = HUB
  ? {
      label: 'NAVER API HUB',
      base: env.NAVER_APIHUB_BASE || 'https://naverapihub.apigw.ntruss.com',
      search: (ep) => `/search/v1/${ep}`,
      trend: env.NAVER_APIHUB_TREND_PATH || '/datalab/v1/search',
      headers: { 'X-NCP-APIGW-API-KEY-ID': env.NAVER_APIHUB_CLIENT_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_APIHUB_CLIENT_SECRET },
    }
  : {
      label: '네이버 개발자센터 (2027-06-30 종료 예정, 트렌드 미지원)',
      base: 'https://openapi.naver.com',
      search: (ep) => `/v1/search/${ep}.json`,
      trend: null,
      headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET },
    };

// ── 기본 씨앗 (클러스터별 Q4 시즌 키워드. 측정 대상일 뿐 발행 확정이 아니다) ──
const DEFAULT_SEEDS = {
  tax: ['연말정산 미리보기', '연말정산 부양가족 기준', '월세 세액공제 조건', '신용카드 소득공제 계산', '재산세 카드납부 혜택',
    '종합부동산세 납부 기간', '부가세 예정신고 개인사업자', '연금저축 세액공제 한도', '자동차세 연납 신청', '주택청약 소득공제 조건'],
  'gov-support': ['근로장려금 반기 신청', '국가장학금 신청 기간', '청년월세지원 신청', '에너지바우처 신청', '난방비 지원 신청',
    '청년 도약계좌 조건', '출산지원금 신청', '첫만남이용권 사용처', '기초생활수급자 조건', '긴급복지 생계지원'],
  realestate: ['전세보증금 반환보증 가입', '청약통장 전환', '디딤돌대출 조건', '버팀목 전세대출 조건', '전월세 신고제 과태료',
    '확정일자 받는 법', '임대차 계약 갱신청구권', '주택담보대출 DSR 계산', '분양권 전매제한', '전세사기 피해자 지원'],
  unemployment: ['실업급여 신청 방법', '실업급여 조건 계약만료', '퇴직금 계산 방법', '실업급여 구직활동 인정', '퇴직금 지급기한',
    '실업급여 연장 신청', '권고사직 실업급여', '자발적 퇴사 실업급여'],
  'insurance-labor': ['주휴수당 계산', '2027 최저임금', '4대보험 요율 2027', '연차수당 계산', '건강보험료 정산',
    '건강보험 본인부담상한제 환급', '육아휴직 급여 신청', '고용보험 가입 확인', '출산휴가 급여'],
  'insurance-personal': ['실손보험 전환', '자동차보험 갱신 비교', '실손보험 청구 방법', '암보험 비교', '운전자보험 필요성',
    '보험료 카드납부', '치아보험 보장', '실손보험 중복가입 확인'],
  pension: ['국민연금 예상수령액 조회', '기초연금 신청 자격', '국민연금 임의가입', '퇴직연금 IRP 세액공제', '국민연금 조기수령 조건',
    '연금저축 IRP 차이', '국민연금 개혁 시행', '노령연금 신청'],
  auto: ['자동차세 2기분 납부', '자동차 검사 과태료', '운전면허 갱신 기간', '자동차 채권 환급', '전기차 보조금 2026',
    '자동차 명의이전 비용', '과태료 조회 방법', '자동차 취득세 계산'],
  savings: ['청년도약계좌 만기', 'ISA 계좌 장단점', '예금자보호 한도', '고금리 적금 추천', '주택청약 납입 인정금액',
    '청년희망적금 만기 해지', '파킹통장 금리 비교', '정기예금 이자 계산'],
  'credit-loan': ['신용점수 올리는 방법', '대출 갈아타기 조건', '전세대출 규제', '소액생계비대출 신청', '신용회복위원회 채무조정',
    '햇살론 자격', '연체 기록 삭제', '카드론 신용점수 영향'],
  'public-services': ['주민등록증 재발급', '등기우편 조회', '인터넷등기소 확정일자', '전입신고 방법', '정부24 등본 발급',
    '모바일 신분증 발급', '주민등록 사실조사', '여권 재발급 기간'],
  'office-tips': ['연차 계산 방법', '퇴직 절차 인수인계', '재직증명서 발급', '급여명세서 확인', '원천징수영수증 발급',
    '휴일근로수당 계산', '연말정산 간소화 서비스', '중도퇴사 연말정산'],
};

// ── 씨앗 로드 ───────────────────────────────────────────────────────────
function loadSeeds() {
  const list = [];
  if (SEEDS_FILE) {
    const raw = readFileSync(path.resolve(ROOT, SEEDS_FILE), 'utf8');
    if (SEEDS_FILE.endsWith('.json')) {
      const j = JSON.parse(raw);
      for (const it of Array.isArray(j) ? j : []) {
        if (typeof it === 'string') list.push({ keyword: it, cluster: '?', source: 'seeds' });
        else if (it.keyword) list.push({ keyword: it.keyword, cluster: it.cluster || '?', source: 'seeds' });
      }
    } else {
      for (const l of raw.split(/\r?\n/)) if (l.trim() && !l.startsWith('#')) list.push({ keyword: l.trim(), cluster: '?', source: 'seeds' });
    }
  } else {
    for (const [cluster, kws] of Object.entries(DEFAULT_SEEDS)) for (const keyword of kws) list.push({ keyword, cluster, source: 'default' });
  }
  if (CAL_FILE) {
    const cal = JSON.parse(readFileSync(path.resolve(ROOT, CAL_FILE), 'utf8'));
    for (const e of Array.isArray(cal) ? cal : []) {
      if (e.mainKeyword) list.push({ keyword: e.mainKeyword, cluster: e.cluster || '?', source: 'calendar', date: e.date });
      for (const k of e.subKeywords || []) list.push({ keyword: k, cluster: e.cluster || '?', source: 'calendar', date: e.date });
    }
  }
  const seen = new Set();
  const uniq = list.filter((s) => {
    const k = s.keyword.replace(/\s+/g, ' ').trim();
    if (seen.has(k)) return false;
    seen.add(k); s.keyword = k; return true;
  });
  return LIMIT ? uniq.slice(0, LIMIT) : uniq;
}

// ── 인벤토리 (카니발리제이션 힌트) ──────────────────────────────────────
function loadInventory() {
  const out = [];
  for (const f of readdirSync(ART_DIR).filter((f) => f.endsWith('.mdx'))) {
    const fm = readFileSync(path.join(ART_DIR, f), 'utf8').split('---')[1] || '';
    const title = (fm.match(/^title:\s*"?([^"\n]*)"?/m) || [])[1] || '';
    const description = (fm.match(/^description:\s*"?([^"\n]*)"?/m) || [])[1] || '';
    out.push({ slug: f.replace(/\.mdx$/, ''), title, text: `${title} ${description}` });
  }
  return out;
}
// 조사·시기 등 변별력 없는 토큰. "상반기/반기", "9월/9월분" 같은 변형은 앞 2글자 접두 매칭으로 흡수한다.
const STOP = new Set(['방법', '조건', '신청', '기간', '계산', '확인', '비교', '2026', '2027', '조회', '발급', '기준', '법', '차이', '추천', '한도', '가입', '납부', '지급', '전환']);
function tokens(kw) { return kw.split(/\s+/).filter((t) => t.length >= 2 && !STOP.has(t)); }
function existingMatches(kw, inv) {
  const tk = tokens(kw);
  if (!tk.length) return [];
  // 핵심 토큰(가장 긴 것) 은 반드시 포함, 나머지는 앞 2글자 접두로 느슨하게 (제목+설명 대상)
  const core = [...tk].sort((a, b) => b.length - a.length)[0];
  const rest = tk.filter((t) => t !== core).map((t) => t.slice(0, 2));
  return inv
    .filter((a) => a.text.includes(core) && rest.every((p) => a.text.includes(p)))
    .slice(0, 3)
    .map((a) => a.slug);
}

// ── API ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(ep, query, params) {
  const u = new URL(API.base + API.search(ep));
  u.searchParams.set('query', query);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: API.headers });
  if (r.status === 429) { await sleep(1500); return search(ep, query, params); }
  if (!r.ok) throw new Error(`${ep} ${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

// 검색어 트렌드 (HUB 전용): 키워드 5개씩 묶어 최근 8주 주간 상대 관심도(구간 최고 = 100)를 받고
// 최근 4주 평균 / 직전 4주 평균 = trendRatio (1.0 = 보합, 2.0 = 두 배). 호출 간 절대값 비교는 불가(호출 내 상대 지수).
async function measureTrend(keywords) {
  const out = new Map();
  if (!API.trend) return out;
  const end = new Date(Date.now() + 9 * 3600000); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 8 * 7 + 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  for (let i = 0; i < keywords.length; i += 5) {
    const group = keywords.slice(i, i + 5);
    const body = { startDate: fmt(start), endDate: fmt(end), timeUnit: 'week', keywordGroups: group.map((k) => ({ groupName: k, keywords: [k] })) };
    try {
      const r = await fetch(API.base + API.trend, { method: 'POST', headers: { ...API.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 429) { await sleep(1500); i -= 5; continue; }
      if (!r.ok) {
        console.error(`⚠️ 검색어 트렌드 API ${r.status}: ${(await r.text()).slice(0, 120)} — trend 지표 없이 진행 (경로 ${API.trend}, 환경변수 NAVER_APIHUB_TREND_PATH 로 조정 가능)`);
        return out;
      }
      const j = await r.json();
      for (const res of j.results || []) {
        const data = res.data || [];
        const recent = data.slice(-4);
        const prev = data.slice(0, Math.max(0, data.length - 4)).slice(-4);
        const avg = (xs) => (xs.length ? xs.reduce((a, d) => a + (d.ratio || 0), 0) / xs.length : 0);
        const ra = avg(recent), pa = avg(prev);
        out.set(res.title, { trendRecent: +ra.toFixed(1), trendPrev: +pa.toFixed(1), trendRatio: pa ? +(ra / pa).toFixed(2) : null });
      }
    } catch (e) {
      console.error('⚠️ 검색어 트렌드 API 오류:', e.message, '— trend 지표 없이 진행');
      return out;
    }
    await sleep(120);
  }
  return out;
}
const DAY = 86400000;
function spanDays(dates) {
  const ds = dates.filter(Boolean).map((d) => d.getTime()).sort((a, b) => a - b);
  if (ds.length < 2) return null;
  return Math.max((ds[ds.length - 1] - ds[0]) / DAY, 0.5);
}
function parseBlogDate(s) {
  return s && /^\d{8}$/.test(s) ? new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00+09:00`) : null;
}

async function measure(kw, inv) {
  const [kin, blog, news, web] = await Promise.all([
    search('kin', kw, { display: 1 }),
    search('blog', kw, { display: 20, sort: 'date' }),
    search('news', kw, { display: 20, sort: 'date' }),
    search('webkr', kw, { display: 10 }),
  ]);
  const bSpan = spanDays((blog.items || []).map((i) => parseBlogDate(i.postdate)));
  const nSpan = spanDays((news.items || []).map((i) => (i.pubDate ? new Date(i.pubDate) : null)));
  const webLinks = (web.items || []).map((i) => i.link || '');
  const official = webLinks.filter((l) => /\.(go|or)\.kr/.test(l)).length;
  const ourIdx = webLinks.findIndex((l) => l.includes('asiatop.co.kr'));
  const blogPerDay = bSpan ? +((blog.items || []).length / bSpan).toFixed(2) : 0;
  const newsPerDay = nSpan ? +((news.items || []).length / nSpan).toFixed(2) : 0;
  const latestNews = (news.items || [])[0];
  const demand = +(Math.log(kin.total + 1) + (Math.min(blogPerDay, 10) / 10) * 3 + (Math.min(newsPerDay, 5) / 5) * 2).toFixed(2);
  const existing = existingMatches(kw, inv);
  // gap: 기존 글이 없고 1차 출처(go.kr/or.kr)가 상위 10 안에 3개 이상 → 신규 후보로 올릴 만함 (최종 판단은 strategist)
  const gap = existing.length === 0 && official >= 3 ? 1 : 0;
  return {
    kinTotal: kin.total, blogTotal: blog.total, blogPerDay, newsTotal: news.total, newsPerDay,
    latestNews: latestNews ? { title: latestNews.title.replace(/<[^>]+>/g, ''), date: (latestNews.pubDate || '').slice(5, 16) } : null,
    official, ourRank: ourIdx >= 0 ? ourIdx + 1 : 0, existing, gap, demand,
  };
}

// ── main ────────────────────────────────────────────────────────────────
const seeds = loadSeeds();
const inv = loadInventory();
const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
if (!QUIET) console.log(`네이버 수요 측정: ${seeds.length} 키워드, 인벤토리 ${inv.length}편, ${kst} KST, API = ${API.label}\n`);
const rows = [];
for (const s of seeds) {
  try {
    const m = await measure(s.keyword, inv);
    rows.push({ ...s, ...m });
    if (!QUIET) process.stdout.write('.');
  } catch (e) {
    rows.push({ ...s, error: String(e.message).slice(0, 100) });
    if (!QUIET) process.stdout.write('x');
  }
  await sleep(120);
}
if (!QUIET) console.log('\n');
const trend = await measureTrend(rows.filter((r) => !r.error).map((r) => r.keyword));
for (const r of rows) Object.assign(r, trend.get(r.keyword) || {});
rows.sort((a, b) => (b.demand || 0) - (a.demand || 0));

mkdirSync(LOG_DIR, { recursive: true });
const outFile = path.join(LOG_DIR, `naver-demand-${kst}.json`);
writeFileSync(outFile, JSON.stringify({
  pulledAt: new Date().toISOString(), kstDate: kst, api: API.label, trendMeasured: trend.size > 0,
  seedsSource: SEEDS_FILE || 'default', calendar: CAL_FILE || null, rows,
}, null, 1));

if (!QUIET) {
  const pad = (s, n) => String(s ?? '').padEnd(n);
  const T = trend.size > 0;
  console.log(pad('점수', 5), pad('갭', 3), pad('클러스터', 18), pad('키워드', 24), pad('지식iN', 7), pad('블로그/일', 9), pad('뉴스/일', 7), pad('go.kr', 5), pad('우리', 4), T ? pad('트렌드', 6) : '', '기존글');
  for (const r of rows.slice(0, 40)) {
    if (r.error) { console.log(pad('ERR', 5), pad('', 3), pad(r.cluster, 18), pad(r.keyword, 24), r.error); continue; }
    console.log(pad(r.demand, 5), pad(r.gap ? '★' : '', 3), pad(r.cluster, 18), pad(r.keyword.slice(0, 22), 24), pad(r.kinTotal, 7), pad(r.blogPerDay, 9), pad(r.newsPerDay, 7), pad(r.official, 5), pad(r.ourRank || '-', 4), T ? pad(r.trendRatio ?? '-', 6) : '', r.existing.join(',') || '-');
  }
  const gaps = rows.filter((r) => r.gap);
  console.log(`\n→ ${path.relative(ROOT, outFile)} (${rows.length}건, 신규 후보 갭 ★ ${gaps.length}건${T ? ', 트렌드 측정 포함' : HUB ? ', 트렌드 미측정' : ', 트렌드 미측정(개발자센터 키 — HUB 키가 있어야 측정)'})`);
  console.log('읽는 법: 지식iN 많음 = 꾸준한 질문 / 블로그·일 높음 = 지금 뜨거움(경쟁도 높음, 40 = 오늘만 20건 이상) / 뉴스·일 = 제도 변화 / go.kr = 1차 출처 / 우리 = 네이버 웹문서 10위 내 순위 / 트렌드 = 최근 4주÷직전 4주 관심도(HUB) / 기존글 = 겹칠 수 있는 슬러그 / ★ = 기존 글 없음 + 출처 3개 이상');
}
