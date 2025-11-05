import { LanguageModel, LanguageModelMessage, LanguageModelParsedResponse, LanguageModelRequest, LanguageModelResponse, LanguageModelStatus, LanguageModelStreamResponse, TokenUsageService, UserRequest } from '@theia/ai-core';
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
    frequency_penalty?: number;
    presence_penalty?: number;
};
export declare const OllamaModelIdentifier: unique symbol;
export declare class OllamaModel implements LanguageModel {
    readonly id: string;
    protected readonly model: string;
    status: LanguageModelStatus;
    protected host: () => string | undefined;
    protected readonly tokenUsageService?: TokenUsageService | undefined;
    readonly providerId = "ollama";
    readonly vendor: string;
    constructor(id: string, model: string, status: LanguageModelStatus, host: () => string | undefined, // Mantido para possível uso futuro em metadados
    tokenUsageService?: TokenUsageService | undefined);
    request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse>;
    protected handleStreamingRequest(aethelRequest: AethelChatRequest, userRequest: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelStreamResponse>;
    protected handleNonStreamingRequest(aethelRequest: AethelChatRequest, userRequest: UserRequest): Promise<LanguageModelResponse>;
    protected getSettings(request: LanguageModelRequest | UserRequest): Record<string, unknown>;
    protected buildAethelChatRequest(request: UserRequest, settings: Record<string, unknown>): AethelChatRequest;
    protected pickNumber(settings: Record<string, unknown>, key: string): number | undefined;
    protected shouldStream(settings: Record<string, unknown>): boolean;
    protected toChatMessages(messages: readonly LanguageModelMessage[]): {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    protected toRole(message: LanguageModelMessage): 'system' | 'user' | 'assistant';
    protected toStringContent(message: LanguageModelMessage): string | null;
    protected buildParsedResponse(content: string): LanguageModelParsedResponse;
}
export {};
//# sourceMappingURL=ollama-language-model.d.ts.map