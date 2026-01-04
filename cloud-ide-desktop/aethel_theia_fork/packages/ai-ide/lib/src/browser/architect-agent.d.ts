import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
/**
 * Architect Agent - Production Implementation
 * Analyzes project structure and provides architectural guidance
 */
export interface ArchitectureRequest {
    type: 'analyze' | 'suggest' | 'review' | 'diagram' | 'dependencies' | 'refactor';
    scope: 'file' | 'directory' | 'workspace';
    path: string;
    context?: string;
    userId: string;
    workspaceId: string;
    files?: Array<{
        path: string;
        content: string;
    }>;
}
export interface ArchitectureResponse {
    analysis?: {
        structure: string;
        patterns: string[];
        antiPatterns: string[];
        dependencies: Array<{
            from: string;
            to: string;
            type: string;
        }>;
        metrics: {
            complexity: number;
            coupling: number;
            cohesion: number;
            maintainability: number;
        };
        issues: Array<{
            severity: string;
            message: string;
            location?: string;
        }>;
    };
    suggestions?: Array<{
        priority: string;
        description: string;
        impact: string;
    }>;
    diagram?: string;
    refactoringPlan?: Array<{
        step: number;
        action: string;
        files: string[];
    }>;
    error?: string;
}
export interface PromptTemplate {
    id: string;
    template: string;
}
export declare class ArchitectAgent {
    private telemetry;
    private observability;
    private llmRouter;
    private policyEngine;
    private contextStore;
    readonly id = "architect";
    readonly name = "Architect";
    readonly description = "Analyzes project structure and provides architectural guidance.";
    readonly promptTemplates: PromptTemplate[];
    invoke(request: any): Promise<any>;
    constructor(telemetry: TelemetryService, observability: ObservabilityService, llmRouter: LLMRouter, policyEngine: PolicyEngine, contextStore: ContextStore);
    /**
     * Process architecture request with full LLM integration
     */
    processRequest(request: ArchitectureRequest): Promise<ArchitectureResponse>;
    /**
     * Analyze structure (static analysis)
     */
    private analyzeStructure;
    /**
     * Build prompt for LLM
     */
    private buildPrompt;
    /**
     * Call LLM provider
     */
    private callLLM;
    /**
     * Parse LLM response
     */
    private parseResponse;
    private extractPatterns;
    private extractAntiPatterns;
    private extractIssues;
    private extractSuggestions;
    private extractDiagram;
    private extractRefactoringPlan;
    private calculateComplexity;
    private calculateCoupling;
    private calculateCohesion;
    private calculateMaintainability;
    private estimateTokens;
    /**
     * Get agent capabilities
     */
    getCapabilities(): string[];
}
