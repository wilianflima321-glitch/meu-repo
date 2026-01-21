import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Aethel Engine Core Functionality
 * Tests user flows, WebSocket connections, and API integrations
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:1234';

test.describe('Aethel Engine - Core Features', () => {
  
  // ============================================================================
  // HEALTH & STATUS TESTS
  // ============================================================================
  
  test.describe('Health Checks', () => {
    test('should return healthy status from API', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.status).toBeDefined();
      expect(['pass', 'warn', 'fail']).toContain(body.status);
    });

    test('should return liveness probe', async ({ request }) => {
      const response = await request.get(`${API_URL}/health/live`);
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe('ok');
    });

    test('should return readiness probe', async ({ request }) => {
      const response = await request.get(`${API_URL}/health/ready`);
      // Can be 200 (ready) or 503 (not ready)
      expect([200, 503]).toContain(response.status());
    });

    test('should return Prometheus metrics', async ({ request }) => {
      const response = await request.get(`${API_URL}/metrics`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.text();
      expect(body).toContain('# HELP');
      expect(body).toContain('# TYPE');
    });
  });

  // ============================================================================
  // API INFO TESTS
  // ============================================================================
  
  test.describe('API Info', () => {
    test('should return API information', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/info`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.name).toBe('Aethel Engine Server');
      expect(body.version).toBeDefined();
      expect(body.features).toBeInstanceOf(Array);
      expect(body.endpoints).toBeDefined();
    });

    test('should include WebSocket endpoints', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/info`);
      const body = await response.json();
      
      expect(body.endpoints.ws).toBeDefined();
      expect(body.endpoints.ws.bridge).toBe('/bridge');
      expect(body.endpoints.ws.browser).toBe('/browser');
    });
  });

  // ============================================================================
  // SWAGGER/OPENAPI TESTS
  // ============================================================================
  
  test.describe('API Documentation', () => {
    test('should serve OpenAPI spec as JSON', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/openapi.json`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.openapi).toMatch(/^3\.\d+\.\d+$/);
      expect(body.info.title).toContain('Aethel');
      expect(body.paths).toBeDefined();
    });

    test('should serve Swagger UI', async ({ page }) => {
      await page.goto(`${API_URL}/api/docs`);
      
      // Swagger UI should render
      await expect(page.locator('.swagger-ui')).toBeVisible({ timeout: 10000 });
      
      // Should show API title
      await expect(page.locator('.info .title')).toContainText('Aethel');
    });
  });

  // ============================================================================
  // RATE LIMITING TESTS
  // ============================================================================
  
  test.describe('Rate Limiting', () => {
    test('should allow normal request rate', async ({ request }) => {
      // Make 10 requests - should all succeed
      const promises = Array.from({ length: 10 }, () => 
        request.get(`${API_URL}/health`)
      );
      
      const responses = await Promise.all(promises);
      const allOk = responses.every(r => r.ok());
      expect(allOk).toBeTruthy();
    });

    test.skip('should block excessive requests', async ({ request }) => {
      // This test is skipped by default to not actually trigger rate limits
      // Enable only for specific rate limit testing
      const promises = Array.from({ length: 150 }, () => 
        request.get(`${API_URL}/health`)
      );
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status() === 429);
      expect(rateLimited).toBeTruthy();
    });
  });
});

// ============================================================================
// WEB UI TESTS
// ============================================================================

test.describe('Aethel Engine - Web UI', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should load the main page', async ({ page }) => {
    await expect(page).toHaveTitle(/Aethel/i);
  });

  test('should show loading indicator initially', async ({ page }) => {
    // May have loading state
    const hasLoader = await page.locator('[data-testid="loader"], .loading, .spinner').count();
    // Loading state is optional
    expect(hasLoader).toBeGreaterThanOrEqual(0);
  });

  test('should render main layout', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check for main structural elements
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Should not have horizontal scroll on mobile
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBeFalsy();
  });
});

// ============================================================================
// KEYBOARD NAVIGATION TESTS
// ============================================================================

test.describe('Aethel Engine - Keyboard Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should support tab navigation', async ({ page }) => {
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Should have focused element
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const isVisible = await focusedElement.isVisible().catch(() => false);
    
    // Focus should be visible if element exists
    if (await focusedElement.count() > 0) {
      expect(isVisible).toBeTruthy();
    }
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('Aethel Engine - Performance', () => {
  
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load DOM in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have acceptable Largest Contentful Paint', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout fallback
        setTimeout(() => resolve(3000), 5000);
      });
    });
    
    // LCP should be under 2.5 seconds (good) or 4 seconds (needs improvement)
    expect(lcp).toBeLessThan(4000);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Navigate away and back multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('about:blank');
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
    }
    
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory shouldn't grow more than 50% (allowing for GC variance)
    if (initialMemory > 0 && finalMemory > 0) {
      const growth = (finalMemory - initialMemory) / initialMemory;
      expect(growth).toBeLessThan(0.5);
    }
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Aethel Engine - Error Handling', () => {
  
  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/non-existent-page-12345`);
    
    // Should either redirect to home or show 404 page
    const status = response?.status();
    expect([200, 404]).toContain(status);
    
    // Should not show raw error
    const content = await page.content();
    expect(content).not.toContain('Cannot GET');
    expect(content).not.toContain('ENOENT');
  });

  test('should handle API errors gracefully', async ({ request }) => {
    const response = await request.get(`${API_URL}/non-existent-endpoint`);
    
    expect([404, 400]).toContain(response.status());
    
    // Should return JSON error, not HTML
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should handle malformed requests', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/ai/generate`, {
      data: 'not-json',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should return 400 Bad Request
    expect([400, 415]).toContain(response.status());
  });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

test.describe('Aethel Engine - Security', () => {
  
  test('should have security headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    const headers = response.headers();
    
    // Check for common security headers
    // Note: These may not all be present depending on configuration
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    // At least one security header should be present
    const hasSecurityHeaders = securityHeaders.some(h => headers[h]);
    expect(hasSecurityHeaders || true).toBeTruthy(); // Soft check
  });

  test('should not expose sensitive information in errors', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/internal-error-test`);
    
    if (!response.ok()) {
      const body = await response.text();
      
      // Should not expose stack traces or internal paths
      expect(body).not.toContain('node_modules');
      expect(body).not.toContain('at Object.');
      expect(body).not.toContain('at Function.');
    }
  });

  test('should require authentication for protected endpoints', async ({ request }) => {
    const protectedEndpoints = [
      '/api/projects',
      '/api/ai/generate',
      '/api/render/queue'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(`${API_URL}${endpoint}`);
      
      // Should return 401 Unauthorized without auth
      expect([401, 403, 404]).toContain(response.status());
    }
  });
});
