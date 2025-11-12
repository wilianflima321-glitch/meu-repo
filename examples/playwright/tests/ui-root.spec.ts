import { test, expect } from '@playwright/test';

test.describe('mock backend (root)', () => {
  test('root path returns plain text status', async ({ request }) => {
    const res = await request.get('/');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('Dev mock backend running');
  });
});
