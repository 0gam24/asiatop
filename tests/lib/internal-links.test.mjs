import { describe, it, expect } from 'vitest';
import { href } from '../../src/lib/url.ts';
import remarkTrailingSlash, { normalizeInternalHref, loadRedirectMap } from '../../src/lib/remark-trailing-slash.mjs';

// 네이버 서치어드바이저 "리다이렉션된 페이지" 대응 (2026-09-05) — trailingSlash:'always' 정책 보장.
const CASES = [
  ['/tax', '/tax/'],
  ['/tax/', '/tax/'],
  ['/', '/'],
  ['/calculators/salary', '/calculators/salary/'],
  ['/search?q=연말정산', '/search/?q=연말정산'],
  ['/tax/yearend-tax-2026-checklist#faq', '/tax/yearend-tax-2026-checklist/#faq'],
  ['/clusters#archive', '/clusters/#archive'],
  ['/rss.xml', '/rss.xml'],
  ['/rss/tax.xml', '/rss/tax.xml'],
  ['/llms-cluster-tax.txt', '/llms-cluster-tax.txt'],
  ['/og/foo.png', '/og/foo.png'],
  ['/manifest.webmanifest', '/manifest.webmanifest'],
  ['/tax/some-article.md', '/tax/some-article.md'],
  ['https://www.gov.kr/portal', 'https://www.gov.kr/portal'],
  ['//cdn.example.com/x', '//cdn.example.com/x'],
  ['#sources', '#sources'],
  ['mailto:smartdatashop@gmail.com', 'mailto:smartdatashop@gmail.com'],
  ['../relative', '../relative'],
];

describe('href() — 내부 경로 trailing slash 정규화', () => {
  it.each(CASES)('%s → %s', (input, expected) => {
    expect(href(input)).toBe(expected);
  });
  it('문자열이 아니면 그대로 반환', () => {
    expect(href(undefined)).toBe(undefined);
  });
});

describe('remark-trailing-slash — url.ts 와 규칙 패리티', () => {
  it.each(CASES)('normalizeInternalHref(%s) === href()', (input) => {
    expect(normalizeInternalHref(input)).toBe(href(input));
  });

  it('link · definition · MDX JSX <a> · 원시 html 노드를 모두 정규화한다', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'link', url: '/tax/yearend-tax-2026-checklist', children: [] },
            { type: 'link', url: 'https://www.hometax.go.kr', children: [] },
            { type: 'linkReference', identifier: 'a', children: [] },
            {
              type: 'mdxJsxTextElement',
              name: 'a',
              attributes: [{ type: 'mdxJsxAttribute', name: 'href', value: '/calculators/salary' }],
              children: [],
            },
          ],
        },
        { type: 'definition', identifier: 'a', url: '/gov-support' },
        { type: 'html', value: '<a href="/tax">세금</a> <a href="/rss.xml">RSS</a>' },
      ],
    };
    remarkTrailingSlash({ redirectMap: new Map() })(tree);
    const para = tree.children[0].children;
    expect(para[0].url).toBe('/tax/yearend-tax-2026-checklist/');
    expect(para[1].url).toBe('https://www.hometax.go.kr');
    expect(para[3].attributes[0].value).toBe('/calculators/salary/');
    expect(tree.children[1].url).toBe('/gov-support/');
    expect(tree.children[2].value).toBe('<a href="/tax/">세금</a> <a href="/rss.xml">RSS</a>');
  });

  it('프루닝 리다이렉트 맵 — merge 는 통합글로 직결, delete 는 링크를 풀어 텍스트만 남긴다', () => {
    const redirectMap = new Map([
      ['/savings/pension-savings-vs-irp/', { to: '/savings/pension-savings-vs-irp-tax-credit/', action: 'merge' }],
      ['/savings/kisa-individual-investment-tax-deduction/', { to: '/savings/', action: 'delete' }],
    ]);
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '비교는 ' },
            { type: 'link', url: '/savings/pension-savings-vs-irp', children: [{ type: 'text', value: 'IRP 글' }] },
            { type: 'text', value: ' 과 ' },
            {
              type: 'link',
              url: '/savings/kisa-individual-investment-tax-deduction/#faq',
              children: [{ type: 'strong', children: [{ type: 'text', value: 'KISA 공제' }] }],
            },
            { type: 'text', value: ' 참고.' },
          ],
        },
        {
          type: 'mdxJsxTextElement',
          name: 'a',
          attributes: [{ type: 'mdxJsxAttribute', name: 'href', value: '/savings/pension-savings-vs-irp' }],
          children: [],
        },
      ],
    };
    remarkTrailingSlash({ redirectMap })(tree);
    const para = tree.children[0].children;
    expect(para.map((n) => n.type)).toEqual(['text', 'link', 'text', 'strong', 'text']);
    expect(para[1].url).toBe('/savings/pension-savings-vs-irp-tax-credit/');
    expect(para[3].children[0].value).toBe('KISA 공제');
    expect(tree.children[1].attributes[0].value).toBe('/savings/pension-savings-vs-irp-tax-credit/');
  });

  it('실제 redirect-map.json 이 로드되고 from 경로가 정규화돼 있다', () => {
    const map = loadRedirectMap();
    expect(map.size).toBeGreaterThan(0);
    for (const [from, v] of map) {
      expect(from.endsWith('/')).toBe(true);
      expect(v.to.endsWith('/')).toBe(true);
      expect(['merge', 'delete']).toContain(v.action);
    }
  });
});
