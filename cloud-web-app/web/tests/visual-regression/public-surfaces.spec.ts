/**
 * tests/visual-regression/public-surfaces.spec.ts
 *
 * Visual regression for all public and auth surfaces.
 * These tests run against the development server (not Storybook).
 *
 * Run: npx playwright test tests/visual-regression/public-surfaces.spec.ts
 * Update: npx playwright test --update-snapshots
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const SNAP = { maxDiffPixelRatio: 0.005 }

test.describe('Public surfaces — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }`,
    })
  })

  // ── Landing ───────────────────────────────────────────────────────────────
  test('Landing — hero + proof + start modes', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('landing-full.png', SNAP)
  })

  test('Landing — no FIG 1 label visible', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.waitForLoadState('networkidle')
    // Confirm internal labels are absent
    await expect(page.locator('text=FIG 1')).not.toBeVisible()
    await expect(page.locator('text=SPINE')).not.toBeVisible()
  })

  // ── Auth ──────────────────────────────────────────────────────────────────
  test('Login — default state', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('auth-login.png', SNAP)
  })

  test('Login — no "AI Console" text visible', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=AI Console')).not.toBeVisible()
  })

  // ── Pricing ───────────────────────────────────────────────────────────────
  test('Pricing — plans grid visible, comparison collapsed', async ({ page }) => {
    await page.goto(`${BASE}/pricing`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('pricing-default.png', SNAP)
  })

  test('Pricing — comparison table expands on click', async ({ page }) => {
    await page.goto(`${BASE}/pricing`)
    await page.waitForLoadState('networkidle')
    await page.click('details summary:has-text("Billing details")')
    await expect(page).toHaveScreenshot('pricing-comparison-open.png', SNAP)
  })

  // ── Compare ──────────────────────────────────────────────────────────────
  test('Compare — no duplicate h3 tool names', async ({ page }) => {
    await page.goto(`${BASE}/compare`)
    await page.waitForLoadState('networkidle')
    // There should not be a visible h3 just repeating the tool name
    const h3Elements = page.locator('article h3')
    await expect(h3Elements).toHaveCount(0)
    await expect(page).toHaveScreenshot('compare-default.png', SNAP)
  })

  test('Compare — detail drawer expands', async ({ page }) => {
    await page.goto(`${BASE}/compare`)
    await page.waitForLoadState('networkidle')
    const firstDetail = page.locator('article details').first()
    await firstDetail.click()
    await expect(page).toHaveScreenshot('compare-detail-open.png', SNAP)
  })

  // ── Marketplace ───────────────────────────────────────────────────────────
  test('Marketplace — extensions grid', async ({ page }) => {
    await page.goto(`${BASE}/marketplace`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('marketplace-default.png', SNAP)
  })

  // ── Download ─────────────────────────────────────────────────────────────
  test('Download — platform selector', async ({ page }) => {
    await page.goto(`${BASE}/download`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('download-default.png', SNAP)
  })
})

// ── Global jargon check ───────────────────────────────────────────────────────

test.describe('No internal jargon on public pages', () => {
  const PUBLIC_PAGES = ['/', '/pricing', '/compare', '/marketplace', '/download', '/login']
  const BANNED_STRINGS = [
    'FIG 1',
    'SPINE',
    'GATE',
    'AI Console',
    'Canonical preview',
    'EXECUTION_LOG',
    'V30',
    'V31',
    'production ready',
    'AAA ready',
    'Unreal-grade',
  ]

  for (const pagePath of PUBLIC_PAGES) {
    test(`${pagePath} — no banned jargon strings`, async ({ page }) => {
      await page.goto(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}${pagePath}`)
      await page.waitForLoadState('networkidle')
      for (const banned of BANNED_STRINGS) {
        const visible = page.locator(`text="${banned}"`)
        await expect(visible, `"${banned}" should not be visible on ${pagePath}`).not.toBeVisible()
      }
    })
  }
})
