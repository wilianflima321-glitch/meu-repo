export declare const OLLAMA_LANGUAGE_MODELS_MANAGER_PATH = "/services/ollama/language-model-manager";
export declare const OllamaLanguageModelsManager: unique symbol;
export interface OllamaModelDescription {
    /**
     * The identifier of the model which will be shown in the UI.
     */
    id: string;
    /**
     * The name or ID of the model in the Ollama environment.
     */
    model: string;
}
export interface OllamaLanguageModelsManager {
    host: string | undefined;
    setHost(host: string | undefined): void;
    createOrUpdateLanguageModels(...models: OllamaModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
}
//# sourceMappingURL=ollama-language-models-manager.d.ts.map