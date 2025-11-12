"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomHttpProvider = void 0;
class CustomHttpProvider {
    id;
    name;
    type = 'custom';
    description;
    isEnabled;
    endpoint;
    apiKey;
    constructor(cfg) {
        this.id = cfg.id;
        this.name = cfg.name;
        this.endpoint = cfg.endpoint;
        this.apiKey = cfg.apiKey;
        this.description = cfg.description;
        this.isEnabled = cfg.isEnabled ?? true;
    }
    async sendRequest(payload) {
        if (!this.endpoint) {
            throw new Error('No endpoint configured for provider ' + this.id);
        }
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const resp = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`Provider ${this.name} returned ${resp.status}: ${txt}`);
        }
        const text = await resp.text();
        let parsed = text;
        try {
            parsed = JSON.parse(text);
        }
        catch { }
        return { status: resp.status, body: parsed };
    }
}
exports.CustomHttpProvider = CustomHttpProvider;
//# sourceMappingURL=custom-http-provider.js.map