import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ToolchainRegistry } from '../common/toolchains/toolchain-registry';
import { ContextStore } from '../common/context/context-store';
/**
 * Coder Agent - Production Implementation
 * Assists with code writing, refactoring, and debugging
 */
export interface CodeRequest {
    type: 'generate' | 'refactor' | 'debug' | 'explain' | 'test' | 'review';
    language: string;
    context: string;
    prompt: string;
    userId: string;
    workspaceId: string;
    files?: Array<{
        path: string;
        content: string;
    }>;
}
export interface CodeResponse {
    code?: string;
    explanation?: string;
    suggestions?: string[];
    tests?: string;
    issues?: Array<{
        severity: string;
        message: string;
        line?: number;
    }>;
    error?: string;
}
export interface PromptTemplate {
    id: string;
    template: string;
}
export declare class CoderAgent {
    private telemetry;
    private observability;
    private llmRouter;
    private policyEngine;
    private toolchainRegistry;
    private contextStore;
    readonly id = "coder";
    readonly name = "Coder";
    readonly description = "Assists with code writing, refactoring, and debugging.";
    readonly promptTemplates: PromptTemplate[];
    invoke(request: any): Promise<any>;
    constructor(telemetry: TelemetryService, observability: ObservabilityService, llmRouter: LLMRouter, policyEngine: PolicyEngine, toolchainRegistry: ToolchainRegistry, contextStore: ContextStore);
    /**
     * Process code request with full policy and LLM integration
     */
    processRequest(request: CodeRequest): Promise<CodeResponse>;
    /**
     * Build prompt based on request type
     */
    private buildPrompt;
    /**
     * Call LLM provider
     */
    private callLLM;
    /**
     * Parse LLM response based on request type
     */
    private parseResponse;
    /**
     * Extract suggestions from response
     */
    private extractSuggestions;
    /**
     * Extract issues from response
     */
    private extractIssues;
    /**
     * Estimate tokens for prompt
     */
    private estimateTokens;
    /**
     * Get agent capabilities
     */
    getCapabilities(): string[];
}
