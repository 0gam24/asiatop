#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// revenue-pull.mjs — AdSense·Search Console 현황 API 수집 (LLM 0, 브라우저 0)
// docs/23-adsense-revenue-ops.md §6-3. Node 22+, 외부 의존성 0 (fetch 내장).
//
// 1회 셋업 (운영자, ~10분):
//   1) console.cloud.google.com → 새 프로젝트 (이름 예: moneylook-revenue)
//   2) "API 및 서비스 → 라이브러리" 에서 활성화:
//        - AdSense Management API
//        - Google Search Console API
//   3) "OAuth 동의 화면": User Type 외부 → 테스트 사용자에 본인 Gmail 추가
//      (앱 게시 불필요 — 테스트 모드로 충분)
//   4) "사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID"
//      애플리케이션 유형: 데스크톱 앱
//   5) 발급된 ID/Secret 을 .env.local 에 기입:
//        REVENUE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
//        REVENUE_OAUTH_CLIENT_SECRET=GOCSPX-...
//   6) node scripts/audit/revenue-pull.mjs auth   ← 브라우저 동의 1회
//      (.revenue-auth.json 저장 — .gitignore 처리됨, 커밋 금지)
//
// 이후 조회 (무인):
//   node scripts/audit/revenue-pull.mjs
//   → 콘솔 요약 + docs/revenue-log/pull-YYYY-MM-DD.json 저장
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AUTH_FILE = path.join(ROOT, '.revenue-auth.json');
const LOG_DIR = path.join(ROOT, 'docs', 'revenue-log');
const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/cb`;
const SCOPES = [
  'https://www.googleapis.com/auth/adsense.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');
const SITE_DOMAIN = 'asiatop.co.kr';

// ── env ──────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };
const CLIENT_ID = env.REVENUE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = env.REVENUE_OAUTH_CLIENT_SECRET;

function die(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

// ── OAuth ────────────────────────────────────────────────────────────────
async function authFlow() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    die('.env.local 에 REVENUE_OAUTH_CLIENT_ID / REVENUE_OAUTH_CLIENT_SECRET 이 없습니다. 파일 상단 셋업 가이드 참조.');
  }
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });

  console.log('\n아래 URL 을 브라우저에서 열어 Google 계정으로 동의해 주세요:\n');
  console.log(authUrl + '\n');

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (u.pathname !== '/cb') { res.writeHead(404).end(); return; }
      const c = u.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(c ? '<h2>인증 완료 — 터미널로 돌아가세요.</h2>' : '<h2>인증 실패</h2>');
      server.close();
      c ? resolve(c) : reject(new Error(u.searchParams.get('error') || 'no code'));
    });
    server.listen(PORT, '127.0.0.1');
    setTimeout(() => { server.close(); reject(new Error('5분 타임아웃')); }, 300_000);
  });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const tok = await r.json();
  if (!tok.refresh_token) die(`refresh_token 발급 실패: ${JSON.stringify(tok)}`);
  writeFileSync(AUTH_FILE, JSON.stringify({ refresh_token: tok.refresh_token }, null, 2));
  console.log(`✅ 인증 저장: ${AUTH_FILE} (gitignore 처리됨)\n이제 인자 없이 실행하면 조회됩니다.`);
}

async function getAccessToken() {
  if (!existsSync(AUTH_FILE)) {
    die('인증 파일이 없습니다. 먼저: node scripts/audit/revenue-pull.mjs auth');
  }
  const { refresh_token } = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  const tok = await r.json();
  if (!tok.access_token) die(`access_token 갱신 실패: ${JSON.stringify(tok)}`);
  return tok.access_token;
}

// ── API helpers ──────────────────────────────────────────────────────────
async function gget(token, url) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}
async function gpost(token, url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function adsenseReport(token, account, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) for (const x of v) qs.append(k, x);
    else qs.set(k, v);
  }
  return gget(token, `https://adsense.googleapis.com/v2/${account}/reports:generate?${qs}`);
}

function reportRows(rep) {
  const headers = (rep.headers || []).map((h) => h.name);
  return (rep.rows || []).map((row) =>
    Object.fromEntries(row.cells.map((c, i) => [headers[i], c.value])),
  );
}

function fmtTable(rows) {
  if (!rows.length) return '  (데이터 없음)';
  const keys = Object.keys(rows[0]);
  return rows.map((r) => '  ' + keys.map((k) => `${k}=${r[k]}`).join('  ')).join('\n');
}

