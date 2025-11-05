"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aethelApiClient = exports.APIError = void 0;
// g:\\repo\\cloud-ide-desktop\\aethel_theia_fork\\packages\\ai-core\\src\\node\\aethel-api-client.ts
const node_fetch_1 = require("node-fetch");
class APIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.status = status;
        this.response = response;
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
/**
 * Cliente de API para interagir com o backend Aethel a partir do backend do Theia.
 */
class AethelAPIClient {
    constructor(baseURL = process.env.AETHEL_API_URL || 'http://localhost:8000') {
        // O token pode ser gerenciado centralmente no futuro, talvez via a extensão principal do Aethel.
        this.token = null;
        this.baseURL = baseURL;
    }
    // Método para definir o token, se necessário para chamadas autenticadas
    setToken(token) {
        this.token = token;
    }
    /**
     * Envia uma requisição de chat para o AI Runtime centralizado.
     * @param request O objeto de requisição de chat.
     * @returns A resposta do chat.
     */
    async chat(request) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const response = await (0, node_fetch_1.default)(`${this.baseURL}/api/v1/ai-runtime/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            }
            catch (e) {
                errorData = { detail: 'Failed to parse error response from Aethel Backend.' };
            }
            throw new APIError(errorData.detail || `Aethel API request failed with status ${response.status}`, response.status, errorData);
        }
        return response.json();
    }
    async *chatStream(request) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const response = await (0, node_fetch_1.default)(`${this.baseURL}/api/v1/ai-runtime/chat/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...request, stream: true }),
        });
        if (!response.ok || !response.body) {
            let errorData;
            try {
                errorData = await response.json();
            }
            catch (e) {
                errorData = { detail: 'Failed to parse error response from Aethel Backend stream.' };
            }
            throw new APIError(errorData.detail || `Aethel API stream request failed with status ${response.status}`, response.status, errorData);
        }
        for await (const chunk of response.body) {
            yield chunk.toString();
        }
    }
}
// Exporta uma instância singleton do cliente.
exports.aethelApiClient = new AethelAPIClient();
//# sourceMappingURL=aethel-api-client.js.map