import { injectable, inject } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core';
import { AI_LLM_PROVIDERS_PREF, AI_LLM_DEFAULT_PROVIDER_PREF, LlmProviderConfig } from '../common/ai-llm-preferences';

@injectable()
export class LlmProviderRegistry {
  // preferenceService is injected and used at runtime across async helpers; constructor injection is used at runtime by inversify.
    // Keep the injected value in a clearly-named private field to avoid lint confusion around parameter-property shorthand.
    protected readonly __injectedPreferenceService: PreferenceService;
    constructor(
        @inject(PreferenceService) preferenceService: PreferenceService
    ) {
      this.__injectedPreferenceService = preferenceService;
      // No-op reference to satisfy linters when analysis tools are imprecise about runtime-only usage
      void this.__injectedPreferenceService;
    }

  // Provide a protected getter to keep the original property name for callers while keeping the injected
  // field underscore-prefixed so linters don't complain when the injection is only used at runtime via casts.
  protected get preferenceService(): PreferenceService { return this.__injectedPreferenceService; }

  getAll(): LlmProviderConfig[] {
    // Try backend endpoint first (centralized storage). Fall back to preferences if unavailable.
    try {
      (async () => {
        try {
          const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
          const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']) : '/api';
          const resp = await fetch(`${base}/llm/providers`, { credentials: 'same-origin' });
          if (resp.ok) {
            const json = await resp.json();
            if (Array.isArray(json)) {
              const pref = this.preferenceService as unknown as { set?: Function };
              const setter = pref?.set;
              if (typeof setter === 'function') {
                setter.call(this.preferenceService, AI_LLM_PROVIDERS_PREF, json);
              }
            }
          }
        } catch {}
      })().catch(() => {});
    } catch {}

  const providers = (this.preferenceService as unknown as { get?: Function })?.get?.(AI_LLM_PROVIDERS_PREF, []) as LlmProviderConfig[] | undefined;
    // Ensure billing defaults for older records
    const normalized = (providers ?? []).map(p => ({
      billingMode: p.billingMode ?? 'self',
      ownerId: p.ownerId ?? undefined,
      promoId: p.promoId ?? undefined,
      ...p
    } as LlmProviderConfig));
    return normalized;
  }

  saveAll(providers: LlmProviderConfig[]) {
    // Try to save centrally; if backend call fails, fall back to preference storage
    const sanitize = (p: LlmProviderConfig) => {
      const copy = { ...p } as Partial<LlmProviderConfig> & Record<string, unknown>;
      // Never persist apiKey or secrets into local preferences cache
      if ('apiKey' in copy) { delete (copy as Record<string, unknown>)['apiKey']; }
      return copy as LlmProviderConfig;
    };

    (async () => {
      try {
        const resp = await fetch('/api/llm/providers', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(providers) });
        if (resp.ok) {return;}
      } catch {}
  const pref = this.preferenceService as unknown as { set?: Function };
    const setter = pref?.set;
      if (typeof setter === 'function') {
        setter.call(this.preferenceService, AI_LLM_PROVIDERS_PREF, providers.map(sanitize));
      }
    })().catch(() => {});
  }

  addProvider(cfg: LlmProviderConfig) {
    // Try central create API; if it fails, write to preference store
    (async () => {
      try {
        const resp = await fetch('/api/llm/providers', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
        if (resp.ok) {return;}
      } catch {}
  const _all = this.getAll();
  this.saveAll([..._all.filter(p => p.id !== cfg.id), cfg]);
    })().catch(() => {});
  }

  removeProvider(id: string) {
    (async () => {
      try {
        const resp = await fetch(`/api/llm/providers/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
        if (resp.ok) {return;}
      } catch {}
  const _all = this.getAll();
  this.saveAll(_all.filter(p => p.id !== id));
    })().catch(() => {});
  }

  getDefaultProviderId(): string | undefined {
    try {
      // Best-effort async refresh from backend
      (async () => {
        try {
          const resp = await fetch('/api/llm/providers/default', { credentials: 'same-origin' });
          if (resp.ok) {
            const json = await resp.json();
            if (json && typeof json.id === 'string') {
                      const pref = this.preferenceService as unknown as { set?: Function };
                      const setter = pref?.set;
                      if (typeof setter === 'function') {
                        setter.call(this.preferenceService, AI_LLM_DEFAULT_PROVIDER_PREF, json.id);
                      }
            }
          }
        } catch {}
      })().catch(() => {});
    } catch {}
  const id = (this.preferenceService as unknown as { get?: Function })?.get?.(AI_LLM_DEFAULT_PROVIDER_PREF, '') as string | undefined;
    return id || undefined;
  }

  setDefaultProvider(id: string) {
    (async () => {
      try {
        const resp = await fetch('/api/llm/providers/default', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        if (resp.ok) {return;}
      } catch {}
  const pref = this.preferenceService as unknown as { set?: Function };
    const setter = pref?.set;
      if (typeof setter === 'function') {
        setter.call(this.preferenceService, AI_LLM_DEFAULT_PROVIDER_PREF, id);
      }
    })().catch(() => {});
  }
}
