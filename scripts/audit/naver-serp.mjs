#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// naver-serp.mjs — 네이버 상위 노출 문서 역설계 (NAVER API HUB 검색 API, LLM 0)
// 목표 키워드마다 웹문서 상위 10·블로그 상위 10·지식iN 상위 5 를 받아
//   · 제목 길이·수치/연도 포함률·질문형 비율, 설명 길이, 도메인 유형(go.kr / 언론 / 블로그 / 기타), 우리 순위
//   · 지식iN 질문 제목(H2·FAQ 소재)
// 를 키워드별·전체 통계로 남긴다. /topics·content-strategist 가 제목·설명·소제목 설계에 쓴다.
//
// 인증: naver-demand.mjs 와 동일 (.env.local, HUB 키 우선). 실행: node scripts/audit/naver-serp.mjs [--keywords <txt|json>] [--from-demand] [--limit N]
//   --from-demand : 최신 docs/revenue-log/naver-demand-*.json 에서 gap=1 상위 + 달력 유래 키워드 자동 선택 (기본)
// 출력: 콘솔 통계 + docs/revenue-log/naver-serp-YYYY-MM-DD.json
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const KW_FILE = opt('--keywords', null);
const LIMIT = Number(opt('--limit', 30)) || 30;

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
  ? { base: 'https://naverapihub.apigw.ntruss.com', search: (ep) => `/search/v1/${ep}`, headers: { 'X-NCP-APIGW-API-KEY-ID': HUB_ID, 'X-NCP-APIGW-API-KEY': HUB_SECRET } }
  : { base: 'https://openapi.naver.com', search: (ep) => `/v1/search/${ep}.json`, headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(ep, query, params) {
  const u = new URL(API.base + API.search(ep));
  u.searchParams.set('query', query);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: API.headers });
  if (r.status === 429) { await sleep(1500); return search(ep, query, params); }
  if (!r.ok) throw new Error(`${ep} ${r.status}`);
  return r.json();
}
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
// 링크는 도메인+경로만 저장한다. 쿼리 문자열(예: go.kr 의 fileKey=긴토큰)은 분석에 불필요하고 시크릿 검사(gitleaks)가 API 키로 오인한다.
const cleanLink = (link) => { try { const u = new URL(link); return `${u.origin}${u.pathname}`.slice(0, 200); } catch { return (link || '').split('?')[0].slice(0, 200); } };
const domainType = (link) => {
  if (/asiatop\.co\.kr/.test(link)) return 'ours';
  if (/\.(go|or)\.kr/.test(link)) return 'official';
  if (/blog\.naver\.com|tistory\.com|brunch\.co\.kr|post\.naver\.com|cafe\.naver\.com|velog|medium\.com/.test(link)) return 'blog';
  if (/news|\.co\.kr\/(news|article)|hankyung|chosun|joongang|mk\.co\.kr|yna\.co\.kr|kbs|mbc|sbs|edaily|newsis|nate\.com|daum\.net\/v\//.test(link)) return 'news';
  return 'other';
};
const hasNumber = (t) => /\d/.test(t);
const hasYear = (t) => /20\d\d/.test(t);
const isQuestion = (t) => /\?|나요|까요|할까|인가|일까|어떻게|얼마|언제|무엇/.test(t);

function loadKeywords() {
  if (KW_FILE) {
    const raw = readFileSync(path.resolve(ROOT, KW_FILE), 'utf8');
    if (KW_FILE.endsWith('.json')) return JSON.parse(raw).map((x) => (typeof x === 'string' ? x : x.keyword)).filter(Boolean).slice(0, LIMIT);
    return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, LIMIT);
  }
  const files = readdirSync(LOG_DIR).filter((f) => /^naver-demand-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) { console.error('❌ naver-demand-*.json 없음 — pnpm audit:naver 먼저'); process.exit(1); }
  const d = JSON.parse(readFileSync(path.join(LOG_DIR, files[files.length - 1]), 'utf8'));
  const rows = d.rows.filter((r) => !r.error);
  const gaps = rows.filter((r) => r.gap).sort((a, b) => (b.trendRatio || 0) - (a.trendRatio || 0) || b.demand - a.demand);
  const ours = rows.filter((r) => r.ourRank);
  const pick = [...ours, ...gaps].map((r) => r.keyword);
  return [...new Set(pick)].slice(0, LIMIT);
}

