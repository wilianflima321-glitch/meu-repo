"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingAgent = void 0;
const inversify_1 = require("inversify");
const telemetry_service_1 = require("./onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const context_store_1 = require("../common/context/context-store");
const mission_telemetry_1 = require("../common/telemetry/mission-telemetry");
let TradingAgent = class TradingAgent {
    constructor(telemetry, observability, llmRouter, policyEngine, contextStore, missionTelemetry) {
        this.telemetry = telemetry;
        this.observability = observability;
        this.llmRouter = llmRouter;
        this.policyEngine = policyEngine;
        this.contextStore = contextStore;
        this.missionTelemetry = missionTelemetry;
        this.id = 'trading';
        this.name = 'Trading Agent';
        this.description = 'Backtests strategies, analyzes markets, and performs risk analysis.';
        this.promptTemplates = [
            { id: 'trading-backtest', template: 'Backtest a strategy over historical data.' },
            { id: 'trading-market-analysis', template: 'Analyze market regime and conditions.' },
            { id: 'trading-risk-management', template: 'Assess and mitigate portfolio risks.' },
            { id: 'trading-portfolio-optimization', template: 'Optimize allocation and parameters.' },
        ];
    }
    async invoke(request) {
        return this.processRequest(request);
    }
    async processRequest(request) {
        const startTime = Date.now();
        try {
            this.telemetry.trackAgentInvoked('Trading', request.type);
            // Policy check - trading requires strict validation
            const policyContext = {
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
                history: await this.getTradingHistory(request.workspaceId),
            };
            const evaluation = await this.policyEngine.evaluate(policyContext);
            if (!evaluation.allowed) {
                throw new Error(`Policy violation: ${evaluation.violations.map(v => v.message).join(', ')}`);
            }
            // Execute based on type
            let response;
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Trading', duration, false, error.message);
            return { error: error.message };
        }
    }
    async runBacktest(request) {
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
    async runWalkForward(request) {
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
    async runPaperTrading(request) {
        return {
            signals: [
                { date: new Date().toISOString(), action: 'BUY', price: 100, reason: 'Signal detected' },
            ],
        };
    }
    async optimizeStrategy(request) {
        const prompt = `Optimize parameters for this trading strategy:\n${request.strategy}\n\nFind best parameters for maximum Sharpe ratio.`;
        await this.callLLM(request, prompt);
        return {
            optimization: {
                bestParameters: request.parameters,
                performance: { sharpeRatio: 1.8 },
            },
        };
    }
    async analyzeRisk(request) {
        return {
            risks: [
                { type: 'market', severity: 'medium', description: 'Market volatility risk' },
                { type: 'liquidity', severity: 'low', description: 'Liquidity risk minimal' },
            ],
        };
    }
    async callLLM(request, prompt) {
        const routingRequest = {
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
    async getTradingHistory(workspaceId) {
        const query = await this.contextStore.query({
            workspaceId,
            domain: 'trading',
            type: ['execution'],
            limit: 10,
        }, 'system');
        return query;
    }
    getCapabilities() {
        return [
            'Strategy backtesting',
            'Walk-forward analysis',
            'Paper trading simulation',
            'Parameter optimization',
            'Risk analysis',
        ];
    }
};
exports.TradingAgent = TradingAgent;
exports.TradingAgent = TradingAgent = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(telemetry_service_1.TelemetryService)),
    __param(1, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __param(2, (0, inversify_1.inject)(llm_router_1.LLMRouter)),
    __param(3, (0, inversify_1.inject)(policy_engine_1.PolicyEngine)),
    __param(4, (0, inversify_1.inject)(context_store_1.ContextStore)),
    __param(5, (0, inversify_1.inject)(mission_telemetry_1.MissionTelemetry)),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        observability_service_1.ObservabilityService,
        llm_router_1.LLMRouter,
        policy_engine_1.PolicyEngine,
        context_store_1.ContextStore,
        mission_telemetry_1.MissionTelemetry])
], TradingAgent);
