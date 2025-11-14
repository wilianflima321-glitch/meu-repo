import { PreferenceService } from '@theia/core';
import { Disposable } from '@theia/core/lib/common/disposable';
import { LlmProviderRegistry } from '../browser/llm-provider-registry';
import { LlmProviderConfig } from '../common/ai-llm-preferences';

const globalWithFetch = globalThis as typeof globalThis & { fetch?: any };

describe('LlmProviderRegistry events', () => {
  let registry: LlmProviderRegistry;
  let store: Record<string, unknown>;
  let originalFetch: typeof globalWithFetch.fetch;

  const createPreferenceService = (): PreferenceService => {
    const prefService = {
      get: jest.fn((key: string, defaultValue?: unknown) => (key in store ? store[key] : defaultValue)),
      set: jest.fn((key: string, value: unknown) => {
        store[key] = value;
        return Promise.resolve(true);
      })
    } as unknown as PreferenceService;
    return prefService;
  };

  beforeEach(() => {
    store = {};
    originalFetch = globalWithFetch.fetch;
    globalWithFetch.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => [] }));
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
    const disposable = registry.onDidChangeProviders((payload: LlmProviderConfig[]) => events.push(payload));
    registry.saveAll([
      { id: 'prov-1', type: 'custom', apiKey: 'secret-key' } as unknown as LlmProviderConfig
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toHaveLength(1);
    expect(events[0][0].id).toBe('prov-1');
    expect((events[0][0] as Record<string, unknown>).apiKey).toBeUndefined();

    disposable.dispose();
  });

  it('fires default provider change events when setDefaultProvider is called', () => {
    const defaults: Array<string | undefined> = [];
    const disposable = registry.onDidChangeDefaultProvider((id: string | undefined) => defaults.push(id));

    registry.setDefaultProvider('prov-main');

    expect(defaults).toContain('prov-main');
    disposable.dispose();
  });

  it('coalesces concurrent backend refreshes triggered by getAll', async () => {
    let resolveFetch: ((value: { ok: boolean; json: () => Promise<unknown[]> }) => void) | undefined;
    const deferred = new Promise<{ ok: boolean; json: () => Promise<unknown[]> }>(resolve => {
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