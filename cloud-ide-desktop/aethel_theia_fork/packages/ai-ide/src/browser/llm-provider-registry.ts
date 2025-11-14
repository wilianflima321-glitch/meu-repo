import { injectable, inject } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core';
import { Disposable, Emitter, Event } from '@theia/core/lib/common';
import { AI_LLM_PROVIDERS_PREF, AI_LLM_DEFAULT_PROVIDER_PREF, LlmProviderConfig } from '../common/ai-llm-preferences';

@injectable()
export class LlmProviderRegistry implements Disposable {
  protected readonly preferenceService: PreferenceService;

  private readonly providersChangedEmitter = new Emitter<LlmProviderConfig[]>();
  private readonly defaultProviderChangedEmitter = new Emitter<string | undefined>();
  private providersRefreshPromise: Promise<void> | undefined;
  private defaultRefreshPromise: Promise<void> | undefined;

  constructor(@inject(PreferenceService) preferenceService: PreferenceService) {
    this.preferenceService = preferenceService;
  }

  get onDidChangeProviders(): Event<LlmProviderConfig[]> {
    return this.providersChangedEmitter.event;
  }

  get onDidChangeDefaultProvider(): Event<string | undefined> {
    return this.defaultProviderChangedEmitter.event;
  }

  getAll(): LlmProviderConfig[] {
    this.scheduleProvidersRefresh();
    return this.normalizeProviders(this.getProvidersFromPreferences());
  }

  saveAll(providers: LlmProviderConfig[]): void {
    const sanitized = providers.map(LlmProviderRegistry.sanitizeProvider);
    this.setPreference(LlmProviderRegistry.PROVIDERS_KEY, sanitized);
    this.fireProvidersChanged(sanitized);
    void this.persistProvidersRemotely(sanitized)
      .then(success => {
        if (success) {
          this.scheduleProvidersRefresh();
        }
      })
      .catch(() => undefined);
  }

  addProvider(cfg: LlmProviderConfig): void {
    const providers = this.getProvidersFromPreferences().filter(existing => existing.id !== cfg.id);
    const next = [...providers, LlmProviderRegistry.sanitizeProvider(cfg)];
    this.setPreference(LlmProviderRegistry.PROVIDERS_KEY, next);
    this.fireProvidersChanged(next);
    void this.createProviderRemotely(cfg)
      .then(success => {
        if (success) {
          this.scheduleProvidersRefresh();
        }
      })
      .catch(() => undefined);
  }

  removeProvider(id: string): void {
    const providers = this.getProvidersFromPreferences().filter(provider => provider.id !== id);
    this.setPreference(LlmProviderRegistry.PROVIDERS_KEY, providers);
    this.fireProvidersChanged(providers);
    void this.deleteProviderRemotely(id)
      .then(success => {
        if (success) {
          this.scheduleProvidersRefresh();
        }
      })
      .catch(() => undefined);
  }

  getDefaultProviderId(): string | undefined {
    this.scheduleDefaultProviderRefresh();
  return this.getDefaultProviderFromPreferences();
  }

  setDefaultProvider(id: string): void {
    this.setPreference(LlmProviderRegistry.DEFAULT_PROVIDER_KEY, id);
    this.fireDefaultProviderChanged(id);
    void this.persistDefaultProviderRemotely(id)
      .then(success => {
        if (success) {
          this.scheduleDefaultProviderRefresh();
        }
      })
      .catch(() => undefined);
  }

  protected fireProvidersChanged(providers?: LlmProviderConfig[]): void {
    this.providersChangedEmitter.fire(this.normalizeProviders(providers ?? this.getProvidersFromPreferences()));
  }

  protected fireDefaultProviderChanged(id?: string | undefined): void {
    this.defaultProviderChangedEmitter.fire(id ?? this.getDefaultProviderFromPreferences());
  }

  protected scheduleProvidersRefresh(): void {
    if (!this.providersRefreshPromise) {
      this.providersRefreshPromise = this.refreshProvidersFromBackend()
        .catch(() => undefined)
        .finally(() => {
          this.providersRefreshPromise = undefined;
        });
    }
  }

  protected scheduleDefaultProviderRefresh(): void {
    if (!this.defaultRefreshPromise) {
      this.defaultRefreshPromise = this.refreshDefaultProviderFromBackend()
        .catch(() => undefined)
        .finally(() => {
          this.defaultRefreshPromise = undefined;
        });
    }
  }

