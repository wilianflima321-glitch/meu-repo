import { LLMRouter, RoutingRequest } from '../common/llm/llm-router';

describe('LLMRouter', () => {
    let router: LLMRouter;

    beforeEach(() => {
        router = new LLMRouter();
    });

    describe('route', () => {
        it('should route to cheapest model for low priority', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'simple generation',
                priority: 'low',
                constraints: {
                    maxCost: 0.01,
                },
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
                estimatedTokens: { input: 100, output: 100 },
            };

            const decision = await router.route(request);

            expect(decision.model.tier).toBe('fast');
            expect(decision.estimatedCost).toBeLessThan(0.01);
        });

        it('should route to quality model for high priority', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'complex generation',
                priority: 'critical',
                constraints: {
                    minQuality: 0.9,
                },
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
                estimatedTokens: { input: 1000, output: 1000 },
            };

            const decision = await router.route(request);

            expect(decision.model.tier).toBe('quality');
            expect(decision.qualityScore).toBeGreaterThanOrEqual(0.9);
        });

        it('should throw error when budget exhausted', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 100, remaining: 0 },
                },
            };

            await expect(router.route(request)).rejects.toThrow('Budget exhausted');
        });

        it('should find cheaper alternative when cost exceeds budget', async () => {
            router.setBudget('ws_123', 0.05);

            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 0.05, spent: 0.04, remaining: 0.01 },
                },
                estimatedTokens: { input: 1000, output: 1000 },
            };

            const decision = await router.route(request);

            expect(decision.estimatedCost).toBeLessThanOrEqual(0.01);
        });

        it('should provide fallback models', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision = await router.route(request);

            expect(decision.fallbacks.length).toBeGreaterThan(0);
            expect(decision.fallbacks[0].model.id).not.toBe(decision.model.id);
        });
    });

    describe('execute', () => {
        it('should execute with primary model', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision = await router.route(request);

            const executor = jest.fn().mockResolvedValue('result');
            const result = await router.execute(decision, executor, request);

            expect(result).toBe('result');
            expect(executor).toHaveBeenCalledWith(decision.model, decision.provider);
        });

        it('should fallback on primary failure', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision = await router.route(request);

            const executor = jest.fn()
                .mockRejectedValueOnce(new Error('Primary failed'))
                .mockResolvedValueOnce('fallback result');

            const result = await router.execute(decision, executor, request);

            expect(result).toBe('fallback result');
            expect(executor).toHaveBeenCalledTimes(2);
        });

        it('should timeout after configured duration', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision = await router.route(request);

            const executor = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 100000))
            );

            await expect(router.execute(decision, executor, request)).rejects.toThrow('timeout');
        }, 70000);

        it('should record metrics on success', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
                estimatedTokens: { input: 100, output: 100 },
            };

            const decision = await router.route(request);
            const executor = jest.fn().mockResolvedValue('result');

            await router.execute(decision, executor, request);

            const postMortem = router.getPostMortem('ws_123', {
                start: Date.now() - 1000,
                end: Date.now(),
            });

            expect(postMortem.summary.totalRequests).toBeGreaterThan(0);
            expect(postMortem.summary.successRate).toBe(1);
        });
    });

    describe('budget management', () => {
        it('should track budget spending', async () => {
            router.setBudget('ws_123', 1.0);

            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 1.0, spent: 0, remaining: 1.0 },
                },
                estimatedTokens: { input: 1000, output: 1000 },
            };

            const decision = await router.route(request);
            const executor = jest.fn().mockResolvedValue('result');
            await router.execute(decision, executor, request);

            const budget = router.getBudget('ws_123');
            expect(budget.spent).toBeGreaterThan(0);
            expect(budget.remaining).toBeLessThan(1.0);
        });

        it('should emit cost alerts at thresholds', async () => {
            router.setBudget('ws_123', 1.0);

            const alertHandler = jest.fn();
            router.onCostAlert(alertHandler);

            // Simulate spending to trigger alerts
            for (let i = 0; i < 10; i++) {
                const request: RoutingRequest = {
                    domain: 'code',
                    task: 'generation',
                    priority: 'normal',
                    constraints: {},
                    context: {
                        workspaceId: 'ws_123',
                        userId: 'user_123',
                        budget: router.getBudget('ws_123'),
                    },
                    estimatedTokens: { input: 1000, output: 1000 },
                };

                const decision = await router.route(request);
                const executor = jest.fn().mockResolvedValue('result');
                await router.execute(decision, executor, request);
            }

            expect(alertHandler).toHaveBeenCalled();
        });
    });

    describe('circuit breaker', () => {
        it('should open circuit after failures', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision = await router.route(request);
            const executor = jest.fn().mockRejectedValue(new Error('Provider error'));

            // Trigger multiple failures
            for (let i = 0; i < 6; i++) {
                try {
                    await router.execute(decision, executor, request);
                } catch (error) {
                    // Expected
                }
            }

            // Circuit should be open now
            const circuitOpenHandler = jest.fn();
            router.onCircuitOpen(circuitOpenHandler);

            expect(circuitOpenHandler).toHaveBeenCalled();
        });
    });

    describe('post-mortem', () => {
        it('should provide cost breakdown', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
                estimatedTokens: { input: 1000, output: 1000 },
            };

            const decision = await router.route(request);
            const executor = jest.fn().mockResolvedValue('result');
            await router.execute(decision, executor, request);

            const postMortem = router.getPostMortem('ws_123', {
                start: Date.now() - 1000,
                end: Date.now(),
            });

            expect(postMortem.summary.totalCost).toBeGreaterThan(0);
            expect(postMortem.breakdown).toBeDefined();
            expect(postMortem.topCostDrivers).toBeDefined();
        });

        it('should provide optimization recommendations', async () => {
            // Execute multiple requests with expensive model
            for (let i = 0; i < 5; i++) {
                const request: RoutingRequest = {
                    domain: 'code',
                    task: 'generation',
                    priority: 'critical',
                    constraints: {},
                    context: {
                        workspaceId: 'ws_123',
                        userId: 'user_123',
                        budget: { total: 100, spent: 0, remaining: 100 },
                    },
                    estimatedTokens: { input: 1000, output: 1000 },
                };

                const decision = await router.route(request);
                const executor = jest.fn().mockResolvedValue('result');
                await router.execute(decision, executor, request);
            }

            const postMortem = router.getPostMortem('ws_123', {
                start: Date.now() - 10000,
                end: Date.now(),
            });

            expect(postMortem.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('caching', () => {
        it('should cache responses', async () => {
            const request: RoutingRequest = {
                domain: 'code',
                task: 'generation',
                priority: 'normal',
                constraints: {},
                context: {
                    workspaceId: 'ws_123',
                    userId: 'user_123',
                    budget: { total: 100, spent: 0, remaining: 100 },
                },
            };

            const decision1 = await router.route(request);
            router.cacheResponse(request, { result: 'cached' });

            const decision2 = await router.route(request);

            expect(decision2.estimatedCost).toBe(0);
            expect(decision2.reasoning).toContain('cache');
        });
    });
});
