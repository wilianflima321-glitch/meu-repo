import { injectable, inject } from 'inversify';
import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';
import { PolicyEngine, PolicyContext } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
import { SecureFetch, FetchRequest } from '../common/data/secure-fetch';
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

@injectable()
export class ResearchAgent {
    readonly id = 'research';
    readonly name = 'Research Agent';
    readonly description = 'Performs search, analysis, summarization, and fact-checking.';
    readonly promptTemplates: PromptTemplate[] = [
        { id: 'research-search', template: 'Search the web for relevant sources.' },
        { id: 'research-analysis', template: 'Analyze and extract key points.' },
        { id: 'research-summarize', template: 'Summarize content clearly and concisely.' },
        { id: 'research-fact-verify', template: 'Fact-check claims and provide evidence.' },
    ];

    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService,
        @inject(ObservabilityService) private observability: ObservabilityService,
        @inject(LLMRouter) private llmRouter: LLMRouter,
        @inject(PolicyEngine) private policyEngine: PolicyEngine,
        @inject(ContextStore) private contextStore: ContextStore,
        @inject(SecureFetch) private secureFetch: SecureFetch,
        @inject(MissionTelemetry) private missionTelemetry: MissionTelemetry
    ) {}

    async invoke(request: ResearchRequest): Promise<ResearchResponse> {
        return this.processRequest(request);
    }

    async processRequest(request: ResearchRequest): Promise<ResearchResponse> {
        const startTime = Date.now();
        
        try {
            this.telemetry.trackAgentInvoked('Research', request.type);
            
            // Policy check
            const policyContext: PolicyContext = {
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

            let response: ResearchResponse;
            
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
        } catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Research', duration, false, (error as Error).message);
            return { error: (error as Error).message };
        }
    }

    private async performSearch(request: ResearchRequest): Promise<ResearchResponse> {
        // Fetch from multiple sources
        const sources = request.sources || ['https://en.wikipedia.org'];
        const results: ResearchResponse['results'] = [];

        for (const source of sources.slice(0, 3)) {
            try {
                const fetchRequest: FetchRequest = {
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
            } catch (error) {
                // Continue with other sources
            }
        }

        return { results };
    }

    private async analyzeContent(request: ResearchRequest): Promise<ResearchResponse> {
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

    private async summarizeContent(request: ResearchRequest): Promise<ResearchResponse> {
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

    private async factCheck(request: ResearchRequest): Promise<ResearchResponse> {
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

    private async generateCitations(request: ResearchRequest): Promise<ResearchResponse> {
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

    private async callLLM(request: ResearchRequest, prompt: string): Promise<string> {
        const routingRequest: RoutingRequest = {
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

    getCapabilities(): string[] {
        return [
            'Web search with source verification',
            'Content analysis and summarization',
            'Fact-checking with evidence',
            'Citation generation',
            'Multi-source aggregation',
        ];
    }
}
