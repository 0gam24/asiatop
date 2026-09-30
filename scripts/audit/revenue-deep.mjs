#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// revenue-deep.mjs — AdSense 심층 리포트: 클릭 품질(CTR·CPC)·포맷·플랫폼·타깃팅 (읽기 전용, LLM 0)
//
// 왜 필요한가 (2026-09-30 실측): revenue-pull 의 합계만 보면 "PV 가 적어서 수익이 적다" 로 읽히지만,
// 포맷별로 쪼개면 asiatop 모바일 인아티클이 클릭의 90% 를 내면서 CPC $0.012 (자매 사이트 $0.16) 였다.
// 우발 클릭이 CPC 를 깎고, 방치하면 Confirmed Click·정책 경고로 같은 계정의 다른 사이트 수익까지 위험하다.
//
// 인증: revenue-pull.mjs 와 같은 .revenue-auth.json (먼저 `node scripts/audit/revenue-pull.mjs auth`).
// 실행: node scripts/audit/revenue-deep.mjs [--site asiatop.co.kr] [--compare awoo.or.kr] [--quiet]
// 출력: docs/revenue-log/deep-YYYY-MM-DD.json + 콘솔 요약 (클릭 품질 경고 포함)
// 금지: 이 스크립트는 API 읽기만 한다. Auto ads 설정 변경은 대시보드에서만 가능하다.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AUTH_FILE = path.join(ROOT, '.revenue-auth.json');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SITE = opt('--site', 'asiatop.co.kr');
const COMPARE = opt('--compare', 'awoo.or.kr');
const QUIET = args.includes('--quiet');

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local'); const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };

async function getAccessToken() {
  if (!existsSync(AUTH_FILE)) { console.error('❌ .revenue-auth.json 없음 — 먼저 node scripts/audit/revenue-pull.mjs auth'); process.exit(1); }
  const { refresh_token } = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token, client_id: env.REVENUE_OAUTH_CLIENT_ID, client_secret: env.REVENUE_OAUTH_CLIENT_SECRET, grant_type: 'refresh_token' }),
  });
  const tok = await r.json();
  if (!tok.access_token) { console.error(`❌ access_token 갱신 실패: ${JSON.stringify(tok)}`); process.exit(1); }
  return tok.access_token;
}
async function gget(token, url) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}
async function report(token, account, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) { if (Array.isArray(v)) for (const x of v) qs.append(k, x); else qs.set(k, v); }
  const rep = await gget(token, `https://adsense.googleapis.com/v2/${account}/reports:generate?${qs}`);
  const h = (rep.headers || []).map((x) => x.name);
  return (rep.rows || []).map((row) => Object.fromEntries(row.cells.map((c, i) => [h[i], c.value])));
}
const num = (x) => Number(x || 0);
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '-');
const cpc = (e, c) => (c ? (e / c).toFixed(3) : '-');
const withRates = (rows) => rows.map((r) => ({ ...r, CTR: pct(num(r.CLICKS), num(r.IMPRESSIONS)), CPC: cpc(num(r.ESTIMATED_EARNINGS), num(r.CLICKS)) }));
const monthsAgo = (n) => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - n, 1); return d; };
const custom = (s, e) => ({ dateRange: 'CUSTOM', 'startDate.year': s.getUTCFullYear(), 'startDate.month': s.getUTCMonth() + 1, 'startDate.day': s.getUTCDate(), 'endDate.year': e.getUTCFullYear(), 'endDate.month': e.getUTCMonth() + 1, 'endDate.day': e.getUTCDate() });

const token = await getAccessToken();
const account = (await gget(token, 'https://adsense.googleapis.com/v2/accounts')).accounts[0].name;
const M = ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS'];
const F = ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS'];
const site = `DOMAIN_NAME==${SITE}`;
const out = { pulledAt: new Date().toISOString(), account, site: SITE, compare: COMPARE };

