import { ILlmProvider, SendRequestOptions, LlmProviderResponse } from '../../common/llm-provider';

export interface EnsembleCfg {
  id?: string;
  name?: string;
  providerIds?: string[];
  mode?: 'fast' | 'blend' | 'best';
  timeoutMs?: number;
}

// Lightweight ensemble provider that queries multiple configured providers
// in parallel with a short timeout and returns a combined/first-good response.
// This is intentionally conservative (no heavy aggregation) to avoid high cost/latency.
export class EnsembleProvider implements ILlmProvider {
  readonly id: string;
  readonly name: string;
  // use 'custom' type so it is compatible with existing LlmProviderType union
  readonly type = 'custom';
  readonly providerIds: string[];
  readonly mode: 'fast' | 'blend' | 'best';
  readonly timeoutMs: number;

  // serviceFactory is a function that, given a providerId, returns an instantiated ILlmProvider.
  constructor(public cfg: EnsembleCfg, protected serviceFactory: (id: string) => ILlmProvider | undefined) {
    this.id = cfg.id ?? `ensemble-${Date.now()}`;
    this.name = cfg.name ?? 'Ensemble Provider';
    this.providerIds = cfg.providerIds ?? [];
    this.mode = cfg.mode ?? 'fast';
    this.timeoutMs = cfg.timeoutMs ?? 2500;
  }

  async sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse> {
    const calls = this.providerIds.map(pid => {
      const p = this.serviceFactory(pid);
      if (!p) {return Promise.resolve({ ok: false as const, providerId: pid, err: new Error('provider_not_found') });}
      // wrap each provider call with a timeout to avoid long waits/cost
      return promiseWithTimeout(p.sendRequest(options), this.timeoutMs)
        .then(res => ({ ok: true as const, providerId: pid, res }))
        .catch(err => ({ ok: false as const, providerId: pid, err }));
    });

    const results = await Promise.all(calls) as Array<{ ok: true; providerId: string; res: LlmProviderResponse } | { ok: false; providerId: string; err: any }>;

    // prefer first successful response for 'fast' mode
    const successes = results.filter(r => r.ok) as Array<{ ok: true; providerId: string; res: LlmProviderResponse }>;
    if (this.mode === 'fast') {
      if (successes.length) {
        // propagate any warnings from the chosen provider
        const res = successes[0].res;
        const warnings = collectWarningsFromResults(successes);
        if (warnings.length) {
          return { ...res, warnings } as LlmProviderResponse;
        }
        return res;
      }
      // fallback: return first error-like
      const firstErr = results.find(r => !r.ok);
      return { status: 502, body: { error: 'all_providers_failed', details: firstErr } } as LlmProviderResponse;
    }

    // 'blend' mode: concatenate short textual outputs (best-effort)
    if (this.mode === 'blend') {
      const parts: any[] = [];
      for (const s of successes) {
        const body = s.res.body;
        parts.push({ providerId: s.providerId, body });
      }
      if (parts.length) {
        // lightweight merge: join textual fields when present
        const mergedText = parts.map(p => extractTextFromBody(p.body)).filter(Boolean).join('\n\n---\n\n');
        const warnings = collectWarningsFromResults(successes);
        const resp: LlmProviderResponse = { status: 207, body: { blended: true, providers: parts.map(p => p.providerId), text: mergedText, parts } };
        if (warnings.length) {resp.warnings = warnings;}
        return resp;
      }
      return { status: 502, body: { error: 'no_successful_providers', details: results } } as LlmProviderResponse;
    }

    // 'best' mode: choose longest textual answer as heuristic
    if (this.mode === 'best') {
      if (successes.length) {
        let best = successes[0];
        let bestLen = (extractTextFromBody(best.res.body) || '').length;
        for (const s of successes.slice(1)) {
          const t = extractTextFromBody(s.res.body) || '';
          if (t.length > bestLen) { best = s; bestLen = t.length; }
        }
        // propagate warnings from successful providers (deduped)
        const warnings = collectWarningsFromResults(successes);
        if (warnings.length) {
          return { ...best.res, warnings } as LlmProviderResponse;
        }
        return best.res;
      }
      return { status: 502, body: { error: 'no_successful_providers' } } as LlmProviderResponse;
    }

    return { status: 500, body: { error: 'unsupported_ensemble_mode' } } as LlmProviderResponse;
  }
}

function extractTextFromBody(body: any): string | undefined {
  try {
    if (!body) {return undefined;}
    if (typeof body === 'string') {return body;}
    if (typeof body?.text === 'string') {return body.text;}
    if (typeof body?.message === 'string') {return body.message;}
    // OpenAI-style: choices[0].message.content
    if (Array.isArray(body?.choices) && body.choices[0] && body.choices[0].message && typeof body.choices[0].message.content === 'string') {return body.choices[0].message.content;}
    // simple fallbacks
    if (typeof body?.result === 'string') {return body.result;}
    return JSON.stringify(body);
  } catch {
    return undefined;
  }
}

function promiseWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(res => { clearTimeout(t); resolve(res); }).catch(err => { clearTimeout(t); reject(err); });
  });
}

function collectWarningsFromResults(successes: Array<{ ok: true; providerId: string; res: LlmProviderResponse }>): string[] {
  const set = new Set<string>();
  for (const s of successes) {
    try {
      const r: any = s.res;
      if (Array.isArray(r.warnings)) {
        for (const w of r.warnings) {if (typeof w === 'string') {set.add(w);}}
      }
      if (r && r.body && Array.isArray(r.body.warnings)) {
        for (const w of r.body.warnings) {if (typeof w === 'string') {set.add(w);}}
      }
    } catch {
      // ignore
    }
  }
  return Array.from(set);
}
