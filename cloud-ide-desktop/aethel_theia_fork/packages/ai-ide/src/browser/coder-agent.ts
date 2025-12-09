import { injectable, inject } from 'inversify';
import { TelemetryService } from './onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';
import { PolicyEngine, PolicyContext } from '../common/compliance/policy-engine';
import { ToolchainRegistry } from '../common/toolchains/toolchain-registry';
import { ContextStore } from '../common/context/context-store';

/**
 * Coder Agent - Production Implementation
 * Assists with code writing, refactoring, and debugging
 */

export interface CodeRequest {
    type: 'generate' | 'refactor' | 'debug' | 'explain' | 'test' | 'review';
    language: string;
    context: string;
    prompt: string;
    userId: string;
    workspaceId: string;
    files?: Array<{ path: string; content: string }>;
}

export interface CodeResponse {
    code?: string;
    explanation?: string;
    suggestions?: string[];
    tests?: string;
    issues?: Array<{ severity: string; message: string; line?: number }>;
    error?: string;
}

@injectable()
export class CoderAgent {
    constructor(
        @inject(TelemetryService) private telemetry: TelemetryService,
        @inject(ObservabilityService) private observability: ObservabilityService,
        @inject(LLMRouter) private llmRouter: LLMRouter,
        @inject(PolicyEngine) private policyEngine: PolicyEngine,
        @inject(ToolchainRegistry) private toolchainRegistry: ToolchainRegistry,
        @inject(ContextStore) private contextStore: ContextStore
    ) {}

    /**
     * Process code request with full policy and LLM integration
     */
    async processRequest(request: CodeRequest): Promise<CodeResponse> {
        const startTime = Date.now();
        
        try {
            this.telemetry.trackAgentInvoked('Coder', request.type);
            
            // 1. Check policy
            const policyContext: PolicyContext = {
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
            const routingRequest: RoutingRequest = {
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
            const llmResponse = await this.llmRouter.execute(
                decision,
                async (model, provider) => {
                    return await this.callLLM(model, provider, prompt);
                },
                routingRequest
            );

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
        } catch (error) {
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
    private buildPrompt(request: CodeRequest): string {
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
    private parseResponse(llmResponse: string, type: string): CodeResponse {
        // Extract code blocks
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
        const codeBlocks: string[] = [];
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
    private extractSuggestions(response: string): string[] {
        const suggestions: string[] = [];
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
    private extractIssues(response: string): Array<{ severity: string; message: string; line?: number }> {
        const issues: Array<{ severity: string; message: string; line?: number }> = [];
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
    private estimateTokens(prompt: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(prompt.length / 4);
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
        return [
            'Code generation with best practices',
            'Intelligent code refactoring',
            'Bug detection and debugging',
            'Code explanation and documentation',
            'Test generation with edge cases',
            'Code review with quality assessment',
        ];
    }
}
