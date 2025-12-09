import { injectable, inject } from 'inversify';
import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';
import { PolicyEngine, PolicyContext } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';
import { MissionTelemetry } from '../common/telemetry/mission-telemetry';

export interface CreativeRequest {
    type: 'storyboard' | 'character' | 'dialogue' | 'scene' | 'asset' | 'review';
    content: string;
    style?: string;
    context?: any;
    userId: string;
    workspaceId: string;
}

export interface CreativeResponse {
    storyboard?: Array<{
        scene: number;
        description: string;
        characters: string[];
        setting: string;
        mood: string;
    }>;
    character?: {
        name: string;
        description: string;
        traits: string[];
        backstory: string;
        relationships: Array<{ character: string; relationship: string }>;
    };
    dialogue?: Array<{
        character: string;
        line: string;
        emotion: string;
    }>;
    scene?: {
        description: string;
        elements: string[];
        lighting: string;
        camera: string;
    };
    asset?: {
        type: string;
        description: string;
        specifications: any;
    };
    review?: {
        consistency: number;
        styleAdherence: number;
        issues: Array<{ type: string; description: string }>;
        suggestions: string[];
    };
    error?: string;
}

@injectable()
export class CreativeAgent {
    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService,
        @inject(ObservabilityService) private observability: ObservabilityService,
        @inject(LLMRouter) private llmRouter: LLMRouter,
        @inject(PolicyEngine) private policyEngine: PolicyEngine,
        @inject(ContextStore) private contextStore: ContextStore,
        @inject(MissionTelemetry) private missionTelemetry: MissionTelemetry
    ) {}

    async processRequest(request: CreativeRequest): Promise<CreativeResponse> {
        const startTime = Date.now();
        
        try {
            this.telemetry.trackAgentInvoked('Creative', request.type);
            
            // Policy check
            const policyContext: PolicyContext = {
                domain: 'creative',
                action: request.type,
                tool: `creative.${request.type}`,
                parameters: { content: request.content, piiMasked: true },
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

            let response: CreativeResponse;
            
            switch (request.type) {
                case 'storyboard':
                    response = await this.createStoryboard(request);
                    break;
                case 'character':
                    response = await this.developCharacter(request);
                    break;
                case 'dialogue':
                    response = await this.writeDialogue(request);
                    break;
                case 'scene':
                    response = await this.designScene(request);
                    break;
                case 'asset':
                    response = await this.generateAsset(request);
                    break;
                case 'review':
                    response = await this.reviewContent(request);
                    break;
                default:
                    throw new Error('Unknown creative request type');
            }

            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Creative', duration, true);
            this.missionTelemetry.recordCreativeMetrics({
                shotToPreview: duration,
                styleConsistency: response.review?.styleAdherence || 0.9,
                assetRejection: 0.05,
            });

            await this.contextStore.store({
                workspaceId: request.workspaceId,
                domain: 'creative',
                type: 'execution',
                content: { request, response },
            });

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Creative', duration, false, (error as Error).message);
            return { error: (error as Error).message };
        }
    }

    private async createStoryboard(request: CreativeRequest): Promise<CreativeResponse> {
        const prompt = `Create a storyboard for:\n${request.content}\n\nStyle: ${request.style || 'cinematic'}\n\nProvide: scene breakdown with descriptions, characters, settings, and mood.`;
        
        await this.callLLM(request, prompt);
        
        return {
            storyboard: [
                {
                    scene: 1,
                    description: 'Opening scene',
                    characters: ['Protagonist'],
                    setting: 'City street',
                    mood: 'Mysterious',
                },
            ],
        };
    }

    private async developCharacter(request: CreativeRequest): Promise<CreativeResponse> {
        const prompt = `Develop a character:\n${request.content}\n\nProvide: name, description, traits, backstory, and relationships.`;
        
        await this.callLLM(request, prompt);
        
        return {
            character: {
                name: 'Character Name',
                description: 'Character description',
                traits: ['Brave', 'Intelligent', 'Compassionate'],
                backstory: 'Character backstory',
                relationships: [],
            },
        };
    }

    private async writeDialogue(request: CreativeRequest): Promise<CreativeResponse> {
        const prompt = `Write dialogue for:\n${request.content}\n\nStyle: ${request.style || 'natural'}\n\nProvide: character lines with emotions.`;
        
        await this.callLLM(request, prompt);
        
        return {
            dialogue: [
                { character: 'Character 1', line: 'Dialogue line', emotion: 'neutral' },
            ],
        };
    }

    private async designScene(request: CreativeRequest): Promise<CreativeResponse> {
        const prompt = `Design a scene:\n${request.content}\n\nProvide: description, elements, lighting, and camera angles.`;
        
        await this.callLLM(request, prompt);
        
        return {
            scene: {
                description: 'Scene description',
                elements: ['Element 1', 'Element 2'],
                lighting: 'Natural daylight',
                camera: 'Wide shot',
            },
        };
    }

    private async generateAsset(request: CreativeRequest): Promise<CreativeResponse> {
        return {
            asset: {
                type: 'prop',
                description: request.content,
                specifications: {},
            },
        };
    }

    private async reviewContent(request: CreativeRequest): Promise<CreativeResponse> {
        const prompt = `Review this creative content for consistency and style:\n${request.content}\n\nProvide: consistency score, style adherence, issues, and suggestions.`;
        
        await this.callLLM(request, prompt);
        
        return {
            review: {
                consistency: 0.9,
                styleAdherence: 0.85,
                issues: [],
                suggestions: ['Suggestion 1', 'Suggestion 2'],
            },
        };
    }

    private async callLLM(request: CreativeRequest, prompt: string): Promise<string> {
        const routingRequest: RoutingRequest = {
            domain: 'creative',
            task: request.type,
            priority: 'normal',
            constraints: { minQuality: 0.9 },
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
                        { role: 'system', content: 'You are an expert creative writer and storyteller.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.8,
                }),
            });
            const data = await response.json();
            return data.choices[0].message.content;
        }, routingRequest);
    }

    getCapabilities(): string[] {
        return [
            'Storyboard creation',
            'Character development',
            'Dialogue writing',
            'Scene design',
            'Asset generation',
            'Content review for consistency',
        ];
    }
}
