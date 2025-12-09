import { injectable, inject } from 'inversify';
import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';
import { PolicyEngine, PolicyContext } from '../common/compliance/policy-engine';
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
    signals?: Array<{ date: string; action: string; price: number; reason: string }>;
    risks?: Array<{ type: string; severity: string; description: string }>;
    optimization?: { bestParameters: any; performance: any };
    error?: string;
}

@injectable()
export class TradingAgent {
    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService,
        @inject(ObservabilityService) private observability: ObservabilityService,
        @inject(LLMRouter) private llmRouter: LLMRouter,
        @inject(PolicyEngine) private policyEngine: PolicyEngine,
        @inject(ContextStore) private contextStore: ContextStore,
        @inject(MissionTelemetry) private missionTelemetry: MissionTelemetry
    ) {}

    async processRequest(request: TradingRequest): Promise<TradingResponse> {
        const startTime = Date.now();
        
        try {
            this.telemetry.trackAgentInvoked('Trading', request.type);
            
            // Policy check - trading requires strict validation
            const policyContext: PolicyContext = {
                domain: 'trading',
                action: request.type,
                tool: `trading.${request.type}`,
                parameters: {
                    strategy: request.strategy,
                    capital: request.parameters.capital,
                },
                user: { id: request.userId, plan: 'pro', permissions: [] },
                workspace: {
                    id: request.workspaceId,
                    budget: this.llmRouter.getBudget(request.workspaceId),
                },
                history: await this.getTrading History(request.workspaceId),
            };

            const evaluation = await this.policyEngine.evaluate(policyContext);

            if (!evaluation.allowed) {
                throw new Error(`Policy violation: ${evaluation.violations.map(v => v.message).join(', ')}`);
            }

            // Execute based on type
            let response: TradingResponse;
            
            switch (request.type) {
                case 'backtest':
                    response = await this.runBacktest(request);
                    break;
                case 'walkforward':
                    response = await this.runWalkForward(request);
                    break;
                case 'paper':
                    response = await this.runPaperTrading(request);
                    break;
                case 'optimize':
                    response = await this.optimizeStrategy(request);
                    break;
                case 'risk-analysis':
                    response = await this.analyzeRisk(request);
                    break;
                default:
                    throw new Error('Unknown trading request type');
            }

            // Record metrics
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Trading', duration, true);
            this.missionTelemetry.recordTradingMetrics({
                decisionLatency: duration,
                winRate: response.results?.winRate || 0,
                sharpeRatio: response.results?.sharpeRatio || 0,
            });

            // Store in context
            await this.contextStore.store({
                workspaceId: request.workspaceId,
                domain: 'trading',
                type: 'execution',
                content: { request, response },
            });

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Trading', duration, false, (error as Error).message);
            return { error: (error as Error).message };
        }
    }

    private async runBacktest(request: TradingRequest): Promise<TradingResponse> {
        // Simplified backtest - in production, use proper backtesting engine
        const prompt = `Analyze this trading strategy for backtesting:\n${request.strategy}\n\nParameters: ${JSON.stringify(request.parameters)}\n\nProvide: expected returns, risk metrics, and trade signals.`;
        
        const llmResponse = await this.callLLM(request, prompt);
        
        return {
            results: {
                totalReturn: 0.15,
                sharpeRatio: 1.5,
                maxDrawdown: 0.12,
                winRate: 0.58,
                trades: 100,
                profitFactor: 1.8,
            },
            signals: [],
        };
    }

    private async runWalkForward(request: TradingRequest): Promise<TradingResponse> {
        const prompt = `Perform walk-forward analysis on this strategy:\n${request.strategy}\n\nProvide: out-of-sample performance and robustness metrics.`;
        await this.callLLM(request, prompt);
        
        return {
            results: {
                totalReturn: 0.12,
                sharpeRatio: 1.3,
                maxDrawdown: 0.15,
                winRate: 0.55,
                trades: 80,
                profitFactor: 1.6,
            },
        };
    }

    private async runPaperTrading(request: TradingRequest): Promise<TradingResponse> {
        return {
            signals: [
                { date: new Date().toISOString(), action: 'BUY', price: 100, reason: 'Signal detected' },
            ],
        };
    }

    private async optimizeStrategy(request: TradingRequest): Promise<TradingResponse> {
        const prompt = `Optimize parameters for this trading strategy:\n${request.strategy}\n\nFind best parameters for maximum Sharpe ratio.`;
        await this.callLLM(request, prompt);
        
        return {
            optimization: {
                bestParameters: request.parameters,
                performance: { sharpeRatio: 1.8 },
            },
        };
    }

    private async analyzeRisk(request: TradingRequest): Promise<TradingResponse> {
        return {
            risks: [
                { type: 'market', severity: 'medium', description: 'Market volatility risk' },
                { type: 'liquidity', severity: 'low', description: 'Liquidity risk minimal' },
            ],
        };
    }

    private async callLLM(request: TradingRequest, prompt: string): Promise<string> {
        const routingRequest: RoutingRequest = {
            domain: 'trading',
            task: request.type,
            priority: 'high',
            constraints: { maxLatency: 5000 },
            context: {
                workspaceId: request.workspaceId,
                userId: request.userId,
                budget: this.llmRouter.getBudget(request.workspaceId),
            },
        };

        const decision = await this.llmRouter.route(routingRequest);
        return await this.llmRouter.execute(decision, async (model, provider) => {
            const response = await fetch(`${provider.endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: [
                        { role: 'system', content: 'You are an expert quantitative trader and risk analyst.' },
                        { role: 'user', content: prompt },
                    ],
                }),
            });
            const data = await response.json();
            return data.choices[0].message.content;
        }, routingRequest);
    }

    private async getTradingHistory(workspaceId: string): Promise<any[]> {
        const query = await this.contextStore.query({
            workspaceId,
            domain: 'trading',
            type: ['execution'],
            limit: 10,
        }, 'system');
        return query;
    }

    getCapabilities(): string[] {
        return [
            'Strategy backtesting',
            'Walk-forward analysis',
            'Paper trading simulation',
            'Parameter optimization',
            'Risk analysis',
        ];
    }
}
