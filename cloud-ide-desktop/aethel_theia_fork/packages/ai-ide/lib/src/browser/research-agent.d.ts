import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
import { SecureFetch } from '../common/data/secure-fetch';
import { MissionTelemetry } from '../common/telemetry/mission-telemetry';
export interface ResearchRequest {
    type: 'search' | 'analyze' | 'summarize' | 'fact-check' | 'cite';
    query: string;
    sources?: string[];
    userId: string;
    workspaceId: string;
}
export interface ResearchResponse {
    results?: Array<{
        title: string;
        url: string;
        snippet: string;
        relevance: number;
    }>;
    analysis?: {
        summary: string;
        keyPoints: string[];
        sources: string[];
        factuality: number;
    };
    citations?: Array<{
        text: string;
        source: string;
        url: string;
    }>;
    factCheck?: {
        claim: string;
        verdict: 'true' | 'false' | 'mixed' | 'unverified';
        confidence: number;
        evidence: string[];
    };
    error?: string;
}
export interface PromptTemplate {
    id: string;
    template: string;
}
export declare class ResearchAgent {
    private telemetry;
    private observability;
    private llmRouter;
    private policyEngine;
    private contextStore;
    private secureFetch;
    private missionTelemetry;
    readonly id = "research";
    readonly name = "Research Agent";
    readonly description = "Performs search, analysis, summarization, and fact-checking.";
    readonly promptTemplates: PromptTemplate[];
    constructor(telemetry: TelemetryService, observability: ObservabilityService, llmRouter: LLMRouter, policyEngine: PolicyEngine, contextStore: ContextStore, secureFetch: SecureFetch, missionTelemetry: MissionTelemetry);
    invoke(request: ResearchRequest): Promise<ResearchResponse>;
    processRequest(request: ResearchRequest): Promise<ResearchResponse>;
    private performSearch;
    private analyzeContent;
    private summarizeContent;
    private factCheck;
    private generateCitations;
    private callLLM;
    getCapabilities(): string[];
}
