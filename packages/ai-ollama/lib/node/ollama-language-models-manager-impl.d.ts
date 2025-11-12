import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { OllamaLanguageModelsManager, OllamaModelDescription } from '../common';
export declare class OllamaLanguageModelsManagerImpl implements OllamaLanguageModelsManager {
    protected _host: string | undefined;
    protected readonly languageModelRegistry: LanguageModelRegistry;
    protected readonly tokenUsageService: TokenUsageService;
    get host(): string | undefined;
    protected calculateStatus(_host: string | undefined): LanguageModelStatus;
    createOrUpdateLanguageModels(...models: OllamaModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
    setHost(host: string | undefined): void;
}
//# sourceMappingURL=ollama-language-models-manager-impl.d.ts.map