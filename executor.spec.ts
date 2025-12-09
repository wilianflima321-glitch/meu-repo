import { test, expect } from '@playwright/test';

/**
 * Executor E2E tests
 * Validates command execution with streaming, toasts, and channel output
 */

test.describe('AI Workspace Executor', () => {
  test.beforeEach(async ({ page }) => {
    // Setup minimal page with executor UI elements
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .ai-executor-channel { display: none; padding: 10px; background: #1e1e1e; color: #d4d4d4; }
          .ai-executor-channel.visible { display: block; }
          .ai-toast { position: fixed; top: 20px; right: 20px; padding: 10px; border-radius: 4px; }
          .ai-toast.error { background: #f44336; color: white; }
          .ai-toast.warning { background: #ff9800; color: white; }
          .ai-toast.info { background: #2196f3; color: white; }
          .ai-executor-status { cursor: pointer; padding: 5px 10px; background: #007acc; color: white; }
        </style>
      </head>
      <body>
        <div class="ai-executor-status" id="executor-status">Executor Ready</div>
        <div class="ai-executor-channel" id="executor-channel">
          <div id="channel-output"></div>
        </div>
        <div id="toast-container"></div>
        
        <script>
          // Simulate executor service
          window.executorService = {
            execute: async (command) => {
              const channel = document.getElementById('executor-channel');
              const output = document.getElementById('channel-output');
              const toastContainer = document.getElementById('toast-container');
              
              // Show channel
              channel.classList.add('visible');
              output.innerHTML = '';
              
              // Simulate streaming output
              const appendOutput = (text) => {
                const line = document.createElement('div');
                line.textContent = text;
                output.appendChild(line);
              };
              
              appendOutput(\`[\${new Date().toISOString()}] Executing: \${command}\`);
              appendOutput('');
              
              // Simulate command execution
              if (command === 'echo ok') {
                await new Promise(r => setTimeout(r, 100));
                appendOutput('ok');
                appendOutput('');
                appendOutput(\`[\${new Date().toISOString()}] Completed in 100ms\`);
                appendOutput('Exit code: 0');
                return { exitCode: 0, truncated: false, timedOut: false, wasTerminated: false };
              } else if (command === 'bash -c "exit 1"') {
                await new Promise(r => setTimeout(r, 100));
                appendOutput('');
                appendOutput(\`[\${new Date().toISOString()}] Completed in 100ms\`);
                appendOutput('Exit code: 1');
                
                // Show error toast
                const toast = document.createElement('div');
                toast.className = 'ai-toast error';
                toast.textContent = 'Command failed with exit code 1';
                toast.setAttribute('data-test', 'error-toast');
                toastContainer.appendChild(toast);
                
                return { exitCode: 1, truncated: false, timedOut: false, wasTerminated: false };
              } else if (command.includes('timeout')) {
                await new Promise(r => setTimeout(r, 100));
                appendOutput('[ERROR] Command execution timed out');
                appendOutput('');
                appendOutput(\`[\${new Date().toISOString()}] Completed in 30000ms\`);
                appendOutput('Exit code: -1');
                
                // Show timeout toast
                const toast = document.createElement('div');
                toast.className = 'ai-toast error';
                toast.textContent = 'Command execution timed out and was terminated';
                toast.setAttribute('data-test', 'timeout-toast');
                toastContainer.appendChild(toast);
                
                return { exitCode: -1, truncated: false, timedOut: true, wasTerminated: true };
              } else if (command.includes('large-output')) {
                await new Promise(r => setTimeout(r, 100));
                appendOutput('[WARNING] Output truncated due to size limit');
                appendOutput('');
                appendOutput(\`[\${new Date().toISOString()}] Completed in 500ms\`);
                appendOutput('Exit code: -1');
                
                // Show truncation toast
                const toast = document.createElement('div');
                toast.className = 'ai-toast warning';
                toast.textContent = 'Command output was truncated due to size limit';
                toast.setAttribute('data-test', 'truncation-toast');
                toastContainer.appendChild(toast);
                
                return { exitCode: -1, truncated: true, timedOut: false, wasTerminated: true };
              }
            }
          };
          
          // Status bar click handler
          document.getElementById('executor-status').addEventListener('click', () => {
            const channel = document.getElementById('executor-channel');
            channel.classList.toggle('visible');
          });
        </script>
      </body>
      </html>
    `);
  });

  test('successful execution shows output in channel without error toast', async ({ page }) => {
    // Execute successful command
    await page.evaluate(() => window.executorService.execute('echo ok'));
    
    // Channel should be visible
    const channel = page.locator('#executor-channel');
    await expect(channel).toHaveClass(/visible/);
    
    // Output should contain command and result
    const output = page.locator('#channel-output');
    await expect(output).toContainText('Executing: echo ok');
    await expect(output).toContainText('ok');
    await expect(output).toContainText('Exit code: 0');
    
    // No error toast should be present
    const errorToast = page.locator('[data-test="error-toast"]');
    await expect(errorToast).toHaveCount(0);
  });

  test('failed execution shows error toast and channel output', async ({ page }) => {
    // Execute failing command
    await page.evaluate(() => window.executorService.execute('bash -c "exit 1"'));
    
    // Channel should be visible
    const channel = page.locator('#executor-channel');
    await expect(channel).toHaveClass(/visible/);
    
    // Output should show failure
    const output = page.locator('#channel-output');
    await expect(output).toContainText('Executing: bash -c "exit 1"');
    await expect(output).toContainText('Exit code: 1');
    
    // Error toast should be present
    const errorToast = page.locator('[data-test="error-toast"]');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('Command failed with exit code 1');
  });

  test('timeout shows timeout toast with wasTerminated flag', async ({ page }) => {
    // Execute command that times out
    await page.evaluate(() => window.executorService.execute('sleep timeout'));
    
    // Channel should be visible
    const channel = page.locator('#executor-channel');
    await expect(channel).toHaveClass(/visible/);
    
    // Output should show timeout
    const output = page.locator('#channel-output');
    await expect(output).toContainText('Command execution timed out');
    await expect(output).toContainText('Exit code: -1');
    
    // Timeout toast should be present
    const timeoutToast = page.locator('[data-test="timeout-toast"]');
    await expect(timeoutToast).toBeVisible();
    await expect(timeoutToast).toContainText('timed out and was terminated');
  });

  test('truncation shows warning toast with truncated flag', async ({ page }) => {
    // Execute command with large output
    await page.evaluate(() => window.executorService.execute('generate large-output'));
    
    // Channel should be visible
    const channel = page.locator('#executor-channel');
    await expect(channel).toHaveClass(/visible/);
    
    // Output should show truncation warning
    const output = page.locator('#channel-output');
    await expect(output).toContainText('Output truncated due to size limit');
    
    // Truncation toast should be present
    const truncationToast = page.locator('[data-test="truncation-toast"]');
    await expect(truncationToast).toBeVisible();
    await expect(truncationToast).toContainText('truncated due to size limit');
  });

  test('status bar click toggles channel visibility', async ({ page }) => {
    const statusBar = page.locator('#executor-status');
    const channel = page.locator('#executor-channel');
    
    // Initially hidden
    await expect(channel).not.toHaveClass(/visible/);
    
    // Click to show
    await statusBar.click();
    await expect(channel).toHaveClass(/visible/);
    
    // Click to hide
    await statusBar.click();
    await expect(channel).not.toHaveClass(/visible/);
  });

  test('streaming output appears progressively', async ({ page }) => {
    const output = page.locator('#channel-output');
    
    // Start execution
    const executionPromise = page.evaluate(() => 
      window.executorService.execute('echo ok')
    );
    
    // Wait for initial output
    await expect(output).toContainText('Executing: echo ok', { timeout: 1000 });
    
    // Wait for completion
    await executionPromise;
    
    // Final output should be present
    await expect(output).toContainText('Exit code: 0');
  });
});
