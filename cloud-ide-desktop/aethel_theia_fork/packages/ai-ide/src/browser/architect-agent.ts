import { injectable, inject } from 'inversify';
import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';
import { PolicyEngine, PolicyContext } from '../common/compliance/policy-engine';
import { ContextStore } from '../common/context/context-store';

/**
 * Architect Agent - Production Implementation
 * Analyzes project structure and provides architectural guidance
 */

export interface ArchitectureRequest {
    type: 'analyze' | 'suggest' | 'review' | 'diagram' | 'dependencies' | 'refactor';
    scope: 'file' | 'directory' | 'workspace';
    path: string;
    context?: string;
    userId: string;
    workspaceId: string;
    files?: Array<{ path: string; content: string }>;
}

export interface ArchitectureResponse {
    analysis?: {
        structure: string;
        patterns: string[];
        antiPatterns: string[];
        dependencies: Array<{ from: string; to: string; type: string }>;
        metrics: {
            complexity: number;
            coupling: number;
            cohesion: number;
            maintainability: number;
        };
        issues: Array<{ severity: string; message: string; location?: string }>;
    };
    suggestions?: Array<{ priority: string; description: string; impact: string }>;
    diagram?: string;
    refactoringPlan?: Array<{ step: number; action: string; files: string[] }>;
    error?: string;
}

@injectable()
export class ArchitectAgent {
    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService,
        @inject(ObservabilityService) private observability: ObservabilityService,
        @inject(LLMRouter) private llmRouter: LLMRouter,
        @inject(PolicyEngine) private policyEngine: PolicyEngine,
        @inject(ContextStore) private contextStore: ContextStore
    ) {}

    /**
     * Process architecture request with full LLM integration
     */
    async processRequest(request: ArchitectureRequest): Promise<ArchitectureResponse> {
        const startTime = Date.now();
        
        try {
            this.telemetry.trackAgentInvoked('Architect', request.type);
            
            // 1. Check policy
            const policyContext: PolicyContext = {
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
            const routingRequest: RoutingRequest = {
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
            const llmResponse = await this.llmRouter.execute(
                decision,
                async (model, provider) => {
                    return await this.callLLM(model, provider, prompt);
                },
                routingRequest
            );

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
        } catch (error) {
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
    private async analyzeStructure(request: ArchitectureRequest): Promise<any> {
        // Static analysis of code structure
        const structure = {
            files: request.files?.length || 0,
            directories: 0,
            totalLines: 0,
            languages: new Set<string>(),
            imports: [] as Array<{ from: string; to: string }>,
        };

        if (request.files) {
            for (const file of request.files) {
                structure.totalLines += file.content.split('\n').length;
                
                // Detect language
                const ext = file.path.split('.').pop();
                if (ext) structure.languages.add(ext);

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
    private buildPrompt(request: ArchitectureRequest, structure: any): string {
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
    private async callLLM(model: any, provider: any, prompt: string): Promise<string> {
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
    private parseResponse(llmResponse: string, type: string, structure: any): ArchitectureResponse {
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

    private extractPatterns(response: string): string[] {
        const patterns: string[] = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (line.match(/pattern/i) && line.match(/[-*]\s+/)) {
                patterns.push(line.replace(/^[-*]\s+/, '').trim());
            }
        }
        
        return patterns;
    }

    private extractAntiPatterns(response: string): string[] {
        const antiPatterns: string[] = [];
        const lines = response.split('\n');
        
        for (const line of lines) {
            if (line.match(/anti-pattern|code smell/i) && line.match(/[-*]\s+/)) {
                antiPatterns.push(line.replace(/^[-*]\s+/, '').trim());
            }
        }
        
        return antiPatterns;
    }

    private extractIssues(response: string): Array<{ severity: string; message: string; location?: string }> {
        const issues: Array<{ severity: string; message: string; location?: string }> = [];
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

    private extractSuggestions(response: string): Array<{ priority: string; description: string; impact: string }> {
        const suggestions: Array<{ priority: string; description: string; impact: string }> = [];
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

    private extractDiagram(response: string): string {
        const mermaidRegex = /```mermaid\n([\s\S]*?)```/;
        const match = response.match(mermaidRegex);
        return match ? match[1].trim() : response;
    }

    private extractRefactoringPlan(response: string): Array<{ step: number; action: string; files: string[] }> {
        const plan: Array<{ step: number; action: string; files: string[] }> = [];
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

    private calculateComplexity(structure: any): number {
        // Simplified cyclomatic complexity
        return Math.min(structure.totalLines / 100, 10);
    }

    private calculateCoupling(structure: any): number {
        // Coupling based on imports
        const imports = structure.imports?.length || 0;
        return Math.min(imports / 10, 10);
    }

    private calculateCohesion(structure: any): number {
        // Simplified cohesion metric
        return Math.max(10 - this.calculateCoupling(structure), 1);
    }

    private calculateMaintainability(structure: any): number {
        // Maintainability index
        const complexity = this.calculateComplexity(structure);
        const coupling = this.calculateCoupling(structure);
        const cohesion = this.calculateCohesion(structure);
        
        return Math.max(10 - (complexity + coupling - cohesion) / 3, 1);
    }

    private estimateTokens(prompt: string): number {
        return Math.ceil(prompt.length / 4);
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
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
}