// ── main pull ────────────────────────────────────────────────────────────
async function pull() {
  const token = await getAccessToken();
  const out = { pulledAt: new Date().toISOString(), site: SITE_DOMAIN };

  // 1) AdSense 계정
  const accounts = await gget(token, 'https://adsense.googleapis.com/v2/accounts');
  const account = accounts.accounts?.[0]?.name;
  if (!account) die('AdSense 계정을 찾지 못했습니다 (스코프/계정 확인).');
  out.account = account;

  // 2) 정책 이슈 — §8-4 의 1순위
  try {
    const issues = await gget(token, `https://adsense.googleapis.com/v2/${account}/policyIssues`);
    out.policyIssues = issues.policyIssues || [];
  } catch (e) {
    out.policyIssues = `조회 실패: ${e.message.slice(0, 200)}`;
  }

  // 3) 최근 7일 일자별 (수익·PV·노출·클릭)
  try {
    const rep = await adsenseReport(token, account, {
      dateRange: 'LAST_7_DAYS',
      metrics: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS'],
      dimensions: ['DATE'],
    });
    out.last7days = reportRows(rep);
  } catch (e) { out.last7days = `조회 실패: ${e.message.slice(0, 200)}`; }

  // 4) 광고 단위별 (오늘 + 어제) — moneylook-* 수동 유닛 가동 확인용
  for (const range of ['TODAY', 'YESTERDAY']) {
    try {
      const rep = await adsenseReport(token, account, {
        dateRange: range,
        metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'ACTIVE_VIEW_VIEWABILITY', 'CLICKS'],
        dimensions: ['AD_UNIT_NAME'],
      });
      out[`adUnits_${range.toLowerCase()}`] = reportRows(rep);
    } catch (e) { out[`adUnits_${range.toLowerCase()}`] = `조회 실패: ${e.message.slice(0, 200)}`; }
  }

  // 5) 도메인별 (오늘) — asiatop vs calculatorhost 분리
  try {
    const rep = await adsenseReport(token, account, {
      dateRange: 'TODAY',
      metrics: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS'],
      dimensions: ['DOMAIN_NAME'],
    });
    out.domains_today = reportRows(rep);
  } catch (e) { out.domains_today = `조회 실패: ${e.message.slice(0, 200)}`; }

  // 6) GSC — 최근 7일(완결일 기준) 일자별 클릭/노출 + 상위 쿼리 10
  try {
    const sites = await gget(token, 'https://www.googleapis.com/webmasters/v3/sites');
    const entry = (sites.siteEntry || []).find((s) => s.siteUrl.includes(SITE_DOMAIN));
    if (!entry) throw new Error(`GSC 속성에 ${SITE_DOMAIN} 없음`);
    out.gscProperty = entry.siteUrl;
    const enc = encodeURIComponent(entry.siteUrl);
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() - 2);   // GSC 집계 지연 ~2일
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const iso = (d) => d.toISOString().slice(0, 10);
    out.gscRange = { start: iso(start), end: iso(end) };
    const daily = await gpost(token, `https://www.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`, {
      startDate: iso(start), endDate: iso(end), dimensions: ['date'],
    });
    out.gscDaily = (daily.rows || []).map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
    const queries = await gpost(token, `https://www.googleapis.com/webmasters/v3/sites/${enc}/searchAnalytics/query`, {
      startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 10,
    });
    out.gscTopQueries = (queries.rows || []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions }));
  } catch (e) { out.gsc = `조회 실패: ${e.message.slice(0, 200)}`; }

  // ── 출력 ──
  console.log('\n════════ AdSense·GSC 현황 ════════');
  const issueCount = Array.isArray(out.policyIssues) ? out.policyIssues.length : -1;
  console.log(`\n[1] 정책 이슈: ${issueCount === 0 ? '✅ 0건' : issueCount > 0 ? `🚨 ${issueCount}건 — 즉시 확인!` : out.policyIssues}`);
  console.log('\n[2] 최근 7일 (일자별):');
  console.log(Array.isArray(out.last7days) ? fmtTable(out.last7days) : '  ' + out.last7days);
  console.log('\n[3] 광고 단위별 — 오늘:');
  console.log(Array.isArray(out.adUnits_today) ? fmtTable(out.adUnits_today) : '  ' + out.adUnits_today);
  console.log('\n    광고 단위별 — 어제:');
  console.log(Array.isArray(out.adUnits_yesterday) ? fmtTable(out.adUnits_yesterday) : '  ' + out.adUnits_yesterday);
  console.log('\n[4] 도메인별 — 오늘:');
  console.log(Array.isArray(out.domains_today) ? fmtTable(out.domains_today) : '  ' + out.domains_today);
  if (out.gscDaily) {
    console.log(`\n[5] GSC ${out.gscRange.start}~${out.gscRange.end} (일자별):`);
    console.log(fmtTable(out.gscDaily));
    console.log('\n    상위 쿼리 10:');
    console.log(fmtTable(out.gscTopQueries));
  } else {
    console.log(`\n[5] GSC: ${out.gsc}`);
  }

  // ── 로그 저장 ──
  mkdirSync(LOG_DIR, { recursive: true });
  const kst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const logPath = path.join(LOG_DIR, `pull-${kst}.json`);
  writeFileSync(logPath, JSON.stringify(out, null, 2));
  console.log(`\n💾 저장: ${path.relative(ROOT, logPath)}`);
}

// ── entry ────────────────────────────────────────────────────────────────
const cmd = process.argv[2];
if (cmd === 'auth') await authFlow();
else await pull();
