"use strict";
/**
 * LLM Providers Index
 *
 * Centralized exports for all LLM providers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_PROVIDERS = exports.EnsembleProvider = exports.OllamaProvider = exports.GoogleAIProvider = exports.AnthropicProvider = exports.OpenAIProvider = void 0;
// OpenAI
var openai_provider_1 = require("./openai-provider");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_provider_1.OpenAIProvider; } });
// Anthropic Claude
var anthropic_provider_1 = require("./anthropic-provider");
Object.defineProperty(exports, "AnthropicProvider", { enumerable: true, get: function () { return anthropic_provider_1.AnthropicProvider; } });
// Google AI (Gemini)
var google_ai_provider_1 = require("./google-ai-provider");
Object.defineProperty(exports, "GoogleAIProvider", { enumerable: true, get: function () { return google_ai_provider_1.GoogleAIProvider; } });
// Ollama (Local)
var ollama_provider_1 = require("./ollama-provider");
Object.defineProperty(exports, "OllamaProvider", { enumerable: true, get: function () { return ollama_provider_1.OllamaProvider; } });
// Ensemble
var ensemble_provider_1 = require("./ensemble-provider");
Object.defineProperty(exports, "EnsembleProvider", { enumerable: true, get: function () { return ensemble_provider_1.EnsembleProvider; } });
/**
 * Available providers metadata
 */
exports.AVAILABLE_PROVIDERS = [
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
