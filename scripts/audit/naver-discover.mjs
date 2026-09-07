#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-discover.mjs — 신생 키워드 발굴 (NAVER API HUB 뉴스 검색, LLM 0)
// 문제: naver-demand.mjs 는 "이미 아는 키워드"만 측정한다. 새로 생긴 제도어(예: 아이맞이지원금, 청년미래적금)는
//       씨앗 목록에도 달력에도 없어 영영 보이지 않는다. 경쟁 문서가 없어 가장 쉬운 자리인데 놓치는 구조였다.
// 방법: 클러스터별 축 용어로 최근 뉴스를 훑어 제목에서 후보 어구를 뽑고, 기존 665편과 대조해 "우리가 안 쓴 신생어"만 남긴다.
//       판단은 하지 않는다. 여기 결과는 씨앗 후보일 뿐이고, 실제 수요·경쟁은 naver-demand.mjs 가 측정한다.
//
// 실행: node scripts/audit/naver-discover.mjs [--days 14] [--min 2] [--quiet]   (pnpm audit:discover)
// 출력: 콘솔 목록 + docs/revenue-log/naver-discover-YYYY-MM-DD.json (+ seeds 배열 = audit:naver --seeds 로 바로 투입)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DAYS = Number(opt('--days', 14)) || 14;
const MIN_HITS = Number(opt('--min', 2)) || 2;
const QUIET = args.includes('--quiet');

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local'); const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };
const HUB_ID = env.X_NCP_APIGW_API_KEY_ID || env.NCP_APIGW_API_KEY_ID || env.NAVER_APIHUB_CLIENT_ID;
const HUB_SECRET = env.X_NCP_APIGW_API_KEY || env.NCP_APIGW_API_KEY || env.NAVER_APIHUB_CLIENT_SECRET;
const HUB = !!(HUB_ID && HUB_SECRET);
if (!HUB && !(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET)) { console.error('❌ 네이버 API 자격증명 없음 (naver-demand.mjs 헤더 참조)'); process.exit(1); }
const API = HUB
  ? { base: 'https://naverapihub.apigw.ntruss.com', news: '/search/v1/news', headers: { 'X-NCP-APIGW-API-KEY-ID': HUB_ID, 'X-NCP-APIGW-API-KEY': HUB_SECRET } }
  : { base: 'https://openapi.naver.com', news: '/v1/search/news.json', headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET } };

// 클러스터별 축 용어. 이 말이 들어간 최근 뉴스에서만 후보를 뽑는다 (정치·연예 뉴스 유입 차단).
const AXES = {
  'gov-support': ['지원금 신청', '정부지원금', '수당 지급', '바우처 신청', '장려금'],
  tax: ['세액공제', '소득공제', '신고 납부 국세청', '세법개정', '재산세 종부세'],
  realestate: ['전세대출 규제', '청약 제도', '임대차 신고', '공시가격'],
  unemployment: ['실업급여', '퇴직금 지급', '구직급여'],
  'insurance-labor': ['건강보험료', '4대보험 요율', '최저임금', '육아휴직 급여', '연차수당'],
  'insurance-personal': ['실손보험', '자동차보험료', '본인부담상한'],
  pension: ['국민연금 보험료율', '기초연금', '퇴직연금 IRP', '연금저축'],
  auto: ['자동차세', '운전면허 갱신', '자동차 검사 과태료', '유류세'],
  savings: ['청년 적금', '예금자보호', '주택청약 납입', 'ISA 계좌'],
  'credit-loan': ['채무조정', 'DSR 규제', '정책서민금융', '연체 채권'],
  'public-services': ['주민등록', '정부24 발급', '민원 신청 방법'],
  'office-tips': ['연말정산 간소화', '원천세', '급여 명세'],
};

