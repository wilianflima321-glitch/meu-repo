import { test, expect } from '@playwright/test';

// These proxy tests exercise the Theia backend proxy at /ai-proxy.
// They are skipped by default; set RUN_PROXY_TESTS=1 to enable when a
// Theia backend with the AethelBackendService is running locally.
const runProxy = !!process.env.RUN_PROXY_TESTS;

test.describe('theia backend proxy (optional)', () => {
  test.skip(!runProxy, 'Proxy tests skipped unless RUN_PROXY_TESTS=1');

  test('proxy /ai-proxy/health forwards to mock backend', async ({ request }) => {
    const res = await request.get('/ai-proxy/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  test('proxy /ai-proxy/api/items returns items array', async ({ request }) => {
    const res = await request.get('/ai-proxy/api/items');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});
