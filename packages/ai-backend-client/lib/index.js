"use strict";
// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStreamingIterator = exports.AethelAIBackendClient = void 0;
exports.getDefaultClient = getDefaultClient;
exports.setDefaultClient = setDefaultClient;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importStar(require("axios"));
// ============================================================================
// Client Implementation
// ============================================================================
class AethelAIBackendClient {
    constructor(config) {
        var _a, _b, _c;
        this.enableLogging = (_a = config.enableLogging) !== null && _a !== void 0 ? _a : false;
        this.retries = (_b = config.retries) !== null && _b !== void 0 ? _b : 2;
        this.api = axios_1.default.create({
            baseURL: config.baseUrl.replace(/\/$/, ''),
            timeout: (_c = config.timeoutMs) !== null && _c !== void 0 ? _c : 30000,
            headers: {
                'Content-Type': 'application/json',
                ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
            },
            validateStatus: (status) => typeof status === 'number' && status < 500,
        });
        this.api.interceptors.request.use((cfg) => {
            var _a;
            if (this.enableLogging) {
                console.log(`[AethelAIBackendClient] ${(_a = cfg.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${cfg.url}`);
            }
            return cfg;
        }, (error) => Promise.reject(error));
        this.api.interceptors.response.use((response) => response, async (error) => {
            var _a;
            const config = error.config;
            if (!config) {
                return Promise.reject(error);
            }
            const headers = this.ensureMutableHeaders(config);
            const attempt = Number((_a = headers.get('x-retry-count')) !== null && _a !== void 0 ? _a : 0);
            if (attempt >= this.retries) {
                return Promise.reject(error);
            }
            if (!error.response || error.response.status === 503) {
                headers.set('x-retry-count', String(attempt + 1));
                const delay = Math.min(1000 * 2 ** attempt, 8000);
                await new Promise(resolve => setTimeout(resolve, delay));
                if (this.enableLogging) {
                    console.log(`[AethelAIBackendClient] retry ${attempt + 1} after ${delay}ms`);
                }
                return this.api.request(config);
            }
            return Promise.reject(error);
        });
    }
    setToken(token) {
        if (token) {
            this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        else {
            delete this.api.defaults.headers.common['Authorization'];
        }
    }
    async health() {
        const response = await this.api.get('/health');
        this.log('GET /health', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Health check failed (status ${response.status})`);
        }
        return response.data;
    }
    async chat(request) {
        try {
            const response = await this.api.post('/ai-runtime/chat', request);
            this.log('POST /ai-runtime/chat', response.status);
            if (response.status !== 200 || !response.data) {
                return this.buildErrorResponse(request, response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Empty response');
            }
            return this.normalizeChatResponse(response.data, request);
        }
        catch (error) {
            return this.buildErrorResponse(request, this.formatError(error));
        }
    }
    async *chatStream(request, _options) {
        var _a, _b, _c, _d;
        const response = await this.chat({ ...request, stream: false });
        if (response.error) {
            throw new Error(response.error);
        }
        const content = (_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : (_d = response.message) === null || _d === void 0 ? void 0 : _d.content;
        if (content) {
            yield { content, usage: response.usage };
        }
        yield { done: true };
    }
    async loadModel(request) {
        const response = await this.api.post('/ai-runtime/load_model', request);
        this.log('POST /ai-runtime/load_model', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Failed to load model (status ${response.status})`);
        }
        return response.data;
    }
    async runInference(request) {
        const response = await this.api.post('/ai-runtime/run_inference', request);
        this.log('POST /ai-runtime/run_inference', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Inference failed (status ${response.status})`);
        }
        return response.data;
    }
    async listModels() {
        var _a;
        const response = await this.api.get('/ai-runtime/list_models');
        this.log('GET /ai-runtime/list_models', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Failed to list models (status ${response.status})`);
        }
        return (_a = response.data.models) !== null && _a !== void 0 ? _a : [];
    }
    async unloadModel(modelName) {
        const response = await this.api.delete(`/ai-runtime/unload_model/${encodeURIComponent(modelName)}`);
        this.log('DELETE /ai-runtime/unload_model', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Failed to unload model (status ${response.status})`);
        }
        return response.data;
    }
    async getGPUInfo() {
        const response = await this.api.get('/ai-runtime/gpu_info');
        this.log('GET /ai-runtime/gpu_info', response.status);
        if (response.status !== 200 || !response.data) {
            throw new Error(`Failed to fetch GPU info (status ${response.status})`);
        }
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    normalizeChatResponse(data, request) {
        var _a;
        const choices = Array.isArray(data.choices) && data.choices.length > 0
            ? data.choices
            : data.message
                ? [{ message: data.message }]
                : [];
        return {
            id: data.id || `${Date.now()}`,
            provider: (_a = data.provider) !== null && _a !== void 0 ? _a : request.provider,
            model: data.model || request.model || 'unknown',
            choices,
            usage: data.usage,
            message: data.message,
        };
    }
    buildErrorResponse(request, detail) {
        return {
            id: `${Date.now()}`,
            provider: request.provider,
            model: request.model || 'unknown',
            choices: [],
            error: detail,
        };
    }
    formatError(error) {
        if (error && typeof error === 'object') {
            const axiosError = error;
            if (axiosError.response) {
                const status = axiosError.response.status;
                const statusText = axiosError.response.statusText;
                return `HTTP ${status}: ${statusText}`;
            }
            if ('message' in axiosError && typeof axiosError.message === 'string') {
                return axiosError.message;
            }
        }
        return 'Unknown error';
    }
    ensureMutableHeaders(config) {
        var _a;
        const current = config.headers instanceof axios_1.AxiosHeaders
            ? config.headers
            : axios_1.AxiosHeaders.from((_a = config.headers) !== null && _a !== void 0 ? _a : {});
        config.headers = current;
        return current;
    }
    log(endpoint, status) {
        if (this.enableLogging) {
            console.log(`[AethelAIBackendClient] ${endpoint} -> ${status}`);
        }
    }
}
exports.AethelAIBackendClient = AethelAIBackendClient;
// ============================================================================
// Singleton helpers
// ============================================================================
let defaultClient;
function getDefaultClient() {
    if (!defaultClient) {
        const env = (typeof process !== 'undefined' && (process === null || process === void 0 ? void 0 : process.env)) || {};
        const baseUrl = env.AETHEL_BACKEND_URL || 'http://localhost:8000';
        const token = env.AETHEL_BACKEND_TOKEN;
        const enableLogging = env.NODE_ENV === 'development';
        defaultClient = new AethelAIBackendClient({
            baseUrl,
            token,
            enableLogging,
        });
    }
    return defaultClient;
}
function setDefaultClient(client) {
    defaultClient = client;
}
var streaming_1 = require("./streaming");
Object.defineProperty(exports, "BackendStreamingIterator", { enumerable: true, get: function () { return streaming_1.BackendStreamingIterator; } });
//# sourceMappingURL=index.js.map