import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Mission-first entry contract', () => {
  test('keeps the public entry centered on one mission intake instead of a feature grid', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    await expect(page.getByRole('heading', { name: /ask aethel to build, research, fix or operate anything/i })).toBeVisible()
    await expect(page.getByText(/mission intake/i).first()).toBeVisible()
    await expect(page.getByText(/web light/i).first()).toBeVisible()
    await expect(page.getByText(/studio handoff/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /start a mission/i })).toBeVisible()

    await expect(page.getByText(/lorem ipsum/i)).toHaveCount(0)
    await expect(page.getByText(/coming soon/i)).toHaveCount(0)
  })
})
