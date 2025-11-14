import { PreferenceService } from '@theia/core';
import { Disposable } from '@theia/core/lib/common/disposable';
import { strict as assert } from 'assert';
import { LlmProviderRegistry } from '../browser/llm-provider-registry';
import { LlmProviderConfig } from '../common/ai-llm-preferences';

const globalWithFetch = globalThis as typeof globalThis & { fetch?: any };

describe('LlmProviderRegistry events', () => {
  let registry: LlmProviderRegistry;
  let store: Record<string, unknown>;
  let originalFetch: typeof globalWithFetch.fetch;
  let fetchCalls: number;

  const createPreferenceService = (): PreferenceService => {
    const prefService = {
      get: (key: string, defaultValue?: unknown) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue),
      set: (key: string, value: unknown) => {
        store[key] = value;
        return Promise.resolve(true);
      }
    } as unknown as PreferenceService;
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
    registry = new LlmProviderRegistry(createPreferenceService());
  });

  afterEach(() => {
    const dispose = registry as unknown as Disposable;
    if (typeof dispose.dispose === 'function') {
      dispose.dispose();
    }
    if (originalFetch) {
      globalWithFetch.fetch = originalFetch;
    } else {
      globalWithFetch.fetch = undefined;
    }
  });

  it('fires provider change events with sanitized payloads on saveAll', () => {
    const events: LlmProviderConfig[][] = [];
    const disposable = registry.onDidChangeProviders(payload => events.push(payload));
    registry.saveAll([
      { id: 'prov-1', type: 'custom', apiKey: 'secret-key' } as unknown as LlmProviderConfig
    ]);

    assert.equal(events.length, 1);
    assert.equal(events[0].length, 1);
    assert.equal(events[0][0].id, 'prov-1');
    assert.equal(Object.prototype.hasOwnProperty.call(events[0][0] as Record<string, unknown>, 'apiKey'), false);

    disposable.dispose();
  });

  it('fires default provider change events when setDefaultProvider is called', () => {
    const defaults: Array<string | undefined> = [];
    const disposable = registry.onDidChangeDefaultProvider(id => defaults.push(id));

    registry.setDefaultProvider('prov-main');

    assert.equal(defaults.includes('prov-main'), true);
    disposable.dispose();
  });

  it('coalesces concurrent backend refreshes triggered by getAll', async () => {
    let resolveFetch: ((value: { ok: boolean; json: () => Promise<unknown[]> }) => void) | undefined;
    fetchCalls = 0;
    const deferred = new Promise<{ ok: boolean; json: () => Promise<unknown[]> }>(resolve => {
      resolveFetch = resolve;
    });

    globalWithFetch.fetch = (..._args: unknown[]) => {
      fetchCalls += 1;
      return deferred;
    };

    registry.getAll();
    registry.getAll();

    assert.equal(fetchCalls, 1);

    resolveFetch?.({ ok: true, json: async () => [] });
    await Promise.resolve();
    await Promise.resolve();
  });
});