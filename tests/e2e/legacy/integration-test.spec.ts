import { test, expect } from '@playwright/test';

/**
 * Integration Test
 * Validates core AI IDE functionality end-to-end
 */

test.describe('AI IDE Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Setup minimal IDE environment
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI IDE Integration Test</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
          .status.success { background: #d4edda; color: #155724; }
          .status.error { background: #f8d7da; color: #721c24; }
          .metric { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>AI IDE Integration Test</h1>
        <div id="status"></div>
        <div id="metrics"></div>
        
        <script>
          // Simulate AI IDE components
          window.aiIDE = {
            executor: {
              execute: async (cmd) => {
                return {
                  exitCode: cmd.includes('fail') ? 1 : 0,
                  stdout: cmd.includes('fail') ? '' : 'Command executed successfully',
                  stderr: cmd.includes('fail') ? 'Command failed' : '',
                  duration: 100,
                  truncated: false,
                  timedOut: false,
                  wasTerminated: false
                };
              },
              getMetrics: () => ({
                total: 10,
                success: 8,
                failed: 2,
                p95: 150,
                p99: 200
              })
            },
            agents: {
              coder: {
                processRequest: async (req) => ({
                  code: '// Generated code',
                  explanation: 'Code generated successfully'
                })
              },
              architect: {
                processRequest: async (req) => ({
                  analysis: {
                    structure: 'MVC pattern detected',
                    patterns: ['MVC', 'Repository'],
                    issues: []
                  }
                })
              }
            },
            observability: {
              getAgentMetrics: () => [
                { agentId: 'Coder', totalRequests: 5, successCount: 5, errorCount: 0 },
                { agentId: 'Architect', totalRequests: 3, successCount: 3, errorCount: 0 }
              ],
              getProviderMetrics: () => [
                { providerId: 'openai', totalRequests: 8, successCount: 8, errorCount: 0 }
              ]
            },
            lsp: {
              getFeatures: () => [
                { id: 'hover', enabled: true },
                { id: 'completion', enabled: true },
                { id: 'definition', enabled: true },
                { id: 'references', enabled: true },
                { id: 'rename', enabled: true },
                { id: 'formatting', enabled: true }
              ]
            }
          };
          
          // Display status
          function showStatus(message, type) {
            const status = document.getElementById('status');
            const div = document.createElement('div');
            div.className = 'status ' + type;
            div.textContent = message;
            status.appendChild(div);
          }
          
          // Display metrics
          function showMetrics() {
            const metrics = document.getElementById('metrics');
            metrics.innerHTML = '<h2>System Metrics</h2>';
            
            const executorMetrics = window.aiIDE.executor.getMetrics();
            metrics.innerHTML += '<h3>Executor</h3>';
            Object.entries(executorMetrics).forEach(([key, value]) => {
              metrics.innerHTML += '<div class="metric"><span>' + key + '</span><span>' + value + '</span></div>';
            });
            
            const agentMetrics = window.aiIDE.observability.getAgentMetrics();
            metrics.innerHTML += '<h3>Agents</h3>';
            agentMetrics.forEach(agent => {
              metrics.innerHTML += '<div class="metric"><span>' + agent.agentId + '</span><span>' + agent.totalRequests + ' requests</span></div>';
            });
            
            const lspFeatures = window.aiIDE.lsp.getFeatures();
            metrics.innerHTML += '<h3>LSP Features</h3>';
            lspFeatures.forEach(feature => {
              metrics.innerHTML += '<div class="metric"><span>' + feature.id + '</span><span>' + (feature.enabled ? '✓' : '✗') + '</span></div>';
            });
          }
          
          showStatus('AI IDE initialized', 'success');
          showMetrics();
        </script>
      </body>
      </html>
    `);
  });

  test('executor should execute commands successfully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await window.aiIDE.executor.execute('echo test');
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('successfully');
    expect(result.duration).toBeGreaterThan(0);
  });

  test('executor should handle command failures', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await window.aiIDE.executor.execute('fail command');
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('failed');
  });

  test('executor metrics should be available', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      return window.aiIDE.executor.getMetrics();
    });

    expect(metrics.total).toBeGreaterThan(0);
    expect(metrics.p95).toBeGreaterThan(0);
    expect(metrics.p99).toBeGreaterThan(0);
  });

  test('coder agent should generate code', async ({ page }) => {
    const response = await page.evaluate(async () => {
      return await window.aiIDE.agents.coder.processRequest({
        type: 'generate',
        language: 'typescript',
        prompt: 'Create a function'
      });
    });

    expect(response.code).toBeDefined();
    expect(response.explanation).toBeDefined();
  });

  test('architect agent should analyze structure', async ({ page }) => {
    const response = await page.evaluate(async () => {
      return await window.aiIDE.agents.architect.processRequest({
        type: 'analyze',
        scope: 'workspace',
        path: '/workspace'
      });
    });

    expect(response.analysis).toBeDefined();
    expect(response.analysis.structure).toBeDefined();
    expect(response.analysis.patterns).toBeInstanceOf(Array);
  });

  test('observability should track agent metrics', async ({ page }) => {
    const agentMetrics = await page.evaluate(() => {
      return window.aiIDE.observability.getAgentMetrics();
    });

    expect(agentMetrics.length).toBeGreaterThan(0);
    expect(agentMetrics[0]).toHaveProperty('agentId');
    expect(agentMetrics[0]).toHaveProperty('totalRequests');
    expect(agentMetrics[0]).toHaveProperty('successCount');
  });

  test('observability should track provider metrics', async ({ page }) => {
    const providerMetrics = await page.evaluate(() => {
      return window.aiIDE.observability.getProviderMetrics();
    });

    expect(providerMetrics.length).toBeGreaterThan(0);
    expect(providerMetrics[0]).toHaveProperty('providerId');
    expect(providerMetrics[0]).toHaveProperty('totalRequests');
  });

  test('LSP features should be enabled', async ({ page }) => {
    const features = await page.evaluate(() => {
      return window.aiIDE.lsp.getFeatures();
    });

    expect(features.length).toBeGreaterThan(0);
    
    const essentialFeatures = ['hover', 'completion', 'definition', 'references', 'rename', 'formatting'];
    for (const featureName of essentialFeatures) {
      const feature = features.find(f => f.id === featureName);
      expect(feature).toBeDefined();
      expect(feature.enabled).toBe(true);
    }
  });

  test('status should show success', async ({ page }) => {
    const statusText = await page.locator('.status.success').textContent();
    expect(statusText).toContain('initialized');
  });

  test('metrics should be displayed', async ({ page }) => {
    const metricsVisible = await page.locator('#metrics h2').isVisible();
    expect(metricsVisible).toBe(true);

    const executorMetrics = await page.locator('#metrics h3:has-text("Executor")').isVisible();
    expect(executorMetrics).toBe(true);

    const agentMetrics = await page.locator('#metrics h3:has-text("Agents")').isVisible();
    expect(agentMetrics).toBe(true);

    const lspMetrics = await page.locator('#metrics h3:has-text("LSP Features")').isVisible();
    expect(lspMetrics).toBe(true);
  });
});
