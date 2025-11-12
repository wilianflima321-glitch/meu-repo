import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { GoogleLanguageModelsManager, GoogleModelDescription } from '../common';
export interface GoogleLanguageModelRetrySettings {
    maxRetriesOnErrors: number;
    retryDelayOnRateLimitError: number;
    retryDelayOnOtherErrors: number;
}
export declare class GoogleLanguageModelsManagerImpl implements GoogleLanguageModelsManager {
    protected _apiKey: string | undefined;
    protected retrySettings: GoogleLanguageModelRetrySettings;
    protected readonly languageModelRegistry: LanguageModelRegistry;
    protected readonly tokenUsageService: TokenUsageService;
    get apiKey(): string | undefined;
    protected calculateStatus(effectiveApiKey: string | undefined): LanguageModelStatus;
    createOrUpdateLanguageModels(...modelDescriptions: GoogleModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
    setApiKey(apiKey: string | undefined): void;
    setMaxRetriesOnErrors(maxRetries: number): void;
    setRetryDelayOnRateLimitError(retryDelay: number): void;
    setRetryDelayOnOtherErrors(retryDelay: number): void;
}
//# sourceMappingURL=google-language-models-manager-impl.d.ts.map