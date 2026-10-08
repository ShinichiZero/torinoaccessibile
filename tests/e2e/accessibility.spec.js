import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addVercelPreviewAuthentication } from './helpers.js';

test('has no serious or critical axe violations on the main experience', async ({ page }, testInfo) => {
  await addVercelPreviewAuthentication(page, testInfo.project.use.baseURL);
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('searchbox', { name: 'Nome o codice fermata' })).toBeEnabled();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousOrCritical = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
});
