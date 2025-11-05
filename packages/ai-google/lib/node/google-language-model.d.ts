import { LanguageModel, LanguageModelRequest, LanguageModelMessage, LanguageModelResponse, TokenUsageService, UserRequest, LanguageModelStatus } from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
import { GoogleLanguageModelRetrySettings } from './google-language-models-manager-impl';
type AethelChatRequest = {
    model: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
};
export declare const GoogleModelIdentifier: unique symbol;
/**
 * Implements the Google language model integration for Theia by calling the central Aethel backend.
 */
export declare class GoogleModel implements LanguageModel {
    readonly id: string;
    model: string;
    status: LanguageModelStatus;
    enableStreaming: boolean;
    apiKey: () => string | undefined;
    retrySettings: () => GoogleLanguageModelRetrySettings;
    protected readonly tokenUsageService?: TokenUsageService | undefined;
    constructor(id: string, model: string, status: LanguageModelStatus, enableStreaming: boolean, apiKey: () => string | undefined, // Mantido para compatibilidade, mas não mais usado para chamadas diretas
    retrySettings: () => GoogleLanguageModelRetrySettings, tokenUsageService?: TokenUsageService | undefined);
    protected getSettings(request: LanguageModelRequest): Readonly<Record<string, unknown>>;
    request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse>;
    protected buildAethelChatRequest(request: UserRequest, settings: Readonly<Record<string, unknown>>): AethelChatRequest;
    protected pickNumber(settings: Readonly<Record<string, unknown>>, key: string): number | undefined;
    protected toChatMessages(messages: readonly LanguageModelMessage[]): {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    protected toRole(message: LanguageModelMessage): 'system' | 'user' | 'assistant';
    protected toStringContent(message: LanguageModelMessage): string | null;
}
export {};
//# sourceMappingURL=google-language-model.d.ts.map