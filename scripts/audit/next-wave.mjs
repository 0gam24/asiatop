// ════════════════════════════════════════════════════════════════════════
// next-wave.mjs — 다음에 크게 뜰 주제(묶음) 측정 (공식 네이버 API: 뉴스 검색 + 검색어 트렌드, LLM 0)
//
// 왜: 빈틈 대기열(naver-pipeline.mjs)은 "검색어 하나"의 자리를 잰다. 주제 묶음(연말정산·청년미래적금 같은 이름)이
//     통째로 커지는 것은 못 본다. 운영자 지시(2026-10-07 "이런 식으로 오늘 빈틈 키워드를 찾아줘", awoo 목록 화면)로
//     awoo scripts/next-wave.mjs 의 구조를 머니룩 금융 주제로 옮겼다. 지역 분해는 넣지 않았다(지자체 주제는 awoo 몫).
//
// 방법 (공식 API 만, search.naver.com 수집 없음):
//   1) 뉴스 검색: NEWS_QUERIES × 2쪽(200건) 최근 기사 제목에서 제도·상품 이름(○○공제·○○세·○○대출·○○연금·○○계좌…)을 뽑는다.
//      제목 3건 미만은 버린다. 자매 awoo 주제(isSisterTopic)와 지원금·바우처·상품권·쿠폰은 뺀다.
//   2) 감시 목록 docs/ops/next-wave-seeds.json (ignore = 운영자가 목록에서 보류한 묶음).
//   3) 검색어 트렌드: 묶음(이름 · 붙여 쓴 이름 · 신청형이면 "이름 신청")을 56일 일별로 잰다. 요청마다 기준어 '실업급여'를 넣고
//      기준어 최근 28일 평균 = 100 으로 환산한다(요청끼리 ratio 비교는 무효, naver-volume.mjs 와 같은 원칙). 0 인 날은 0 으로 채운다.
//   4) 작년 이번 달·다음 달·다다음 달 월별 값(같은 요청의 기준어 3개월 평균 = 100)으로 계절 배수를 잰다.
// 판정(stage). 정의는 목록 위젯 범례와 같다.
//   rising  지금 뜨는 중       최근 7일 평균이 직전 3주 평균의 1.4배 이상이고 크기 8 이상
//   soon    곧 뜸              감시 목록 묶음이고, 작년 이맘때 한두 달 뒤 1.5배 이상 커졌고(작년 이번 달 값이 지금의 절반 이상인 이름만),
//                             그 배수를 곱하면 크기 8 이상이고, 지금 0.6배 아래로 꺾이지 않음
//   growing 커지는 중          1.2배 이상이고 크기 2 이상, 또는 뉴스에 처음 보인 지 3일 이내이고 1배 이상·크기 1 이상
//   fading  꺾이는 중          0.6배 이하이고 직전 3주 크기 10 이상 (새 글 대신 기존 글 갱신만)
//   thin    큰데 우리 글 적음   감시 목록 묶음이고 크기 30 이상인데 우리 글 2개 이하
//   steady  그 밖
// 정렬 점수 score = 크기 × 배수(soon 은 작년 배수, 그 밖은 지금 배수를 0.1~4 로 자름) × (우리 글 0개면 1.3). 정렬용이다. 전망이 아니다.
//
// 실행: node scripts/audit/next-wave.mjs [--dry-run] [--if-stale] [--terms]   (pnpm audit:wave)
//   --if-stale  오늘(KST) 결과가 이미 있으면 API 를 부르지 않는다(목록 명령용)
//   --terms     뉴스에서 뽑은 묶음만 보여 주고 끝(트렌드 호출 없음)
// 출력: docs/ops/next-wave.json (scripts/audit/ops-widget.mjs 가 읽는다). 검색량 상대값만 담는다(애드센스 수치 없음).
// 호출량: 뉴스 최대 28회 + 트렌드 최대 22회. 무료 한도: 검색 일 25,000 · 트렌드 월 30,000.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { naverSearch, naverClient, stripTags, sleep, kstDate, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { parseArticleMeta } from './naver-ledger.mjs';
import { isSisterTopic, regionOf } from './naver-pipeline.mjs';

const OUT = path.join(ROOT, 'docs', 'ops', 'next-wave.json');
const SEEDS = path.join(ROOT, 'docs', 'ops', 'next-wave-seeds.json');
const QUEUE = path.join(ROOT, 'docs', 'ops', 'pipeline-queue.json');
const CALENDAR = path.join(ROOT, 'docs', 'ops', 'landgrab-calendar.json');
const ARTICLES = path.join(ROOT, 'src', 'content', 'articles');

