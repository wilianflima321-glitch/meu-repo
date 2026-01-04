"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAIProvider = void 0;
const inversify_1 = require("inversify");
const observability_service_1 = require("../../common/observability-service");
let GoogleAIProvider = class GoogleAIProvider {
    constructor(observability) {
        this.observability = observability;
        this.config = null;
        this.DEFAULT_MODEL = 'gemini-1.5-pro';
        this.BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
    }
    /**
     * Configure provider
     */
    configure(config) {
        this.config = config;
    }
    /**
     * Check if provider is configured
     */
    isConfigured() {
        return this.config !== null && !!this.config.apiKey;
    }
    /**
     * Get available models
     */
    getAvailableModels() {
        return [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
        ];
    }
    /**
     * Send request to Google AI
     */
    async sendRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('Google AI provider not configured. Set API key first.');
        }
        const startTime = Date.now();
        const providerId = 'google-ai';
        try {
            const response = await this.callGoogleAI(request);
            const duration = Date.now() - startTime;
            this.observability.recordProviderRequest(providerId, duration, true);
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = this.extractErrorMessage(error);
            this.observability.recordProviderRequest(providerId, duration, false, errorMsg);
            throw error;
        }
    }
    /**
     * Stream response from Google AI
     */
    async *streamRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('Google AI provider not configured. Set API key first.');
        }
        const config = this.config;
        const model = config.model || this.DEFAULT_MODEL;
        const body = {
            contents: request.contents,
            systemInstruction: request.systemInstruction,
            generationConfig: {
                maxOutputTokens: request.generationConfig?.maxOutputTokens || config.maxOutputTokens || 8192,
                temperature: request.generationConfig?.temperature ?? config.temperature ?? 0.7,
                topP: request.generationConfig?.topP ?? 0.95,
                topK: request.generationConfig?.topK ?? 40,
            },
        };
        const url = `${this.BASE_URL}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(error)}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            return;
                        try {
                            const parsed = JSON.parse(data);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                yield text;
                            }
                        }
                        catch {
                            // Skip malformed JSON
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * Call Google AI API
     */
    async callGoogleAI(request) {
        const config = this.config;
        const model = config.model || this.DEFAULT_MODEL;
        const body = {
            contents: request.contents,
            systemInstruction: request.systemInstruction,
            generationConfig: {
                maxOutputTokens: request.generationConfig?.maxOutputTokens || config.maxOutputTokens || 8192,
                temperature: request.generationConfig?.temperature ?? config.temperature ?? 0.7,
                topP: request.generationConfig?.topP ?? 0.95,
                topK: request.generationConfig?.topK ?? 40,
            },
        };
        const url = `${this.BASE_URL}/models/${model}:generateContent?key=${config.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(error)}`);
        }
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text || '';
        return {
            content,
            model: model,
            usage: {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata?.totalTokenCount || 0,
            },
            finishReason: candidate?.finishReason || 'unknown',
        };
    }
    /**
     * Extract error message from various error types
     */
    extractErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error';
    }
    /**
     * Convert messages from generic format to Google AI format
     */
    convertMessages(messages) {
        return messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
    }
    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            id: 'google-ai',
            name: 'Google AI (Gemini)',
            models: this.getAvailableModels(),
        };
    }
};
exports.GoogleAIProvider = GoogleAIProvider;
exports.GoogleAIProvider = GoogleAIProvider = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], GoogleAIProvider);
