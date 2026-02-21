import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function loginIfNeeded(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /login|entrar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Studio Home - Smoke', () => {
  test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');

  test('renders Studio Home shell', async ({ page }) => {
    await loginIfNeeded(page);

    await expect(page.getByRole('heading', { name: /studio home/i })).toBeVisible();
    await expect(page.getByText(/mission/i)).toBeVisible();
    await expect(page.getByText(/team chat live/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /open ide/i })).toBeVisible();
  });

  test('open IDE handoff keeps session context', async ({ page }) => {
    await loginIfNeeded(page);

    const openIdeButton = page.getByRole('button', { name: /open ide/i });
    await openIdeButton.click();

    await expect(page).toHaveURL(/\/ide\?/);
    await expect(page.getByText(/explorer/i)).toBeVisible();
  });
});

