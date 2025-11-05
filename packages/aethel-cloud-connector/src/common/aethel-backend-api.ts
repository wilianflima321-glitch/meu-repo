// *****************************************************************************
// Copyright (C) 2025 Aethel IDE Team.
//
// This program and the accompanying materials are made available under the
// terms of the Aethel Proprietary License.
//
// SPDX-License-Identifier: Proprietary
// *****************************************************************************

/**
 * Aethel Backend API Client for Desktop IDE
 * Centralizes all communication with the Aethel Cloud Backend
 * Eliminates direct AI SDK calls from Desktop IDE
 */

export interface AethelConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
    retries?: number;
}

export interface AethelChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    images?: string[]; // Base64 encoded images
}

export interface AethelChatRequest {
    messages: AethelChatMessage[];
    model?: string;
    provider?: 'openai' | 'anthropic' | 'ollama' | 'huggingface' | 'google';
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: AethelTool[];
    tool_choice?: string;
}

export interface AethelTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface AethelChatResponse {
    id: string;
    model: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
            tool_calls?: Array<{
                id: string;
                type: 'function';
                function: {
                    name: string;
                    arguments: string;
                };
            }>;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AethelStreamChunk {
    id: string;
    model: string;
    choices: Array<{
        delta: {
            role?: string;
            content?: string;
            tool_calls?: Array<{
                index: number;
                id?: string;
                type?: 'function';
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
        };
        finish_reason?: string;
    }>;
}

export interface AethelEmbeddingRequest {
    input: string | string[];
    model?: string;
}

export interface AethelEmbeddingResponse {
    embeddings: number[][];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export interface AethelSemanticSearchRequest {
    query: string;
    workspace_path: string;
    file_extensions?: string[];
    max_results?: number;
}

export interface AethelSemanticSearchResult {
    file_path: string;
    line_number: number;
    content: string;
    score: number;
}

export interface AethelCodeAnalysisRequest {
    code: string;
    language: string;
    analysis_type: 'refactor' | 'review' | 'explain' | 'test';
}

export interface AethelCodeAnalysisResponse {
    suggestions: Array<{
        type: string;
        description: string;
        code?: string;
        line?: number;
    }>;
}

export const AethelBackendAPIPath = '/services/aethel-backend-api';
export const AethelBackendAPI = Symbol('AethelBackendAPI');

/**
 * Backend service interface for Theia RPC
 */
export interface AethelBackendAPI {
    /**
     * Send chat completion request to backend AI runtime
     */
    chat(request: AethelChatRequest): Promise<AethelChatResponse>;

    /**
     * Stream chat completion from backend AI runtime
     */
    chatStream(request: AethelChatRequest): Promise<ReadableStream<AethelStreamChunk>>;

    /**
     * Generate embeddings for semantic search
     */
    embeddings(request: AethelEmbeddingRequest): Promise<AethelEmbeddingResponse>;

    /**
     * Semantic code search using backend RAG
     */
    semanticSearch(request: AethelSemanticSearchRequest): Promise<AethelSemanticSearchResult[]>;

    /**
     * AI-powered code analysis
     */
    analyzeCode(request: AethelCodeAnalysisRequest): Promise<AethelCodeAnalysisResponse>;

    /**
     * Get available AI models from backend
     */
    getAvailableModels(): Promise<string[]>;

    /**
     * Get backend health status
     */
    getHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; version: string }>;
}
