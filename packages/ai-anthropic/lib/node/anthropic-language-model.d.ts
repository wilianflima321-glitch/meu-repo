import { LanguageModel, LanguageModelMessage, LanguageModelRequest, LanguageModelResponse, LanguageModelStatus, TokenUsageService, UserRequest } from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
type AethelChatRequest = {
    model: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
};
export declare const DEFAULT_MAX_TOKENS = 4096;
export declare const AnthropicModelIdentifier: unique symbol;
export declare class AnthropicModel implements LanguageModel {
    readonly id: string;
    model: string;
    status: LanguageModelStatus;
    enableStreaming: boolean;
    useCaching: boolean;
    maxTokens: number;
    maxRetries: number;
    protected readonly tokenUsageService?: TokenUsageService | undefined;
    constructor(id: string, model: string, status: LanguageModelStatus, enableStreaming: boolean, useCaching: boolean, maxTokens?: number, maxRetries?: number, tokenUsageService?: TokenUsageService | undefined);
    protected getSettings(request: LanguageModelRequest): Readonly<Record<string, unknown>>;
    request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse>;
    protected buildAethelChatRequest(request: UserRequest, settings: Readonly<Record<string, unknown>>): AethelChatRequest;
    protected pickNumber(settings: Readonly<Record<string, unknown>>, key: string): number | undefined;
    protected toChatMessages(messages: LanguageModelMessage[]): {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    protected toRole(message: LanguageModelMessage): 'system' | 'user' | 'assistant';
    protected toStringContent(message: LanguageModelMessage): string | null;
}
export {};
//# sourceMappingURL=anthropic-language-model.d.ts.map