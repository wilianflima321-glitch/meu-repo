/**
 * LLM Providers Index
 * 
 * Centralized exports for all LLM providers
 */

// OpenAI
export { OpenAIProvider } from './openai-provider';
export type { OpenAIConfig, LLMRequest, LLMResponse } from './openai-provider';

// Anthropic Claude
export { AnthropicProvider } from './anthropic-provider';
export type { AnthropicConfig, AnthropicMessage, AnthropicRequest, AnthropicResponse } from './anthropic-provider';

// Google AI (Gemini)
export { GoogleAIProvider } from './google-ai-provider';
export type { GoogleAIConfig, GoogleAIContent, GoogleAIRequest, GoogleAIResponse } from './google-ai-provider';

// Ollama (Local)
export { OllamaProvider } from './ollama-provider';
export type { OllamaConfig, OllamaMessage, OllamaRequest, OllamaResponse, OllamaModelInfo } from './ollama-provider';

// Ensemble
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
    getProviderInfo(): { id: string; name: string; models: string[] };
}

/**
 * Provider factory type
 */
export type ProviderFactory = () => ILLMProvider;

/**
 * Available providers metadata
 */
export const AVAILABLE_PROVIDERS: Array<{
    id: ProviderType;
    name: string;
    description: string;
    requiresApiKey: boolean;
    isLocal: boolean;
}> = [
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT-4, GPT-4o, GPT-3.5 Turbo models',
        requiresApiKey: true,
        isLocal: false,
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Claude 3.5 Sonnet, Opus, Haiku models',
        requiresApiKey: true,
        isLocal: false,
    },
    {
        id: 'google-ai',
        name: 'Google AI',
        description: 'Gemini 1.5 Pro, Flash, and experimental models',
        requiresApiKey: true,
        isLocal: false,
    },
    {
        id: 'ollama',
        name: 'Ollama',
        description: 'Local models: Llama, Mistral, CodeLlama, etc.',
        requiresApiKey: false,
        isLocal: true,
    },
    {
        id: 'ensemble',
        name: 'Ensemble',
        description: 'Multi-provider routing with fallbacks',
        requiresApiKey: false,
        isLocal: false,
    },
];
