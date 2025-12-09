import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * Captures screenshots of key AI IDE screens for visual comparison
 */

test.describe('AI IDE Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('branding screen visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div class="ai-ide-widget" style="max-width: 800px; margin: 40px auto;">
          <div class="ai-ide-widget-header">
            <div>
              <h1 class="ai-ide-widget-title">AI IDE</h1>
              <p class="ai-ide-widget-subtitle">Intelligent Development Environment</p>
            </div>
          </div>
          <div style="margin: 24px 0;">
            <p style="color: var(--ai-ide-text-muted); line-height: 1.6;">
              Professional AI-powered development tools with intelligent agents, 
              workspace execution, and real-time assistance.
            </p>
          </div>
          <div class="ai-ide-widget-actions">
            <button class="ai-ide-button">Get Started</button>
            <button class="ai-ide-button ai-ide-button-secondary">Learn More</button>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('branding-screen.png', {
      maxDiffPixels: 100
    });
  });

  test('configuration screen visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div class="ai-ide-widget" style="max-width: 600px; margin: 40px auto;">
          <div class="ai-ide-widget-header">
            <h2 class="ai-ide-widget-title">AI Configuration</h2>
          </div>
          <form>
            <div class="ai-ide-config-section">
              <label class="ai-ide-config-label" for="agent">Agent</label>
              <select id="agent" class="ai-ide-config-select">
                <option>Coder</option>
                <option>Architect</option>
                <option>Universal</option>
              </select>
            </div>
            <div class="ai-ide-config-section">
              <label class="ai-ide-config-label" for="model">Model</label>
              <input type="text" id="model" class="ai-ide-config-input" placeholder="gpt-4" />
            </div>
            <div class="ai-ide-widget-actions">
              <button type="submit" class="ai-ide-button">Save</button>
              <button type="button" class="ai-ide-button ai-ide-button-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('config-screen.png', {
      maxDiffPixels: 100
    });
  });

  test('health panel visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div class="ai-ide-widget ai-ide-widget-elevated" style="max-width: 1000px; margin: 40px auto;">
          <div class="ai-ide-widget-header">
            <h2 class="ai-ide-widget-title">AI Health</h2>
            <div class="ai-ide-widget-actions">
              <button class="ai-ide-button">Refresh</button>
              <button class="ai-ide-button">Export</button>
            </div>
          </div>
          <div class="ai-ide-health-panel">
            <div class="ai-ide-health-card">
              <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">Coder Agent</h3>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Total Requests</span>
                <span class="ai-ide-health-value">150</span>
              </div>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Error Rate</span>
                <span class="ai-ide-health-value success">2.5%</span>
              </div>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">P95</span>
                <span class="ai-ide-health-value">245ms</span>
              </div>
            </div>
            <div class="ai-ide-health-card">
              <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">Architect Agent</h3>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Total Requests</span>
                <span class="ai-ide-health-value">89</span>
              </div>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Error Rate</span>
                <span class="ai-ide-health-value success">1.1%</span>
              </div>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">P95</span>
                <span class="ai-ide-health-value">312ms</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('health-panel.png', {
      maxDiffPixels: 100
    });
  });

  test('executor channel visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div style="max-width: 800px; margin: 40px auto;">
          <div class="ai-ide-executor-channel">
            <div class="ai-ide-executor-output-line">[2024-12-09T19:55:00.000Z] Executing: npm test</div>
            <div class="ai-ide-executor-output-line"></div>
            <div class="ai-ide-executor-output-line">Running tests...</div>
            <div class="ai-ide-executor-output-line">  ✓ should pass test 1</div>
            <div class="ai-ide-executor-output-line">  ✓ should pass test 2</div>
            <div class="ai-ide-executor-output-line stderr">[stderr] Warning: deprecated package</div>
            <div class="ai-ide-executor-output-line"></div>
            <div class="ai-ide-executor-output-line">[2024-12-09T19:55:02.345Z] Completed in 2345ms</div>
            <div class="ai-ide-executor-output-line">Exit code: 0</div>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('executor-channel.png', {
      maxDiffPixels: 100
    });
  });

  test('toast notification visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div class="ai-ide-toast error">
          <span class="ai-ide-toast-icon">❌</span>
          <div class="ai-ide-toast-content">
            <div class="ai-ide-toast-title">Command Failed</div>
            <div class="ai-ide-toast-message">Exit code: 1 - Check executor logs for details</div>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('toast-error.png', {
      maxDiffPixels: 50
    });
  });

  test('agent card visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div style="max-width: 400px; margin: 40px auto;">
          <div class="ai-ide-agent-card">
            <div class="ai-ide-agent-name">Coder Agent</div>
            <div class="ai-ide-agent-description">
              Assists with code writing, refactoring, and debugging. 
              Provides intelligent suggestions and improvements.
            </div>
            <div class="ai-ide-agent-status active">
              <span>●</span>
              <span>Active</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('agent-card.png', {
      maxDiffPixels: 50
    });
  });

  test('dark theme consistency', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 40px;">
          <div class="ai-ide-widget">
            <h3 class="ai-ide-widget-title">Surface</h3>
            <p class="ai-ide-text-muted">Default surface</p>
          </div>
          <div class="ai-ide-widget" style="background: var(--ai-ide-surface-alt);">
            <h3 class="ai-ide-widget-title">Surface Alt</h3>
            <p class="ai-ide-text-muted">Alternative surface</p>
          </div>
          <div class="ai-ide-widget ai-ide-widget-elevated">
            <h3 class="ai-ide-widget-title">Elevated</h3>
            <p class="ai-ide-text-muted">Elevated surface</p>
          </div>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('theme-surfaces.png', {
      maxDiffPixels: 100
    });
  });

  test('button states visual snapshot', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="file://${__dirname}/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/style/index.css">
      </head>
      <body>
        <div style="padding: 40px; display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
          <button class="ai-ide-button">Primary Button</button>
          <button class="ai-ide-button ai-ide-button-secondary">Secondary Button</button>
          <button class="ai-ide-button" disabled>Disabled Button</button>
          <button class="ai-ide-button ai-ide-button-icon">⚙</button>
        </div>
      </body>
      </html>
    `);

    await expect(page).toHaveScreenshot('button-states.png', {
      maxDiffPixels: 50
    });
  });
});
