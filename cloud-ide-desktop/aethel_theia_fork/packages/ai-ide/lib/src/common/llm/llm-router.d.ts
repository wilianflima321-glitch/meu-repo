import { Event } from '@theia/core';
/**
 * LLM provider configuration
 */
export interface LLMProvider {
    id: string;
    name: string;
    models: LLMModel[];
    endpoint: string;
    apiKey: string;
    rateLimit: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
    pricing: {
        inputTokenCost: number;
        outputTokenCost: number;
    };
    capabilities: {
        streaming: boolean;
        functionCalling: boolean;
        vision: boolean;
        maxContextLength: number;
    };
}
/**
 * LLM model configuration
 */
export interface LLMModel {
    id: string;
    name: string;
    providerId: string;
    tier: 'fast' | 'balanced' | 'quality';
    contextWindow: number;
    pricing: {
        input: number;
        output: number;
    };
    performance: {
        avgLatencyMs: number;
        p95LatencyMs: number;
        throughputTPS: number;
    };
    capabilities: string[];
}
/**
 * Routing request with constraints
 */
export interface RoutingRequest {
    domain: 'code' | 'trading' | 'research' | 'creative';
    task: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    constraints: {
        maxCost?: number;
        maxLatency?: number;
        minQuality?: number;
        requiredCapabilities?: string[];
    };
    context: {
        workspaceId: string;
        userId: string;
        budget: {
            total: number;
            spent: number;
            remaining: number;
        };
    };
    estimatedTokens?: {
        input: number;
        output: number;
    };
}
/**
 * Routing decision
 */
export interface RoutingDecision {
    model: LLMModel;
    provider: LLMProvider;
    estimatedCost: number;
    estimatedLatency: number;
    qualityScore: number;
    reasoning: string;
    fallbacks: Array<{
        model: LLMModel;
        provider: LLMProvider;
    }>;
}
/**
 * Budget tracking
 */
interface BudgetTracker {
    workspaceId: string;
    total: number;
    spent: number;
    remaining: number;
    alerts: Array<{
        threshold: number;
        triggered: boolean;
    }>;
    planId?: PlanType;
}
/**
 * Plan types - 5 tiers with zero loss margins (89%+)
 */
export type PlanType = 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
/**
 * Plan budget configuration
 * Alinhado com estratégia ZERO PREJUÍZO:
 * - Starter: $3/mês, 500K tokens, margin 96.7%
 * - Basic: $9/mês, 2M tokens, margin 93.9%
 * - Pro: $29/mês, 8M tokens, margin 89.2%
 * - Studio: $79/mês, 25M tokens, margin 89.6%
 * - Enterprise: $199/mês, 100M tokens, margin 92.0%
 */
export declare const PLAN_BUDGETS: Record<PlanType, {
    budget: number;
    tokens: number;
    allowedModels: string[];
}>;
/**
 * LLM Router with cost optimization, circuit breakers, and fallback
 */
export declare class LLMRouter {
    private providers;
    private models;
    private circuitBreakers;
    private metrics;
    private budgets;
    private cache;
    private readonly onCostAlertEmitter;
    readonly onCostAlert: Event<{
        workspaceId: string;
        threshold: number;
    }>;
    private readonly onCircuitOpenEmitter;
    readonly onCircuitOpen: Event<{
        providerId: string;
    }>;
    private readonly FAILURE_THRESHOLD;
    private readonly TIMEOUT_MS;
    private readonly HALF_OPEN_DELAY_MS;
    private readonly configService;
    constructor();
    /**
     * Initialize router (call after ConfigService is loaded)
     */
    initialize(): Promise<void>;
    /**
     * Route request to optimal model
     */
    route(request: RoutingRequest): Promise<RoutingDecision>;
    /**
     * Execute request with fallback
     */
    execute<T>(decision: RoutingDecision, executor: (model: LLMModel, provider: LLMProvider) => Promise<T>, request: RoutingRequest): Promise<T>;
    /**
     * Estimate cost before execution
     */
    estimateCost(request: RoutingRequest): {
        min: number;
        max: number;
        recommended: number;
    };
    /**
     * Get post-mortem analysis
     */
    getPostMortem(workspaceId: string, timeRange: {
        start: number;
        end: number;
    }): any;
    /**
     * Register provider
     */
    registerProvider(provider: LLMProvider): void;
    /**
     * Set workspace budget (legacy method)
     */
    setBudget(workspaceId: string, total: number): void;
    /**
     * Set workspace budget by plan (RECOMMENDED)
     * Uses PLAN_BUDGETS configuration for zero-loss margins
     */
    setBudgetByPlan(workspaceId: string, planId: PlanType): void;
    /**
     * Get allowed models for workspace based on plan
     */
    getAllowedModels(workspaceId: string): string[];
    /**
     * Get budget status
     */
    getBudget(workspaceId: string): BudgetTracker;
    /**
     * Cache response
     */
    cacheResponse(request: RoutingRequest, response: any, ttlMs?: number): void;
    /**
     * Load providers from ConfigService
     * Organized by tier for cost optimization (89%+ margins)
     */
    private loadProvidersFromConfig;
    private getCandidateModels;
    private scoreModel;
    private calculateCost;
    private createDecision;
    private canAttempt;
    private recordSuccess;
    private recordFailure;
    private checkCostAlerts;
    private getCacheKey;
    private timeout;
    private startMetricsCleanup;
}
export {};
