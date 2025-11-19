"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomHttpProvider = void 0;
class CustomHttpProvider {
    id;
    name;
    type = 'custom';
    endpoint;
    apiKey;
    constructor(cfg) {
        this.id = cfg.id;
        this.name = cfg.name;
        this.endpoint = cfg.endpoint;
        this.apiKey = cfg.apiKey;
    }
    async sendRequest(options) {
        if (!this.endpoint)
            throw new Error('Custom provider missing endpoint');
        const body = { input: options.input, settings: options.settings };
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey)
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        const resp = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
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
//# sourceMappingURL=custom-provider.js.map