export declare const GOOGLE_LANGUAGE_MODELS_MANAGER_PATH = "/services/google/language-model-manager";
export declare const GoogleLanguageModelsManager: unique symbol;
export interface GoogleModelDescription {
    /**
     * The identifier of the model which will be shown in the UI.
     */
    id: string;
    /**
     * The model ID as used by the Google Gemini API.
     */
    model: string;
    /**
     * The key for the model. If 'true' is provided the global Gemini API key will be used.
     */
    apiKey: string | true | undefined;
    /**
     * Indicate whether the streaming API shall be used.
     */
    enableStreaming: boolean;
    /**
     * Maximum number of tokens to generate. Default is 4096.
     */
    maxTokens?: number;
}
export interface GoogleLanguageModelsManager {
    apiKey: string | undefined;
    setApiKey(key: string | undefined): void;
    setMaxRetriesOnErrors(maxRetries: number): void;
    setRetryDelayOnRateLimitError(retryDelay: number): void;
    setRetryDelayOnOtherErrors(retryDelay: number): void;
    createOrUpdateLanguageModels(...models: GoogleModelDescription[]): Promise<void>;
    removeLanguageModels(...modelIds: string[]): void;
}
//# sourceMappingURL=google-language-models-manager.d.ts.map