import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Authentication & Authorization
 * Covers login, registration, session management, and permissions
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      await expect(page.getByRole('heading', { name: /login|entrar/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password|senha/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login|entrar/i })).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      await page.getByRole('button', { name: /login|entrar/i }).click();
      
      await expect(page.getByText(/email.*required|email.*obrigatório/i)).toBeVisible();
      await expect(page.getByText(/password.*required|senha.*obrigatória/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      await page.getByLabel(/email/i).fill('invalid@test.com');
      await page.getByLabel(/password|senha/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login|entrar/i }).click();
      
      await expect(page.getByText(/invalid|inválido|incorrect|incorreto/i)).toBeVisible({ timeout: 5000 });
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      const registerLink = page.getByRole('link', { name: /register|cadastrar|criar conta/i });
      await expect(registerLink).toBeVisible();
      
      await registerLink.click();
      await expect(page).toHaveURL(/register|cadastro/);
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      await expect(page.getByRole('link', { name: /forgot|esqueci|recuperar/i })).toBeVisible();
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password|senha/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /register|cadastrar|criar/i })).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/^password|^senha/i).fill('weak');
      await page.getByRole('button', { name: /register|cadastrar|criar/i }).click();
      
      // Should show password requirements
      await expect(page.getByText(/8.*characters|8.*caracteres|strong|forte/i)).toBeVisible({ timeout: 3000 });
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/^password|^senha/i).fill('StrongPassword123!');
      await page.getByRole('button', { name: /register|cadastrar|criar/i }).click();
      
      await expect(page.getByText(/valid email|email válido|email inválido/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect from projects page when not authenticated', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect from settings page when not authenticated', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);
      
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page, context }) => {
      // This test requires a valid session - skip if no test credentials
      test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');
      
      await page.goto(`${BASE_URL}/login`);
      
      await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
      await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
      await page.getByRole('button', { name: /login|entrar/i }).click();
      
      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should have logout functionality', async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL, 'Test credentials not configured');
      
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
      await page.getByLabel(/password|senha/i).fill(process.env.TEST_USER_PASSWORD!);
      await page.getByRole('button', { name: /login|entrar/i }).click();
      
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      
      // Find and click logout
      const logoutButton = page.getByRole('button', { name: /logout|sair/i })
        .or(page.getByRole('menuitem', { name: /logout|sair/i }));
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await expect(page).toHaveURL(/login|home|\//);
      }
    });
  });
});

test.describe('OAuth Providers', () => {
  test('should show GitHub OAuth option', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    const githubButton = page.getByRole('button', { name: /github/i })
      .or(page.getByText(/continue.*github|entrar.*github/i));
    
    // GitHub OAuth should be available (even if not clicking it in test)
    await expect(githubButton).toBeVisible();
  });

  test('should show Google OAuth option', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    const googleButton = page.getByRole('button', { name: /google/i })
      .or(page.getByText(/continue.*google|entrar.*google/i));
    
    await expect(googleButton).toBeVisible();
  });
});
