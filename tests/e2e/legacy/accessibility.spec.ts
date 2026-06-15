import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for AI IDE screens
 * Tests contrast, focus, keyboard navigation, and ARIA compliance
 */

test.describe('AI IDE Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Setup base page with AI IDE styles
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI IDE</title>
        <style>
          ${getAIIDEStyles()}
        </style>
      </head>
      <body>
        <div id="app"></div>
      </body>
      </html>
    `);
  });

  test('branding screen should have no accessibility violations', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget">
          <div class="ai-ide-widget-header">
            <h1 class="ai-ide-widget-title">AI IDE</h1>
            <p class="ai-ide-widget-subtitle">Intelligent Development Environment</p>
          </div>
          <div class="ai-ide-widget-actions">
            <button class="ai-ide-button" aria-label="Get Started">Get Started</button>
            <button class="ai-ide-button ai-ide-button-secondary" aria-label="Learn More">Learn More</button>
          </div>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('configuration screen should have no accessibility violations', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget">
          <div class="ai-ide-widget-header">
            <h2 class="ai-ide-widget-title">AI Configuration</h2>
          </div>
          <form>
            <div class="ai-ide-config-section">
              <label class="ai-ide-config-label" for="agent-select">Select Agent</label>
              <select id="agent-select" class="ai-ide-config-select" aria-label="Select AI Agent">
                <option value="coder">Coder</option>
                <option value="architect">Architect</option>
                <option value="universal">Universal</option>
              </select>
            </div>
            <div class="ai-ide-config-section">
              <label class="ai-ide-config-label" for="model-input">Model ID</label>
              <input 
                type="text" 
                id="model-input" 
                class="ai-ide-config-input" 
                placeholder="Enter model ID"
                aria-describedby="model-help"
              />
              <small id="model-help" class="ai-ide-text-muted">Enter the LLM model identifier</small>
            </div>
            <div class="ai-ide-widget-actions">
              <button type="submit" class="ai-ide-button">Save</button>
              <button type="button" class="ai-ide-button ai-ide-button-secondary">Cancel</button>
            </div>
          </form>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('health panel should have no accessibility violations', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget ai-ide-widget-elevated">
          <div class="ai-ide-widget-header">
            <h2 class="ai-ide-widget-title">AI Health</h2>
            <div class="ai-ide-widget-actions">
              <button class="ai-ide-button" aria-label="Refresh metrics">
                <span class="codicon codicon-refresh" aria-hidden="true"></span>
                Refresh
              </button>
              <button class="ai-ide-button" aria-label="Export metrics">
                <span class="codicon codicon-file" aria-hidden="true"></span>
                Export
              </button>
            </div>
          </div>
          <div class="ai-ide-health-panel" role="region" aria-label="Health metrics">
            <div class="ai-ide-health-card">
              <h3 class="ai-ide-widget-title">Coder Agent</h3>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Total Requests</span>
                <span class="ai-ide-health-value">150</span>
              </div>
              <div class="ai-ide-health-metric">
                <span class="ai-ide-health-label">Error Rate</span>
                <span class="ai-ide-health-value success">2.5%</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('admin panel should have no accessibility violations', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget">
          <div class="ai-ide-widget-header">
            <h2 class="ai-ide-widget-title">Admin Panel</h2>
          </div>
          <nav aria-label="Admin navigation">
            <ul style="list-style: none; padding: 0;">
              <li><a href="#users" class="ai-ide-button ai-ide-button-secondary" style="display: block; margin-bottom: 8px;">Users</a></li>
              <li><a href="#settings" class="ai-ide-button ai-ide-button-secondary" style="display: block; margin-bottom: 8px;">Settings</a></li>
              <li><a href="#billing" class="ai-ide-button ai-ide-button-secondary" style="display: block;">Billing</a></li>
            </ul>
          </nav>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('executor channel should have proper focus management', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-executor-channel" role="log" aria-live="polite" aria-label="Command output" tabindex="0">
          <div class="ai-ide-executor-output-line">[2024-12-09] Executing: npm test</div>
          <div class="ai-ide-executor-output-line">Running tests...</div>
          <div class="ai-ide-executor-output-line stderr">[stderr] Warning: deprecated package</div>
          <div class="ai-ide-executor-output-line">Exit code: 0</div>
        </div>
      `;
    });

    // Test keyboard focus
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className);
    expect(focused).toContain('ai-ide-executor-channel');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('toast notifications should be announced to screen readers', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-toast error" role="alert" aria-live="assertive">
          <span class="ai-ide-toast-icon codicon codicon-error" aria-hidden="true"></span>
          <div class="ai-ide-toast-content">
            <div class="ai-ide-toast-title">Command Failed</div>
            <div class="ai-ide-toast-message">Exit code: 1</div>
          </div>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('buttons should have sufficient contrast', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget">
          <button class="ai-ide-button">Primary Action</button>
          <button class="ai-ide-button ai-ide-button-secondary">Secondary Action</button>
          <button class="ai-ide-button ai-ide-button-icon" aria-label="Settings">
            <span class="codicon codicon-gear" aria-hidden="true"></span>
          </button>
        </div>
      `;
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation should work for all interactive elements', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <div class="ai-ide-widget">
          <button id="btn1" class="ai-ide-button">Button 1</button>
          <button id="btn2" class="ai-ide-button">Button 2</button>
          <input id="input1" type="text" class="ai-ide-config-input" placeholder="Input" />
          <select id="select1" class="ai-ide-config-select">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </div>
      `;
    });

    // Tab through elements
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('btn1');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('btn2');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('input1');

    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('select1');
  });

  test('focus indicators should be visible', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('app')!.innerHTML = `
        <button id="test-button" class="ai-ide-button">Test Button</button>
      `;
    });

    await page.focus('#test-button');
    
    const outlineStyle = await page.evaluate(() => {
      const btn = document.getElementById('test-button');
      return window.getComputedStyle(btn!).outline;
    });

    // Should have visible focus indicator
    expect(outlineStyle).not.toBe('none');
  });
});

