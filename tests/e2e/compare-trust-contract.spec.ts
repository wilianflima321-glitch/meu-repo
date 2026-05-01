import { expect, test } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Buyer comparison contract', () => {
  test('states strengths and limitations without fake market claims', async ({ page }) => {
    await page.goto(`${BASE_URL}/compare`)

    await expect(page.getByRole('heading', { name: /compare o aethel com as ferramentas/i })).toBeVisible()
    await expect(page.getByText('Onde o Aethel ja ganha', { exact: true })).toBeVisible()
    await expect(page.getByText(/onde os lideres do mercado ainda estao na frente/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /abrir pack de procurement/i })).toBeVisible()

    await expect(page.getByText(/100% autonomo/i)).toHaveCount(0)
    await expect(page.getByText(/substitui unreal/i)).toHaveCount(0)
  })
})
