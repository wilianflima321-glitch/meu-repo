import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function loginIfNeeded(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('IDE - Smoke', () => {
  test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('loads IDE shell and explorer', async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto(`${BASE_URL}/ide?projectId=default`);

    await expect(page.getByText(/explorer/i)).toBeVisible();
    await expect(page.getByText(/preview/i)).toBeVisible();
  });
});
