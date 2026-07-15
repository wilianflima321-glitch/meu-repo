import { expect, test, type Page } from '@playwright/test';

async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

test.describe('Merge pressure E2E', () => {
  test.beforeAll(async ({ request }) => {
    const warmPaths = ['/', '/contact-sales', '/login', '/dashboard', '/api/health/live']

    for (const path of warmPaths) {
      await request.get(path, {
        timeout: 60_000,
        failOnStatusCode: false,
      })
    }
  })

  test('landing keeps core public CTAs and honest copy', async ({ page }) => {
    await gotoApp(page, '/');

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

  test('contact sales stays on backend submission flow', async ({ page }) => {
    await gotoApp(page, '/contact-sales');

    await expect(
      page.getByRole('heading', {
        name: /fale com vendas e desenhe o melhor rollout para o seu time/i,
      })
    ).toBeVisible();

    await expect(page.getByText(/abrir email para vendas/i)).toHaveCount(0);
    await expect(page.getByText(/sem esconder lacunas/i)).toHaveCount(0);

    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'merge_pressure_contact_ok' }),
      });
    });

    await page.getByLabel(/nome/i).fill('Teste Comercial');
    await page.getByLabel(/email corporativo/i).fill('comercial@empresa.com');
    await page.getByLabel(/empresa/i).fill('Empresa Teste');
    await page.getByLabel(/cargo/i).fill('CTO');
    await page
      .getByLabel(/contexto e requisitos/i)
      .fill('Precisamos validar rollout enterprise com seguranca e governanca.');

    await page.getByRole('button', { name: /enviar briefing para vendas/i }).click();

    await expect(page.getByRole('heading', { name: /briefing enviado/i })).toBeVisible();
  });

  test('login still exposes the main entry points', async ({ page }) => {
    await gotoApp(page, '/login');

    await expect(page.getByRole('heading', { name: /login|entrar/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|entrar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continuar com github|entrar com github|github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continuar com google|entrar com google|google/i })).toBeVisible();
  });

  test('protected surfaces still redirect unauthenticated users', async ({ page }) => {
    for (const path of ['/dashboard', '/projects', '/settings']) {
      await gotoApp(page, path);
      await expect(page).toHaveURL(/login/);
    }
  });

  test('health endpoints and metrics remain online', async ({ request }) => {
    const live = await request.get('/api/health/live');
    expect(live.status()).toBe(200);
    expect((await live.json()).status).toBe('ok');

    const ready = await request.get('/api/health/ready');
    expect([200, 503]).toContain(ready.status());

    const metrics = await request.get('/api/health/metrics');
    expect(metrics.ok()).toBeTruthy();
    expect(await metrics.text()).toContain('# HELP');
  });
});
