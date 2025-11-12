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
};
export declare const OpenAiModelIdentifier: unique symbol;
export type DeveloperMessageSettings = 'user' | 'system' | 'developer' | 'mergeWithFollowingUserMessage' | 'skip';
export declare class OpenAiModel implements LanguageModel {
    readonly id: string;
    model: string;
    status: LanguageModelStatus;
    enableStreaming: boolean;
    apiKey: () => string | undefined;
    apiVersion: () => string | undefined;
    supportsStructuredOutput: boolean;
    url: string | undefined;
    openAiModelUtils: OpenAiModelUtils;
    developerMessageSettings: DeveloperMessageSettings;
    maxRetries: number;
    protected readonly tokenUsageService?: TokenUsageService | undefined;
    constructor(id: string, model: string, status: LanguageModelStatus, enableStreaming: boolean, apiKey: () => string | undefined, apiVersion: () => string | undefined, supportsStructuredOutput: boolean, url: string | undefined, openAiModelUtils: OpenAiModelUtils, developerMessageSettings?: DeveloperMessageSettings, maxRetries?: number, tokenUsageService?: TokenUsageService | undefined);
    protected getSettings(request: LanguageModelRequest): Record<string, unknown>;
    request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse>;
    protected buildAethelChatRequest(request: UserRequest, settings: Record<string, unknown>): AethelChatRequest;
    protected pickNumber(settings: Record<string, unknown>, key: string): number | undefined;
}
/**
 * Utility class for processing messages for the OpenAI language model.
 * Esta classe agora converte as mensagens para o formato esperado pelo Aethel Backend.
 */
export declare class OpenAiModelUtils {
    processMessages(messages: LanguageModelMessage[], developerMessageSettings: DeveloperMessageSettings, model: string): {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
}
export {};
//# sourceMappingURL=openai-language-model.d.ts.map