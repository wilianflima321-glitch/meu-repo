/**
 * Minimal shim for @theia/ai-core
 * Provides type definitions for AI IDE integration
 */

export interface LanguageModel {
    id: string;
    name: string;
    provider: string;
}

export interface LanguageModelRequirement {
    purpose: string;
    identifier: string;
}

export interface LanguageModelMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LanguageModelResponse {
    content: string;
    model?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export function getJsonOfText(text: string): any;
export function getTextOfResponse(response: LanguageModelResponse): string;

export interface AgentService {
    getAgent(id: string): any;
    getAllAgents(): any[];
}

export interface AISettingsService {
    getSetting(key: string): any;
    setSetting(key: string, value: any): void;
}

export interface PromptService {
    getPrompt(id: string): any;
    registerPrompt(id: string, prompt: any): void;
}
