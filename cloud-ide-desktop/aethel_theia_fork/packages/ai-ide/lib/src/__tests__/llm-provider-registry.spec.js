"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const llm_provider_registry_1 = require("../browser/llm-provider-registry");
const globalWithFetch = globalThis;
describe('LlmProviderRegistry events', () => {
    let registry;
    let store;
    let originalFetch;
    let fetchCalls;
    const createPreferenceService = () => {
        const prefService = {
            get: (key, defaultValue) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue),
            set: (key, value) => {
                store[key] = value;
                return Promise.resolve(true);
            }
        };
        return prefService;
    };
    beforeEach(() => {
        store = {};
        fetchCalls = 0;
        originalFetch = globalWithFetch.fetch;
        globalWithFetch.fetch = async () => {
            fetchCalls += 1;
            return { ok: false, json: async () => [] };
        };
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
        const disposable = registry.onDidChangeProviders(payload => events.push(payload));
        registry.saveAll([
            { id: 'prov-1', type: 'custom', apiKey: 'secret-key' }
        ]);
        assert_1.strict.equal(events.length, 1);
        assert_1.strict.equal(events[0].length, 1);
        assert_1.strict.equal(events[0][0].id, 'prov-1');
        assert_1.strict.equal(Object.prototype.hasOwnProperty.call(events[0][0], 'apiKey'), false);
        disposable.dispose();
    });
    it('fires default provider change events when setDefaultProvider is called', () => {
        const defaults = [];
        const disposable = registry.onDidChangeDefaultProvider(id => defaults.push(id));
        registry.setDefaultProvider('prov-main');
        assert_1.strict.equal(defaults.includes('prov-main'), true);
        disposable.dispose();
    });
    it('coalesces concurrent backend refreshes triggered by getAll', async () => {
        let resolveFetch;
        fetchCalls = 0;
        const deferred = new Promise(resolve => {
            resolveFetch = resolve;
        });
        globalWithFetch.fetch = (..._args) => {
            fetchCalls += 1;
            return deferred;
        };
        registry.getAll();
        registry.getAll();
        assert_1.strict.equal(fetchCalls, 1);
        resolveFetch?.({ ok: true, json: async () => [] });
        await Promise.resolve();
        await Promise.resolve();
    });
});
