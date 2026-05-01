/**
 * MDX 본문 처리 공용 유틸 (단일 진실 공급원)
 *
 * 통합 전: scripts/lib/fact-verifier.mjs, ai-likeness-scorer.mjs,
 *         scripts/gates/g5-adsense-policy.mjs, g6-disclosure-attach.mjs,
 *         g7-plagiarism.mjs — 5곳 중복.
 * 통합 후: 본 파일이 유일한 출처.
 */

/**
 * MDX에서 frontmatter 제거하고 body만 반환.
 * @param {string} mdx
 * @returns {string} body (frontmatter 없으면 원본)
 */
export function stripFrontmatter(mdx) {
  if (typeof mdx !== 'string') return '';
  if (!mdx.startsWith('---')) return mdx;
  const end = mdx.indexOf('\n---', 3);
  if (end < 0) return mdx;
  return mdx.slice(end + 4).trimStart();
}

/**
 * MDX를 frontmatter와 body로 분리.
 * @param {string} mdx
 * @returns {{ fm: string, body: string }} fm는 '---\n...---\n' 포함, frontmatter 없으면 fm=''
 */
export function splitFrontmatter(mdx) {
  if (typeof mdx !== 'string') return { fm: '', body: '' };
  if (!mdx.startsWith('---')) return { fm: '', body: mdx };
  const end = mdx.indexOf('\n---', 3);
  if (end < 0) return { fm: '', body: mdx };
  return {
    fm: mdx.slice(0, end + 4),
    body: mdx.slice(end + 4),
  };
}
