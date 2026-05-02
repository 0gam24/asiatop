import { describe, it, expect } from 'vitest';
import { stripFrontmatter, splitFrontmatter } from '../../scripts/lib/mdx-utils.mjs';

describe('mdx-utils — stripFrontmatter', () => {
  it('frontmatter 제거', () => {
    const mdx = '---\ntitle: 제목\n---\n\n본문';
    expect(stripFrontmatter(mdx)).toBe('본문');
  });

  it('frontmatter 없으면 원본', () => {
    expect(stripFrontmatter('## H2\n본문')).toBe('## H2\n본문');
  });

  it('빈 입력 처리', () => {
    expect(stripFrontmatter('')).toBe('');
    expect(stripFrontmatter(null)).toBe('');
    expect(stripFrontmatter(undefined)).toBe('');
  });

  it('multiline frontmatter 처리', () => {
    const mdx = '---\ntitle: t\nauthor: a\nkeywords:\n  - k1\n  - k2\n---\n\n본문 내용';
    expect(stripFrontmatter(mdx)).toBe('본문 내용');
  });
});

describe('mdx-utils — splitFrontmatter', () => {
  it('fm + body 분리', () => {
    const mdx = '---\ntitle: 제목\n---\n\n본문';
    const r = splitFrontmatter(mdx);
    expect(r.fm).toBe('---\ntitle: 제목\n---');
    expect(r.body).toBe('\n\n본문');
  });

  it('frontmatter 없으면 fm=빈, body=원본', () => {
    const r = splitFrontmatter('본문만');
    expect(r.fm).toBe('');
    expect(r.body).toBe('본문만');
  });

  it('빈 입력 안전', () => {
    expect(splitFrontmatter('')).toEqual({ fm: '', body: '' });
    expect(splitFrontmatter(null)).toEqual({ fm: '', body: '' });
  });
});
