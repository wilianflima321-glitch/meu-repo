"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIShim = void 0;
// Shim para substituir chamadas diretas de SDK por chamadas ao backend
const ai_backend_client_1 = require("@theia/ai-backend-client");
class OpenAIShim {
    constructor(baseUrl, token, model = 'gpt-4') {
        const cfg = { baseUrl, token };
        this.client = new ai_backend_client_1.AethelAIBackendClient(cfg);
        this.model = model;
    }
    async chat(prompt, options) {
        const request = {
            provider: 'openai',
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            ...options
        };
        return await this.client.chat(request);
    }
}
exports.OpenAIShim = OpenAIShim;
// Similar shims podem ser criados para Anthropic, Ollama, Hugging Face, Google
//# sourceMappingURL=openai-shim.js.map