import { test, expect } from '@playwright/test';

const MOCK_URL = process.env.MOCK_URL || 'http://127.0.0.1:8010/api';

test('ensemble runtime creates usage events for member providers', async ({ request }) => {
  const p1 = {
    id: 'prov-run-1',
    name: 'run-prov-1',
    type: 'custom',
    endpoint: `${MOCK_URL}/provider-backend-1`,
    rateCard: { pricePerToken: 0.0001, currency: 'USD' }
  };
  const p2 = {
    id: 'prov-run-2',
    name: 'run-prov-2',
    type: 'custom',
    endpoint: `${MOCK_URL}/provider-backend-2`,
    rateCard: { pricePerToken: 0.0001, currency: 'USD' }
  };

  // cleanup
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent(p1.id)}`).catch(() => {});
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent(p2.id)}`).catch(() => {});
  await request.delete(`${MOCK_URL}/llm/providers/${encodeURIComponent('ensemble-run')}`).catch(() => {});

  const r1 = await request.post(`${MOCK_URL}/llm/providers`, { data: p1 });
  expect(r1.ok()).toBeTruthy();
  const r2 = await request.post(`${MOCK_URL}/llm/providers`, { data: p2 });
  expect(r2.ok()).toBeTruthy();

  const ensemble = {
    id: 'ensemble-run',
    name: 'Run Ensemble',
    type: 'ensemble',
    providerIds: [p1.id, p2.id],
    mode: 'fast',
    timeoutMs: 1500
  };

  const re = await request.post(`${MOCK_URL}/llm/providers`, { data: ensemble });
  expect(re.ok()).toBeTruthy();

  const requestId = `run-${Date.now()}`;
  const rr = await request.post(`${MOCK_URL}/llm/dev/run-ensemble/${encodeURIComponent(ensemble.id)}`, { data: { requestId, userId: 'e2e-user', tokensInput: 2, tokensOutput: 4, model: 'gpt-test' } });
  expect(rr.status()).toBe(202);
  const json = await rr.json();
  expect(json.requestId).toBe(requestId);
  expect(Array.isArray(json.created)).toBeTruthy();
  // wait a short moment for persistence
  await new Promise(r => setTimeout(r, 100));
  const usage = await request.get(`${MOCK_URL}/llm/usage?requestId=${encodeURIComponent(requestId)}`);
  expect(usage.ok()).toBeTruthy();
  const events = await usage.json();
  // we expect one usage event per member provider
  const provIds = events.map((e: any) => e.providerId);
  expect(provIds).toContain(p1.id);
  expect(provIds).toContain(p2.id);
  expect(events.length).toBeGreaterThanOrEqual(2);
});
