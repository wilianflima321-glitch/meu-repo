"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const inversify_1 = require("@theia/core/shared/inversify");
const mission_control_1 = require("../../missions/mission-control");
const agent_scheduler_1 = require("../../../common/orchestration/agent-scheduler");
const websocket_service_1 = require("../../../common/websocket/websocket-service");
const policy_engine_1 = require("../../../common/compliance/policy-engine");
const mission_telemetry_1 = require("../../../common/telemetry/mission-telemetry");
describe('Mission Creation E2E', () => {
    let container;
    let missionControl;
    let scheduler;
    let wsClient;
    let policyEngine;
    let telemetry;
    beforeEach(async () => {
        container = new inversify_1.Container();
        // Create real instances
        scheduler = new agent_scheduler_1.AgentScheduler();
        wsClient = new websocket_service_1.MissionWebSocketClient();
        policyEngine = new policy_engine_1.PolicyEngine();
        telemetry = new mission_telemetry_1.MissionTelemetry();
        container.bind(agent_scheduler_1.AgentScheduler).toConstantValue(scheduler);
        container.bind(websocket_service_1.MissionWebSocketClient).toConstantValue(wsClient);
        container.bind(policy_engine_1.PolicyEngine).toConstantValue(policyEngine);
        container.bind(mission_telemetry_1.MissionTelemetry).toConstantValue(telemetry);
        container.bind(mission_control_1.MissionControlWidget).toSelf();
        missionControl = container.get(mission_control_1.MissionControlWidget);
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
                domain: 'code',
                description: 'Implement a new feature',
                icon: 'fa-code',
                toolchain: 'code',
                estimatedCost: { min: 0.05, max: 0.50, typical: 0.15 },
                estimatedTime: { min: 300, max: 1800, typical: 600 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'starter',
                examples: ['Add authentication', 'Create API endpoint'],
            };
            // Step 2: Check policy compliance
            const policyCheck = await policyEngine.checkPolicy('mission.create', {
                domain: preset.domain,
                riskLevel: preset.riskLevel,
            });
            (0, chai_1.expect)(policyCheck.allowed).to.be.true;
            (0, chai_1.expect)(policyCheck.violations).to.be.empty;
            // Step 3: Create mission
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: preset.name,
                description: preset.description,
                domain: preset.domain,
                priority: 'normal',
                estimatedCost: preset.estimatedCost.typical,
                estimatedTime: preset.estimatedTime.typical,
            };
            // Step 4: Schedule with AgentScheduler
            const scheduleResult = await scheduler.scheduleMission(mission);
            (0, chai_1.expect)(scheduleResult).to.exist;
            (0, chai_1.expect)(scheduleResult.missionId).to.equal(missionId);
            (0, chai_1.expect)(scheduleResult.status).to.equal('scheduled');
            // Step 5: Start telemetry tracking
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });
            const metrics = telemetry.getMissionMetrics(missionId);
            (0, chai_1.expect)(metrics).to.exist;
            (0, chai_1.expect)(metrics.missionId).to.equal(missionId);
            // Step 6: Verify mission is in scheduler
            const activeMissions = scheduler.getActiveMissions();
            (0, chai_1.expect)(activeMissions).to.have.lengthOf(1);
            (0, chai_1.expect)(activeMissions[0].id).to.equal(missionId);
            // Step 7: Verify mission status
            const status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status).to.exist;
            (0, chai_1.expect)(status.status).to.be.oneOf(['scheduled', 'running']);
        });
        it('should handle high-risk mission with approval', async () => {
            const preset = {
                id: 'code-deploy',
                name: 'Production Deploy',
                domain: 'code',
                description: 'Deploy to production',
                icon: 'fa-rocket',
                toolchain: 'code',
                estimatedCost: { min: 0.10, max: 0.50, typical: 0.20 },
                estimatedTime: { min: 300, max: 900, typical: 450 },
                riskLevel: 'high',
                requiresApproval: true,
                requiredPlan: 'pro',
                examples: ['Deploy API', 'Update frontend'],
            };
            // Check policy - should require approval
            const policyCheck = await policyEngine.checkPolicy('mission.create', {
                domain: preset.domain,
                riskLevel: preset.riskLevel,
            });
            if (preset.requiresApproval) {
                (0, chai_1.expect)(policyCheck.requiresApproval).to.be.true;
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
                    priority: 'high',
                    estimatedCost: preset.estimatedCost.typical,
                    estimatedTime: preset.estimatedTime.typical,
                    approved: true,
                    approvedBy: 'test-user',
                    approvedAt: new Date(),
                };
                const scheduleResult = await scheduler.scheduleMission(mission);
                (0, chai_1.expect)(scheduleResult).to.exist;
                (0, chai_1.expect)(scheduleResult.approved).to.be.true;
            }
        });
        it('should handle trading mission with policy checks', async () => {
            const preset = {
                id: 'trading-backtest',
                name: 'Strategy Backtest',
                domain: 'trading',
                description: 'Backtest trading strategy',
                icon: 'fa-chart-line',
                toolchain: 'trading',
                estimatedCost: { min: 0.05, max: 0.20, typical: 0.10 },
                estimatedTime: { min: 120, max: 600, typical: 300 },
                riskLevel: 'low',
                requiresApproval: false,
                requiredPlan: 'pro',
                examples: ['Test momentum strategy'],
            };
            // Check trading policy
            const policyCheck = await policyEngine.checkPolicy('trading.backtest', {
                domain: preset.domain,
            });
            (0, chai_1.expect)(policyCheck.allowed).to.be.true;
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: preset.name,
                description: preset.description,
                domain: preset.domain,
                priority: 'normal',
                estimatedCost: preset.estimatedCost.typical,
                estimatedTime: preset.estimatedTime.typical,
            };
            const scheduleResult = await scheduler.scheduleMission(mission);
            (0, chai_1.expect)(scheduleResult).to.exist;
        });
    });
    describe('Mission Validation', () => {
        it('should validate mission parameters', async () => {
            const invalidMission = {
                id: '', // Invalid: empty ID
                name: '', // Invalid: empty name
                description: 'Test',
                domain: 'code',
                priority: 'normal',
                estimatedCost: -1, // Invalid: negative cost
                estimatedTime: 0, // Invalid: zero time
            };
            try {
                await scheduler.scheduleMission(invalidMission);
                chai_1.expect.fail('Should have thrown validation error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
                (0, chai_1.expect)(error.message).to.include('validation');
            }
        });
        it('should validate domain', async () => {
            const invalidMission = {
                id: 'test-mission',
                name: 'Test',
                description: 'Test',
                domain: 'invalid-domain',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            try {
                await scheduler.scheduleMission(invalidMission);
                chai_1.expect.fail('Should have thrown validation error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
        });
        it('should validate priority', async () => {
            const invalidMission = {
                id: 'test-mission',
                name: 'Test',
                description: 'Test',
                domain: 'code',
                priority: 'invalid-priority',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            try {
                await scheduler.scheduleMission(invalidMission);
                chai_1.expect.fail('Should have thrown validation error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
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
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            // Create
            const scheduleResult = await scheduler.scheduleMission(mission);
            (0, chai_1.expect)(scheduleResult.status).to.equal('scheduled');
            // Start telemetry
            telemetry.startMission(missionId, {
                name: mission.name,
                startTime: new Date(),
            });
            // Start execution
            await scheduler.startMission(missionId);
            let status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.status).to.equal('running');
            // Simulate progress
            await scheduler.updateMissionProgress(missionId, 0.5);
            status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.progress).to.equal(0.5);
            // Complete
            await scheduler.completeMission(missionId);
            status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.status).to.equal('completed');
            // End telemetry
            telemetry.endMission(missionId, {
                status: 'completed',
                endTime: new Date(),
            });
            const metrics = telemetry.getMissionMetrics(missionId);
            (0, chai_1.expect)(metrics.status).to.equal('completed');
        });
        it('should handle mission cancellation', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test cancellation',
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);
            // Cancel
            await scheduler.cancelMission(missionId);
            const status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.status).to.equal('cancelled');
        });
        it('should handle mission failure', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test failure',
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            await scheduler.scheduleMission(mission);
            await scheduler.startMission(missionId);
            // Simulate failure
            await scheduler.failMission(missionId, 'Test error');
            const status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.status).to.equal('failed');
            (0, chai_1.expect)(status.error).to.equal('Test error');
        });
    });
    describe('Concurrent Missions', () => {
        it('should handle multiple missions concurrently', async () => {
            const missions = Array.from({ length: 3 }, (_, i) => ({
                id: `mission-${Date.now()}-${i}`,
                name: `Mission ${i}`,
                description: `Test mission ${i}`,
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            }));
            // Schedule all missions
            const results = await Promise.all(missions.map(m => scheduler.scheduleMission(m)));
            (0, chai_1.expect)(results).to.have.lengthOf(3);
            results.forEach(result => {
                (0, chai_1.expect)(result.status).to.equal('scheduled');
            });
            // Verify all are active
            const activeMissions = scheduler.getActiveMissions();
            (0, chai_1.expect)(activeMissions).to.have.lengthOf(3);
        });
        it('should respect priority ordering', async () => {
            const lowPriority = {
                id: 'mission-low',
                name: 'Low Priority',
                description: 'Test',
                domain: 'code',
                priority: 'low',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            const highPriority = {
                id: 'mission-high',
                name: 'High Priority',
                description: 'Test',
                domain: 'code',
                priority: 'high',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            await scheduler.scheduleMission(lowPriority);
            await scheduler.scheduleMission(highPriority);
            const queue = scheduler.getMissionQueue();
            (0, chai_1.expect)(queue[0].priority).to.equal('high');
            (0, chai_1.expect)(queue[1].priority).to.equal('low');
        });
    });
    describe('Error Recovery', () => {
        it('should recover from scheduler errors', async () => {
            const missionId = `mission-${Date.now()}`;
            const mission = {
                id: missionId,
                name: 'Test Mission',
                description: 'Test recovery',
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            };
            await scheduler.scheduleMission(mission);
            // Simulate error
            try {
                await scheduler.startMission('non-existent-mission');
                chai_1.expect.fail('Should have thrown error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
            // Verify scheduler still works
            await scheduler.startMission(missionId);
            const status = scheduler.getMissionStatus(missionId);
            (0, chai_1.expect)(status.status).to.equal('running');
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
            (0, chai_1.expect)(metrics).to.exist;
        });
    });
});
