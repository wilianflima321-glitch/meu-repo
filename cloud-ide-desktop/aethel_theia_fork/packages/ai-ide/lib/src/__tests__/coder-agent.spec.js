"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const coder_agent_1 = require("../browser/coder-agent");
const telemetry_service_1 = require("../browser/onboarding/telemetry-service");
const observability_service_1 = require("../common/observability-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const toolchain_registry_1 = require("../common/toolchains/toolchain-registry");
const context_store_1 = require("../common/context/context-store");
describe('CoderAgent', () => {
    let container;
    let coderAgent;
    let mockTelemetry;
    let mockObservability;
    let mockLLMRouter;
    let mockPolicyEngine;
    let mockToolchainRegistry;
    let mockContextStore;
    beforeEach(() => {
        container = new inversify_1.Container();
        // Create mocks
        mockTelemetry = {
            trackAgentInvoked: jest.fn(),
        };
        mockObservability = {
            recordAgentRequest: jest.fn(),
        };
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
        };
        mockPolicyEngine = {
            evaluate: jest.fn().mockResolvedValue({
                allowed: true,
                requiresApproval: false,
                violations: [],
                warnings: [],
                estimatedCost: 0.01,
                estimatedRisk: 'low',
            }),
        };
        mockToolchainRegistry = {};
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
        };
        // Bind mocks
        container.bind(telemetry_service_1.TelemetryService).toConstantValue(mockTelemetry);
        container.bind(observability_service_1.ObservabilityService).toConstantValue(mockObservability);
        container.bind(llm_router_1.LLMRouter).toConstantValue(mockLLMRouter);
        container.bind(policy_engine_1.PolicyEngine).toConstantValue(mockPolicyEngine);
        container.bind(toolchain_registry_1.ToolchainRegistry).toConstantValue(mockToolchainRegistry);
        container.bind(context_store_1.ContextStore).toConstantValue(mockContextStore);
        container.bind(coder_agent_1.CoderAgent).toSelf();
        coderAgent = container.get(coder_agent_1.CoderAgent);
    });
    describe('processRequest', () => {
        it('should generate code successfully', async () => {
            const request = {
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
            });
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
            const request = {
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
            const request = {
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
            const request = {
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
            });
            const response = await coderAgent.processRequest(request);
            expect(response.code).toBeTruthy();
            expect(response.explanation).toBeTruthy();
        });
        it('should generate tests', async () => {
            const request = {
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
            });
            const response = await coderAgent.processRequest(request);
            expect(response.tests).toContain('describe');
            expect(response.explanation).toBeTruthy();
        });
        it('should handle LLM API errors', async () => {
            const request = {
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
            });
            const response = await coderAgent.processRequest(request);
            expect(response.error).toContain('LLM API error');
            expect(mockObservability.recordAgentRequest).toHaveBeenCalledWith('Coder', expect.any(Number), false, expect.any(String));
        });
        it('should store context after successful execution', async () => {
            const request = {
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
            });
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