out.sites = ((await gget(token, `https://adsense.googleapis.com/v2/${account}/sites?pageSize=50`)).sites || []).map((s) => ({ domain: s.domain, state: s.state, autoAds: s.autoAdsEnabled }));
out.monthly_by_domain = await report(token, account, { ...custom(monthsAgo(5), new Date()), metrics: M, dimensions: ['MONTH', 'DOMAIN_NAME'], orderBy: '+MONTH' });
out.site_daily_30d = withRates(await report(token, account, { dateRange: 'LAST_30_DAYS', metrics: M, dimensions: ['DATE'], filters: [site], orderBy: '+DATE' }));
out.site_format_by_month = withRates(await report(token, account, { ...custom(monthsAgo(3), new Date()), metrics: F, dimensions: ['MONTH', 'AD_FORMAT_NAME'], filters: [site], orderBy: '+MONTH' }));
out.site_platform_format_30d = withRates(await report(token, account, { dateRange: 'LAST_30_DAYS', metrics: F, dimensions: ['PLATFORM_TYPE_NAME', 'AD_FORMAT_NAME'], filters: [site], orderBy: '-CLICKS' }));
out.site_targeting_30d = withRates(await report(token, account, { dateRange: 'LAST_30_DAYS', metrics: F, dimensions: ['TARGETING_TYPE_NAME'], filters: [site], orderBy: '-IMPRESSIONS' }));
out.site_country_30d = await report(token, account, { dateRange: 'LAST_30_DAYS', metrics: M, dimensions: ['COUNTRY_CODE'], filters: [site], orderBy: '-PAGE_VIEWS', limit: 5 });
out.compare_format_30d = COMPARE ? withRates(await report(token, account, { dateRange: 'LAST_30_DAYS', metrics: F, dimensions: ['AD_FORMAT_NAME'], filters: [`DOMAIN_NAME==${COMPARE}`], orderBy: '-ESTIMATED_EARNINGS' })) : [];

// ── 클릭 품질 판정 (경고만, 자동 조치 없음) ─────────────────────────────
const mobileInArticle = out.site_platform_format_30d.find((r) => /mobile/i.test(r.PLATFORM_TYPE_NAME) && r.AD_FORMAT_NAME === 'In-article');
const totals = out.site_daily_30d.reduce((a, r) => ({ e: a.e + num(r.ESTIMATED_EARNINGS), pv: a.pv + num(r.PAGE_VIEWS), imp: a.imp + num(r.IMPRESSIONS), c: a.c + num(r.CLICKS) }), { e: 0, pv: 0, imp: 0, c: 0 });
const warnings = [];
if (mobileInArticle) {
  const ctr = num(mobileInArticle.CLICKS) / Math.max(1, num(mobileInArticle.IMPRESSIONS));
  const c = num(mobileInArticle.ESTIMATED_EARNINGS) / Math.max(1, num(mobileInArticle.CLICKS));
  if (ctr > 0.02 && c < 0.05) warnings.push(`모바일 인아티클 CTR ${(ctr * 100).toFixed(1)}%·CPC $${c.toFixed(3)} — 우발 클릭 신호 (기준: CTR>2% 이고 CPC<$0.05). 광고 간격·라벨·링크 분리 점검, 대시보드 '페이지당 최대 광고 수·광고 간 최소 거리' 조정 검토`);
}
if (totals.c && totals.e / totals.c < 0.05) warnings.push(`사이트 평균 CPC $${(totals.e / totals.c).toFixed(3)} — 클릭 품질 낮음`);
out.summary = { days: out.site_daily_30d.length, earnings: totals.e.toFixed(2), pageViews: totals.pv, impressions: totals.imp, clicks: totals.c, pageRPM: totals.pv ? (1000 * totals.e / totals.pv).toFixed(2) : '-', ctr: pct(totals.c, totals.imp), cpc: cpc(totals.e, totals.c), impPerPV: totals.pv ? (totals.imp / totals.pv).toFixed(1) : '-', warnings };

const stamp = new Date().toISOString().slice(0, 10);
const outFile = path.join(LOG_DIR, `deep-${stamp}.json`);
writeFileSync(outFile, JSON.stringify(out, null, 2));

if (!QUIET) {
  console.log(`\n════════ AdSense 심층 (${SITE}, 최근 ${out.summary.days}일) ════════`);
  console.log(`수익 $${out.summary.earnings} · PV ${out.summary.pageViews} · 노출 ${out.summary.impressions} · 클릭 ${out.summary.clicks}`);
  console.log(`Page RPM $${out.summary.pageRPM} · CTR ${out.summary.ctr} · CPC $${out.summary.cpc} · 노출/PV ${out.summary.impPerPV}`);
  console.log('\n[포맷별 최근 월]'); console.table(out.site_format_by_month.filter((r) => r.MONTH === out.site_format_by_month.at(-1)?.MONTH).map(({ MONTH, ...r }) => r));
  console.log('\n[플랫폼 × 포맷 30일, 클릭 상위]'); console.table(out.site_platform_format_30d.slice(0, 8));
  if (out.compare_format_30d.length) { console.log(`\n[비교 ${COMPARE} 포맷 30일]`); console.table(out.compare_format_30d); }
  console.log('\n[타깃팅 30일]'); console.table(out.site_targeting_30d);
  if (warnings.length) { console.log('\n⚠️  클릭 품질 경고'); for (const w of warnings) console.log(' - ' + w); }
  else console.log('\n✅ 클릭 품질 경고 없음');
}
console.log(`\n💾 저장: ${outFile}`);
