/**
 * R68 — ads.txt (IAB Authorized Digital Sellers)
 *
 * AdSense·DSP 가 광고 노출 권한을 검증하는 표준 파일.
 * publisher ID 가 발급되지 않은 시점에도 placeholder 노출하여 404 회피.
 *
 * 활성화:
 *   1. 운영자 AdSense 가입 → publisher ID 발급 (pub-XXXXXXXXXXXXXXXX)
 *   2. GitHub Secret PUBLIC_ADSENSE_CLIENT 추가
 *   3. CF Pages 재빌드 → ads.txt 자동 활성화
 */
import type { APIContext } from 'astro';

export async function GET(_context: APIContext) {
  const adsenseClient = import.meta.env.PUBLIC_ADSENSE_CLIENT;

  let body: string;
  if (adsenseClient && adsenseClient.startsWith('pub-')) {
    // AdSense Direct relationship.
    // ca- prefix 제거된 publisher ID 만 사용 (예: pub-1234567890123456).
    body = `google.com, ${adsenseClient}, DIRECT, f08c47fec0942fa0
`;
  } else {
    // 발급 전 placeholder. 200 OK 응답으로 404 회피.
    // AdSense 가 발견 시 정확한 publisher ID 등록 메시지 출력.
    body = `# ads.txt placeholder — AdSense publisher ID 발급 대기 중.
# 발급 후 GitHub Secret PUBLIC_ADSENSE_CLIENT 등록 시 자동 활성화.
# 형식 예: google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
#
# 마지막 갱신: ${new Date().toISOString()}
`;
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
