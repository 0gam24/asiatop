import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/',
  '/tax',
  '/tax/yearend-tax-2026-checklist',
  '/calculators/salary',
  '/about',
  '/editorial-policy',
  '/privacy',
  '/contact',
];

for (const path of PAGES) {
  test(`a11y(WCAG 2.2 AA): ${path}`, async ({ page }, testInfo) => {
    // mobile/desktop 둘 다 돌리되, 한 path당 한 번만 실행 (속도 위해 chromium만)
    test.skip(testInfo.project.name !== 'chromium', 'a11y는 chromium에서만 실행');
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    if (results.violations.length > 0) {
      const summary = results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}건)`).join('\n');
      throw new Error(`${path} 접근성 위반 ${results.violations.length}건:\n${summary}`);
    }
    expect(results.violations).toHaveLength(0);
  });
}
