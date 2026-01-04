/**
 * LLM Providers Index
 *
 * Centralized exports for all LLM providers
 */
export { OpenAIProvider } from './openai-provider';
export type { OpenAIConfig, LLMRequest, LLMResponse } from './openai-provider';
export { AnthropicProvider } from './anthropic-provider';
export type { AnthropicConfig, AnthropicMessage, AnthropicRequest, AnthropicResponse } from './anthropic-provider';
export { GoogleAIProvider } from './google-ai-provider';
export type { GoogleAIConfig, GoogleAIContent, GoogleAIRequest, GoogleAIResponse } from './google-ai-provider';
export { OllamaProvider } from './ollama-provider';
export type { OllamaConfig, OllamaMessage, OllamaRequest, OllamaResponse, OllamaModelInfo } from './ollama-provider';
export { EnsembleProvider } from './ensemble-provider';
/**
 * Provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'google-ai' | 'ollama' | 'ensemble';
/**
 * Generic provider interface
 */
export interface ILLMProvider {
    isConfigured(): boolean;
    getProviderInfo(): {
        id: string;
        name: string;
        models: string[];
    };
}
/**
 * Provider factory type
 */
export type ProviderFactory = () => ILLMProvider;
/**
 * Available providers metadata
 */
export declare const AVAILABLE_PROVIDERS: Array<{
    id: ProviderType;
    name: string;
    description: string;
    requiresApiKey: boolean;
    isLocal: boolean;
}>;
