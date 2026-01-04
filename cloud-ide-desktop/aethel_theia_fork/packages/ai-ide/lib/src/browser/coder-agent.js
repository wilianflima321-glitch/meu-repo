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
exports.CoderAgent = void 0;
const inversify_1 = require("inversify");
const telemetry_service_1 = require("./onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const toolchain_registry_1 = require("../common/toolchains/toolchain-registry");
const context_store_1 = require("../common/context/context-store");
let CoderAgent = class CoderAgent {
    async invoke(request) {
        return this.processRequest(request);
    }
    constructor(telemetry, observability, llmRouter, policyEngine, toolchainRegistry, contextStore) {
        this.telemetry = telemetry;
        this.observability = observability;
        this.llmRouter = llmRouter;
        this.policyEngine = policyEngine;
        this.toolchainRegistry = toolchainRegistry;
        this.contextStore = contextStore;
        this.id = 'coder';
        this.name = 'Coder';
        this.description = 'Assists with code writing, refactoring, and debugging.';
        this.promptTemplates = [
            { id: 'code-generate', template: 'Generate code based on requirements and context.' },
            { id: 'code-refactor', template: 'Refactor code while preserving behavior and improving clarity.' },
            { id: 'code-debug', template: 'Debug issues, identify root cause, and propose a fix.' },
            { id: 'code-test', template: 'Generate tests to validate behavior and edge cases.' },
        ];
    }
    /**
     * Process code request with full policy and LLM integration
     */
    async processRequest(request) {
        const startTime = Date.now();
        try {
            this.telemetry.trackAgentInvoked('Coder', request.type);
            // 1. Check policy
            const policyContext = {
                domain: 'code',
                action: request.type,
                tool: `code.${request.type}`,
                parameters: {
                    language: request.language,
                    context: request.context,
                    includesTests: request.type === 'test',
                    securityScanPassed: true, // TODO: Implement actual scan
                    content: request.context,
                },
                user: {
                    id: request.userId,
                    plan: 'pro', // TODO: Get from user service
                    permissions: [],
                },
                workspace: {
                    id: request.workspaceId,
                    budget: this.llmRouter.getBudget(request.workspaceId),
                },
            };
            const evaluation = await this.policyEngine.evaluate(policyContext);
            if (!evaluation.allowed) {
                throw new Error(`Policy violation: ${evaluation.violations.map(v => v.message).join(', ')}`);
            }
            if (evaluation.requiresApproval) {
                return {
                    error: 'Approval required for this operation',
                    suggestions: ['Request approval from team lead', 'Reduce scope of changes'],
                };
            }
            // 2. Build prompt based on request type
            const prompt = this.buildPrompt(request);
            // 3. Route to LLM
            const routingRequest = {
                domain: 'code',
                task: request.type,
                priority: 'normal',
                constraints: {
                    maxCost: evaluation.estimatedCost,
                    minQuality: 0.8,
                },
                context: {
                    workspaceId: request.workspaceId,
                    userId: request.userId,
                    budget: this.llmRouter.getBudget(request.workspaceId),
                },
                estimatedTokens: {
                    input: this.estimateTokens(prompt),
                    output: 1000,
                },
            };
            const decision = await this.llmRouter.route(routingRequest);
            // 4. Execute with fallback
            const llmResponse = await this.llmRouter.execute(decision, async (model, provider) => {
                return await this.callLLM(model, provider, prompt);
            }, routingRequest);
            // 5. Parse and validate response
            const response = this.parseResponse(llmResponse, request.type);
            // 6. Store in context
            await this.contextStore.store({
                workspaceId: request.workspaceId,
                domain: 'code',
                type: 'execution',
                content: {
                    request,
                    response,
                    model: decision.model.id,
                    cost: decision.estimatedCost,
                },
            });
            // 7. Record metrics
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Coder', duration, true);
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.observability.recordAgentRequest('Coder', duration, false, errorMsg);
            return {
                error: errorMsg,
                suggestions: ['Check your input', 'Try a simpler request', 'Contact support'],
            };
        }
    }
    /**
     * Build prompt based on request type
     */
    buildPrompt(request) {
        const baseContext = `Language: ${request.language}\nContext: ${request.context}\n`;
        switch (request.type) {
            case 'generate':
                return `${baseContext}\nTask: Generate code for the following requirement:\n${request.prompt}\n\nProvide clean, well-documented code with error handling.`;
            case 'refactor':
                return `${baseContext}\nTask: Refactor the following code:\n${request.prompt}\n\nImprove readability, performance, and maintainability. Explain your changes.`;
            case 'debug':
                return `${baseContext}\nTask: Debug the following code:\n${request.prompt}\n\nIdentify issues, explain root causes, and provide fixes.`;
            case 'explain':
                return `${baseContext}\nTask: Explain the following code:\n${request.prompt}\n\nProvide a clear explanation suitable for developers.`;
            case 'test':
                return `${baseContext}\nTask: Generate tests for the following code:\n${request.prompt}\n\nProvide comprehensive unit tests with edge cases.`;
            case 'review':
                return `${baseContext}\nTask: Review the following code:\n${request.prompt}\n\nIdentify issues, suggest improvements, and rate code quality.`;
            default:
                return `${baseContext}\n${request.prompt}`;
        }
    }
    /**
     * Call LLM provider
     */
    async callLLM(model, provider, prompt) {
        const response = await fetch(`${provider.endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: model.id,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert software engineer. Provide high-quality, production-ready code with proper error handling, documentation, and best practices.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.2, // Lower temperature for more consistent code
                max_tokens: 2000,
            }),
        });
        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
    /**
     * Parse LLM response based on request type
     */
    parseResponse(llmResponse, type) {
        // Extract code blocks
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
        const codeBlocks = [];
        let match;
        while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
            codeBlocks.push(match[1].trim());
        }
        // Extract explanation (text outside code blocks)
        const explanation = llmResponse.replace(codeBlockRegex, '').trim();
        switch (type) {
            case 'generate':
            case 'refactor':
                return {
                    code: codeBlocks[0] || '',
                    explanation,
                };
            case 'test':
                return {
                    tests: codeBlocks[0] || '',
                    explanation,
                };
            case 'debug':
            case 'review':
                return {
                    explanation,
                    suggestions: this.extractSuggestions(llmResponse),
                    issues: this.extractIssues(llmResponse),
                };
            case 'explain':
                return {
                    explanation,
                };
            default:
                return {
                    explanation: llmResponse,
                };
        }
    }
    /**
     * Extract suggestions from response
     */
    extractSuggestions(response) {
        const suggestions = [];
        const lines = response.split('\n');
        for (const line of lines) {
            if (line.match(/^[-*]\s+/)) {
                suggestions.push(line.replace(/^[-*]\s+/, '').trim());
            }
        }
        return suggestions;
    }
    /**
     * Extract issues from response
     */
    extractIssues(response) {
        const issues = [];
        const lines = response.split('\n');
        for (const line of lines) {
            const match = line.match(/\[(error|warning|info)\]\s*(line\s+(\d+))?\s*:\s*(.+)/i);
            if (match) {
                issues.push({
                    severity: match[1].toLowerCase(),
                    line: match[3] ? parseInt(match[3], 10) : undefined,
                    message: match[4].trim(),
                });
            }
        }
        return issues;
    }
    /**
     * Estimate tokens for prompt
     */
    estimateTokens(prompt) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(prompt.length / 4);
    }
    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return [
            'Code generation with best practices',
            'Intelligent code refactoring',
            'Bug detection and debugging',
            'Code explanation and documentation',
            'Test generation with edge cases',
            'Code review with quality assessment',
        ];
    }
};
exports.CoderAgent = CoderAgent;
exports.CoderAgent = CoderAgent = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(telemetry_service_1.TelemetryService)),
    __param(1, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __param(2, (0, inversify_1.inject)(llm_router_1.LLMRouter)),
    __param(3, (0, inversify_1.inject)(policy_engine_1.PolicyEngine)),
    __param(4, (0, inversify_1.inject)(toolchain_registry_1.ToolchainRegistry)),
    __param(5, (0, inversify_1.inject)(context_store_1.ContextStore)),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        observability_service_1.ObservabilityService,
        llm_router_1.LLMRouter,
        policy_engine_1.PolicyEngine,
        toolchain_registry_1.ToolchainRegistry,
        context_store_1.ContextStore])
], CoderAgent);
