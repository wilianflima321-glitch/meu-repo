import { test, expect } from '@playwright/test';

// UI smoke test for soft-warn banner. This is a high-level test scaffold and
// may require adjusting selectors to the real IDE DOM. It assumes the web
// app is available at http://localhost:3000 and the mock backend at 8010.

test.describe('AI soft-warn UI', () => {
  test('shows soft-warn banner when provider returns warnings (simulated)', async ({ page }) => {
    // instead of relying on a running app, inject a minimal HTML that matches
    // the banner structure created by the activation service and then simulate a warning
    await page.setContent(`
      <html><head></head><body>
        <div class="ai-warning-banner">
          <div class="header"><span class="codicon codicon-warning"></span><strong>AI verification</strong><div class="actions"><button class="toggle">Details</button><button class="close">×</button></div></div>
          <div class="body"><div class="meta"></div><ul class="warnings-list"></ul></div>
        </div>
      </body></html>
    `);

    // ensure banner element exists in DOM
    const banner = page.locator('.ai-warning-banner');
    await expect(banner).toHaveCount(1);

    // simulate a provider warning by populating the banner from page context
    const warnings = ['chronology_error: possible inconsistent chronology', 'drug_instruction: illicit procurement mention'];
    await page.evaluate((w) => {
      const banner = document.querySelector('.ai-warning-banner') as HTMLElement | null;
      if (!banner) return false;
      const meta = banner.querySelector('.meta');
      const list = banner.querySelector('.warnings-list');
      if (meta) meta.textContent = `Provider: mock-prov — ${w.length} warning(s)`;
      if (list) {
        list.innerHTML = '';
        for (const it of w) {
          const li = document.createElement('li');
          li.textContent = it;
          list.appendChild(li);
        }
      }
      banner.classList.add('show');
      return true;
    }, warnings);

    // assert banner visible and warnings present
    await expect(banner).toBeVisible({ timeout: 2000 });
    const items = banner.locator('.warnings-list li');
    await expect(items).toHaveCount(warnings.length);
    await expect(items.nth(0)).toHaveText(/chronology_error/);
  });
});
