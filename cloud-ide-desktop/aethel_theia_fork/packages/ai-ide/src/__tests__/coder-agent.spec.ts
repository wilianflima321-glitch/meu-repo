import { Container } from 'inversify';
import { CoderAgent, CodeRequest } from '../browser/coder-agent';
import { TelemetryService } from '../browser/onboarding/telemetry-service';
import { ObservabilityService } from '../common/observability-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { ToolchainRegistry } from '../common/toolchains/toolchain-registry';
import { ContextStore } from '../common/context/context-store';

describe('CoderAgent', () => {
    let container: Container;
    let coderAgent: CoderAgent;
    let mockTelemetry: jest.Mocked<TelemetryService>;
    let mockObservability: jest.Mocked<ObservabilityService>;
    let mockLLMRouter: jest.Mocked<LLMRouter>;
    let mockPolicyEngine: jest.Mocked<PolicyEngine>;
    let mockToolchainRegistry: jest.Mocked<ToolchainRegistry>;
    let mockContextStore: jest.Mocked<ContextStore>;

    beforeEach(() => {
        container = new Container();

        // Create mocks
        mockTelemetry = {
            trackAgentInvoked: jest.fn(),
        } as any;

        mockObservability = {
            recordAgentRequest: jest.fn(),
        } as any;

        mockLLMRouter = {
            getBudget: jest.fn().mockReturnValue({ total: 100, spent: 0, remaining: 100 }),
            route: jest.fn().mockResolvedValue({
                model: { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
                provider: { id: 'openai', endpoint: 'https://api.openai.com/v1', apiKey: 'test-key' },
                estimatedCost: 0.01,
                estimatedLatency: 1000,
                qualityScore: 0.85,
                reasoning: 'Selected for balance',
                fallbacks: [],
            }),
            execute: jest.fn().mockImplementation(async (decision, executor) => {
                return await executor(decision.model, decision.provider);
            }),
        } as any;

        mockPolicyEngine = {
            evaluate: jest.fn().mockResolvedValue({
                allowed: true,
                requiresApproval: false,
                violations: [],
                warnings: [],
                estimatedCost: 0.01,
                estimatedRisk: 'low',
            }),
        } as any;

        mockToolchainRegistry = {} as any;

        mockContextStore = {
            store: jest.fn().mockResolvedValue({
                id: 'ctx_123',
                workspaceId: 'ws_123',
                domain: 'code',
                type: 'execution',
                content: {},
                metadata: {
                    createdAt: Date.now(),
                    createdBy: 'user_123',
                    version: 1,
                    tags: [],
                },
                signature: 'sig_123',
            }),
        } as any;

        // Bind mocks
        container.bind(TelemetryService).toConstantValue(mockTelemetry);
        container.bind(ObservabilityService).toConstantValue(mockObservability);
        container.bind(LLMRouter).toConstantValue(mockLLMRouter);
        container.bind(PolicyEngine).toConstantValue(mockPolicyEngine);
        container.bind(ToolchainRegistry).toConstantValue(mockToolchainRegistry);
        container.bind(ContextStore).toConstantValue(mockContextStore);
        container.bind(CoderAgent).toSelf();

        coderAgent = container.get(CoderAgent);
    });

    describe('processRequest', () => {
        it('should generate code successfully', async () => {
            const request: CodeRequest = {
                type: 'generate',
                language: 'typescript',
                context: 'Create a function',
                prompt: 'Create a function that adds two numbers',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: '```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```\n\nThis function adds two numbers and returns the result.',
                        },
                    }],
                }),
            }) as any;

            const response = await coderAgent.processRequest(request);

            expect(response.code).toContain('function add');
            expect(response.explanation).toBeTruthy();
            expect(mockTelemetry.trackAgentInvoked).toHaveBeenCalledWith('Coder', 'generate');
            expect(mockObservability.recordAgentRequest).toHaveBeenCalledWith('Coder', expect.any(Number), true);
        });

        it('should handle policy violations', async () => {
            mockPolicyEngine.evaluate.mockResolvedValue({
                allowed: false,
                requiresApproval: false,
                violations: [
                    {
                        ruleId: 'code.tests-required',
                        ruleName: 'Tests Required',
                        severity: 'high',
                        message: 'All code changes must include tests',
                        action: 'block',
                    },
                ],
                warnings: [],
                estimatedCost: 0.01,
                estimatedRisk: 'high',
            });

            const request: CodeRequest = {
                type: 'generate',
                language: 'typescript',
                context: 'Create a function',
                prompt: 'Create a function',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            const response = await coderAgent.processRequest(request);

            expect(response.error).toContain('Policy violation');
            expect(mockObservability.recordAgentRequest).toHaveBeenCalledWith('Coder', expect.any(Number), false, expect.any(String));
        });

        it('should handle approval required', async () => {
            mockPolicyEngine.evaluate.mockResolvedValue({
                allowed: true,
                requiresApproval: true,
                violations: [],
                warnings: [],
                estimatedCost: 0.5,
                estimatedRisk: 'medium',
            });

            const request: CodeRequest = {
                type: 'generate',
                language: 'typescript',
                context: 'Create a function',
                prompt: 'Create a function',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            const response = await coderAgent.processRequest(request);

            expect(response.error).toContain('Approval required');
            expect(response.suggestions).toBeTruthy();
        });

        it('should refactor code', async () => {
            const request: CodeRequest = {
                type: 'refactor',
                language: 'typescript',
                context: 'Refactor this code',
                prompt: 'function add(a,b){return a+b}',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: '```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```\n\nImproved with type annotations and formatting.',
                        },
                    }],
                }),
            }) as any;

            const response = await coderAgent.processRequest(request);

            expect(response.code).toBeTruthy();
            expect(response.explanation).toBeTruthy();
        });

        it('should generate tests', async () => {
            const request: CodeRequest = {
                type: 'test',
                language: 'typescript',
                context: 'Generate tests',
                prompt: 'function add(a: number, b: number): number { return a + b; }',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: '```typescript\ndescribe("add", () => {\n  it("should add two numbers", () => {\n    expect(add(2, 3)).toBe(5);\n  });\n});\n```\n\nComprehensive tests with edge cases.',
                        },
                    }],
                }),
            }) as any;

            const response = await coderAgent.processRequest(request);

            expect(response.tests).toContain('describe');
            expect(response.explanation).toBeTruthy();
        });

        it('should handle LLM API errors', async () => {
            const request: CodeRequest = {
                type: 'generate',
                language: 'typescript',
                context: 'Create a function',
                prompt: 'Create a function',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            }) as any;

            const response = await coderAgent.processRequest(request);

            expect(response.error).toContain('LLM API error');
            expect(mockObservability.recordAgentRequest).toHaveBeenCalledWith('Coder', expect.any(Number), false, expect.any(String));
        });

        it('should store context after successful execution', async () => {
            const request: CodeRequest = {
                type: 'generate',
                language: 'typescript',
                context: 'Create a function',
                prompt: 'Create a function',
                userId: 'user_123',
                workspaceId: 'ws_123',
            };

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: '```typescript\nfunction test() {}\n```',
                        },
                    }],
                }),
            }) as any;

            await coderAgent.processRequest(request);

            expect(mockContextStore.store).toHaveBeenCalledWith({
                workspaceId: 'ws_123',
                domain: 'code',
                type: 'execution',
                content: expect.objectContaining({
                    request,
                    response: expect.any(Object),
                }),
            });
        });
    });

    describe('getCapabilities', () => {
        it('should return agent capabilities', () => {
            const capabilities = coderAgent.getCapabilities();

            expect(capabilities).toContain('Code generation with best practices');
            expect(capabilities).toContain('Intelligent code refactoring');
            expect(capabilities).toContain('Bug detection and debugging');
            expect(capabilities).toContain('Test generation with edge cases');
        });
    });
});
