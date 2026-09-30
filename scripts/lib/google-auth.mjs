// ════════════════════════════════════════════════════════════════════════
// google-auth.mjs: 구글 API 공용 인증 (refresh_token → access_token). 외부 의존성 0.
//
// revenue-pull.mjs 와 같은 방식이다. 같은 자격증명을 그대로 다시 쓴다.
//   .revenue-auth.json  { "refresh_token": "..." }   ← revenue-pull.mjs auth 로 1회 발급 (gitignore)
//   .env.local          REVENUE_OAUTH_CLIENT_ID / REVENUE_OAUTH_CLIENT_SECRET
//   환경변수가 있으면 .env.local 보다 먼저 쓴다.
//
// 비밀 값은 요청 본문에만 싣는다. 로그·오류 메시지·파일 어디에도 찍지 않는다.
// 쓰는 곳: scripts/audit/index-status.mjs (revenue-pull·gsc-opportunities 는 아직 자체 코드. 옮기는 건 별도 작업)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const AUTH_FILE_NAME = '.revenue-auth.json';
export const ENV_FILE_NAME = '.env.local';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export class GoogleAuthError extends Error {}

function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return out;
}

/**
 * 비밀 파일 두 개를 secretsDir 에서 읽는다. 값 자체는 돌려주되 절대 출력하지 않는다.
 * @param {string} secretsDir .revenue-auth.json 과 .env.local 이 있는 폴더
 */
export function loadGoogleCredentials(secretsDir) {
  const authFile = path.join(secretsDir, AUTH_FILE_NAME);
  const env = { ...readEnvFile(path.join(secretsDir, ENV_FILE_NAME)), ...process.env };
  const clientId = env.REVENUE_OAUTH_CLIENT_ID;
  const clientSecret = env.REVENUE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleAuthError(`${path.join(secretsDir, ENV_FILE_NAME)} 에 REVENUE_OAUTH_CLIENT_ID / REVENUE_OAUTH_CLIENT_SECRET 이 없다 (셋업: scripts/audit/revenue-pull.mjs 머리말)`);
  }
  if (!existsSync(authFile)) {
    throw new GoogleAuthError(`${authFile} 이 없다. 먼저: node scripts/audit/revenue-pull.mjs auth`);
  }
  let refreshToken;
  try { refreshToken = JSON.parse(readFileSync(authFile, 'utf8')).refresh_token; } catch { /* 아래에서 처리 */ }
  if (!refreshToken) throw new GoogleAuthError(`${authFile} 에 refresh_token 이 없다. 다시: node scripts/audit/revenue-pull.mjs auth`);
  return { clientId, clientSecret, refreshToken };
}

/**
 * access_token 을 새로 받는다. requiredScope 가 주어지면 토큰 범위에 들어 있는지 확인한다.
 * @param {{ secretsDir: string, requiredScope?: string }} opts
 * @returns {Promise<{ accessToken: string, scopes: string[] }>}
 */
export async function getGoogleAccessToken({ secretsDir, requiredScope } = {}) {
  const { clientId, clientSecret, refreshToken } = loadGoogleCredentials(secretsDir);
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
  });
  let tok = {};
  try { tok = await r.json(); } catch { /* 빈 응답 */ }
  if (!tok.access_token) {
    // 오류 응답에는 error·error_description 만 있다. 그것만 보여 준다(요청 값은 찍지 않는다).
    throw new GoogleAuthError(`access_token 갱신 실패 (HTTP ${r.status}): ${tok.error || '?'} ${tok.error_description || ''}`.trim());
  }
  const scopes = String(tok.scope || '').split(/\s+/).filter(Boolean);
  if (requiredScope && scopes.length && !scopes.includes(requiredScope)) {
    throw new GoogleAuthError(`토큰 범위에 ${requiredScope} 가 없다. 다시 동의: node scripts/audit/revenue-pull.mjs auth`);
  }
  return { accessToken: tok.access_token, scopes };
}
