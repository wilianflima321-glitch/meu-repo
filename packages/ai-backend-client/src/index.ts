// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************

import axios, { type AxiosInstance, type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios';

// Minimal declaration so the package works in environments without Node types.
declare const process: { env?: Record<string, string | undefined> } | undefined;

// ============================================================================
// Contract Types
// ============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'huggingface' | 'google';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  provider?: AIProvider;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatCompletionChoice {
  index?: number;
  message: ChatMessage;
  finish_reason?: string;
}

export interface ChatCompletionResponse {
  id: string;
  provider?: AIProvider;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  message?: ChatMessage;
  error?: string;
}

export interface ChatStreamChunk {
  content?: string;
  usage?: ChatCompletionUsage;
  done?: boolean;
  event?: string;
}

export interface ModelLoadRequest {
  model_name: string;
  provider: AIProvider;
  device?: string;
  quantization?: string;
}

export interface LoadModelResponse {
  status: string;
  model_name: string;
  provider: string;
  device?: string;
}

export interface InferenceRequest {
  model_name: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface InferenceResponse {
  model_name: string;
  result: string;
  tokens_generated?: number;
}

export interface HealthResponse {
  status: string;
  version?: string;
  uptime?: number;
}

export interface AethelBackendClientConfig {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  retries?: number;
  enableLogging?: boolean;
}

// ============================================================================
// Client Implementation
// ============================================================================

export class AethelAIBackendClient {
  private readonly api: AxiosInstance;
  private readonly enableLogging: boolean;
  private readonly retries: number;

  constructor(config: AethelBackendClientConfig) {
    this.enableLogging = config.enableLogging ?? false;
    this.retries = config.retries ?? 2;
    this.api = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ''),
      timeout: config.timeoutMs ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      validateStatus: (status: number) => typeof status === 'number' && status < 500,
    });

    this.api.interceptors.request.use(
      (cfg: InternalAxiosRequestConfig) => {
        if (this.enableLogging) {
          console.log(`[AethelAIBackendClient] ${cfg.method?.toUpperCase()} ${cfg.url}`);
        }
        return cfg;
      },
      (error: unknown) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const config = error.config;
        if (!config) {
          return Promise.reject(error);
        }

  const headers = this.ensureMutableHeaders(config);
  const attempt = Number(headers.get('x-retry-count') ?? 0);

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
      }
    );
  }

  setToken(token: string | undefined): void {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  async health(): Promise<HealthResponse> {
    const response = await this.api.get<HealthResponse>('/health');
    this.log('GET /health', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Health check failed (status ${response.status})`);
    }
    return response.data;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await this.api.post<ChatCompletionResponse>('/ai-runtime/chat', request);
      this.log('POST /ai-runtime/chat', response.status);

      if (response.status !== 200 || !response.data) {
        return this.buildErrorResponse(request, response.status ? `HTTP ${response.status}: ${response.statusText}` : 'Empty response');
      }

      return this.normalizeChatResponse(response.data, request);
    } catch (error) {
      return this.buildErrorResponse(request, this.formatError(error));
    }
  }

  async *chatStream(
    request: ChatCompletionRequest,
    _options?: { signal?: AbortSignal }
  ): AsyncGenerator<ChatStreamChunk> {
    const response = await this.chat({ ...request, stream: false });
    if (response.error) {
      throw new Error(response.error);
    }

    const content = response.choices[0]?.message?.content ?? response.message?.content;
    if (content) {
      yield { content, usage: response.usage };
    }

    yield { done: true };
  }

  async loadModel(request: ModelLoadRequest): Promise<LoadModelResponse> {
    const response = await this.api.post<LoadModelResponse>('/ai-runtime/load_model', request);
    this.log('POST /ai-runtime/load_model', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Failed to load model (status ${response.status})`);
    }
    return response.data;
  }

  async runInference(request: InferenceRequest): Promise<InferenceResponse> {
    const response = await this.api.post<InferenceResponse>('/ai-runtime/run_inference', request);
    this.log('POST /ai-runtime/run_inference', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Inference failed (status ${response.status})`);
    }
    return response.data;
  }

  async listModels(): Promise<string[]> {
    const response = await this.api.get<{ models: string[] }>('/ai-runtime/list_models');
    this.log('GET /ai-runtime/list_models', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Failed to list models (status ${response.status})`);
    }
    return response.data.models ?? [];
  }

  async unloadModel(modelName: string): Promise<{ status: string }> {
    const response = await this.api.delete<{ status: string }>(`/ai-runtime/unload_model/${encodeURIComponent(modelName)}`);
    this.log('DELETE /ai-runtime/unload_model', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Failed to unload model (status ${response.status})`);
    }
    return response.data;
  }

  async getGPUInfo(): Promise<Record<string, unknown>> {
    const response = await this.api.get<Record<string, unknown>>('/ai-runtime/gpu_info');
    this.log('GET /ai-runtime/gpu_info', response.status);
    if (response.status !== 200 || !response.data) {
      throw new Error(`Failed to fetch GPU info (status ${response.status})`);
    }
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private normalizeChatResponse(data: ChatCompletionResponse, request: ChatCompletionRequest): ChatCompletionResponse {
    const choices = Array.isArray(data.choices) && data.choices.length > 0
      ? data.choices
      : data.message
        ? [{ message: data.message }]
        : [];

    return {
      id: data.id || `${Date.now()}`,
      provider: data.provider ?? request.provider,
      model: data.model || request.model || 'unknown',
      choices,
      usage: data.usage,
      message: data.message,
    };
  }

  private buildErrorResponse(request: ChatCompletionRequest, detail: string): ChatCompletionResponse {
    return {
      id: `${Date.now()}`,
      provider: request.provider,
      model: request.model || 'unknown',
      choices: [],
      error: detail,
    };
  }

  private formatError(error: unknown): string {
    if (error && typeof error === 'object') {
      const axiosError = error as AxiosError;
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

  private ensureMutableHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
    const current = config.headers instanceof AxiosHeaders
      ? config.headers
      : AxiosHeaders.from(config.headers ?? {});
    config.headers = current;
    return current;
  }

  private log(endpoint: string, status: number): void {
    if (this.enableLogging) {
      console.log(`[AethelAIBackendClient] ${endpoint} -> ${status}`);
    }
  }
}

// ============================================================================
// Singleton helpers
// ============================================================================

let defaultClient: AethelAIBackendClient | undefined;

export function getDefaultClient(): AethelAIBackendClient {
  if (!defaultClient) {
    const env = (typeof process !== 'undefined' && process?.env) || {};
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

export function setDefaultClient(client: AethelAIBackendClient | undefined): void {
  defaultClient = client;
}

export { BackendStreamingIterator, type BackendStreamContext } from './streaming';

