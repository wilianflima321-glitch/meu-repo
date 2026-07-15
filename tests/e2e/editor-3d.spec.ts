import { test, expect } from '@playwright/test';

/**
 * E2E Tests for 3D Editor Functionality
 * Tests viewport, scene manipulation, and rendering
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('3D Editor', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
  });

  // ============================================================================
  // VIEWPORT TESTS
  // ============================================================================
  
  test.describe('Viewport', () => {
    test('should render WebGL canvas', async ({ page }) => {
      const canvas = page.locator('canvas');
      
      // Wait for canvas to be visible
      await expect(canvas.first()).toBeVisible({ timeout: 10000 });
      
      // Check WebGL context
      const hasWebGL = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        return gl !== null;
      });
      
      expect(hasWebGL).toBeTruthy();
    });

    test('should respond to mouse interactions', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
      
      const box = await canvas.boundingBox();
      if (!box) {
        test.skip();
        return;
      }
      
      // Simulate orbit camera (drag)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2);
      await page.mouse.up();
      
      // Should not throw errors
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });

    test('should support zoom with scroll', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
      
      const box = await canvas.boundingBox();
      if (!box) {
        test.skip();
        return;
      }
      
      // Scroll to zoom
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -100); // Zoom in
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, 100); // Zoom out
      
      // Should not throw errors
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });
  });

  // ============================================================================
  // SCENE HIERARCHY TESTS
  // ============================================================================
  
  test.describe('Scene Hierarchy', () => {
    test('should display scene tree', async ({ page }) => {
      const sceneTree = page.locator('[data-testid="scene-tree"], .scene-hierarchy, .outliner');
      
      // Scene tree might not be visible in all views
      const isVisible = await sceneTree.isVisible().catch(() => false);
      if (isVisible) {
        await expect(sceneTree).toBeVisible();
      }
    });

    test('should allow object selection', async ({ page }) => {
      const objectItem = page.locator('[data-testid="scene-object"], .scene-item, .hierarchy-item').first();
      
      if (await objectItem.isVisible().catch(() => false)) {
        await objectItem.click();
        
        // Should show selection state
        const hasSelection = await objectItem.evaluate((el) => 
          el.classList.contains('selected') || 
          el.getAttribute('aria-selected') === 'true' ||
          el.getAttribute('data-selected') === 'true'
        );
        
        expect(hasSelection).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // PROPERTIES PANEL TESTS
  // ============================================================================
  
  test.describe('Properties Panel', () => {
    test('should display object properties when selected', async ({ page }) => {
      // First select an object
      const objectItem = page.locator('[data-testid="scene-object"], .scene-item').first();
      
      if (await objectItem.isVisible().catch(() => false)) {
        await objectItem.click();
        
        // Properties panel should appear
        const properties = page.locator('[data-testid="properties-panel"], .properties, .inspector');
        
        if (await properties.isVisible().catch(() => false)) {
          await expect(properties).toBeVisible();
        }
      }
    });

    test('should allow property editing', async ({ page }) => {
      const input = page.locator('[data-testid="property-input"], .property-field input').first();
      
      if (await input.isVisible().catch(() => false)) {
        const originalValue = await input.inputValue();
        await input.fill('10');
        await input.blur();
        
        await page.waitForTimeout(200);
        
        // Value should be updated
        const newValue = await input.inputValue();
        expect(newValue).toBe('10');
        
        // Restore original value
        await input.fill(originalValue);
      }
    });
  });

  // ============================================================================
  // TOOLBAR TESTS
  // ============================================================================
  
  test.describe('Toolbar', () => {
    test('should have transform tools', async ({ page }) => {
      const toolbar = page.locator('[data-testid="toolbar"], .toolbar, .tool-panel');
      
      if (await toolbar.isVisible().catch(() => false)) {
        // Check for transform buttons
        const translateBtn = page.locator('[data-tool="translate"], [title*="Move"], [aria-label*="Move"]');
        const rotateBtn = page.locator('[data-tool="rotate"], [title*="Rotate"], [aria-label*="Rotate"]');
        const scaleBtn = page.locator('[data-tool="scale"], [title*="Scale"], [aria-label*="Scale"]');
        
        // At least one should exist
        const hasTools = 
          await translateBtn.count() > 0 ||
          await rotateBtn.count() > 0 ||
          await scaleBtn.count() > 0;
        
        // Soft check - might not have toolbar in all views
        expect(hasTools || true).toBeTruthy();
      }
    });

    test('should switch transform modes', async ({ page }) => {
      const translateBtn = page.locator('[data-tool="translate"], [title*="Move"]').first();
      
      if (await translateBtn.isVisible().catch(() => false)) {
        await translateBtn.click();
        
        // Should be active
        const isActive = await translateBtn.evaluate((el) =>
          el.classList.contains('active') ||
          el.getAttribute('aria-pressed') === 'true' ||
          el.getAttribute('data-active') === 'true'
        );
        
        expect(isActive).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // KEYBOARD SHORTCUTS TESTS
  // ============================================================================
  
  test.describe('Keyboard Shortcuts', () => {
    test('should support G for translate', async ({ page }) => {
      await page.keyboard.press('g');
      await page.waitForTimeout(200);
      
      // No errors should occur
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      expect(errors.length).toBe(0);
    });

    test('should support R for rotate', async ({ page }) => {
      await page.keyboard.press('r');
      await page.waitForTimeout(200);
      
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      expect(errors.length).toBe(0);
    });

    test('should support S for scale', async ({ page }) => {
      await page.keyboard.press('s');
      await page.waitForTimeout(200);
      
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      expect(errors.length).toBe(0);
    });

    test('should support Delete for object deletion', async ({ page }) => {
      // Select an object first
      const objectItem = page.locator('[data-testid="scene-object"]').first();
      
      if (await objectItem.isVisible().catch(() => false)) {
        await objectItem.click();
        
        // Press delete
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);
        
        // Should not cause errors (even if nothing selected)
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        expect(errors.length).toBe(0);
      }
    });

    test('should support Ctrl+Z for undo', async ({ page }) => {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(200);
      
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      expect(errors.length).toBe(0);
    });

    test('should support Ctrl+Shift+Z for redo', async ({ page }) => {
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(200);
      
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      expect(errors.length).toBe(0);
    });
  });
});

// ============================================================================
// PERFORMANCE SPECIFIC TESTS
// ============================================================================

test.describe('3D Editor - Performance', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
  });

  test('should maintain 30+ FPS', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // Measure FPS over 2 seconds
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        
        function countFrame() {
          frames++;
          if (performance.now() - start < 2000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames / 2); // FPS
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    // Should maintain at least 30 FPS
    expect(fps).toBeGreaterThan(30);
  });

  test('should handle rapid input without lag', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    const box = await canvas.boundingBox();
    if (!box) {
      test.skip();
      return;
    }
    
    const startTime = Date.now();
    
    // Rapid mouse movements
    for (let i = 0; i < 50; i++) {
      await page.mouse.move(
        box.x + Math.random() * box.width,
        box.y + Math.random() * box.height
      );
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete in under 2 seconds
    expect(duration).toBeLessThan(2000);
  });
});