function getAIIDEStyles(): string {
  return `
    :root {
      --ai-ide-font-stack: 'Inter', 'Segoe UI', Roboto, sans-serif;
      --ai-ide-font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      --ai-ide-brand-primary: #4f46e5;
      --ai-ide-brand-secondary: #ec4899;
      --ai-ide-brand-tertiary: #22d3ee;
      --ai-ide-surface: #1e293b;
      --ai-ide-surface-alt: #273554;
      --ai-ide-surface-elevated: #334155;
      --ai-ide-border: rgba(99, 102, 241, 0.35);
      --ai-ide-border-muted: rgba(148, 163, 184, 0.24);
      --ai-ide-accent: var(--ai-ide-brand-primary);
      --ai-ide-text: #f8fafc;
      --ai-ide-text-muted: #cbd5e1;
      --ai-ide-text-subtle: #94a3b8;
      --ai-ide-radius-sm: 8px;
      --ai-ide-radius-md: 12px;
      --ai-ide-transition: 180ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    * { box-sizing: border-box; }

    body {
      font-family: var(--ai-ide-font-stack);
      background: #0f172a;
      color: var(--ai-ide-text);
      margin: 0;
      padding: 20px;
    }

    .ai-ide-widget {
      background: var(--ai-ide-surface);
      border: 1px solid var(--ai-ide-border);
      border-radius: var(--ai-ide-radius-md);
      padding: 16px;
      color: var(--ai-ide-text);
    }

    .ai-ide-widget-elevated {
      background: var(--ai-ide-surface-elevated);
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.35);
    }

    .ai-ide-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--ai-ide-border-muted);
    }

    .ai-ide-widget-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--ai-ide-text);
      margin: 0;
    }

    .ai-ide-widget-subtitle {
      font-size: 13px;
      color: var(--ai-ide-text-muted);
      margin: 4px 0 0 0;
    }

    .ai-ide-widget-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .ai-ide-button {
      padding: 8px 16px;
      background: var(--ai-ide-accent);
      color: white;
      border: none;
      border-radius: var(--ai-ide-radius-sm);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ai-ide-transition);
    }

    .ai-ide-button:hover {
      background: var(--ai-ide-brand-secondary);
      transform: translateY(-1px);
    }

    .ai-ide-button:focus {
      outline: 2px solid var(--ai-ide-brand-tertiary);
      outline-offset: 2px;
    }

    .ai-ide-button-secondary {
      background: var(--ai-ide-surface-alt);
      color: var(--ai-ide-text);
    }

    .ai-ide-button-icon {
      padding: 8px;
      min-width: 32px;
    }

    .ai-ide-config-section {
      margin-bottom: 16px;
    }

    .ai-ide-config-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--ai-ide-text);
      margin-bottom: 8px;
    }

    .ai-ide-config-input,
    .ai-ide-config-select {
      width: 100%;
      padding: 10px 12px;
      background: var(--ai-ide-surface-alt);
      border: 1px solid var(--ai-ide-border-muted);
      border-radius: var(--ai-ide-radius-sm);
      color: var(--ai-ide-text);
      font-size: 13px;
      font-family: var(--ai-ide-font-stack);
    }

    .ai-ide-config-input:focus,
    .ai-ide-config-select:focus {
      outline: 2px solid var(--ai-ide-accent);
      outline-offset: 2px;
      border-color: var(--ai-ide-accent);
    }

    .ai-ide-health-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .ai-ide-health-card {
      background: var(--ai-ide-surface);
      border: 1px solid var(--ai-ide-border);
      border-radius: var(--ai-ide-radius-md);
      padding: 16px;
    }

    .ai-ide-health-metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .ai-ide-health-label {
      font-size: 13px;
      color: var(--ai-ide-text-muted);
    }

    .ai-ide-health-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--ai-ide-text);
    }

    .ai-ide-health-value.success {
      color: var(--ai-ide-brand-tertiary);
    }

    .ai-ide-executor-channel {
      background: #1e1e1e;
      border: 1px solid var(--ai-ide-border-muted);
      border-radius: var(--ai-ide-radius-sm);
      padding: 12px;
      font-family: var(--ai-ide-font-mono);
      font-size: 12px;
      color: #d4d4d4;
      max-height: 400px;
      overflow-y: auto;
    }

    .ai-ide-executor-channel:focus {
      outline: 2px solid var(--ai-ide-accent);
      outline-offset: 2px;
    }

    .ai-ide-executor-output-line {
      margin: 2px 0;
      white-space: pre-wrap;
    }

    .ai-ide-executor-output-line.stderr {
      color: #f87171;
    }

    .ai-ide-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 300px;
      padding: 12px 16px;
      background: var(--ai-ide-surface-elevated);
      border: 1px solid var(--ai-ide-border);
      border-radius: var(--ai-ide-radius-sm);
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .ai-ide-toast.error {
      border-color: #ef4444;
    }

    .ai-ide-toast-icon {
      flex-shrink: 0;
      font-size: 18px;
    }

    .ai-ide-toast-content {
      flex: 1;
    }

    .ai-ide-toast-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .ai-ide-toast-message {
      font-size: 13px;
      color: var(--ai-ide-text-muted);
    }

    .ai-ide-text-muted {
      color: var(--ai-ide-text-muted);
    }

    .codicon {
      font-family: codicon;
      font-style: normal;
      font-weight: normal;
    }

    .codicon-refresh:before { content: '↻'; }
    .codicon-file:before { content: '📄'; }
    .codicon-error:before { content: '❌'; }
    .codicon-gear:before { content: '⚙'; }
  `;
}
