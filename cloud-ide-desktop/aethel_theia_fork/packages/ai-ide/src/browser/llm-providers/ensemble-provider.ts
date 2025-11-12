import type { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';

export type EnsembleCfg = {
  providerIds: string[];
  mode: 'fast' | 'blend' | 'best';
  timeoutMs?: number;
};

export class EnsembleProvider implements ILlmProvider {
  id = 'ensemble';
  name = 'ensemble';
  type: any = 'ensemble';
  protected cfg: EnsembleCfg;
  protected factory: (id: string) => ILlmProvider | undefined;
  constructor(cfg: EnsembleCfg, factory: (id: string) => ILlmProvider | undefined) {
    this.cfg = cfg;
    this.factory = factory;
  }

  protected async callWithTimeout(p: Promise<LlmProviderResponse>, timeoutMs = 1000): Promise<LlmProviderResponse | null> {
    if (!timeoutMs) {
      try { return await p; } catch { return null; }
    }
    return await Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), timeoutMs))]) as (LlmProviderResponse | null);
  }

  async sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse> {
    const ids = this.cfg.providerIds ?? [];
    const timeout = this.cfg.timeoutMs ?? 2000;

    if (this.cfg.mode === 'fast') {
      // iterate in order and return first successful provider result
      for (const id of ids) {
        const p = this.factory(id);
        if (!p) { continue; }
        try {
          const resp = await this.callWithTimeout(p.sendRequest(options), timeout);
          if (resp && resp.status >= 200 && resp.status < 300) {
            return resp;
          }
        } catch {
          // ignore and continue
        }
      }
      // fallback: return an error-like response
      return { status: 502, body: { error: 'No provider succeeded' } } as unknown as LlmProviderResponse;
    }

    if (this.cfg.mode === 'blend') {
      const tasks = ids.map(id => {
        const p = this.factory(id);
        return p ? this.callWithTimeout(p.sendRequest(options), timeout) : Promise.resolve(null);
      });
      const results = (await Promise.all(tasks)).filter(Boolean) as LlmProviderResponse[];
      const texts = results.map(r => (r.body && typeof r.body === 'object' && 'text' in r.body) ? (r.body as any).text : String(r.body));
      return { status: 207, body: { blended: true, text: texts.join('\n') } } as unknown as LlmProviderResponse;
    }

    // best: pick the provider with the longest body.text
    if (this.cfg.mode === 'best') {
      const tasks = ids.map(id => {
        const p = this.factory(id);
        return p ? this.callWithTimeout(p.sendRequest(options), timeout) : Promise.resolve(null);
      });
      const results = (await Promise.all(tasks)).filter(Boolean) as LlmProviderResponse[];
      if (results.length === 0) {
        return { status: 502, body: { error: 'No provider succeeded' } } as unknown as LlmProviderResponse;
      }
      let best = results[0];
      let bestLen = String((best.body && (best.body as any).text) ?? '').length;
      for (const r of results) {
        const t = String((r.body && (r.body as any).text) ?? '');
        if (t.length > bestLen) { best = r; bestLen = t.length; }
      }
      return best;
    }

    return { status: 400, body: { error: 'Unknown ensemble mode' } } as unknown as LlmProviderResponse;
  }
}
