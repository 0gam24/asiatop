/**
 * 내부 URL 정규화 — 사이트 정책 trailingSlash:'always' (astro.config.mjs).
 *
 * 슬래시 없는 내부 링크(/tax, /calculators/salary)는 Cloudflare Pages 가 308 로 /tax/ 에 보내므로
 * 크롤러가 링크마다 리다이렉트를 한 번 더 탄다. 네이버 서치어드바이저가 이를 "리다이렉션된 페이지"
 * 로 집계했다 (2026-09-04 진단, 약 103건). 컴포넌트에서 만드는 내부 경로는 이 함수를 거친다.
 *
 * 쌍둥이: src/lib/remark-trailing-slash.mjs (MDX 본문 링크용, 동일 규칙 — astro.config 가 TS 를
 * 직접 import 하지 않도록 분리). 규칙을 바꾸면 둘 다 고치고 tests/lib/internal-links.test.mjs 의
 * 패리티 테스트로 확인한다. 빌드 산출물 게이트: scripts/audit/internal-links.mjs.
 */
const FILE_EXT_RE = /\.[a-z0-9]{2,12}$/i; // .webmanifest(11자) 까지 파일로 인식

/** 내부 경로에 trailing slash 를 보장한다. 외부 URL·앵커·mailto·파일 자원은 그대로 돌려준다. */
export function href(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/')) return path; // 외부·앵커·mailto·상대 경로
  if (path.startsWith('//')) return path; // protocol-relative
  const cut = path.search(/[?#]/);
  const p = cut === -1 ? path : path.slice(0, cut);
  const rest = cut === -1 ? '' : path.slice(cut);
  if (FILE_EXT_RE.test(p)) return path; // .xml·.txt·.png 등 파일 자원
  return (p.endsWith('/') ? p : `${p}/`) + rest;
}
