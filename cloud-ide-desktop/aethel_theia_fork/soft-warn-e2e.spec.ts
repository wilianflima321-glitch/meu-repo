import { test, expect, request } from '@playwright/test';

// End-to-end test against the mock backend. Requires mock server running at http://localhost:8010
test.describe('LLM mock ensemble E2E', () => {
  test('run-ensemble returns warnings and records usage events', async () => {
  const base = 'http://127.0.0.1:8010';
    const api = await request.newContext();

    // create two simple providers to act as ensemble members
    const p1 = await api.post(`${base}/api/llm/providers`, { data: { id: 'prov-a', name: 'pA', type: 'custom' } });
    expect(p1.ok()).toBeTruthy();
    const p2 = await api.post(`${base}/api/llm/providers`, { data: { id: 'prov-b', name: 'pB', type: 'custom' } });
    expect(p2.ok()).toBeTruthy();

    // create an ensemble provider that references them and enable soft verification + physics checks
    const ensembleRec = { id: 'ensemble-1', name: 'ens1', type: 'ensemble', providerIds: ['prov-a','prov-b'], verificationMode: 'soft', constraints: ['physics_checks'] };
    const eResp = await api.post(`${base}/api/llm/providers`, { data: ensembleRec });
    expect(eResp.ok()).toBeTruthy();

    // post a scene with an impossible throw
    const scene = {
      worldRules: { gravity: 9.81 },
      entities: [ { id: 'actor-1' } ],
      actions: [ { actorId: 'actor-1', verb: 'throw', params: { v0: 1, angleDeg: 20, targetDistance: 100 } } ]
    };

    const run = await api.post(`${base}/api/llm/dev/run-ensemble/ensemble-1`, { data: { scene, requestId: 'r-e2e-1' } });
    // ensemble is in soft mode so server should return 202 with warnings
    expect(run.status()).toBe(202);
    const body = await run.json();
    expect(body).toHaveProperty('warnings');
    expect(Array.isArray(body.warnings)).toBe(true);
    expect(body.warnings.length).toBeGreaterThan(0);

    // verify usage events were created
    const usage = await api.get(`${base}/api/llm/usage?requestId=r-e2e-1`);
    expect(usage.ok()).toBeTruthy();
    const ubody = await usage.json();
    expect(Array.isArray(ubody)).toBe(true);
    expect(ubody.length).toBeGreaterThanOrEqual(1);
    await api.dispose();
  });
});
