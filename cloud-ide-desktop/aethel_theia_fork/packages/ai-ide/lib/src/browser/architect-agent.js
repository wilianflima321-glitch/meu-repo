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
exports.ArchitectAgent = void 0;
const inversify_1 = require("inversify");
const telemetry_service_1 = require("./onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const context_store_1 = require("../common/context/context-store");
let ArchitectAgent = class ArchitectAgent {
    async invoke(request) {
        return this.processRequest(request);
    }
    constructor(telemetry, observability, llmRouter, policyEngine, contextStore) {
        this.telemetry = telemetry;
        this.observability = observability;
        this.llmRouter = llmRouter;
        this.policyEngine = policyEngine;
        this.contextStore = contextStore;
        this.id = 'architect';
        this.name = 'Architect';
        this.description = 'Analyzes project structure and provides architectural guidance.';
        this.promptTemplates = [
            { id: 'architecture-design', template: 'Design an architecture and describe components and boundaries.' },
            { id: 'system-plan', template: 'Create a system plan with steps and trade-offs.' },
            { id: 'technical-decision', template: 'Recommend a technical decision with pros/cons and risks.' },
            { id: 'architecture-review', template: 'Review an architecture for issues and improvements.' },
        ];
    }
    /**
     * Process architecture request with full LLM integration
     */
    async processRequest(request) {
        const startTime = Date.now();
        try {
            this.telemetry.trackAgentInvoked('Architect', request.type);
            // 1. Check policy
            const policyContext = {
                domain: 'code',
                action: request.type,
                tool: `code.${request.type}`,
                parameters: {
                    scope: request.scope,
                    path: request.path,
                    includesTests: true,
                    securityScanPassed: true,
                },
                user: {
                    id: request.userId,
                    plan: 'pro',
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
            // 2. Analyze structure first
            const structureAnalysis = await this.analyzeStructure(request);
            // 3. Build prompt
            const prompt = this.buildPrompt(request, structureAnalysis);
            // 4. Route to LLM
            const routingRequest = {
                domain: 'code',
                task: request.type,
                priority: 'normal',
                constraints: {
                    maxCost: evaluation.estimatedCost,
                    minQuality: 0.85,
                },
                context: {
                    workspaceId: request.workspaceId,
                    userId: request.userId,
                    budget: this.llmRouter.getBudget(request.workspaceId),
                },
                estimatedTokens: {
                    input: this.estimateTokens(prompt),
                    output: 1500,
                },
            };
            const decision = await this.llmRouter.route(routingRequest);
            // 5. Execute with fallback
            const llmResponse = await this.llmRouter.execute(decision, async (model, provider) => {
                return await this.callLLM(model, provider, prompt);
            }, routingRequest);
            // 6. Parse response
            const response = this.parseResponse(llmResponse, request.type, structureAnalysis);
            // 7. Store in context
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
            const duration = Date.now() - startTime;
            this.observability.recordAgentRequest('Architect', duration, true);
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.observability.recordAgentRequest('Architect', duration, false, errorMsg);
            return {
                error: errorMsg,
                suggestions: [{ priority: 'high', description: 'Check your input and try again', impact: 'none' }],
            };
        }
    }
    /**
     * Analyze structure (static analysis)
     */
    async analyzeStructure(request) {
        // Static analysis of code structure
        const structure = {
            files: request.files?.length || 0,
            directories: 0,
            totalLines: 0,
            languages: new Set(),
            imports: [],
        };
        if (request.files) {
            for (const file of request.files) {
                structure.totalLines += file.content.split('\n').length;
                // Detect language
                const ext = file.path.split('.').pop();
                if (ext)
                    structure.languages.add(ext);
                // Extract imports (simple regex)
                const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
                let match;
                while ((match = importRegex.exec(file.content)) !== null) {
                    structure.imports.push({ from: file.path, to: match[1] });
                }
            }
        }
        return structure;
    }
    /**
     * Build prompt for LLM
     */
    buildPrompt(request, structure) {
        const baseContext = `Scope: ${request.scope}\nPath: ${request.path}\nFiles: ${structure.files}\nLanguages: ${Array.from(structure.languages).join(', ')}\n`;
        switch (request.type) {
            case 'analyze':
                return `${baseContext}\nTask: Analyze the architecture of this ${request.scope}.\n\nProvide:\n1. Overall structure assessment\n2. Design patterns detected\n3. Anti-patterns and issues\n4. Dependency analysis\n5. Code metrics (complexity, coupling, cohesion)\n6. Specific issues with severity and location\n\nContext: ${request.context || 'None'}`;
            case 'suggest':
                return `${baseContext}\nTask: Suggest architectural improvements.\n\nProvide:\n1. Prioritized suggestions\n2. Expected impact of each suggestion\n3. Implementation complexity\n4. Potential risks\n\nContext: ${request.context || 'None'}`;
            case 'review':
                return `${baseContext}\nTask: Review the architecture for quality and maintainability.\n\nProvide:\n1. Overall quality assessment\n2. Maintainability score\n3. Specific issues found\n4. Recommendations for improvement\n\nContext: ${request.context || 'None'}`;
            case 'diagram':
                return `${baseContext}\nTask: Generate an architecture diagram in Mermaid format.\n\nProvide:\n1. Component diagram showing main modules\n2. Dependency relationships\n3. Layer separation\n\nContext: ${request.context || 'None'}`;
            case 'dependencies':
                return `${baseContext}\nTask: Analyze dependencies.\n\nProvide:\n1. Dependency graph\n2. Circular dependencies\n3. Unused dependencies\n4. Missing dependencies\n5. Version conflicts\n\nContext: ${request.context || 'None'}`;
            case 'refactor':
                return `${baseContext}\nTask: Create a refactoring plan.\n\nProvide:\n1. Step-by-step refactoring plan\n2. Files affected by each step\n3. Risk assessment\n4. Testing strategy\n\nContext: ${request.context || 'None'}`;
            default:
                return `${baseContext}\n${request.context || ''}`;
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
                        content: 'You are an expert software architect. Analyze code structure, identify patterns and anti-patterns, and provide actionable architectural guidance.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2500,
            }),
        });
        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
    /**
     * Parse LLM response
     */
    parseResponse(llmResponse, type, structure) {
        // Extract structured data from response
        const patterns = this.extractPatterns(llmResponse);
        const antiPatterns = this.extractAntiPatterns(llmResponse);
        const issues = this.extractIssues(llmResponse);
        const suggestions = this.extractSuggestions(llmResponse);
        switch (type) {
            case 'analyze':
                return {
                    analysis: {
                        structure: llmResponse,
                        patterns,
                        antiPatterns,
                        dependencies: structure.imports || [],
                        metrics: {
                            complexity: this.calculateComplexity(structure),
                            coupling: this.calculateCoupling(structure),
                            cohesion: this.calculateCohesion(structure),
                            maintainability: this.calculateMaintainability(structure),
                        },
                        issues,
                    },
                    suggestions,
                };
            case 'suggest':
                return {
                    suggestions,
                };
            case 'review':
                return {
                    analysis: {
                        structure: llmResponse,
                        patterns,
                        antiPatterns,
                        dependencies: [],
                        metrics: {
                            complexity: 0,
                            coupling: 0,
                            cohesion: 0,
                            maintainability: 0,
                        },
                        issues,
                    },
                    suggestions,
                };
            case 'diagram':
                return {
                    diagram: this.extractDiagram(llmResponse),
                };
            case 'dependencies':
                return {
                    analysis: {
                        structure: llmResponse,
                        patterns: [],
                        antiPatterns: [],
                        dependencies: structure.imports || [],
                        metrics: {
                            complexity: 0,
                            coupling: this.calculateCoupling(structure),
                            cohesion: 0,
                            maintainability: 0,
                        },
                        issues,
                    },
                };
            case 'refactor':
                return {
                    refactoringPlan: this.extractRefactoringPlan(llmResponse),
                    suggestions,
                };
            default:
                return {
                    analysis: {
                        structure: llmResponse,
                        patterns: [],
                        antiPatterns: [],
                        dependencies: [],
                        metrics: {
                            complexity: 0,
                            coupling: 0,
                            cohesion: 0,
                            maintainability: 0,
                        },
                        issues: [],
                    },
                };
        }
    }
    // Helper methods for parsing
    extractPatterns(response) {
        const patterns = [];
        const lines = response.split('\n');
        for (const line of lines) {
            if (line.match(/pattern/i) && line.match(/[-*]\s+/)) {
                patterns.push(line.replace(/^[-*]\s+/, '').trim());
            }
        }
        return patterns;
    }
    extractAntiPatterns(response) {
        const antiPatterns = [];
        const lines = response.split('\n');
        for (const line of lines) {
            if (line.match(/anti-pattern|code smell/i) && line.match(/[-*]\s+/)) {
                antiPatterns.push(line.replace(/^[-*]\s+/, '').trim());
            }
        }
        return antiPatterns;
    }
    extractIssues(response) {
        const issues = [];
        const lines = response.split('\n');
        for (const line of lines) {
            const match = line.match(/\[(critical|high|medium|low)\]\s*(.+)/i);
            if (match) {
                issues.push({
                    severity: match[1].toLowerCase(),
                    message: match[2].trim(),
                });
            }
        }
        return issues;
    }
    extractSuggestions(response) {
        const suggestions = [];
        const lines = response.split('\n');
        for (const line of lines) {
            if (line.match(/suggest|recommend/i) && line.match(/[-*]\s+/)) {
                suggestions.push({
                    priority: 'medium',
                    description: line.replace(/^[-*]\s+/, '').trim(),
                    impact: 'medium',
                });
            }
        }
        return suggestions;
    }
    extractDiagram(response) {
        const mermaidRegex = /```mermaid\n([\s\S]*?)```/;
        const match = response.match(mermaidRegex);
        return match ? match[1].trim() : response;
    }
    extractRefactoringPlan(response) {
        const plan = [];
        const lines = response.split('\n');
        let step = 0;
        for (const line of lines) {
            if (line.match(/^\d+\./)) {
                step++;
                plan.push({
                    step,
                    action: line.replace(/^\d+\.\s*/, '').trim(),
                    files: [],
                });
            }
        }
        return plan;
    }
    // Metrics calculation
    calculateComplexity(structure) {
        // Simplified cyclomatic complexity
        return Math.min(structure.totalLines / 100, 10);
    }
    calculateCoupling(structure) {
        // Coupling based on imports
        const imports = structure.imports?.length || 0;
        return Math.min(imports / 10, 10);
    }
    calculateCohesion(structure) {
        // Simplified cohesion metric
        return Math.max(10 - this.calculateCoupling(structure), 1);
    }
    calculateMaintainability(structure) {
        // Maintainability index
        const complexity = this.calculateComplexity(structure);
        const coupling = this.calculateCoupling(structure);
        const cohesion = this.calculateCohesion(structure);
        return Math.max(10 - (complexity + coupling - cohesion) / 3, 1);
    }
    estimateTokens(prompt) {
        return Math.ceil(prompt.length / 4);
    }
    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return [
            'Architecture analysis with metrics',
            'Design pattern detection',
            'Anti-pattern identification',
            'Dependency analysis',
            'Architecture diagram generation',
            'Refactoring plan creation',
            'Code review with quality assessment',
        ];
    }
};
exports.ArchitectAgent = ArchitectAgent;
exports.ArchitectAgent = ArchitectAgent = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(telemetry_service_1.TelemetryService)),
    __param(1, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __param(2, (0, inversify_1.inject)(llm_router_1.LLMRouter)),
    __param(3, (0, inversify_1.inject)(policy_engine_1.PolicyEngine)),
    __param(4, (0, inversify_1.inject)(context_store_1.ContextStore)),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        observability_service_1.ObservabilityService,
        llm_router_1.LLMRouter,
        policy_engine_1.PolicyEngine,
        context_store_1.ContextStore])
], ArchitectAgent);
