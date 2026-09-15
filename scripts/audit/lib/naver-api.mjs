// ════════════════════════════════════════════════════════════════════════
// naver-api.mjs — 네이버 공식 API 공용 클라이언트 (NAVER API HUB 우선, 개발자센터 폴백)
//
// 쓰는 곳: naver-scout.mjs · naver-volume.mjs (docs/ops/KEYWORD-PLAN-2026-09-15.md §4)
// 자격증명: .env.local 또는 환경변수(GitHub Actions 시크릿). 값은 헤더에만 싣고 절대 출력하지 않는다.
//   HUB     X_NCP_APIGW_API_KEY_ID / X_NCP_APIGW_API_KEY  (콘솔 Application key 패널 이름을 밑줄로)
//   개발자센터 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET       (2027-06-30 종료, 검색어 트렌드는 401)
//
// search.naver.com(통합검색 페이지)은 robots `Disallow: /` 라 여기서 받지 않는다. 공식 API 만 쓴다.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export class NaverAuthError extends Error {}

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"|"$/g, '').trim();
  }
  return out;
}

let cached = null;
export function naverClient() {
  if (cached) return cached;
  const env = { ...loadEnvLocal(), ...process.env };
  const id = env.X_NCP_APIGW_API_KEY_ID || env.NCP_APIGW_API_KEY_ID || env.NAVER_APIHUB_CLIENT_ID;
  const secret = env.X_NCP_APIGW_API_KEY || env.NCP_APIGW_API_KEY || env.NAVER_APIHUB_CLIENT_SECRET;
  if (id && secret) {
    cached = {
      label: 'NAVER API HUB',
      base: 'https://naverapihub.apigw.ntruss.com',
      searchPath: (ep) => `/search/v1/${ep}`,
      trendPath: env.NAVER_APIHUB_TREND_PATH || '/search-trend/v1/search', // 2026-09-07 실키 확인 (/datalab/v1/search 는 HUB 404)
      headers: { 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret },
    };
  } else if (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
    cached = {
      label: '개발자센터',
      base: 'https://openapi.naver.com',
      searchPath: (ep) => `/v1/search/${ep}.json`,
      trendPath: '/v1/datalab/search',
      headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET },
    };
  } else {
    throw new NaverAuthError('네이버 API 자격증명 없음: X_NCP_APIGW_API_KEY_ID / X_NCP_APIGW_API_KEY 를 .env.local 또는 환경변수로 넣어라');
  }
  return cached;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 401·403 은 즉시 NaverAuthError(재시도해도 소용없다). 429·5xx·네트워크 오류는 3회까지 물러났다 다시.
async function request(url, init, label) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, init);
      if (r.status === 401 || r.status === 403) {
        const body = (await r.text()).slice(0, 120);
        throw new NaverAuthError(`${label} ${r.status} 인증 실패 — 키 값이 서로 바뀌었거나 해당 API 권한이 없다: ${body}`);
      }
      if (r.status === 429 || r.status >= 500) { lastErr = new Error(`${label} ${r.status}`); await sleep(1200 * (attempt + 1)); continue; }
      if (!r.ok) throw new Error(`${label} ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return await r.json();
    } catch (e) {
      if (e instanceof NaverAuthError) throw e;
      lastErr = e;
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function naverSearch(ep, query, params = {}) {
  const c = naverClient();
  const u = new URL(c.base + c.searchPath(ep));
  u.searchParams.set('query', query);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return request(u, { headers: c.headers }, ep);
}

// 검색어 트렌드: keywordGroups 최대 5개. 응답 ratio 는 이 호출 안에서의 상댓값(최고 = 100)이다.
export async function naverTrend({ startDate, endDate, timeUnit = 'date', groups }) {
  const c = naverClient();
  const body = JSON.stringify({ startDate, endDate, timeUnit, keywordGroups: groups.map((k) => ({ groupName: k, keywords: [k] })) });
  return request(c.base + c.trendPath, { method: 'POST', headers: { ...c.headers, 'Content-Type': 'application/json' }, body }, 'trend');
}

export const stripTags = (s) =>
  (s || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();

// 링크는 origin+path 만 남긴다. go.kr 의 fileKey= 같은 긴 쿼리 토큰을 gitleaks 가 키로 오인한다(2026-09-07 PR #431).
export const cleanLink = (link) => {
  try { const u = new URL(link); return `${u.origin}${u.pathname}`.slice(0, 200); } catch { return (link || '').split('?')[0].slice(0, 200); }
};

export const kstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

// node 로 직접 실행됐는지 (윈도 경로 대소문자·구분자 차이를 흡수)
export const isMain = (metaUrl) => {
  if (!process.argv[1]) return false;
  const a = path.resolve(fileURLToPath(metaUrl)).toLowerCase();
  const b = path.resolve(process.argv[1]).toLowerCase();
  return a === b;
};
