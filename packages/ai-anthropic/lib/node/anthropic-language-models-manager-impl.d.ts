import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { AnthropicLanguageModelsManager, AnthropicModelDescription } from '../common';
export declare class AnthropicLanguageModelsManagerImpl implements AnthropicLanguageModelsManager {
    protected _apiKey: string | undefined;
    protected readonly languageModelRegistry: LanguageModelRegistry;
    protected readonly tokenUsageService: TokenUsageService;
    get apiKey(): string | undefined;
    createOrUpdateLanguageModels(...modelDescriptions: AnthropicModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
    setApiKey(apiKey: string | undefined): void;
    protected calculateStatus(_modelDescription: AnthropicModelDescription): LanguageModelStatus;
}
//# sourceMappingURL=anthropic-language-models-manager-impl.d.ts.map