// 후보 어구 추출: 뉴스 제목에서 "제도어를 포함한 명사구"만 뽑는다.
// 느슨하게 두면 뉴스 통계("15개월 만에", "10건 중 9건")와 정치·기업 기사("전세금 2억 빌리며", "발행어음 특판")가 대량 유입된다.
// 그래서 제도어 사전(INST)을 반드시 포함하도록 강제하고, 기사체·사건성 어휘는 차단한다.
const NOISE = /(단독|속보|포토|영상|인터뷰|사설|칼럼|기고|오늘의|주가|코스피|코스닥|증시|시황|환율|대표|의원|장관|후보|선거|검찰|경찰|사고|화재|날씨|의혹|고소|고발|재판|구속|논란|공방|해명|특판|순익|영업이익|실적|공모주|청약 경쟁률|우승|출시 기념)/;
// 제도어 사전: 이 말이 어구 안에 있어야 후보가 된다
const INST = /(수당|급여|지원금|바우처|공제|장려금|보험료|연금|적금|계좌|과태료|가산세|상품권|요율|한도|기준액|납부|신고|접수|고지|감면|환급|세액|보조금|장학금|중위소득|최저임금|예산안|개정안|개편안|가입자격|선정기준|지급액|인상률|공시가격|실업급여|건강보험|국민연금|연말정산|종부세|재산세|부가세|소득세|양도세|증여세|상속세)/;
// 어구 안에 있으면 버리는 토큰 (기사체 수식·통계 표현)
const BAD_TOKEN = /^(만에|중|이상|이하|각각|대비|전년|전월|기준으로|가운데|반면|한편|누적|연속|여명|명|건|곳|위|배|억|조|천억|만원대)$/;
// 서술어·문장 조각 (뉴스 제목은 문장이라 그대로 두면 "잘렸다, 구직급여 신청하고" 같은 조각이 남는다)
const VERBISH = /(다|다,|까|까\?|요|네|죠|며|고,|한다|된다|늘었다|줄었다|뛴다|산다|본다|볼까|깨달은|늘린다|받는다)$/;
// 기관·기업·행사 고유명 (지자체 보도자료·상품 홍보·세미나 기사 차단)
const ORG = /(지사|공단|공사|청장|시장|군수|구청|세미나|간담회|설명회|홍보|일제정리|부실|은행|증권|생명|화재|캐피탈|자산운용|회계법인|PwC|미래에셋|케이뱅크|카카오뱅크|토스|신한|국민|하나|우리|농협|삼성|현대|LG|SK)/;
const REGION_LEAD = /^[가-힣]{2,4}(구|군|시|도),/;
const STOPWORD = new Set(['지원', '신청', '제도', '정부', '올해', '내년', '작년', '이번', '관련', '위해', '통해', '대한', '따른', '경우', '가능', '검토', '추진', '발표', '확대', '강화', '개선', '방안', '계획', '사업', '대상', '기준', '변경', '시행', '도입', '신설', '개편']);
function phrases(title) {
  const t = title.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/[\[\]"'“”‘’()…·|]/g, ' ');
  const toks = t.split(/\s+/).filter(Boolean);
  const out = [];
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= toks.length; i++) {
      const win = toks.slice(i, i + n);
      const p = win.join(' ');
      if (p.length < 5 || p.length > 24) continue;
      if (!/[가-힣]/.test(p)) continue;
      if (win.some((w) => STOPWORD.has(w) || BAD_TOKEN.test(w) || VERBISH.test(w))) continue;
      if (!INST.test(p)) continue;                 // 제도어 필수
      if (ORG.test(p) || REGION_LEAD.test(p)) continue;
      if (/[.,…"']$/.test(p) || /^[0-9]+$/.test(win[0])) continue;
      out.push(p);
    }
  }
  return out;
}
// 같은 뉴스에서 나온 겹치는 어구는 가장 구체적인 것(긴 것) 하나만 남긴다
function dedupe(rows) {
  const sorted = [...rows].sort((a, b) => b.keyword.length - a.keyword.length);
  const kept = [];
  for (const r of sorted) {
    if (kept.some((k) => k.keyword.includes(r.keyword) && k.cluster === r.cluster)) continue;
    kept.push(r);
  }
  return kept.sort((a, b) => b.hits - a.hits);
}

function loadInventory() {
  const out = [];
  for (const f of readdirSync(ART_DIR).filter((x) => x.endsWith('.mdx'))) {
    const s = readFileSync(path.join(ART_DIR, f), 'utf8');
    const fm = s.split('---')[1] || '';
    const title = (fm.match(/^title:\s*"?([^"\n]*)"?/m) || [])[1] || '';
    const desc = (fm.match(/^description:\s*"?([^"\n]*)"?/m) || [])[1] || '';
    out.push({ slug: f.replace(/\.mdx$/, ''), text: `${title} ${desc}` });
  }
  return out;
}
function covered(phrase, inv) {
  const toks = phrase.split(/\s+/).filter((w) => w.length >= 2);
  if (!toks.length) return null;
  const core = [...toks].sort((a, b) => b.length - a.length)[0];
  const rest = toks.filter((w) => w !== core).map((w) => w.slice(0, 2));
  const hit = inv.find((a) => a.text.includes(core) && rest.every((p) => a.text.includes(p)));
  return hit ? hit.slug : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function news(query) {
  const u = new URL(API.base + API.news);
  u.searchParams.set('query', query);
  u.searchParams.set('display', '50');
  u.searchParams.set('sort', 'date');
  const r = await fetch(u, { headers: API.headers });
  if (r.status === 429) { await sleep(1500); return news(query); }
  if (!r.ok) throw new Error(`news ${r.status}`);
  return r.json();
}

const inv = loadInventory();
const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const since = Date.now() - DAYS * 86400000;
if (!QUIET) console.log(`신생 키워드 발굴: 클러스터 ${Object.keys(AXES).length}개, 최근 ${DAYS}일 뉴스, 인벤토리 ${inv.length}편, ${kst} KST\n`);

const found = new Map(); // phrase -> { hits, clusters:Set, titles:[], links:[] }
for (const [cluster, axes] of Object.entries(AXES)) {
  for (const axis of axes) {
    let j;
    try { j = await news(axis); } catch (e) { if (!QUIET) process.stdout.write('x'); continue; }
    for (const it of j.items || []) {
      const when = it.pubDate ? new Date(it.pubDate).getTime() : 0;
      if (when && when < since) continue;
      const title = (it.title || '').replace(/<[^>]+>/g, '');
      if (NOISE.test(title)) continue;
      for (const p of phrases(title)) {
        const cur = found.get(p) || { phrase: p, hits: 0, clusters: new Set(), titles: [], links: [] };
        cur.hits++;
        cur.clusters.add(cluster);
        if (cur.titles.length < 3) { cur.titles.push(title.slice(0, 70)); cur.links.push((it.link || '').split('?')[0]); }
        found.set(p, cur);
      }
    }
    if (!QUIET) process.stdout.write('.');
    await sleep(120);
  }
}
if (!QUIET) console.log('\n');

const rows = dedupe([...found.values()]
  .filter((r) => r.hits >= MIN_HITS)
  .map((r) => ({ keyword: r.phrase, hits: r.hits, cluster: [...r.clusters][0], clusters: [...r.clusters], existing: covered(r.phrase, inv), sampleTitles: r.titles, sampleLinks: r.links })));
const fresh = rows.filter((r) => !r.existing);

mkdirSync(LOG_DIR, { recursive: true });
const outFile = path.join(LOG_DIR, `naver-discover-${kst}.json`);
writeFileSync(outFile, JSON.stringify({
  pulledAt: new Date().toISOString(), kstDate: kst, days: DAYS, minHits: MIN_HITS,
  api: HUB ? 'NAVER API HUB' : '개발자센터',
  seeds: fresh.slice(0, 60).map((r) => ({ keyword: r.keyword, cluster: r.cluster })),
  rows,
}, null, 1));

if (!QUIET) {
  const pad = (s, n) => String(s ?? '').padEnd(n);
  console.log('=== 우리가 아직 안 쓴 신생 후보 (뉴스 언급 많은 순) ===');
  console.log(pad('언급', 5), pad('클러스터', 18), pad('후보 키워드', 26), '최근 뉴스 제목');
  for (const r of fresh.slice(0, 30)) console.log(pad(r.hits, 5), pad(r.cluster, 18), pad(r.keyword.slice(0, 24), 26), (r.sampleTitles[0] || '').slice(0, 50));
  console.log(`\n기존 글이 이미 다루는 후보 ${rows.length - fresh.length}건은 제외했다 (리프레시 판단은 audit:naver 의 existing 참조).`);
  console.log(`→ ${path.relative(ROOT, outFile)} (후보 ${rows.length}건, 신생 ${fresh.length}건)`);
  console.log(`다음 단계: node scripts/audit/naver-demand.mjs --seeds ${path.relative(ROOT, outFile).replace(/\\/g, '/')} 로 수요·경쟁 측정 (seeds 배열을 읽는다)`);
}
