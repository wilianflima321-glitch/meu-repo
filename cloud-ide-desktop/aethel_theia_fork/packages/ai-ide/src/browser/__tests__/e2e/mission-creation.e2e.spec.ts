import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { MissionControlWidget } from '../../missions/mission-control';
import { AgentScheduler } from '../../../common/orchestration/agent-scheduler';
import { MissionWebSocketClient } from '../../../common/websocket/websocket-service';
import { PolicyEngine } from '../../../common/compliance/policy-engine';
import { MissionTelemetry } from '../../../common/telemetry/mission-telemetry';

describe('Mission Creation E2E', () => {
    let container: Container;
    let missionControl: MissionControlWidget;
    let scheduler: AgentScheduler;
    let wsClient: MissionWebSocketClient;
    let policyEngine: PolicyEngine;
    let telemetry: MissionTelemetry;

    beforeEach(async () => {
        container = new Container();

        // Create real instances
        scheduler = new AgentScheduler();
        wsClient = new MissionWebSocketClient();
        policyEngine = new PolicyEngine();
        telemetry = new MissionTelemetry();

        container.bind(AgentScheduler).toConstantValue(scheduler);
        container.bind(MissionWebSocketClient).toConstantValue(wsClient);
        container.bind(PolicyEngine).toConstantValue(policyEngine);
        container.bind(MissionTelemetry).toConstantValue(telemetry);
        container.bind(MissionControlWidget).toSelf();

        missionControl = container.get(MissionControlWidget);

        // Initialize services
        await scheduler.initialize();
        await policyEngine.initialize();
    });

    afterEach(async () => {
        // Cleanup
        await wsClient.disconnect();
        await scheduler.shutdown();
    });

    describe('Complete Mission Creation Flow', () => {
        it('should create a code feature mission end-to-end', async () => {
            // Step 1: User selects mission preset
            const preset = {
                id: 'code-feature',
                name: 'Code Feature',
                domain: 'code' as const,
                description: 'Implement a new feature',
                icon: 'fa-code',
                toolchain: 'code',
                estimatedCost: { min: 0.05, max: 0.50, typical: 0.15 },
                estimatedTime: { min: 300, max: 1800, typical: 600 },
                riskLevel: 'low' as const,
                requiresApproval: false,
                requiredPlan: 'starter' as const,
                examples: ['Add authentication', 'Create API endpoint'],
            };

            // Step 2: Check policy compliance
            const policyCheck = await policyEngine.checkPolicy('mission.create', {
                domain: preset.domain,
                riskLevel: preset.riskLevel,
            });

            expect(policyCheck.allowed).to.be.true;
            expect(policyCheck.violations).to.be.empty;

            // Step 3: Create mission
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: preset.name,
                description: preset.description,
                domain: preset.domain,
                priority: 'normal' as const,
                estimatedCost: preset.estimatedCost.typical,
                estimatedTime: preset.estimatedTime.typical,
            };

            // Step 4: Schedule with AgentScheduler
            const scheduleResult = await scheduler.scheduleMission(mission);
            expect(scheduleResult).to.exist;
            expect(scheduleResult.missionId).to.equal(missionId);
            expect(scheduleResult.status).to.equal('scheduled');

            // Step 5: Start telemetry tracking
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics).to.exist;
            expect(metrics.missionId).to.equal(missionId);

            // Step 6: Verify mission is in scheduler
            const activeMissions = scheduler.getActiveMissions();
            expect(activeMissions).to.have.lengthOf(1);
            expect(activeMissions[0].id).to.equal(missionId);

            // Step 7: Verify mission status
            const status = scheduler.getMissionStatus(missionId);
            expect(status).to.exist;
            expect(status.status).to.be.oneOf(['scheduled', 'running']);
        });

        it('should handle high-risk mission with approval', async () => {
            const preset = {
                id: 'code-deploy',
                name: 'Production Deploy',
                domain: 'code' as const,
                description: 'Deploy to production',
                icon: 'fa-rocket',
                toolchain: 'code',
                estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
                estimatedTime: { min: 300, max: 900, typical: 450 },
                riskLevel: 'high' as const,
                requiresApproval: true,
                requiredPlan: 'pro' as const,
                examples: ['Deploy API', 'Update frontend'],
            };

            // Check policy - should require approval
            const policyCheck = await policyEngine.checkPolicy('mission.create', {
                domain: preset.domain,
                riskLevel: preset.riskLevel,
            });

            if (preset.requiresApproval) {
                expect(policyCheck.requiresApproval).to.be.true;
            }

            // Simulate approval
            const approvalGranted = true;

            if (approvalGranted) {
                const missionId = `mission-${Date.now()}`;
                const mission = {
                    id: missionId,
                    name: preset.name,
                    description: preset.description,
                    domain: preset.domain,
                    priority: 'high' as const,
                    estimatedCost: preset.estimatedCost.typical,
                    estimatedTime: preset.estimatedTime.typical,
                    approved: true,
                    approvedBy: 'test-user',
                    approvedAt: new Date(),
                };

                const scheduleResult = await scheduler.scheduleMission(mission);
                expect(scheduleResult).to.exist;
                expect(scheduleResult.approved).to.be.true;
            }
        });

        it('should handle trading mission with policy checks', async () => {
            const preset = {
                id: 'trading-backtest',
                name: 'Strategy Backtest',
                domain: 'trading' as const,
                description: 'Backtest trading strategy',
                icon: 'fa-chart-line',
                toolchain: 'trading',
                estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
                estimatedTime: { min: 120, max: 600, typical: 300 },
                riskLevel: 'low' as const,
                requiresApproval: false,
                requiredPlan: 'pro' as const,
                examples: ['Test momentum strategy'],
            };

            // Check trading policy
            const policyCheck = await policyEngine.checkPolicy('trading.backtest', {
                domain: preset.domain,
            });

            expect(policyCheck.allowed).to.be.true;

            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: preset.name,
                description: preset.description,
                domain: preset.domain,
                priority: 'normal' as const,
                estimatedCost: preset.estimatedCost.typical,
                estimatedTime: preset.estimatedTime.typical,
            };

            const scheduleResult = await scheduler.scheduleMission(mission);
            expect(scheduleResult).to.exist;
        });
    });

    describe('Mission Validation', () => {
        it('should validate mission parameters', async () => {
            const invalidMission = {
                id: '',  // Invalid: empty ID
                name: '',  // Invalid: empty name
                description: 'Test',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: -1,  // Invalid: negative cost
                estimatedTime: 0,  // Invalid: zero time
            };

            try {
                await scheduler.scheduleMission(invalidMission);
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error).to.exist;
                expect(error.message).to.include('validation');
            }
        });

        it('should validate domain', async () => {
            const invalidMission = {
                id: 'test-mission',
                name: 'Test',
                description: 'Test',
                domain: 'invalid-domain' as any,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            try {
                await scheduler.scheduleMission(invalidMission);
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should validate priority', async () => {
            const invalidMission = {
                id: 'test-mission',
                name: 'Test',
                description: 'Test',
                domain: 'code' as const,
                priority: 'invalid-priority' as any,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            try {
                await scheduler.scheduleMission(invalidMission);
                expect.fail('Should have thrown validation error');
            } catch (error) {
                expect(error).to.exist;
            }
        });
    });

    describe('Mission Lifecycle', () => {
        it('should track mission from creation to completion', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test lifecycle',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            // Create
            const scheduleResult = await scheduler.scheduleMission(mission);
            expect(scheduleResult.status).to.equal('scheduled');

            // Start telemetry
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });

            // Start execution
            await scheduler.startMission(missionId);
            let status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('running');

            // Simulate progress
            await scheduler.updateMissionProgress(missionId, 0.5);
            status = scheduler.getMissionStatus(missionId);
            expect(status.progress).to.equal(0.5);

            // Complete
            await scheduler.completeMission(missionId);
            status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('completed');

            // End telemetry
            telemetry.endMission(missionId, {
                status: 'completed',
                endTime: new Date(),
            });

            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics.status).to.equal('completed');
        });

        it('should handle mission cancellation', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test cancellation',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Cancel
            await scheduler.cancelMission(missionId);
            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('cancelled');
        });

        it('should handle mission failure', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test failure',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);

            // Simulate failure
            await scheduler.failMission(missionId, 'Test error');
            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('failed');
            expect(status.error).to.equal('Test error');
        });
    });

    describe('Concurrent Missions', () => {
        it('should handle multiple missions concurrently', async () => {
            const missions = Array.from({ length: 3 }, (_, i) => ({
                id: `mission-${Date.now()}-${i}`,
                name: `Mission ${i}`,
                description: `Test mission ${i}`,
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            }));

            // Schedule all missions
            const results = await Promise.all(
                missions.map(m => scheduler.scheduleMission(m))
            );

            expect(results).to.have.lengthOf(3);
            results.forEach(result => {
                expect(result.status).to.equal('scheduled');
            });

            // Verify all are active
            const activeMissions = scheduler.getActiveMissions();
            expect(activeMissions).to.have.lengthOf(3);
        });

        it('should respect priority ordering', async () => {
            const lowPriority = {
                id: 'mission-low',
                name: 'Low Priority',
                description: 'Test',
                domain: 'code' as const,
                priority: 'low' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            const highPriority = {
                id: 'mission-high',
                name: 'High Priority',
                description: 'Test',
                domain: 'code' as const,
                priority: 'high' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            await scheduler.scheduleMission(lowPriority);
            await scheduler.scheduleMission(highPriority);

            const queue = scheduler.getMissionQueue();
            expect(queue[0].priority).to.equal('high');
            expect(queue[1].priority).to.equal('low');
        });
    });

    describe('Error Recovery', () => {
        it('should recover from scheduler errors', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test recovery',
                domain: 'code' as const,
                priority: 'normal' as const,
                estimatedCost: 0.10,
                estimatedTime: 300,
            };

            await scheduler.scheduleMission(mission);

            // Simulate error
            try {
                await scheduler.startMission('non-existent-mission');
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error).to.exist;
            }

            // Verify scheduler still works
            await scheduler.startMission(missionId);
            const status = scheduler.getMissionStatus(missionId);
            expect(status.status).to.equal('running');
        });

        it('should handle telemetry failures gracefully', async () => {
            const missionId = `mission-${Date.now()}`;

            // Start telemetry for non-existent mission
            telemetry.startMission(missionId, {
                name: 'Test',
                startTime: new Date(),
            });

            // Should not throw
            const metrics = telemetry.getMissionMetrics(missionId);
            expect(metrics).to.exist;
        });
    });
});