const keywords = loadKeywords();
const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
console.log(`네이버 SERP 역설계: ${keywords.length} 키워드, ${kst} KST, API = ${HUB ? 'NAVER API HUB' : '개발자센터'}\n`);
const results = [];
for (const kw of keywords) {
  try {
    const [web, blog, kin] = await Promise.all([
      search('webkr', kw, { display: 10 }),
      search('blog', kw, { display: 10, sort: 'sim' }),
      search('kin', kw, { display: 5, sort: 'sim' }),
    ]);
    const webDocs = (web.items || []).map((i, idx) => ({ rank: idx + 1, title: strip(i.title), desc: strip(i.description), link: cleanLink(i.link), type: domainType(i.link || '') }));
    const blogDocs = (blog.items || []).map((i, idx) => ({ rank: idx + 1, title: strip(i.title), desc: strip(i.description), blogger: i.bloggername, date: i.postdate }));
    const kinQs = (kin.items || []).map((i) => strip(i.title));
    results.push({ keyword: kw, web: webDocs, blog: blogDocs, kin: kinQs, ourRank: (webDocs.find((d) => d.type === 'ours') || {}).rank || 0 });
    process.stdout.write('.');
  } catch (e) { results.push({ keyword: kw, error: e.message }); process.stdout.write('x'); }
  await sleep(150);
}
console.log('\n');

// ── 통계 ────────────────────────────────────────────────────────────────
const ok = results.filter((r) => !r.error);
const webAll = ok.flatMap((r) => r.web);
const blogAll = ok.flatMap((r) => r.blog);
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const avg = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : 0);
const stat = (docs) => ({
  n: docs.length,
  titleLenAvg: avg(docs.map((d) => d.title.length)),
  titleNumberPct: pct(docs.filter((d) => hasNumber(d.title)).length, docs.length),
  titleYearPct: pct(docs.filter((d) => hasYear(d.title)).length, docs.length),
  titleQuestionPct: pct(docs.filter((d) => isQuestion(d.title)).length, docs.length),
  descLenAvg: avg(docs.map((d) => d.desc.length)),
});
const webTop3 = webAll.filter((d) => d.rank <= 3);
const typeShare = (docs) => Object.fromEntries(['official', 'news', 'blog', 'ours', 'other'].map((t) => [t, pct(docs.filter((d) => d.type === t).length, docs.length)]));
const summary = {
  keywords: ok.length, ourTop10: ok.filter((r) => r.ourRank).length,
  web: { all: stat(webAll), top3: stat(webTop3), typeShareAll: typeShare(webAll), typeShareTop3: typeShare(webTop3) },
  blog: stat(blogAll),
};
writeFileSync(path.join(LOG_DIR, `naver-serp-${kst}.json`), JSON.stringify({ pulledAt: new Date().toISOString(), kstDate: kst, api: HUB ? 'NAVER API HUB' : '개발자센터', summary, results }, null, 1));

console.log('=== 웹문서 상위 10 (전체 / 상위 3) ===');
console.log(' 제목 길이 평균', summary.web.all.titleLenAvg, '/', summary.web.top3.titleLenAvg, '자');
console.log(' 제목에 숫자', summary.web.all.titleNumberPct, '% /', summary.web.top3.titleNumberPct, '%  | 연도', summary.web.all.titleYearPct, '% /', summary.web.top3.titleYearPct, '%  | 질문형', summary.web.all.titleQuestionPct, '% /', summary.web.top3.titleQuestionPct, '%');
console.log(' 설명 길이 평균', summary.web.all.descLenAvg, '/', summary.web.top3.descLenAvg, '자');
console.log(' 도메인 유형(전체)', JSON.stringify(summary.web.typeShareAll), ' (상위3)', JSON.stringify(summary.web.typeShareTop3));
console.log('=== 블로그 상위 10 ===', JSON.stringify(summary.blog));
console.log(`\n우리 글 10위 내: ${summary.ourTop10}/${ok.length} 키워드`);
for (const r of ok) {
  const top = r.web.slice(0, 3).map((d) => `[${d.type}] ${d.title.slice(0, 40)}`).join(' | ');
  console.log(`- ${r.keyword}${r.ourRank ? ` (우리 ${r.ourRank}위)` : ''}: ${top}`);
  if (r.kin.length) console.log(`    지식iN: ${r.kin.slice(0, 3).map((q) => q.slice(0, 30)).join(' / ')}`);
}
console.log(`\n→ docs/revenue-log/naver-serp-${kst}.json`);
