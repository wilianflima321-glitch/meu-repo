import { ChatCompletionResponse } from '@theia/ai-backend-client';
export declare class OpenAIShim {
    private client;
    private model;
    constructor(baseUrl: string, token?: string, model?: string);
    chat(prompt: string, options?: Record<string, any>): Promise<ChatCompletionResponse>;
}
//# sourceMappingURL=openai-shim.d.ts.map