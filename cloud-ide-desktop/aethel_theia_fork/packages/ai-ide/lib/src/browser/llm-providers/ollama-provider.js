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
exports.OllamaProvider = void 0;
const inversify_1 = require("inversify");
const observability_service_1 = require("../../common/observability-service");
let OllamaProvider = class OllamaProvider {
    constructor(observability) {
        this.observability = observability;
        this.config = null;
        this.DEFAULT_BASE_URL = 'http://localhost:11434';
        this.DEFAULT_MODEL = 'llama3.2';
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
        return this.config !== null;
    }
    /**
     * Check if Ollama server is running
     */
    async isServerRunning() {
        try {
            const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;
            const response = await fetch(`${baseURL}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * Get available models from Ollama
     */
    async getAvailableModels() {
        const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;
        try {
            const response = await fetch(`${baseURL}/api/tags`);
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return (data.models || []).map((m) => ({
                name: m.name,
                size: m.size,
                modifiedAt: m.modified_at,
                digest: m.digest,
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Pull a model from Ollama registry
     */
    async pullModel(modelName, onProgress) {
        const baseURL = this.config?.baseURL || this.DEFAULT_BASE_URL;
        const response = await fetch(`${baseURL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: true }),
        });
        if (!response.ok) {
            throw new Error(`Failed to pull model: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        if (!reader)
            return;
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const lines = decoder.decode(value).split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (onProgress && data.status) {
                            onProgress(data.status);
                        }
                    }
                    catch {
                        // Skip malformed lines
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * Send request to Ollama
     */
    async sendRequest(request) {
        if (!this.isConfigured() && !await this.isServerRunning()) {
            throw new Error('Ollama server not running. Start Ollama first.');
        }
        const startTime = Date.now();
        const providerId = 'ollama';
        try {
            const response = await this.callOllama(request);
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
     * Stream response from Ollama
     */
    async *streamRequest(request) {
        const config = this.config;
        const baseURL = config?.baseURL || this.DEFAULT_BASE_URL;
        const model = config?.model || this.DEFAULT_MODEL;
        const body = {
            model,
            messages: request.messages,
            stream: true,
            options: {
                temperature: request.options?.temperature ?? config?.temperature ?? 0.7,
                num_ctx: request.options?.num_ctx ?? config?.contextLength ?? 4096,
                num_predict: request.options?.num_predict ?? 2048,
            },
        };
        const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const lines = decoder.decode(value).split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            yield data.message.content;
                        }
                        if (data.done)
                            return;
                    }
                    catch {
                        // Skip malformed lines
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * Call Ollama API
     */
    async callOllama(request) {
        const config = this.config;
        const baseURL = config?.baseURL || this.DEFAULT_BASE_URL;
        const model = config?.model || this.DEFAULT_MODEL;
        const body = {
            model,
            messages: request.messages,
            stream: false,
            options: {
                temperature: request.options?.temperature ?? config?.temperature ?? 0.7,
                num_ctx: request.options?.num_ctx ?? config?.contextLength ?? 4096,
                num_predict: request.options?.num_predict ?? 2048,
            },
        };
        const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return {
            content: data.message?.content || '',
            model: data.model || model,
            totalDuration: data.total_duration || 0,
            evalCount: data.eval_count || 0,
            promptEvalCount: data.prompt_eval_count || 0,
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
            role: m.role,
            content: m.content,
        }));
    }
    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            id: 'ollama',
            name: 'Ollama (Local)',
            models: [
                'llama3.2',
                'llama3.2:1b',
                'llama3.1',
                'mistral',
                'codellama',
                'deepseek-coder',
                'qwen2.5-coder',
            ],
        };
    }
};
exports.OllamaProvider = OllamaProvider;
exports.OllamaProvider = OllamaProvider = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], OllamaProvider);
