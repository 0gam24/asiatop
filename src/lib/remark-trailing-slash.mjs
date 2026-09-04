/**
 * remark 플러그인 — MD/MDX 본문의 내부 링크를 빌드 시 정규화한다 (소스 파일 무수정).
 *
 *  1. trailing slash 보장: 685편 본문에 `](/tax/yearend-tax-2026-checklist)` 꼴 링크가 1,100건 이상 있어
 *     소스를 일괄 수정하면 lastmod 만 흔들리는 대량 변경이 된다 (CLAUDE.md: 본문 무변경 lastmod 갱신 금지).
 *     mdast 단계에서 고치면 산출물 HTML 만 바뀐다. 슬래시 없는 링크는 CF Pages 308 →
 *     네이버 서치어드바이저 "리다이렉션된 페이지" 집계 원인 (2026-09-04 약 103건).
 *  2. 프루닝 리다이렉트 맵 적용: scripts/prune/redirect-map.json (apply-pruning.mjs 가 갱신하는 SSoT) 의
 *     merge 대상 링크는 통합글 현재 경로로 직결, delete 대상 링크는 링크를 풀고 텍스트만 남긴다.
 *     _redirects 를 경유하는 내부 링크도 크롤러에겐 "리다이렉션된 페이지" 이고, 삭제글 링크는 클러스터
 *     인덱스로 튕기는 의미 없는 링크가 된다. 빌드 게이트(scripts/audit/internal-links.mjs)가 이를 차단한다.
 *
 * 대상 노드: link · definition(참조형 링크) · MDX JSX <a href> · 원시 html 노드의 href.
 * 슬래시 규칙은 src/lib/url.ts 의 href() 와 동일해야 한다 (패리티 테스트: tests/lib/internal-links.test.mjs).
 * unist-util-visit 없이 자체 순회 — 의존성 추가 없음 (lockfile 재생성 환경 제약).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE_EXT_RE = /\.[a-z0-9]{2,12}$/i; // .webmanifest(11자) 까지 파일로 인식
const REDIRECT_MAP_REL = 'scripts/prune/redirect-map.json';

/** redirect-map.json 후보 경로 — cwd(리포 루트에서 빌드·테스트) 우선, 모듈 상대 경로 폴백 */
function redirectMapCandidates() {
  const out = [resolve(process.cwd(), REDIRECT_MAP_REL)];
  try {
    // vitest/Vite 변환 환경에서는 import.meta.url 이 file: 이 아닐 수 있어 try 로 감싼다
    out.push(fileURLToPath(new URL(`../../${REDIRECT_MAP_REL}`, import.meta.url)));
  } catch {
    // 무시 — cwd 후보만 사용
  }
  return out;
}

/** @param {string} path */
export function normalizeInternalHref(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return path;
  if (path.startsWith('//')) return path;
  const cut = path.search(/[?#]/);
  const p = cut === -1 ? path : path.slice(0, cut);
  const rest = cut === -1 ? '' : path.slice(cut);
  if (FILE_EXT_RE.test(p)) return path;
  return (p.endsWith('/') ? p : `${p}/`) + rest;
}

/**
 * redirect-map.json → Map<from, {to, action}>. 파일을 못 찾거나 깨지면 경고 후 빈 맵 (슬래시 정규화만 수행).
 * @param {string} [filePath] 명시 경로 (테스트·도구용). 생략 시 후보 경로 중 첫 실존 파일.
 * @returns {Map<string, {to: string, action: string}>}
 */
export function loadRedirectMap(filePath) {
  const candidates = filePath ? [filePath] : redirectMapCandidates();
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    console.warn(`[remark-trailing-slash] redirect-map.json 없음 — 프루닝 링크 재작성 생략 (${candidates.join(' | ')})`);
    return new Map();
  }
  try {
    const json = JSON.parse(readFileSync(found, 'utf8'));
    const map = new Map();
    for (const r of json.redirects ?? []) {
      if (typeof r.from === 'string' && typeof r.to === 'string') {
        map.set(normalizeInternalHref(r.from), { to: normalizeInternalHref(r.to), action: r.action ?? 'merge' });
      }
    }
    return map;
  } catch (err) {
    console.warn(`[remark-trailing-slash] redirect-map.json 파싱 실패 — 재작성 생략: ${err?.message ?? err}`);
    return new Map();
  }
}

/** 프루닝 대상 경로면 재작성 정보를, 아니면 null 을 돌려준다. ?query/#hash 는 떼고 대조한다. */
function pruned(url, redirectMap) {
  if (!redirectMap || redirectMap.size === 0 || typeof url !== 'string' || !url.startsWith('/')) return null;
  const cut = url.search(/[?#]/);
  const path = cut === -1 ? url : url.slice(0, cut);
  return redirectMap.get(path) ?? null;
}

function rewriteHref(url, redirectMap) {
  const n = normalizeInternalHref(url);
  const hit = pruned(n, redirectMap);
  return hit && hit.action !== 'delete' ? hit.to : n;
}

/**
 * @param {{ redirectMap?: Map<string, {to: string, action: string}> }} [options]
 *   redirectMap 을 넘기지 않으면 scripts/prune/redirect-map.json 을 읽는다 (테스트에서 주입용).
 */
export default function remarkTrailingSlash(options = {}) {
  const redirectMap = options.redirectMap ?? loadRedirectMap();

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'definition' && typeof node.url === 'string') {
      node.url = rewriteHref(node.url, redirectMap);
    } else if (
      (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') &&
      node.name === 'a' &&
      Array.isArray(node.attributes)
    ) {
      for (const attr of node.attributes) {
        if (attr && attr.type === 'mdxJsxAttribute' && attr.name === 'href' && typeof attr.value === 'string') {
          attr.value = rewriteHref(attr.value, redirectMap);
        }
      }
    } else if (node.type === 'html' && typeof node.value === 'string' && node.value.includes('href=')) {
      node.value = node.value.replace(
        /(href=)(["'])(\/[^"']*)\2/g,
        (_m, k, q, v) => `${k}${q}${rewriteHref(v, redirectMap)}${q}`,
      );
    }

    const kids = node.children;
    if (!Array.isArray(kids)) return;
    for (let i = 0; i < kids.length; i += 1) {
      const child = kids[i];
      if (child && child.type === 'link' && typeof child.url === 'string') {
        const n = normalizeInternalHref(child.url);
        const hit = pruned(n, redirectMap);
        if (hit && hit.action === 'delete') {
          // 삭제된 글 링크 — 링크를 풀고 텍스트(자식 노드)만 남긴다
          const inner = Array.isArray(child.children) ? child.children : [];
          kids.splice(i, 1, ...inner);
          i += inner.length - 1;
          for (const c of inner) visit(c);
          continue;
        }
        child.url = hit ? hit.to : n;
      }
      visit(child);
    }
  };

  return (tree) => {
    visit(tree);
  };
}
