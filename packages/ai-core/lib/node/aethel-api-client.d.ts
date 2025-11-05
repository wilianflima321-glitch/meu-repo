interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
}
interface ChatResponse {
    id: string;
    model: string;
    choices: {
        message: ChatMessage;
    }[];
    message: ChatMessage;
}
export declare class APIError extends Error {
    status?: number | undefined;
    response?: any | undefined;
    constructor(message: string, status?: number | undefined, response?: any | undefined);
}
/**
 * Cliente de API para interagir com o backend Aethel a partir do backend do Theia.
 */
declare class AethelAPIClient {
    private baseURL;
    private token;
    constructor(baseURL?: string);
    setToken(token: string | null): void;
    /**
     * Envia uma requisição de chat para o AI Runtime centralizado.
     * @param request O objeto de requisição de chat.
     * @returns A resposta do chat.
     */
    chat(request: ChatRequest): Promise<ChatResponse>;
    chatStream(request: ChatRequest): AsyncIterable<string>;
}
export declare const aethelApiClient: AethelAPIClient;
export {};
//# sourceMappingURL=aethel-api-client.d.ts.map