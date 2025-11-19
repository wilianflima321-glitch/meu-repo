"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const llm_provider_registry_1 = require("../browser/llm-provider-registry");
const globalWithFetch = globalThis;
describe('LlmProviderRegistry events', () => {
    let registry;
    let store;
    let originalFetch;
    const createPreferenceService = () => {
        const prefService = {
            get: jest.fn((key, defaultValue) => (key in store ? store[key] : defaultValue)),
            set: jest.fn((key, value) => {
                store[key] = value;
                return Promise.resolve(true);
            })
        };
        return prefService;
    };
    beforeEach(() => {
        store = {};
        originalFetch = globalWithFetch.fetch;
        globalWithFetch.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => [] }));
        registry = new llm_provider_registry_1.LlmProviderRegistry(createPreferenceService());
    });
    afterEach(() => {
        const dispose = registry;
        if (typeof dispose.dispose === 'function') {
            dispose.dispose();
        }
        if (originalFetch) {
            globalWithFetch.fetch = originalFetch;
        }
        else {
            globalWithFetch.fetch = undefined;
        }
    });
    it('fires provider change events with sanitized payloads on saveAll', () => {
        const events = [];
        const disposable = registry.onDidChangeProviders((payload) => events.push(payload));
        registry.saveAll([
            { id: 'prov-1', type: 'custom', apiKey: 'secret-key' }
        ]);
        expect(events).toHaveLength(1);
        expect(events[0]).toHaveLength(1);
        expect(events[0][0].id).toBe('prov-1');
        expect(events[0][0].apiKey).toBeUndefined();
        disposable.dispose();
    });
    it('fires default provider change events when setDefaultProvider is called', () => {
        const defaults = [];
        const disposable = registry.onDidChangeDefaultProvider((id) => defaults.push(id));
        registry.setDefaultProvider('prov-main');
        expect(defaults).toContain('prov-main');
        disposable.dispose();
    });
    it('coalesces concurrent backend refreshes triggered by getAll', async () => {
        let resolveFetch;
        const deferred = new Promise(resolve => {
            resolveFetch = resolve;
        });
        globalWithFetch.fetch = jest.fn(() => deferred);
        registry.getAll();
        registry.getAll();
        expect(globalWithFetch.fetch).toHaveBeenCalledTimes(1);
        resolveFetch?.({ ok: true, json: async () => [] });
        await Promise.resolve();
        await Promise.resolve();
    });
});
