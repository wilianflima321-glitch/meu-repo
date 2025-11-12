#!/usr/bin/env node
'use strict';

// Lightweight smoke test for provider warning emission logic.
// This does not depend on Theia/inversify — it implements a small compatible class

function createLlmProviderServiceStandalone() {
  class LlmProviderServiceStandalone {
    constructor(registry) {
      this.registry = registry;
      this._subs = [];
    }
    // event subscribe: returns an unsubscribe function
    onDidProviderWarning(cb) {
      this._subs.push(cb);
      return () => { const i = this._subs.indexOf(cb); if (i >= 0) this._subs.splice(i, 1); };
    }
    getProvider(_) {
      const all = this.registry && typeof this.registry.getAll === 'function' ? this.registry.getAll() : [];
      const pid = this.registry && typeof this.registry.getDefaultProviderId === 'function' ? this.registry.getDefaultProviderId() : undefined;
      return undefined; // caller may monkeypatch
    }
    async sendRequestToProvider(providerId, options) {
      const provider = this.getProvider(providerId);
      if (!provider) throw new Error('No provider available');
      const resp = await provider.sendRequest(options);
      let warnings = undefined;
      try {
        warnings = (resp && Array.isArray(resp.warnings)) ? resp.warnings : (resp && resp.body && Array.isArray(resp.body.warnings) ? resp.body.warnings : undefined);
      } catch (e) { /* noop */ }
      if (warnings && warnings.length) {
        // fire subscriptions
        for (const s of this._subs) {
          try { s({ providerId: provider.id, warnings, options }); } catch (e) { /* ignore */ }
        }
      }
      return resp;
    }
  }
  return LlmProviderServiceStandalone;
}

async function run() {
  const LlmProviderService = createLlmProviderServiceStandalone();
  const fakeRegistry = { getAll: () => [], getDefaultProviderId: () => undefined };
  const svc = new LlmProviderService(fakeRegistry);

  const mockProvider = {
    id: 'mock-1',
    type: 'custom',
    sendRequest: async (opts) => ({ status: 200, body: { result: 'ok' }, warnings: ['v1', 'v2'] })
  };

  // monkeypatch getProvider
  svc.getProvider = _ => mockProvider;

  const captured = [];
  const unsub = svc.onDidProviderWarning((ev) => captured.push(ev));

  const resp = await svc.sendRequestToProvider(undefined, { input: 'hello' });
  if (resp.status !== 200) { console.error('unexpected resp status', resp); process.exit(2); }
  if (captured.length === 0) { console.error('No provider warning events captured'); process.exit(3); }
  if (captured[0].providerId !== 'mock-1') { console.error('unexpected providerId', captured[0].providerId); process.exit(4); }
  if (!Array.isArray(captured[0].warnings) || captured[0].warnings.indexOf('v1') < 0) { console.error('warnings not found in captured event'); process.exit(5); }

  try { if (typeof unsub === 'function') unsub(); } catch (e) {}
  console.log('LLM provider service smoke test: OK');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
