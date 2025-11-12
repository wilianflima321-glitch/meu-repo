import { test, expect } from '@playwright/test';

const MOCK_URL = process.env.MOCK_URL || 'http://127.0.0.1:8010/api';

test('create ensemble via mock API and verify', async ({ request }) => {
  // Create two simple custom providers
  const p1 = {
    id: 'prov-playwright-1',
    name: 'pw-prov-1',
    type: 'custom',
    endpoint: `${MOCK_URL}/provider-backend-1`,
    rateCard: { pricePerToken: 0.0001, currency: 'USD' }
  };
  const p2 = {
    id: 'prov-playwright-2',
    name: 'pw-prov-2',
    type: 'custom',
    endpoint: `${MOCK_URL}/provider-backend-2`,
    rateCard: { pricePerToken: 0.0001, currency: 'USD' }
  };

  // Ensure a clean state: delete if exists
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent(p1.id)}`).catch(() => {});
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent(p2.id)}`).catch(() => {});
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent('ensemble-pw')}`).catch(() => {});

  const r1 = await request.post(`${MOCK_URL}/llm/providers`, { data: p1 });
  expect(r1.ok()).toBeTruthy();
  const r2 = await request.post(`${MOCK_URL}/llm/providers`, { data: p2 });
  expect(r2.ok()).toBeTruthy();

  const ensemble = {
    id: 'ensemble-pw',
    name: 'Playwright Ensemble',
    type: 'ensemble',
    providerIds: [p1.id, p2.id],
    mode: 'fast',
    timeoutMs: 1500
  };

  const re = await request.post(`${MOCK_URL}/llm/providers`, { data: ensemble });
  expect(re.ok()).toBeTruthy();

  const list = await request.get(`${MOCK_URL}/llm/providers`);
  expect(list.ok()).toBeTruthy();
  const json = await list.json();
  const found = (json as any[]).find(x => x.id === ensemble.id);
  expect(found).toBeTruthy();
  expect(found.type).toBe('ensemble');
  expect(Array.isArray(found.providerIds)).toBeTruthy();
  expect(found.providerIds).toContain(p1.id);
  expect(found.providerIds).toContain(p2.id);
});
