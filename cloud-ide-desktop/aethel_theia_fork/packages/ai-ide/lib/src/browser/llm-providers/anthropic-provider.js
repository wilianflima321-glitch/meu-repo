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
exports.AnthropicProvider = void 0;
const inversify_1 = require("inversify");
const observability_service_1 = require("../../common/observability-service");
let AnthropicProvider = class AnthropicProvider {
    constructor(observability) {
        this.observability = observability;
        this.config = null;
        this.DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
        this.BASE_URL = 'https://api.anthropic.com/v1';
        this.API_VERSION = '2023-06-01';
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
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ];
    }
    /**
     * Send request to Anthropic
     */
    async sendRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('Anthropic provider not configured. Set API key first.');
        }
        const startTime = Date.now();
        const providerId = 'anthropic';
        try {
            const response = await this.callAnthropic(request);
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
     * Stream response from Anthropic
     */
    async *streamRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('Anthropic provider not configured. Set API key first.');
        }
        const config = this.config;
        const model = config.model || this.DEFAULT_MODEL;
        const body = {
            model,
            messages: request.messages,
            system: request.system,
            max_tokens: request.maxTokens || config.maxTokens || 4096,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            stream: true,
        };
        const response = await fetch(`${this.BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': this.API_VERSION,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`);
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
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                yield parsed.delta.text;
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
     * Call Anthropic API
     */
    async callAnthropic(request) {
        const config = this.config;
        const model = config.model || this.DEFAULT_MODEL;
        const body = {
            model,
            messages: request.messages,
            system: request.system,
            max_tokens: request.maxTokens || config.maxTokens || 4096,
            temperature: request.temperature ?? config.temperature ?? 0.7,
        };
        const response = await fetch(`${this.BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': this.API_VERSION,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`);
        }
        const data = await response.json();
        return {
            content: data.content?.[0]?.text || '',
            model: data.model,
            usage: {
                inputTokens: data.usage?.input_tokens || 0,
                outputTokens: data.usage?.output_tokens || 0,
            },
            stopReason: data.stop_reason || 'unknown',
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
     * Convert messages from generic format
     */
    convertMessages(messages) {
        return messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
    }
    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            id: 'anthropic',
            name: 'Anthropic Claude',
            models: this.getAvailableModels(),
        };
    }
};
exports.AnthropicProvider = AnthropicProvider;
exports.AnthropicProvider = AnthropicProvider = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], AnthropicProvider);
