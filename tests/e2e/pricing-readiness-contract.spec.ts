import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Pricing readiness contract', () => {
  test('keeps pricing transparent and scoped to the current product maturity', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)

    await expect(page.getByRole('heading', { name: /planos claros para builders e equipes/i })).toBeVisible()
    await expect(page.getByText(/apps \+ pesquisa sao o foco atual/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /billing readiness real/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /perguntas frequentes/i })).toBeVisible()

    await expect(page.getByText(/preco escondido/i)).toHaveCount(0)
    await expect(page.getByText(/sem limite garantido/i)).toHaveCount(0)
  })
})
