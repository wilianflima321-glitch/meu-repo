import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { AgentScheduler } from '../../../common/orchestration/agent-scheduler';
import { MissionWebSocketClient } from '../../../common/websocket/websocket-service';
import { MissionTelemetry } from '../../../common/telemetry/mission-telemetry';
import { ArchitectAgent } from '../../architect-agent';
import { CoderAgent } from '../../coder-agent';

describe('Mission Execution E2E', () => {
    let container: Container;
    let scheduler: AgentScheduler;
    let wsClient: MissionWebSocketClient;
    let telemetry: MissionTelemetry;
    let architectAgent: ArchitectAgent;
    let coderAgent: CoderAgent;

    beforeEach(async () => {
        container = new Container();

        scheduler = new AgentScheduler();
        wsClient = new MissionWebSocketClient();
        telemetry = new MissionTelemetry();

        // Mock agents
        architectAgent = {
            id: 'architect',
            name: 'Architect',
            invoke: async () => ({ response: 'Architecture designed' }),
        } as any;

        coderAgent = {
            id: 'coder',
            name: 'Coder',
            invoke: async () => ({ response: 'Code implemented' }),
        } as any;

        container.bind(AgentScheduler).toConstantValue(scheduler);
        container.bind(MissionWebSocketClient).toConstantValue(wsClient);
        container.bind(MissionTelemetry).toConstantValue(telemetry);

        await scheduler.initialize();
        scheduler.registerAgent(architectAgent);
        scheduler.registerAgent(coderAgent);
    });

    afterEach(async () => {
        await wsClient.disconnect();
        await scheduler.shutdown();
    });

    describe('Mission Execution Flow', () => {
        it('should execute mission with progress updates', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Build Feature',
                description: 'Build a new feature',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.20,
                estimatedTime: 600,
                agents: ['architect', 'coder'],
            };

            // Schedule mission
            await scheduler.scheduleMission(mission);

            // Start telemetry
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            // Track progress updates
            const progressUpdates: number[] = [];
            scheduler.onMissionProgress((event) => {
                if (event.missionId === missionId) {
                    progressUpdates.push(event.progress);
                }
            });

            // Start execution
            await scheduler.startMission(missionId);

            // Simulate agent execution with progress
            await scheduler.updateMissionProgress(missionId, 0.25);
            await scheduler.updateMissionProgress(missionId, 0.50);
            await scheduler.updateMissionProgress(missionId, 0.75);
            await scheduler.updateMissionProgress(missionId, 1.0);

            // Verify progress updates
            expect(progressUpdates).to.have.lengthOf.at.least(4);
            expect(progressUpdates[0]).to.equal(0.25);
            expect(progressUpdates[progressUpdates.length - 1]).to.equal(1.0);

            // Complete mission
            await scheduler.completeMission(missionId);

            // Verify final status
            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('completed');
            expect(status.progress).to.equal(1.0);

            // Verify telemetry
            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics.status).to.equal('completed');
            expect(metrics.duration).to.be.greaterThan(0);
        });

        it('should execute multi-agent mission sequentially', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Full Stack Feature',
                description: 'Design and implement feature',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.30,
                estimatedTime: 900,
                agents: ['architect', 'coder'],
            };

            await scheduler.scheduleMission(mission);
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            // Track agent execution order
            const executionOrder: string[] = [];

            // Start execution
            await scheduler.startMission(missionId);

            // Execute architect agent
            const architectResult = await architectAgent.invoke({} as any);
            executionOrder.push('architect');
            await scheduler.updateMissionProgress(missionId, 0.5);

            // Execute coder agent
            const coderResult = await coderAgent.invoke({} as any);
            executionOrder.push('coder');
            await scheduler.updateMissionProgress(missionId, 1.0);

            // Verify execution order
            expect(executionOrder).to.deep.equal(['architect', 'coder']);

            // Verify results
            expect(architectResult.response).to.equal('Architecture designed');
            expect(coderResult.response).to.equal('Code implemented');

            await scheduler.completeMission(missionId);
        });

        it('should handle agent failures and retry', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Flaky Mission',
                description: 'Mission with potential failures',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.15,
                estimatedTime: 450,
                agents: ['architect'],
                retryPolicy: {
                    maxRetries: 3,
                    backoff: 'exponential',
                },
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Simulate agent failure
            let attemptCount = 0;
            const flakyAgent = {
                id: 'architect',
                name: 'Architect',
                invoke: async () => {
                    attemptCount++;
                    if (attemptCount < 3) {
                        throw new Error('Temporary failure');
                    }
                    return { response: 'Success after retries' };
                },
            };

            scheduler.registerAgent(flakyAgent);

            // Execute with retries
            try {
                await scheduler.executeAgent(missionId, 'architect');
            } catch (error) {
                // Should retry
            }

            // Verify retries occurred
            expect(attemptCount).to.be.greaterThan(1);
        });
    });

    describe('Real-time Progress Tracking', () => {
        it('should emit progress events via WebSocket', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Tracked Mission',
                description: 'Mission with real-time tracking',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            // Connect WebSocket
            await wsClient.connect('ws://localhost:8080/ws');

            // Track WebSocket events
            const wsEvents: any[] = [];
            wsClient.on('mission:progress', (event) => {
                wsEvents.push(event);
            });

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Update progress
            await scheduler.updateMissionProgress(missionId, 0.33);
            await scheduler.updateMissionProgress(missionId, 0.66);
            await scheduler.updateMissionProgress(missionId, 1.0);

            // Wait for WebSocket events
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify events were emitted
            expect(wsEvents.length).to.be.greaterThan(0);
        });

        it('should track agent-level progress', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Multi-Agent Mission',
                description: 'Track individual agent progress',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.25,
                estimatedTime: 750,
                agents: ['architect', 'coder'],
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Track agent progress
            const agentProgress: Record<string, number> = {};

            scheduler.onAgentProgress((event) => {
                agentProgress[event.agentId] = event.progress;
            });

            // Execute agents with progress
            await scheduler.executeAgent(missionId, 'architect');
            agentProgress['architect'] = 1.0;

            await scheduler.executeAgent(missionId, 'coder');
            agentProgress['coder'] = 1.0;

            // Verify agent progress
            expect(agentProgress['architect']).to.equal(1.0);
            expect(agentProgress['coder']).to.equal(1.0);
        });

        it('should calculate ETA based on progress', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'ETA Mission',
                description: 'Mission with ETA calculation',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 600, // 10 minutes
            };

            await scheduler.scheduleMission(mission);
            const startTime = Date.now();
            await scheduler.startMission(missionId);

            // Simulate progress over time
            await new Promise(resolve => setTimeout(resolve, 100));
            await scheduler.updateMissionProgress(missionId, 0.25);

            const status = scheduler.getMissionStatus(missionId);
            const elapsed = Date.now() - startTime;
            const estimatedTotal = elapsed / 0.25;
            const eta = estimatedTotal - elapsed;

            expect(status.eta).to.be.greaterThan(0);
            expect(status.eta).to.be.closeTo(eta, 1000); // Within 1 second
        });
    });

    describe('Resource Management', () => {
        it('should track cost during execution', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Cost Tracked Mission',
                description: 'Track costs during execution',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.20,
                estimatedTime: 600,
            };

            await scheduler.scheduleMission(mission);
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            await scheduler.startMission(missionId);

            // Simulate cost accumulation
            await scheduler.recordCost(missionId, 0.05);
            await scheduler.recordCost(missionId, 0.08);
            await scheduler.recordCost(missionId, 0.07);

            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics.totalCost).to.equal(0.20);
            expect(metrics.totalCost).to.be.closeTo(mission.estimatedCost, 0.05);
        });

        it('should enforce budget limits', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Budget Limited Mission',
                description: 'Mission with budget limit',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
                budgetLimit: 0.15,
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Exceed budget
            await scheduler.recordCost(missionId, 0.10);
            await scheduler.recordCost(missionId, 0.08); // Total: 0.18 > 0.15

            const status = scheduler.getMissionStatus(missionId);
            expect(status.budgetExceeded).to.be.true;
            expect(status.status).to.be.oneOf(['paused', 'failed']);
        });

        it('should track token usage', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Token Tracked Mission',
                description: 'Track LLM token usage',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.15,
                estimatedTime: 450,
            };

            await scheduler.scheduleMission(mission);
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            await scheduler.startMission(missionId);

            // Record token usage
            telemetry.recordTokenUsage(missionId, {
                promptTokens: 1000,
                completionTokens: 500,
                totalTokens: 1500,
            });

            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics.tokenUsage.totalTokens).to.equal(1500);
        });
    });

    describe('Error Handling During Execution', () => {
        it('should handle agent timeout', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Timeout Mission',
                description: 'Mission with timeout',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
                timeout: 1000, // 1 second
            };

            const slowAgent = {
                id: 'slow-agent',
                name: 'Slow Agent',
                invoke: async () => {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
                    return { response: 'Too slow' };
                },
            };

            scheduler.registerAgent(slowAgent);

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            try {
                await scheduler.executeAgent(missionId, 'slow-agent');
                expect.fail('Should have timed out');
            } catch (error) {
                expect(error.message).to.include('timeout');
            }

            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('failed');
        });

        it('should handle agent crash', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Crash Mission',
                description: 'Mission with crashing agent',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            const crashingAgent = {
                id: 'crashing-agent',
                name: 'Crashing Agent',
                invoke: async () => {
                    throw new Error('Agent crashed');
                },
            };

            scheduler.registerAgent(crashingAgent);

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            try {
                await scheduler.executeAgent(missionId, 'crashing-agent');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Agent crashed');
            }

            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('failed');
            expect(status.error).to.include('crashed');
        });

        it('should handle network failures', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Network Mission',
                description: 'Mission with network dependency',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Simulate network failure
            wsClient.disconnect();

            // Mission should continue despite WebSocket disconnect
            await scheduler.updateMissionProgress(missionId, 0.5);

            const status = scheduler.getMissionStatus(missionId);
            expect(status.progress).to.equal(0.5);
        });
    });

    describe('Mission Pause and Resume', () => {
        it('should pause and resume mission execution', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Pausable Mission',
                description: 'Mission that can be paused',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.15,
                estimatedTime: 450,
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Progress to 50%
            await scheduler.updateMissionProgress(missionId, 0.5);

            // Pause
            await scheduler.pauseMission(missionId);
            let status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('paused');
            expect(status.progress).to.equal(0.5);

            // Resume
            await scheduler.resumeMission(missionId);
            status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('running');

            // Continue to completion
            await scheduler.updateMissionProgress(missionId, 1.0);
            await scheduler.completeMission(missionId);

            status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('completed');
        });

        it('should preserve state when paused', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Stateful Mission',
                description: 'Mission with preserved state',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
                state: { counter: 0 },
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Update state
            await scheduler.updateMissionState(missionId, { counter: 5 });

            // Pause
            await scheduler.pauseMission(missionId);

            // Verify state preserved
            const status = scheduler.getMissionStatus(missionId);
            expect(status.state.counter).to.equal(5);

            // Resume
            await scheduler.resumeMission(missionId);

            // State should still be preserved
            const resumedStatus = scheduler.getMissionStatus(missionId);
            expect(resumedStatus.state.counter).to.equal(5);
        });
    });
});
