import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core';
import { LlmProviderRegistry } from './llm-provider-registry';
import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../common/llm-provider';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class LlmProviderService {
  protected readonly _registry!: LlmProviderRegistry;

  constructor(
    @inject(LlmProviderRegistry) registry: LlmProviderRegistry
  ) {
    this._registry = registry;
  }

  protected readonly onDidProviderWarningEmitter = new Emitter<unknown>();
  // event that consumers (UI) can subscribe to to show warnings returned by providers
  onDidProviderWarning = this.onDidProviderWarningEmitter.event;

  instantiate(cfg: any): ILlmProvider | undefined {
    if (!cfg) {return undefined;}
    if (cfg.type === 'custom') {
      // local require to keep module loading lazy
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CustomHttpProvider } = require('./llm-providers/custom-provider');
      return new CustomHttpProvider(cfg) as ILlmProvider;
    }
    if (cfg.type === 'ensemble') {
      // create an EnsembleProvider that will call back to this service to resolve child providers
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EnsembleProvider } = require('./llm-providers/ensemble-provider');
      return new EnsembleProvider(cfg, (id: string) => this.getProvider(id)) as ILlmProvider;
    }
    // aethel provider can be added later
    return undefined;
  }

  getProvider(providerId?: string): ILlmProvider | undefined {
  const all = this._registry.getAll();
  const pid = providerId ?? this._registry.getDefaultProviderId();
    const cfg = pid ? all.find(p => p.id === pid) : all[0];
    if (!cfg) {return undefined;}
    return this.instantiate(cfg);
  }

  async sendRequestToProvider(providerId: string | undefined, options: SendRequestOptions): Promise<LlmProviderResponse> {
    const provider = this.getProvider(providerId);
    if (!provider) {throw new Error('No provider available');}
    const resp = await provider.sendRequest(options);
    // if the provider returned warnings (e.g. soft verification), surface an event for UI
    try {
      const respObj = resp as unknown as Record<string, unknown> | undefined;
      let warnings: unknown[] | undefined;
      if (respObj && Array.isArray(respObj['warnings'])) {
        warnings = respObj['warnings'] as unknown[];
      } else if (respObj && respObj['body'] && Array.isArray((respObj['body'] as Record<string, unknown>)['warnings'])) {
        warnings = ((respObj['body'] as Record<string, unknown>)['warnings']) as unknown[];
      }
      if (warnings && warnings.length) {
        try {
          const providerObj = provider as unknown as Record<string, unknown> | undefined;
          this.onDidProviderWarningEmitter.fire({ providerId: providerObj?.['id'], warnings, options });
        } catch (e) {
          // swallow emitter errors
        }
      }
    } catch (e) {
      // non-critical
    }
    // Best-effort emit usage event to central billing service
  (async () => {
      try {
        const globalObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : undefined;
        const userId = globalObj && typeof globalObj['__CURRENT_USER_ID'] === 'string' ? String(globalObj['__CURRENT_USER_ID']) : undefined;
        const orgId = globalObj && typeof globalObj['__CURRENT_ORG_ID'] === 'string' ? String(globalObj['__CURRENT_ORG_ID']) : undefined;
        const requestId = uuidv4();
        const tokensInput = estimateTokens(options.input);
        const tokensOutput = tryExtractTokensFromResponse(resp) ?? 0;
        const providerObj = provider as unknown as Record<string, unknown> | undefined;
        const estimatedProviderCost = calcEstimatedProviderCost(providerObj, tokensInput + tokensOutput);
        const getStatus = (r: unknown): number => {
          try {
            const rr = r as { status?: unknown } | undefined;
            if (rr && typeof rr.status === 'number') return rr.status as number;
            if (rr && typeof rr.status === 'string') return Number(rr.status as string) || 0;
          } catch {
            // ignore
          }
          return 0;
        };

        const body = {
          requestId,
          providerId: providerObj?.['id'],
          providerType: providerObj?.['type'],
          userId,
          orgId,
          timestamp: new Date().toISOString(),
          model: options.settings?.model ?? undefined,
          tokensInput,
          tokensOutput,
          estimatedProviderCost,
          billingMode: providerObj?.['billingMode'] ?? 'self',
          providerOwnerId: providerObj?.['ownerId'] ?? undefined,
          status: getStatus(resp)
        };
        const base = globalObj && typeof globalObj['__LLM_MOCK_URL'] === 'string' ? String(globalObj['__LLM_MOCK_URL']) : '/api';
        await fetch(`${base}/llm/usage`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } catch (e) {
        // ignore any telemetry failures
      }
    })().catch(() => {});
    return resp;
  }
}

function estimateTokens(input: string | any): number {
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input);
    // naive heuristic: 4 characters per token
    return Math.max(1, Math.ceil(s.length / 4));
  } catch {
    return 0;
  }
}

function tryExtractTokensFromResponse(resp: LlmProviderResponse | undefined): number | undefined {
  try {
    if (!resp || !resp.body) { return undefined; }
    // some providers return token usage in body. Try common paths
    const b = resp.body as unknown as Record<string, unknown> | undefined;
    const usage = b?.['usage'] as unknown as Record<string, unknown> | undefined;
    if (usage && typeof usage['total_tokens'] === 'number') { return Number(usage['total_tokens']); }
    if (usage && typeof usage['prompt_tokens'] === 'number' && typeof usage['completion_tokens'] === 'number') {
      return Number(usage['prompt_tokens']) + Number(usage['completion_tokens']);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function calcEstimatedProviderCost(provider: unknown, tokens: number): number {
  try {
    const p = provider as Record<string, unknown> | undefined;
    const rate = (p && p['rateCard'] && (p['rateCard'] as Record<string, unknown>)['pricePerToken'] ? Number((p['rateCard'] as Record<string, unknown>)['pricePerToken']) : 0) as number;
    return +(rate * tokens);
  } catch {
    return 0;
  }
}