  protected async refreshProvidersFromBackend(): Promise<void> {
    try {
            const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
      const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']) : '/api';
      const resp = await fetch(`${base}/llm/providers`, { credentials: 'same-origin' });
      if (!resp.ok) {
        return;
      }
      const json = await resp.json();
      if (Array.isArray(json)) {
        const providers = json.map(LlmProviderRegistry.sanitizeProvider);
        const current = this.getProvidersFromPreferences();
        if (!this.areProvidersEqual(current, providers)) {
          this.setPreference(LlmProviderRegistry.PROVIDERS_KEY, providers);
          this.fireProvidersChanged(providers);
        }
      }
    } catch {
      /* ignore network errors */
    }
  }

  protected async persistProvidersRemotely(providers: LlmProviderConfig[]): Promise<boolean> {
    try {
      const resp = await fetch('/api/llm/providers', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providers)
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  protected async createProviderRemotely(cfg: LlmProviderConfig): Promise<boolean> {
    try {
      const resp = await fetch('/api/llm/providers', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  protected async deleteProviderRemotely(id: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/llm/providers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  protected async refreshDefaultProviderFromBackend(): Promise<void> {
    try {
      const resp = await fetch('/api/llm/providers/default', { credentials: 'same-origin' });
      if (!resp.ok) {
        return;
      }
      const json = await resp.json();
      if (json && typeof json.id === 'string') {
        if (json.id !== this.getDefaultProviderFromPreferences()) {
          this.setPreference(LlmProviderRegistry.DEFAULT_PROVIDER_KEY, json.id);
          this.fireDefaultProviderChanged(json.id);
        }
      }
    } catch {
      /* ignore network errors */
    }
  }

  protected async persistDefaultProviderRemotely(id: string): Promise<boolean> {
    try {
      const resp = await fetch('/api/llm/providers/default', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  protected getProvidersFromPreferences(): LlmProviderConfig[] {
    const raw = this.getPreference(LlmProviderRegistry.PROVIDERS_KEY, []) as LlmProviderConfig[] | undefined;
    return raw ? [...raw] : [];
  }

  protected getDefaultProviderFromPreferences(): string | undefined {
    const id = this.getPreference(LlmProviderRegistry.DEFAULT_PROVIDER_KEY, '');
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  }

  protected normalizeProviders(providers: LlmProviderConfig[]): LlmProviderConfig[] {
    return providers.map(provider => ({
      billingMode: provider.billingMode ?? 'self',
      ownerId: provider.ownerId ?? undefined,
      promoId: provider.promoId ?? undefined,
      ...provider
    }));
  }

  protected areProvidersEqual(left: LlmProviderConfig[], right: LlmProviderConfig[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    const orderedLeft = this.orderProvidersForComparison(left);
    const orderedRight = this.orderProvidersForComparison(right);
    return JSON.stringify(orderedLeft) === JSON.stringify(orderedRight);
  }

  protected orderProvidersForComparison(providers: LlmProviderConfig[]): LlmProviderConfig[] {
    const normalized = this.normalizeProviders(providers);
    return normalized.sort((a, b) => {
      const leftId = a.id ?? '';
      const rightId = b.id ?? '';
      return leftId.localeCompare(rightId);
    });
  }

  protected getPreference<T>(key: string, defaultValue: T): T {
    const getter = (this.preferenceService as unknown as { get?: (k: string, d: unknown) => unknown }).get;
    return getter ? (getter.call(this.preferenceService, key, defaultValue) as T) : defaultValue;
  }

  protected setPreference(key: string, value: unknown): void {
    const setter = (this.preferenceService as unknown as { set?: (k: string, v: unknown) => void }).set;
    if (typeof setter === 'function') {
      setter.call(this.preferenceService, key, value);
    }
  }

  protected static sanitizeProvider(provider: LlmProviderConfig): LlmProviderConfig {
    const copy = { ...provider } as Partial<LlmProviderConfig> & Record<string, unknown>;
    if ('apiKey' in copy) {
      delete copy['apiKey'];
    }
    return copy as LlmProviderConfig;
  }

  static readonly PROVIDERS_KEY = AI_LLM_PROVIDERS_PREF;
  static readonly DEFAULT_PROVIDER_KEY = AI_LLM_DEFAULT_PROVIDER_PREF;

  dispose(): void {
    this.providersChangedEmitter.dispose();
    this.defaultProviderChangedEmitter.dispose();
  }
}