const DAY = 864e5;
const dayKst = (offset = 0) => kstDate(new Date(Date.now() + offset * DAY));
const TODAY = dayKst(0);
export const BENCHMARK = '실업급여';
export const WINDOW_DAYS = 56;
const NEWS_QUERIES = [
  '연말정산', '종합소득세', '세액공제', '건강보험료', '국민연금', '실업급여', '주택담보대출',
  '전세대출', '청약통장', '적금 출시', '장려금 신청', '보험료 인상', '자동차세', '환급 신청',
];
const NEWS_PAGES = 2;
const MIN_MENTIONS = 3;
const MAX_DYNAMIC = 12;
const MAX_FAMILIES = 44; // 트렌드 요청 11회(요청당 4묶음 + 기준어)

// 제도·상품 이름의 꼬리. 이 꼬리로 끝나는 낱말만 묶음 후보로 본다.
const POLICY_TAIL = /(세액공제|소득공제|공제|소득세|종소세|부가세|부가가치세|양도세|양도소득세|증여세|상속세|재산세|종부세|종합부동산세|자동차세|취득세|지방세|대출|보험료|보험|연금|계좌|적금|예금|통장|급여|수당|장려금|정산|환급금|환급|청약|감면|특례|상한제|월세|전세)$/;
// 꼬리만 있는 일반명사. 혼자선 묶음이 아니라 앞 낱말과 붙여 "주택담보 대출"처럼 만든다.
const GENERIC = new Set(['공제', '세액공제', '소득공제', '대출', '보험료', '보험', '연금', '계좌', '적금', '예금', '통장', '급여', '수당', '장려금', '정산', '환급금', '환급', '청약', '감면', '특례', '월세', '전세', '세금', '지방세']);
const WEAK_PREFIX = new Set(['및', '등', '첫', '새', '더', '또', '총', '각', '전', '본', '이번', '올해', '내년', '지난해', '최대', '최소', '추가', '신청', '지급', '관련', '위한', '대상', '모든', '전국', '정부', '정책', '신규', '기존', '평균', '월', '연', '역대', '사상', '이상', '이하', '반영한', '사설', '마른', '찾아간', '체납', '외국인', '호우피해', '로또', '부정', '고분양가', '생산', '보조금', '취업연계']);
// 독자가 찾는 제도 이름이 아닌 기사 말(2026-10-07 첫 실행에서 본 잡음)
const NOISE_WORD = new Set(['부정청약', '병역특례', '시럽급여', '후정산', '비급여', '국민건강보험', '건강보험', '고용보험', '사학연금', '군인연금', '공무원연금']);
// 시장·통계 기사 말(독자가 검색하는 제도 이름이 아니다)
const NOISE = /^(가계|기업|정책|불법|부실|사기|은행|금융권|시중|주담대|가계부채|대출금리|예금금리|금리)\s?(대출|예금|보험|금리)?$/;
// 금융사 상품명은 제도가 아니다
const BRAND = /^(신한|우리|하나|농협|기업|카카오|케이뱅크|토스|씨티|새마을|우체국|수협|삼성|현대|롯데|한화|교보|미래에셋|키움|메리츠|흥국|동양|국민은행)/;
const AWOO_WORD = /지원금|바우처|상품권|쿠폰|지역화폐|반값|출산s?장려금|축하금|기본소득/;
const JOSA = /(으로|에서|까지|부터|이나|이란|에게|와|과|은|는|이|가|을|를|에|의|도|로|만)$/;
const APPLY_TYPE = /(장려금|수당|급여|계좌|적금|대출|연금|월세|청약|환급)$/;

const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const round1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const readJson = (p, fb = null) => { try { return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); } catch { return fb; } };

