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
exports.OpenAIProvider = void 0;
const inversify_1 = require("inversify");
const observability_service_1 = require("../../common/observability-service");
let OpenAIProvider = class OpenAIProvider {
    constructor(observability) {
        this.observability = observability;
        this.config = null;
        this.DEFAULT_MODEL = 'gpt-4';
        this.DEFAULT_BASE_URL = 'https://api.openai.com/v1';
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
     * Send request to OpenAI
     */
    async sendRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI provider not configured. Set API key first.');
        }
        const startTime = Date.now();
        const providerId = 'openai';
        try {
            const response = await this.callOpenAI(request);
            const duration = Date.now() - startTime;
            this.observability.recordProviderRequest(providerId, duration, true);
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = this.extractErrorMessage(error);
            this.observability.recordProviderRequest(providerId, duration, false, errorMsg);
            throw new Error(`OpenAI request failed: ${errorMsg}`);
        }
    }
    /**
     * Call OpenAI API
     */
    async callOpenAI(request) {
        const config = this.config;
        const baseURL = config.baseURL || this.DEFAULT_BASE_URL;
        const model = config.model || this.DEFAULT_MODEL;
        const requestBody = {
            model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? config.maxTokens ?? 2000,
            stream: request.stream ?? false
        };
        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.organization && { 'OpenAI-Organization': config.organization })
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message ||
                `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            content: data.choices[0]?.message?.content || '',
            model: data.model,
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            },
            finishReason: data.choices[0]?.finish_reason || 'unknown'
        };
    }
    /**
     * Stream request (for real-time responses)
     */
    async *streamRequest(request) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI provider not configured');
        }
        const config = this.config;
        const baseURL = config.baseURL || this.DEFAULT_BASE_URL;
        const model = config.model || this.DEFAULT_MODEL;
        const requestBody = {
            model,
            messages: request.messages,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? config.maxTokens ?? 2000,
            stream: true
        };
        const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                ...(config.organization && { 'OpenAI-Organization': config.organization })
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
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
                            continue;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) {
                                yield content;
                            }
                        }
                        catch (e) {
                            // Skip invalid JSON
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
     * Extract error message from error object
     */
    extractErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String(error.message);
        }
        return 'Unknown error';
    }
    /**
     * Test connection
     */
    async testConnection() {
        try {
            const response = await this.sendRequest({
                messages: [{ role: 'user', content: 'Hello' }],
                maxTokens: 10
            });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: this.extractErrorMessage(error)
            };
        }
    }
    /**
     * Get provider status
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            model: this.config?.model || this.DEFAULT_MODEL,
            baseURL: this.config?.baseURL || this.DEFAULT_BASE_URL
        };
    }
};
exports.OpenAIProvider = OpenAIProvider;
exports.OpenAIProvider = OpenAIProvider = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], OpenAIProvider);
