/**
 * tests/visual-regression/shells.spec.ts
 *
 * Visual regression tests for the 4 canonical shells.
 * Run via: npx playwright test tests/visual-regression/shells.spec.ts
 *
 * First run: creates golden screenshots in tests/visual-regression/__snapshots__/
 * Subsequent runs: diffs against golden. Fail on > 0.5% pixel delta.
 */

import { test, expect } from '@playwright/test'

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

function storyUrl(storyId: string): string {
  return `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`
}

const SNAP = { maxDiffPixelRatio: 0.005 }

test.describe('Shell visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }`,
    })
  })

  // -- ModernIDEShell ---------------------------------------------------------
  test('ModernIDEShell - idle',          async ({ page }) => {
    await page.goto(storyUrl('shells-modernideshell--idle'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('ide-idle.png', SNAP)
  })

  test('ModernIDEShell - agent running', async ({ page }) => {
    await page.goto(storyUrl('shells-modernideshell--agent-running'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('ide-agent-running.png', SNAP)
  })

  test('ModernIDEShell - panel error',   async ({ page }) => {
    await page.goto(storyUrl('shells-modernideshell--panel-error'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('ide-panel-error.png', SNAP)
  })

  // -- CreativeWorkbenchShell -------------------------------------------------
  test('CreativeWorkbenchShell - World',     async ({ page }) => {
    await page.goto(storyUrl('shells-creativeworkbenchshell--world-group'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('workbench-world.png', SNAP)
  })

  test('CreativeWorkbenchShell - Character', async ({ page }) => {
    await page.goto(storyUrl('shells-creativeworkbenchshell--character-group'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('workbench-character.png', SNAP)
  })

  test('CreativeWorkbenchShell - all panels open', async ({ page }) => {
    await page.goto(storyUrl('shells-creativeworkbenchshell--all-panels-open'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('workbench-all-panels.png', SNAP)
  })

  // -- AgentsWindow ----------------------------------------------------------
  test('AgentsWindow - fleet idle',    async ({ page }) => {
    await page.goto(storyUrl('shells-agentswindow--fleet-idle'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('agents-idle.png', SNAP)
  })

  test('AgentsWindow - parallel run',  async ({ page }) => {
    await page.goto(storyUrl('shells-agentswindow--parallel-run'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('agents-running.png', SNAP)
  })

  test('AgentsWindow - blocked',       async ({ page }) => {
    await page.goto(storyUrl('shells-agentswindow--agent-blocked'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('agents-blocked.png', SNAP)
  })

  // -- DashboardShell --------------------------------------------------------
  test('DashboardShell - default',     async ({ page }) => {
    await page.goto(storyUrl('shells-dashboardshell--default'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('dashboard-default.png', SNAP)
  })

  test('DashboardShell - trial',       async ({ page }) => {
    await page.goto(storyUrl('shells-dashboardshell--trial-active'))
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('dashboard-trial.png', SNAP)
  })
})

// -- Interaction tests ---------------------------------------------------------

test.describe('Shell interaction regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }`,
    })
  })

  test('WorkbenchShell - panel toggle via toolbar', async ({ page }) => {
    await page.goto(storyUrl('shells-creativeworkbenchshell--world-group'))
    await page.waitForLoadState('networkidle')
    await page.click('button[title*="Alt+1"]')
    await expect(page.locator('[aria-label="Left panels"]')).not.toBeVisible()
    await expect(page).toHaveScreenshot('workbench-outliner-collapsed.png', SNAP)
    // Restore
    await page.click('button[title*="Alt+1"]')
    await expect(page.locator('[aria-label="Left panels"]')).toBeVisible()
  })

  test('WorkbenchShell - keyboard toggle Alt+2 (inspector)', async ({ page }) => {
    await page.goto(storyUrl('shells-creativeworkbenchshell--world-group'))
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Alt+2')
    await expect(page.locator('[aria-label="Right panels"]')).not.toBeVisible()
    await expect(page).toHaveScreenshot('workbench-inspector-collapsed.png', SNAP)
  })

  test('Design Mode banner appears on Alt+D', async ({ page }) => {
    await page.goto(storyUrl('shells-modernideshell--idle'))
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Alt+D')
    await expect(page.locator('text=Design Mode active')).toBeVisible()
    await expect(page).toHaveScreenshot('ide-design-mode-banner.png', SNAP)
  })
})