// ── 1) 뉴스 제목에서 묶음 이름 ───────────────────────────────────────────
const tokensOf = (title) => title.split(/[\s,.·…'"‘’“”[\]()<>!?:;~/|=+→▲▶■◆※-]+/).map((t) => t.trim()).filter(Boolean);

export function extractTerms(title) {
  const toks = tokensOf(title);
  const out = new Set();
  for (let i = 0; i < toks.length; i++) {
    let tok = toks[i];
    if (/[\dA-Za-z]/.test(tok)) continue; // 숫자·영문 섞인 낱말은 상품명·금액이 대부분
    if (!POLICY_TAIL.test(tok)) {
      const stripped = tok.replace(JOSA, '');
      if (stripped.length >= 2 && POLICY_TAIL.test(stripped)) tok = stripped; else continue;
    }
    if (GENERIC.has(tok)) {
      const prev = toks[i - 1]?.replace(JOSA, '');
      if (!prev || prev.length < 2 || prev.length > 6 || !/^[가-힣]+$/.test(prev) || WEAK_PREFIX.has(prev) || GENERIC.has(prev)) continue;
      tok = `${prev} ${tok}`;
    }
    if (tok.replace(/\s/g, '').length < 3 || tok.length > 14) continue;
    if (NOISE.test(tok) || NOISE_WORD.has(tok) || BRAND.test(tok) || AWOO_WORD.test(tok) || isSisterTopic(tok)) continue;
    // 지역이 붙은 말("제주시 지방세", "백수읍 지방세")은 지자체 기사다
    if (regionOf(tok) != null || /^[가-힣]{1,4}(시|군|구|읍|면|도)s/.test(tok)) continue;
    if (/운용|증권|은행|생명|화재|캐피탈/.test(tok)) continue;
    out.add(tok);
  }
  return out;
}

async function collectNews() {
  const seenTitles = new Set();
  const byKey = new Map();
  let calls = 0;
  for (const q of NEWS_QUERIES) {
    for (let p = 0; p < NEWS_PAGES; p++) {
      let items = [];
      try { calls++; items = (await naverSearch('news', q, { display: 100, start: 1 + p * 100, sort: 'date' })).items || []; }
      catch (e) { if (e instanceof NaverAuthError) throw e; console.error(`[next-wave] 뉴스 "${q}" 실패: ${e.message}`); }
      for (const it of items) {
        const title = stripTags(it.title);
        const tkey = norm(title);
        if (seenTitles.has(tkey)) continue;
        seenTitles.add(tkey);
        const day = it.pubDate ? kstDate(new Date(it.pubDate)) : TODAY;
        for (const t of extractTerms(title)) {
          const k = norm(t);
          const e = byKey.get(k) ?? { forms: new Map(), mentions: 0, days: {}, sample: [] };
          e.forms.set(t, (e.forms.get(t) ?? 0) + 1);
          e.mentions++;
          e.days[day] = (e.days[day] ?? 0) + 1;
          if (e.sample.length < 2) e.sample.push(title);
          byKey.set(k, e);
        }
      }
      await sleep(120);
    }
  }
  const terms = [...byKey.entries()].map(([key, e]) => ({ key, term: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0], mentions: e.mentions, days: e.days, sample: e.sample }));
  return { terms, titles: seenTitles.size, calls };
}

// ── 2) 검색어 트렌드 (묶음 4개 + 기준어 1개 = 요청당 5그룹 상한) ────────────────
async function trendRequest(body) {
  const c = naverClient();
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(c.base + c.trendPath, { method: 'POST', headers: { ...c.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 401 || r.status === 403) throw new NaverAuthError(`trend ${r.status} 인증 실패`);
      if (r.ok) return await r.json();
      console.error(`[next-wave] 트렌드 ${r.status}`);
    } catch (e) { if (e instanceof NaverAuthError) throw e; console.error(`[next-wave] 트렌드 실패: ${e.message}`); }
    await sleep(800 * (i + 1));
  }
  return null;
}

export function dateAxis(start, end) {
  const out = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

async function trendBatch(families, start, end, days) {
  const j = await trendRequest({
    startDate: start, endDate: end, timeUnit: 'date',
    keywordGroups: [{ groupName: '__anchor__', keywords: [BENCHMARK] }, ...families.map((f) => ({ groupName: f.key, keywords: f.keywords.slice(0, 20) }))],
  });
  if (!j) return null;
  const out = {};
  for (const r of j.results || []) { const m = new Map((r.data || []).map((d) => [d.period, Number(d.ratio) || 0])); out[r.title] = days.map((d) => m.get(d) ?? 0); }
  return out;
}

// 기준어 최근 28일 평균 = 100. growth 는 직전 3주(−28~−8일)가 거의 0 이면 null(새로 잡힘).
export function measureSeries(series, anchor) {
  const scale = mean(anchor.slice(-28)) || 1;
  const v = series.map((x) => (x / scale) * 100);
  const now7 = mean(v.slice(-7));
  const base21 = mean(v.slice(-28, -7));
  const weekly = [];
  for (let w = 0; w < Math.floor(v.length / 7); w++) weekly.push(round1(mean(v.slice(w * 7, w * 7 + 7))));
  return { level: round1(now7), base: round1(base21), growth: base21 > 0.05 ? round1(now7 / base21) : null, fromZero: base21 <= 0.05 && now7 > 0.5, weekly };
}

export function lastYearWindow(today = TODAY) {
  const [y, m] = today.split('-').map(Number);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    start: fmt(new Date(Date.UTC(y - 1, m - 1, 1))),
    end: fmt(new Date(Date.UTC(y - 1, m + 2, 0))),
    months: [0, 1, 2].map((k) => fmt(new Date(Date.UTC(y - 1, m - 1 + k, 1)))),
  };
}

async function seasonBatch(families, win) {
  const j = await trendRequest({
    startDate: win.start, endDate: win.end, timeUnit: 'month',
    keywordGroups: [{ groupName: '__anchor__', keywords: [BENCHMARK] }, ...families.map((f) => ({ groupName: f.key, keywords: f.keywords.slice(0, 20) }))],
  });
  if (!j) return null;
  const out = {};
  for (const r of j.results || []) { const m = new Map((r.data || []).map((d) => [d.period, Number(d.ratio) || 0])); out[r.title] = win.months.map((p) => m.get(p) ?? 0); }
  return out;
}

// [작년 이번 달, +1, +2] → { up: 한두 달 뒤 최고 배수, peakMonth, lastYear: 작년 이번 달 값(기준어 3개월 평균 = 100) }
export function seasonOf(v, anchor, win) {
  if (!v || !(v[0] > 0)) return null;
  const k = v[1] >= v[2] ? 1 : 2;
  const scale = mean(anchor ?? []) || 1;
  return { up: round1(v[k] / v[0]), peakMonth: Number(win.months[k].slice(5, 7)), lastYear: round1((v[0] / scale) * 100) };
}

export function stageOf(m, { isNew = false, season = null, curated = false, posts = 0 } = {}) {
  const g = m.growth ?? (m.fromZero ? Infinity : 1);
  if (g >= 1.4 && m.level >= 8) return 'rising';
  if (curated && season && season.up >= 1.5 && m.level * season.up >= 8 && g >= 0.6) return 'soon';
  if ((g >= 1.2 && m.level >= 2) || (isNew && g >= 1 && m.level >= 1)) return 'growing';
  if (g <= 0.6 && m.base >= 10) return 'fading';
  if (curated && posts <= 2 && m.level >= 30) return 'thin';
  return 'steady';
}

// ── 3) 우리 글·대기열·달력 대조 ───────────────────────────────────────────
export function loadPosts() {
  const out = [];
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith('.mdx')) continue;
    const m = parseArticleMeta(readFileSync(path.join(ARTICLES, f), 'utf8'));
    if (!m) continue;
    const date = [m.updatedAt, m.publishedAt].filter(Boolean).sort().pop() ?? null;
    out.push({ slug: f.replace(/\.mdx$/, ''), cluster: m.cluster ?? null, date, hay: norm([m.title, m.targetQuery, ...(m.keywords || [])].join(' ')) });
  }
  return out;
}

