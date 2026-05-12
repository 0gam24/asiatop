/**
 * 에러 추적 (Sentry) — 클라이언트 사이드, lazy 로딩, 프라이버시 우선 설정
 *
 * 동작:
 *   - PUBLIC_SENTRY_DSN 환경변수가 없으면 noop. 빌드 산출물에 Sentry 청크 자체가 트리시킹 X.
 *   - DSN이 있으면 동의 게이트 무관 즉시 lazy 로드 (legitimate interest — 보안·안정성).
 *   - 세션 리플레이·트레이싱·breadcrumb 콘솔 로그 비활성 — 개인정보 최소 수집.
 *   - URL·요청에서 query string 제거 (q=… 등 검색어 노출 방지).
 *
 * 활성화 절차:
 *   1. Sentry 프로젝트 생성 (Browser SDK)
 *   2. PUBLIC_SENTRY_DSN을 Cloudflare Pages 환경변수에 등록 (Production·Preview)
 *   3. 빌드 후 자동 활성화 — 별도 코드 변경 불필요
 *
 * GA4 + Sentry 분리:
 *   - GA4: 사용자 행동·CWV (web-vitals) — 동의 필요
 *   - Sentry: JS 에러·런타임 예외 — 동의 무관, 단 PII 미수집
 */

declare global {
  interface Window {
    __sentryInit?: boolean;
  }
}

const PII_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
]);

/**
 * Sentry sampleRate 안전 파싱.
 * 환경변수 미설정/잘못된 값 → 0.1 (기본).
 * 0.01 ~ 1.0 범위 강제 (음수·1 초과 차단).
 */
export function parseSampleRate(raw: string | undefined): number {
  if (!raw) return 0.1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0.1;
  if (n > 1) return 1;
  if (n < 0.01) return 0.01;
  return n;
}

/**
 * URL 또는 경로에서 query string·fragment를 제거.
 * 검색어(q=…)·UTM·session token 등 우발 노출 방지.
 */
export function scrubUrl(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== 'string') return url ?? undefined;
  // mailto/tel 등은 그대로
  if (!/^https?:|^\//.test(url)) return url;
  try {
    const u = new URL(url, 'https://asiatop.co.kr');
    return `${u.origin === 'https://asiatop.co.kr' ? '' : u.origin}${u.pathname}`;
  } catch {
    // 파싱 실패 → query·fragment만 정규식으로 제거
    return url.replace(/[?#].*$/, '');
  }
}

/**
 * Sentry beforeSend hook — 이벤트 발송 전 PII 스크럽.
 * 외부에서 테스트 가능하도록 export.
 */
export function scrubEvent<T extends Record<string, unknown>>(event: T): T {
  const e = event as { request?: { url?: string; query_string?: unknown; headers?: Record<string, string> }; user?: { ip_address?: string; email?: string } };

  if (e.request) {
    e.request.url = scrubUrl(e.request.url);
    delete e.request.query_string;
    if (e.request.headers) {
      for (const key of Object.keys(e.request.headers)) {
        if (PII_HEADERS.has(key.toLowerCase())) {
          delete e.request.headers[key];
        }
      }
    }
  }

  if (e.user) {
    delete e.user.ip_address;
    delete e.user.email;
  }

  return event;
}

export async function initSentry(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.__sentryInit) return;

  const dsn = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  window.__sentryInit = true;

  // 선택적 import로 트리쉐이킹 — replay·tracing·console·breadcrumbs 등 미사용 integration 미포함.
  const {
    init,
    browserApiErrorsIntegration,
    globalHandlersIntegration,
    linkedErrorsIntegration,
    dedupeIntegration,
    httpContextIntegration,
  } = await import('@sentry/browser');

  init({
    dsn,
    environment: (import.meta.env.PUBLIC_SENTRY_ENV as string | undefined) ?? 'production',
    release: (import.meta.env.CF_PAGES_COMMIT_SHA as string | undefined),
    sendDefaultPii: false,
    // 트레이싱·리플레이 비활성 (web-vitals가 성능 추적 담당, 리플레이는 프라이버시 충돌)
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // 무료 티어(월 5K) 보호 — 기본 10% 샘플링.
    // PUBLIC_SENTRY_SAMPLE_RATE 환경변수로 0.01~1.0 범위 조정 가능 (트래픽 폭증 시 0.05 등).
    sampleRate: parseSampleRate(
      import.meta.env.PUBLIC_SENTRY_SAMPLE_RATE as string | undefined,
    ),
    defaultIntegrations: false,
    integrations: [
      browserApiErrorsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
    ],
    beforeSend: scrubEvent,
  });
}
