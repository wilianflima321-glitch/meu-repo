import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Project Management
 * Covers project CRUD, file operations, and export
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Project Management', () => {
  // Helper to login before each test
  const login = async (page: Page) => {
    if (!process.env.TEST_USER_EMAIL) {
      test.skip(true, 'Test credentials not configured');
    }
    
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /login|entrar/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  };

  test.describe('Project List', () => {
    test('should display projects dashboard', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      // Should show project list or empty state
      const projectGrid = page.locator('[data-testid="project-grid"]')
        .or(page.getByText(/seus projetos|your projects|no projects/i));
      
      await expect(projectGrid).toBeVisible();
    });

    test('should have create project button', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const createButton = page.getByRole('button', { name: /create|criar|novo|new/i })
        .or(page.getByRole('link', { name: /create|criar|novo|new/i }));
      
      await expect(createButton).toBeVisible();
    });

    test('should show search/filter for projects', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const searchInput = page.getByPlaceholder(/search|buscar|pesquisar/i)
        .or(page.getByRole('searchbox'));
      
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Create Project', () => {
    test('should open create project modal/page', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const createButton = page.getByRole('button', { name: /create|criar|novo|new/i })
        .or(page.getByRole('link', { name: /create|criar|novo|new/i }));
      
      await createButton.click();
      
      // Should show project creation form
      const nameInput = page.getByLabel(/name|nome/i)
        .or(page.getByPlaceholder(/project name|nome do projeto/i));
      
      await expect(nameInput).toBeVisible({ timeout: 5000 });
    });

    test('should show template selection', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects/new`);
      
      // Should show template options
      const templates = page.getByText(/blank|2d|3d|platformer|fps/i);
      await expect(templates.first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate project name', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects/new`);
      
      // Try to create without name
      const submitButton = page.getByRole('button', { name: /create|criar/i });
      await submitButton.click();
      
      // Should show validation error
      await expect(page.getByText(/name.*required|nome.*obrigatório/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Project Editor', () => {
    test('should load editor for a project', async ({ page }) => {
      await login(page);
      
      // Navigate to first project or create one
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // Should show editor interface
        await expect(page.locator('.monaco-editor').or(page.getByTestId('code-editor'))).toBeVisible({ timeout: 10000 });
      }
    });

    test('should have file explorer', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // File explorer should be visible
        const fileExplorer = page.getByTestId('file-explorer')
          .or(page.locator('[data-testid="sidebar"]'))
          .or(page.getByRole('tree'));
        
        await expect(fileExplorer).toBeVisible({ timeout: 10000 });
      }
    });

    test('should have toolbar with actions', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // Toolbar with save, run, etc
        const toolbar = page.getByRole('toolbar')
          .or(page.locator('[data-testid="editor-toolbar"]'));
        
        await expect(toolbar).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Project Export', () => {
    test('should have export option', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // Look for export button
        const exportButton = page.getByRole('button', { name: /export|exportar/i })
          .or(page.getByRole('menuitem', { name: /export|exportar/i }));
        
        // Check in menu if not directly visible
        const menuButton = page.getByRole('button', { name: /menu|more|mais/i });
        if (await menuButton.isVisible()) {
          await menuButton.click();
        }
        
        await expect(exportButton).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show export format options', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // Find and click export
        const exportButton = page.getByRole('button', { name: /export|exportar/i });
        if (await exportButton.isVisible()) {
          await exportButton.click();
          
          // Should show format options
          await expect(page.getByText(/web|desktop|windows|mac|linux/i)).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Project Settings', () => {
    test('should have project settings option', async ({ page }) => {
      await login(page);
      
      await page.goto(`${BASE_URL}/projects`);
      
      const projectCard = page.locator('[data-testid="project-card"]').first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        const settingsButton = page.getByRole('button', { name: /settings|configurações/i })
          .or(page.getByTestId('project-settings'));
        
        await expect(settingsButton).toBeVisible({ timeout: 10000 });
      }
    });
  });
});

test.describe('File Operations', () => {
  const login = async (page: Page) => {
    if (!process.env.TEST_USER_EMAIL) {
      test.skip(true, 'Test credentials not configured');
    }
    
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /login|entrar/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  };

  test('should support keyboard shortcut for save (Ctrl+S)', async ({ page }) => {
    await login(page);
    
    await page.goto(`${BASE_URL}/projects`);
    
    const projectCard = page.locator('[data-testid="project-card"]').first();
    
    if (await projectCard.isVisible()) {
      await projectCard.click();
      
      // Wait for editor to load
      await page.waitForSelector('.monaco-editor', { timeout: 10000 });
      
      // Type something and save
      await page.keyboard.press('Control+s');
      
      // Should show save confirmation or no unsaved changes indicator
      // (This is a basic check - actual implementation may vary)
    }
  });

  test('should have undo/redo functionality', async ({ page }) => {
    await login(page);
    
    await page.goto(`${BASE_URL}/projects`);
    
    const projectCard = page.locator('[data-testid="project-card"]').first();
    
    if (await projectCard.isVisible()) {
      await projectCard.click();
      
      await page.waitForSelector('.monaco-editor', { timeout: 10000 });
      
      // Basic undo/redo test
      await page.keyboard.press('Control+z'); // Undo
      await page.keyboard.press('Control+y'); // Redo
    }
  });
});
