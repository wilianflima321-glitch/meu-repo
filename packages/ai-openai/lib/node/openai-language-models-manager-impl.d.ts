import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { OpenAiModelUtils } from './openai-language-model';
import { OpenAiLanguageModelsManager, OpenAiModelDescription } from '../common';
export declare class OpenAiLanguageModelsManagerImpl implements OpenAiLanguageModelsManager {
    protected readonly openAiModelUtils: OpenAiModelUtils;
    protected _apiKey: string | undefined;
    protected _apiVersion: string | undefined;
    protected readonly languageModelRegistry: LanguageModelRegistry;
    protected readonly tokenUsageService: TokenUsageService;
    get apiKey(): string | undefined;
    get apiVersion(): string | undefined;
    protected calculateStatus(_modelDescription: OpenAiModelDescription, _effectiveApiKey: string | undefined): LanguageModelStatus;
    createOrUpdateLanguageModels(...modelDescriptions: OpenAiModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
    setApiKey(apiKey: string | undefined): void;
    setApiVersion(apiVersion: string | undefined): void;
}
//# sourceMappingURL=openai-language-models-manager-impl.d.ts.map