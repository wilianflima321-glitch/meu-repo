"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsembleProvider = void 0;
class EnsembleProvider {
    constructor(cfg, factory) {
        this.id = 'ensemble';
        this.name = 'ensemble';
        this.type = 'ensemble';
        this.cfg = cfg;
        this.factory = factory;
    }
    async callWithTimeout(p, timeoutMs = 1000) {
        if (!timeoutMs) {
            try {
                return await p;
            }
            catch {
                return null;
            }
        }
        return await Promise.race([p, new Promise(r => setTimeout(() => r(null), timeoutMs))]);
    }
    async sendRequest(options) {
        const ids = this.cfg.providerIds ?? [];
        const timeout = this.cfg.timeoutMs ?? 2000;
        if (this.cfg.mode === 'fast') {
            // iterate in order and return first successful provider result
            for (const id of ids) {
                const p = this.factory(id);
                if (!p) {
                    continue;
                }
                try {
                    const resp = await this.callWithTimeout(p.sendRequest(options), timeout);
                    if (resp && resp.status >= 200 && resp.status < 300) {
                        return resp;
                    }
                }
                catch {
                    // ignore and continue
                }
            }
            // fallback: return an error-like response
            return { status: 502, body: { error: 'No provider succeeded' } };
        }
        if (this.cfg.mode === 'blend') {
            const tasks = ids.map(id => {
                const p = this.factory(id);
                return p ? this.callWithTimeout(p.sendRequest(options), timeout) : Promise.resolve(null);
            });
            const results = (await Promise.all(tasks)).filter(Boolean);
            const texts = results.map(r => (r.body && typeof r.body === 'object' && 'text' in r.body) ? r.body.text : String(r.body));
            return { status: 207, body: { blended: true, text: texts.join('\n') } };
        }
        // best: pick the provider with the longest body.text
        if (this.cfg.mode === 'best') {
            const tasks = ids.map(id => {
                const p = this.factory(id);
                return p ? this.callWithTimeout(p.sendRequest(options), timeout) : Promise.resolve(null);
            });
            const results = (await Promise.all(tasks)).filter(Boolean);
            if (results.length === 0) {
                return { status: 502, body: { error: 'No provider succeeded' } };
            }
            let best = results[0];
            let bestLen = String((best.body && best.body.text) ?? '').length;
            for (const r of results) {
                const t = String((r.body && r.body.text) ?? '');
                if (t.length > bestLen) {
                    best = r;
                    bestLen = t.length;
                }
            }
            return best;
        }
        return { status: 400, body: { error: 'Unknown ensemble mode' } };
    }
}
exports.EnsembleProvider = EnsembleProvider;