const matchKeys = (fam) => [...new Set([fam.term, ...(fam.match || [])].map(norm).filter(Boolean))];

async function main() {
  const args = process.argv.slice(2);
  const DRY = args.includes('--dry-run');
  const prev = readJson(OUT, null);
  if (args.includes('--if-stale') && prev?.meta?.measuredAt === TODAY) { console.log(`[next-wave] 오늘(${TODAY}) 결과가 이미 있다. 건너뜀`); return; }
  const seedsFile = readJson(SEEDS, { seeds: [], ignore: [] });
  const ignore = new Set((seedsFile.ignore || []).map(norm));

  const news = await collectNews();
  if (args.includes('--terms')) {
    for (const t of news.terms.sort((a, b) => b.mentions - a.mentions).slice(0, 60)) console.log(`${t.mentions}\t${t.term}\t${t.sample[0] ?? ''}`);
    console.log(`기사 제목 ${news.titles}건 · 뉴스 호출 ${news.calls}회`);
    return;
  }
  const bootstrap = !prev?.seen;
  const seen = prev?.seen ?? {};
  for (const t of news.terms) {
    const s = seen[t.key] ?? { term: t.term, firstSeen: bootstrap ? dayKst(-30) : TODAY, daily: {} };
    for (const [d, n] of Object.entries(t.days)) s.daily[d] = Math.max(s.daily[d] ?? 0, n);
    seen[t.key] = s;
  }
  const cutoff = dayKst(-30);
  for (const [k, s] of Object.entries(seen)) {
    for (const d of Object.keys(s.daily)) if (d < cutoff) delete s.daily[d];
    if (!Object.keys(s.daily).length && s.firstSeen < cutoff) delete seen[k];
  }

  const fam = new Map();
  const addFam = (term, source, extra = {}) => {
    const key = norm(term);
    if (!key || ignore.has(key) || isSisterTopic(term)) return;
    const cur = fam.get(key);
    if (cur) { cur.sources.add(source); return; }
    fam.set(key, { key, term, sources: new Set([source]), ...extra });
  };
  for (const s of seedsFile.seeds || []) addFam(s.term, '감시 목록', { cluster: s.cluster ?? null, match: s.match ?? [] });
  // 감시 목록의 다른 이름(match)과 같은 뉴스 낱말은 따로 재지 않는다("부가세" = "부가세 신고" 묶음)
  const seedKeys = new Set((seedsFile.seeds || []).flatMap((s) => [s.term, ...(s.match || [])]).map(norm));
  const dynamic = news.terms.filter((t) => t.mentions >= MIN_MENTIONS && !ignore.has(t.key) && !seedKeys.has(t.key)).sort((a, b) => b.mentions - a.mentions).slice(0, MAX_DYNAMIC);
  for (const t of dynamic) addFam(t.term, '뉴스');
  const newsByKey = new Map(news.terms.map((t) => [t.key, t]));
  const families = [...fam.values()].slice(0, MAX_FAMILIES).map((f) => ({
    ...f,
    news: newsByKey.get(f.key) ?? null,
    keywords: [...new Set([f.term, f.term.replace(/\s+/g, ''), ...(APPLY_TYPE.test(f.term) ? [`${f.term} 신청`] : [])])],
  }));

  const end = dayKst(-1); // 오늘 값은 덜 찼다
  const start = dayKst(-WINDOW_DAYS);
  const days = dateAxis(start, end);
  let trendCalls = 0;
  const results = [];
  for (let i = 0; i < families.length; i += 4) {
    const batch = families.slice(i, i + 4);
    trendCalls++;
    const r = await trendBatch(batch, start, end, days);
    if (!r?.__anchor__) continue;
    for (const f of batch) if (r[f.key]) results.push({ f, m: measureSeries(r[f.key], r.__anchor__) });
    await sleep(200);
  }
  const win = lastYearWindow();
  const seasonal = new Map();
  const forSeason = results.filter((x) => x.m.level >= 2).map((x) => x.f);
  for (let i = 0; i < forSeason.length; i += 4) {
    trendCalls++;
    const r = await seasonBatch(forSeason.slice(i, i + 4), win);
    if (r?.__anchor__) for (const [k, v] of Object.entries(r)) if (k !== '__anchor__') seasonal.set(k, seasonOf(v, r.__anchor__, win));
    await sleep(200);
  }

  const posts = loadPosts();
  const queue = readJson(QUEUE, { items: [] });
  const cal = readJson(CALENDAR, { items: [] });
  const items = results.map(({ f, m }) => {
    const keys = matchKeys(f);
    const mine = posts.filter((p) => keys.some((k) => p.hay.includes(k)));
    const clusterCount = new Map();
    for (const p of mine) if (p.cluster) clusterCount.set(p.cluster, (clusterCount.get(p.cluster) ?? 0) + 1);
    const cluster = f.cluster ?? ([...clusterCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
    const queued = (queue.items || []).filter((q) => ['proposed', 'approved'].includes(q.status) && keys.some((k) => norm(q.query).includes(k))).length;
    const calHit = (cal.items || []).filter((c) => c.peakDate >= TODAY && keys.some((k) => norm(c.query).includes(k))).sort((a, b) => (a.peakDate < b.peakDate ? -1 : 1))[0] ?? null;
    let season = seasonal.get(f.key) ?? null;
    if (season && season.lastYear < m.level * 0.5) season = null; // 작년엔 없던(또는 뜻이 다른) 이름
    const s = seen[f.key];
    const isNew = !bootstrap && Boolean(s && s.firstSeen >= dayKst(-3) && (f.news?.mentions ?? 0) >= MIN_MENTIONS);
    const curated = f.sources.has('감시 목록');
    const stage = stageOf(m, { isNew, season, curated, posts: mine.length });
    const lift = stage === 'soon' ? season.up : Math.min(Math.max(m.growth ?? (m.fromZero ? 4 : 1), 0.1), 4);
    const score = round1(m.level * lift * (mine.length ? 1 : 1.3));
    return {
      term: f.term, stage, score, level: m.level, base: m.base, growth: m.growth, fromZero: m.fromZero, weekly: m.weekly,
      season, mentions: f.news?.mentions ?? 0, firstSeen: s?.firstSeen ?? null, isNew,
      posts: mine.length, lastPost: mine.map((p) => p.date).filter(Boolean).sort().pop() ?? null, cluster,
      queued, calendar: calHit ? { event: calHit.event, peakDate: calHit.peakDate } : null,
      sources: [...f.sources], keywords: f.keywords, sample: f.news?.sample ?? [],
    };
  });
  const order = { rising: 0, soon: 1, growing: 2, thin: 3, steady: 4, fading: 5 };
  items.sort((a, b) => order[a.stage] - order[b.stage] || (b.score ?? 0) - (a.score ?? 0));

  const out = {
    _readme: [
      '다음에 크게 뜰 주제(묶음 단위). scripts/audit/next-wave.mjs 가 만들고 scripts/audit/ops-widget.mjs 가 읽는다. 공식 네이버 API(뉴스 검색·검색어 트렌드)만 쓴다.',
      'level·base = 기준어 실업급여 최근 28일 평균을 100 으로 둔 검색량(level 최근 7일 평균, base 직전 3주 평균). growth = level÷base(직전 3주가 거의 0 이면 null, fromZero=true). weekly = 56일을 7일씩 자른 평균.',
      'season = 작년 이번 달 대비 다음 두 달 최고 배수(up)와 그 달(peakMonth), 작년 이번 달 값(lastYear, 같은 요청 기준어 3개월 평균 = 100). 작년 값이 지금의 절반도 안 되면 null.',
      'stage 정의: rising 1.4배↑·크기 8↑ / soon 감시 목록·작년 한두 달 뒤 1.5배↑·지금 0.6배↑ / growing 1.2배↑·크기 2↑ 또는 뉴스 첫 관측 3일 이내 / fading 0.6배↓·직전 3주 10↑ / thin 감시 목록·크기 30↑·우리 글 2개↓ / steady 그 밖.',
      'score 는 정렬용(크기×배수×우리 글 0개면 1.3)이고 전망이 아니다. posts·lastPost = 제목·targetQuery·keywords 에 이름(또는 seeds 의 match)이 든 우리 글 수와 마지막 발행·갱신일. calendar = docs/ops/landgrab-calendar.json 의 가장 이른 기준일.',
      'seen = 뉴스 제목 첫 관측일·일별 제목 수(30일 보존). 자매 awoo 주제와 지원금·바우처·상품권·쿠폰은 뽑지 않는다.',
    ],
    meta: { measuredAt: TODAY, anchor: `${BENCHMARK} 최근 28일 평균 = 100`, window: { start, end, days: WINDOW_DAYS }, lastYear: win, calls: { news: news.calls, trend: trendCalls }, families: families.length, measured: results.length, newsTitles: news.titles },
    items,
    seen,
  };
  const label = { rising: '지금 뜨는 중', soon: '곧 뜸', growing: '커지는 중', thin: '큰데 우리 글 적음', steady: '', fading: '꺾이는 중' };
  for (const it of items.filter((x) => x.stage !== 'steady').slice(0, 20)) {
    console.log(`${(label[it.stage] || '').padEnd(10)} ${String(it.level).padStart(6)}  ${it.growth == null ? (it.fromZero ? '새로' : '-') : it.growth + '배'}  글 ${it.posts}  ${it.term}${it.season ? `  (작년 ${it.season.peakMonth}월 ${it.season.up}배)` : ''}`);
  }
  console.log(`묶음 ${families.length}개 중 측정 ${results.length}개 · 뉴스 호출 ${news.calls}회 · 트렌드 호출 ${trendCalls}회`);
  if (!results.length) { console.error('❌ 측정된 묶음이 0개다(트렌드 API 실패). 파일을 쓰지 않는다.'); process.exit(1); }
  if (!DRY) { writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); console.log(`저장: ${path.relative(ROOT, OUT)}`); }
}

if (isMain(import.meta.url)) {
  main().catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
}
