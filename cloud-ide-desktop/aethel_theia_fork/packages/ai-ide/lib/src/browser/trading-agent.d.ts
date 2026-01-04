import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
import { MissionTelemetry } from '../common/telemetry/mission-telemetry';
export interface TradingRequest {
    type: 'backtest' | 'walkforward' | 'paper' | 'optimize' | 'risk-analysis';
    strategy: string;
    parameters: {
        startDate?: string;
        endDate?: string;
        capital?: number;
        maxPositionSize?: number;
        stopLoss?: number;
        takeProfit?: number;
    };
    userId: string;
    workspaceId: string;
}
export interface TradingResponse {
    results?: {
        totalReturn: number;
        sharpeRatio: number;
        maxDrawdown: number;
        winRate: number;
        trades: number;
        profitFactor: number;
    };
    signals?: Array<{
        date: string;
        action: string;
        price: number;
        reason: string;
    }>;
    risks?: Array<{
        type: string;
        severity: string;
        description: string;
    }>;
    optimization?: {
        bestParameters: any;
        performance: any;
    };
    error?: string;
}
export interface PromptTemplate {
    id: string;
    template: string;
}
export declare class TradingAgent {
    private telemetry;
    private observability;
    private llmRouter;
    private policyEngine;
    private contextStore;
    private missionTelemetry;
    readonly id = "trading";
    readonly name = "Trading Agent";
    readonly description = "Backtests strategies, analyzes markets, and performs risk analysis.";
    readonly promptTemplates: PromptTemplate[];
    constructor(telemetry: TelemetryService, observability: ObservabilityService, llmRouter: LLMRouter, policyEngine: PolicyEngine, contextStore: ContextStore, missionTelemetry: MissionTelemetry);
    invoke(request: TradingRequest): Promise<TradingResponse>;
    processRequest(request: TradingRequest): Promise<TradingResponse>;
    private runBacktest;
    private runWalkForward;
    private runPaperTrading;
    private optimizeStrategy;
    private analyzeRisk;
    private callLLM;
    private getTradingHistory;
    getCapabilities(): string[];
}
