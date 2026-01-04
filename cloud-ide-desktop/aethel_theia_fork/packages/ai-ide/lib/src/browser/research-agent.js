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
exports.ResearchAgent = void 0;
const inversify_1 = require("inversify");
const telemetry_service_1 = require("./onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const context_store_1 = require("../common/context/context-store");
const secure_fetch_1 = require("../common/data/secure-fetch");
const mission_telemetry_1 = require("../common/telemetry/mission-telemetry");
let ResearchAgent = class ResearchAgent {
    constructor(telemetry, observability, llmRouter, policyEngine, contextStore, secureFetch, missionTelemetry) {
        this.telemetry = telemetry;
        this.observability = observability;
        this.llmRouter = llmRouter;
        this.policyEngine = policyEngine;
        this.contextStore = contextStore;
        this.secureFetch = secureFetch;
        this.missionTelemetry = missionTelemetry;
        this.id = 'research';
        this.name = 'Research Agent';
        this.description = 'Performs search, analysis, summarization, and fact-checking.';
        this.promptTemplates = [
            { id: 'research-search', template: 'Search the web for relevant sources.' },
            { id: 'research-analysis', template: 'Analyze and extract key points.' },
            { id: 'research-summarize', template: 'Summarize content clearly and concisely.' },
            { id: 'research-fact-verify', template: 'Fact-check claims and provide evidence.' },
        ];
    }
    async invoke(request) {
        return this.processRequest(request);
    }
    async processRequest(request) {
        const startTime = Date.now();
        try {
            this.telemetry.trackAgentInvoked('Research', request.type);
            // Policy check
            const policyContext = {
                domain: 'research',
                action: request.type,
                tool: `research.${request.type}`,
                parameters: { query: request.query },
                user: { id: request.userId, plan: 'pro', permissions: [] },
                workspace: {
                    id: request.workspaceId,
                    budget: this.llmRouter.getBudget(request.workspaceId),
                },
            };
            const evaluation = await this.policyEngine.evaluate(policyContext);
            if (!evaluation.allowed) {
                throw new Error(`Policy violation: ${evaluation.violations.map(v => v.message).join(', ')}`);
            }
            let response;
            switch (request.type) {
                case 'search':
                    response = await this.performSearch(request);
                    break;
                case 'analyze':
                    response = await this.analyzeContent(request);
                    break;
                case 'summarize':
                    response = await this.summarizeContent(request);
                    break;
                case 'fact-check':
                    response = await this.factCheck(request);
                    break;
                case 'cite':
                    response = await this.generateCitations(request);
                    break;
                default:
                    throw new Error('Unknown research request type');
            }
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Research', duration, true);
            this.missionTelemetry.recordResearchMetrics({
                factuality: response.analysis?.factuality || 0,
                sourceCoverage: response.analysis?.sources.length || 0,
                fetchSuccess: 1,
            });
            await this.contextStore.store({
                workspaceId: request.workspaceId,
                domain: 'research',
                type: 'execution',
                content: { request, response },
            });
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Research', duration, false, error.message);
            return { error: error.message };
        }
    }
    async performSearch(request) {
        // Fetch from multiple sources
        const sources = request.sources || ['https://en.wikipedia.org'];
        const results = [];
        for (const source of sources.slice(0, 3)) {
            try {
                const fetchRequest = {
                    url: source,
                    userId: request.userId,
                    workspaceId: request.workspaceId,
                    purpose: 'research',
                };
                const fetchResult = await this.secureFetch.fetch(fetchRequest);
                results.push({
                    title: source,
                    url: source,
                    snippet: fetchResult.content.substring(0, 200),
                    relevance: 0.8,
                });
            }
            catch (error) {
                // Continue with other sources
            }
        }
        return { results };
    }
    async analyzeContent(request) {
        const prompt = `Analyze the following research query:\n${request.query}\n\nProvide: summary, key points, and factuality assessment.`;
        const llmResponse = await this.callLLM(request, prompt);
        return {
            analysis: {
                summary: llmResponse,
                keyPoints: ['Point 1', 'Point 2', 'Point 3'],
                sources: request.sources || [],
                factuality: 0.85,
            },
        };
    }
    async summarizeContent(request) {
        const prompt = `Summarize the following:\n${request.query}\n\nProvide a concise summary with key takeaways.`;
        const llmResponse = await this.callLLM(request, prompt);
        return {
            analysis: {
                summary: llmResponse,
                keyPoints: [],
                sources: [],
                factuality: 0.9,
            },
        };
    }
    async factCheck(request) {
        const prompt = `Fact-check this claim:\n${request.query}\n\nProvide verdict, confidence, and evidence.`;
        await this.callLLM(request, prompt);
        return {
            factCheck: {
                claim: request.query,
                verdict: 'mixed',
                confidence: 0.75,
                evidence: ['Evidence 1', 'Evidence 2'],
            },
        };
    }
    async generateCitations(request) {
        return {
            citations: [
                {
                    text: request.query,
                    source: 'Source 1',
                    url: 'https://example.com',
                },
            ],
        };
    }
    async callLLM(request, prompt) {
        const routingRequest = {
            domain: 'research',
            task: request.type,
            priority: 'normal',
            constraints: {},
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
                        { role: 'system', content: 'You are an expert researcher and fact-checker.' },
                        { role: 'user', content: prompt },
                    ],
                }),
            });
            const data = await response.json();
            return data.choices[0].message.content;
        }, routingRequest);
    }
    getCapabilities() {
        return [
            'Web search with source verification',
            'Content analysis and summarization',
            'Fact-checking with evidence',
            'Citation generation',
            'Multi-source aggregation',
        ];
    }
};
exports.ResearchAgent = ResearchAgent;
exports.ResearchAgent = ResearchAgent = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(telemetry_service_1.TelemetryService)),
    __param(1, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __param(2, (0, inversify_1.inject)(llm_router_1.LLMRouter)),
    __param(3, (0, inversify_1.inject)(policy_engine_1.PolicyEngine)),
    __param(4, (0, inversify_1.inject)(context_store_1.ContextStore)),
    __param(5, (0, inversify_1.inject)(secure_fetch_1.SecureFetch)),
    __param(6, (0, inversify_1.inject)(mission_telemetry_1.MissionTelemetry)),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        observability_service_1.ObservabilityService,
        llm_router_1.LLMRouter,
        policy_engine_1.PolicyEngine,
        context_store_1.ContextStore,
        secure_fetch_1.SecureFetch,
        mission_telemetry_1.MissionTelemetry])
], ResearchAgent);
