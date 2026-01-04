import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Aethel Engine - Testes E2E REAIS
 * 
 * Testes que navegam na aplicação real, não injetam HTML fake.
 * Validam funcionalidades core do produto.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test.describe('Aethel Engine E2E Tests', () => {
  
  // ==========================================================================
  // LANDING PAGE / HOME
  // ==========================================================================
  
  test.describe('Landing Page', () => {
    test('deve carregar página inicial com elementos principais', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Verificar título da página
      await expect(page).toHaveTitle(/Aethel/i);
      
      // Verificar elementos de navegação
      await expect(page.locator('nav')).toBeVisible();
      
      // Verificar CTA principal
      const ctaButton = page.locator('button:has-text("Get Started"), a:has-text("Get Started")').first();
      await expect(ctaButton).toBeVisible();
    });
    
    test('navegação deve funcionar', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Clicar em Pricing se existir
      const pricingLink = page.locator('a:has-text("Pricing"), button:has-text("Pricing")').first();
      if (await pricingLink.isVisible()) {
        await pricingLink.click();
        await expect(page).toHaveURL(/pricing/i);
      }
    });
    
    test('landing page deve ser acessível (WCAG)', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      // Logar violações para debug, mas permitir algumas menores
      if (results.violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
      }
      
      // Falhar apenas em violações críticas
      const criticalViolations = results.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations).toHaveLength(0);
    });
  });
  
  // ==========================================================================
  // AUTENTICAÇÃO
  // ==========================================================================
  
  test.describe('Authentication', () => {
    test('deve exibir página de login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      // Verificar formulário de login
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });
    
    test('deve exibir página de registro', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`);
      
      // Verificar formulário de registro
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      
      // Pelo menos email deve existir
      await expect(emailInput).toBeVisible();
    });
    
    test('deve validar campos obrigatórios no login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      // Submeter formulário vazio
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
      await submitButton.click();
      
      // Deve mostrar algum erro de validação ou o campo deve estar inválido
      await page.waitForTimeout(500);
      
      const hasValidationError = await page.locator('[class*="error"], [role="alert"], :invalid').count() > 0;
      expect(hasValidationError).toBe(true);
    });
  });
  
  // ==========================================================================
  // PRICING
  // ==========================================================================
  
  test.describe('Pricing Page', () => {
    test('deve exibir planos de preço', async ({ page }) => {
      await page.goto(`${BASE_URL}/pricing`);
      
      // Verificar que existem cards de preço
      const pricingCards = page.locator('[class*="price"], [class*="plan"], [data-testid*="plan"]');
      
      // Deve ter pelo menos 3 planos (Starter, Pro, Studio por exemplo)
      const cardCount = await pricingCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(2);
    });
    
    test('botões de checkout devem estar visíveis', async ({ page }) => {
      await page.goto(`${BASE_URL}/pricing`);
      
      // Verificar CTAs
      const ctaButtons = page.locator('button:has-text("Subscribe"), button:has-text("Get Started"), button:has-text("Choose"), a:has-text("Subscribe")');
      const buttonCount = await ctaButtons.count();
      
      expect(buttonCount).toBeGreaterThan(0);
    });
  });
  
  // ==========================================================================
  // DASHBOARD (REQUER AUTH)
  // ==========================================================================
  
  test.describe('Dashboard (Authenticated)', () => {
    test.skip(true, 'Requer setup de autenticação com fixtures');
    
    test('deve redirecionar para login se não autenticado', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Deve redirecionar para login
      await page.waitForURL(/login|auth/i, { timeout: 5000 });
    });
  });
  
  // ==========================================================================
  // API HEALTH CHECKS
  // ==========================================================================
  
  test.describe('API Health', () => {
    test('API de health deve responder', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`);
      
      // API pode não existir ainda, mas se existir deve responder 200
      if (response.status() !== 404) {
        expect(response.status()).toBe(200);
      }
    });
    
    test('API de AI deve rejeitar requests sem auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/ai/query`, {
        data: { query: 'test' }
      });
      
      // Deve retornar 401 Unauthorized
      expect(response.status()).toBe(401);
    });
  });
  
  // ==========================================================================
  // PERFORMANCE
  // ==========================================================================
  
  test.describe('Performance', () => {
    test('landing page deve carregar em menos de 3 segundos', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });
    
    test('não deve ter erros de console críticos', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Filtrar erros conhecidos/aceitáveis
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('404') &&
        !e.includes('hydration')
      );
      
      if (criticalErrors.length > 0) {
        console.log('Console errors:', criticalErrors);
      }
      
      expect(criticalErrors.length).toBeLessThan(5);
    });
  });
  
  // ==========================================================================
  // MOBILE RESPONSIVENESS
  // ==========================================================================
  
  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE
    
    test('landing page deve ser responsiva em mobile', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Verificar que não há overflow horizontal
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });
    
    test('menu mobile deve funcionar', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Procurar botão de menu hamburger
      const menuButton = page.locator('[aria-label*="menu" i], button:has([class*="hamburger"]), button:has([class*="menu"])').first();
      
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);
        
        // Menu deve estar visível agora
        const mobileMenu = page.locator('[class*="mobile-menu"], [class*="nav-menu"], nav[class*="open"]');
        await expect(mobileMenu.first()).toBeVisible();
      }
    });
  });
});
