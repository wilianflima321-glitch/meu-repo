import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Local Studio continuity contract', () => {
  test('positions the local app as a depth unlock, not a separate product', async ({ page }) => {
    await page.goto(`${BASE_URL}/download`)

    await expect(page.getByRole('heading', { name: /download aethel studio/i })).toBeVisible()
    await expect(page.getByText(/prefere usar no navegador/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /abrir aethel web/i })).toHaveAttribute('href', '/ide')

    await expect(page.getByText(/produto separado/i)).toHaveCount(0)
    await expect(page.getByText(/fork local/i)).toHaveCount(0)
  })
})
