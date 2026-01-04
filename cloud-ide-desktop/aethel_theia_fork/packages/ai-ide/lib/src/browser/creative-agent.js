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
exports.CreativeAgent = void 0;
const inversify_1 = require("inversify");
const telemetry_service_1 = require("./onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const context_store_1 = require("../common/context/context-store");
const mission_telemetry_1 = require("../common/telemetry/mission-telemetry");
let CreativeAgent = class CreativeAgent {
    async invoke(request) {
        return this.processRequest(request);
    }
    constructor(telemetry, observability, llmRouter, policyEngine, contextStore, missionTelemetry) {
        this.telemetry = telemetry;
        this.observability = observability;
        this.llmRouter = llmRouter;
        this.policyEngine = policyEngine;
        this.contextStore = contextStore;
        this.missionTelemetry = missionTelemetry;
        this.id = 'creative';
        this.name = 'Creative Agent';
        this.description = 'Generates creative content and assets based on prompts.';
        this.promptTemplates = [
            { id: 'content-generate', template: 'Generate creative content matching the requested style and constraints.' },
            { id: 'story-narrative', template: 'Create a story/narrative structure with beats and arcs.' },
            { id: 'design-concept', template: 'Propose design concepts and variations with rationale.' },
            { id: 'brainstorm-ideas', template: 'Brainstorm multiple ideas and select top candidates.' },
        ];
    }
    async processRequest(request) {
        const startTime = Date.now();
        try {
            this.telemetry.trackAgentInvoked('Creative', request.type);
            // Policy check
            const policyContext = {
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
            let response;
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Creative', duration, false, error.message);
            return { error: error.message };
        }
    }
    async createStoryboard(request) {
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
    async developCharacter(request) {
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
    async writeDialogue(request) {
        const prompt = `Write dialogue for:\n${request.content}\n\nStyle: ${request.style || 'natural'}\n\nProvide: character lines with emotions.`;
        await this.callLLM(request, prompt);
        return {
            dialogue: [
                { character: 'Character 1', line: 'Dialogue line', emotion: 'neutral' },
            ],
        };
    }
    async designScene(request) {
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
    async generateAsset(request) {
        return {
            asset: {
                type: 'prop',
                description: request.content,
                specifications: {},
            },
        };
    }
    async reviewContent(request) {
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
    async callLLM(request, prompt) {
        const routingRequest = {
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
    getCapabilities() {
        return [
            'Storyboard creation',
            'Character development',
            'Dialogue writing',
            'Scene design',
            'Asset generation',
            'Content review for consistency',
        ];
    }
};
exports.CreativeAgent = CreativeAgent;
exports.CreativeAgent = CreativeAgent = __decorate([
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
], CreativeAgent);
