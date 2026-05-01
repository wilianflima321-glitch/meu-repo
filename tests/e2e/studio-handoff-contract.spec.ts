import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Studio handoff contract', () => {
  test('keeps Web Light, Mission Control, Studio, and Local as one continuous path', async ({ page }) => {
    await page.goto(`${BASE_URL}/`)

    const missionControlLink = page.getByRole('link', { name: /start in mission control/i }).first()
    const studioLinks = page.getByRole('link', { name: /open studio/i })

    await expect(missionControlLink).toBeVisible()
    await expect(missionControlLink).toHaveAttribute('href', /\/dashboard\?onboarding=1&source=landing-primary-cta/)
    await expect(studioLinks.first()).toHaveAttribute('href', '/ide')
    await expect(page.getByText(/web light para entrar\. mission control para orientar\. studio para executar\. local/i)).toBeVisible()
  })
})
