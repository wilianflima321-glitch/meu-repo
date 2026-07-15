import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Public marketing happy path', () => {
  test('landing shows polished public messaging and key CTAs', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await expect(
      page.getByRole('heading', {
        name: /crie apps com ia sem perder o controle do que realmente funciona/i,
      })
    ).toBeVisible();

    await expect(page.getByRole('button', { name: /abrir studio/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /ver planos/i })).toBeVisible();

    await expect(page.getByText(/video demo em producao/i)).toHaveCount(0);
    await expect(page.getByText(/billing e preview real dependem de runtime/i)).toHaveCount(0);
    await expect(page.getByText(/estado atual/i)).toHaveCount(0);
  });

  test('contact sales submits through backend instead of mailto flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact-sales`);

    await expect(
      page.getByRole('heading', { name: /fale com vendas e desenhe o melhor rollout para o seu time/i })
    ).toBeVisible();

    await expect(page.getByText(/abrir email para vendas/i)).toHaveCount(0);
    await expect(page.getByText(/sem esconder lacunas/i)).toHaveCount(0);
    await expect(page.getByText(/como isso funciona/i)).toHaveCount(0);

    await page.getByLabel(/nome/i).fill('Teste Comercial');
    await page.getByLabel(/email corporativo/i).fill('comercial@empresa.com');
    await page.getByLabel(/empresa/i).fill('Empresa Teste');
    await page.getByLabel(/cargo/i).fill('CTO');
    await page.getByLabel(/contexto e requisitos/i).fill('Precisamos avaliar rollout enterprise com seguranca e governanca.');

    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'msg_test_123' }),
      });
    });

    await page.getByRole('button', { name: /enviar briefing para vendas/i }).click();

    await expect(page.getByRole('heading', { name: /briefing enviado/i })).toBeVisible();
    await expect(page.getByText(/responder em ate 24 horas uteis/i)).toBeVisible();
  });
});
