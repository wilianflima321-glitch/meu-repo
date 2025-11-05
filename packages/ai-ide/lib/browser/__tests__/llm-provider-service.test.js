const { LlmProviderService } = require('../llm-provider-service');

describe('LlmProviderService - provider warning emission (compiled)', () => {
  it('fires onDidProviderWarning when provider response contains warnings', async () => {
    const fakeRegistry = { getAll: () => [], getDefaultProviderId: () => undefined };
    const svc = new LlmProviderService(fakeRegistry);

    const mockProvider = {
      id: 'mock-1',
      type: 'custom',
      sendRequest: async (opts) => ({ status: 200, body: { result: 'ok' }, warnings: ['v1', 'v2'] })
    };

    svc.getProvider = _ => mockProvider;

    const captured = [];
    const disp = svc.onDidProviderWarning((ev) => captured.push(ev));

    const resp = await svc.sendRequestToProvider(undefined, { input: 'hello' });

    expect(resp.status).toBe(200);
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].providerId).toBe('mock-1');
    expect(Array.isArray(captured[0].warnings)).toBe(true);
    expect(captured[0].warnings).toContain('v1');

    try { if (typeof disp === 'function') disp(); } catch (e) {}
  });
});
