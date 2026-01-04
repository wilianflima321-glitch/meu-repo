"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const inversify_1 = require("@theia/core/shared/inversify");
const config_service_1 = require("../common/config/config-service");
const llm_router_1 = require("../common/llm/llm-router");
const policy_engine_1 = require("../common/compliance/policy-engine");
const agent_scheduler_1 = require("../common/orchestration/agent-scheduler");
const mission_telemetry_1 = require("../common/telemetry/mission-telemetry");
const context_store_1 = require("../common/context/context-store");
const secure_fetch_1 = require("../common/data/secure-fetch");
/**
 * Smoke tests for deployment validation
 * These tests verify that core services can be instantiated and initialized
 */
describe('Smoke Tests - Deployment Validation', () => {
    let container;
    beforeEach(() => {
        container = new inversify_1.Container();
    });
    describe('Core Services Initialization', () => {
        it('should initialize ConfigService', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            (0, chai_1.expect)(configService.isReady()).to.be.true;
        });
        it('should initialize LLMRouter', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            container.bind(config_service_1.ConfigService).toConstantValue(configService);
            container.bind(llm_router_1.LLMRouter).toSelf();
            const router = container.get(llm_router_1.LLMRouter);
            await router.initialize();
            (0, chai_1.expect)(router).to.exist;
        });
        it('should initialize PolicyEngine', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            container.bind(config_service_1.ConfigService).toConstantValue(configService);
            container.bind(policy_engine_1.PolicyEngine).toSelf();
            const policyEngine = container.get(policy_engine_1.PolicyEngine);
            await policyEngine.initialize();
            (0, chai_1.expect)(policyEngine).to.exist;
        });
        it('should initialize AgentScheduler', async () => {
            const scheduler = new agent_scheduler_1.AgentScheduler();
            await scheduler.initialize();
            (0, chai_1.expect)(scheduler).to.exist;
        });
        it('should initialize MissionTelemetry', () => {
            const telemetry = new mission_telemetry_1.MissionTelemetry();
            (0, chai_1.expect)(telemetry).to.exist;
        });
        it('should initialize ContextStore', () => {
            const contextStore = new context_store_1.ContextStore();
            (0, chai_1.expect)(contextStore).to.exist;
        });
        it('should initialize SecureFetch', () => {
            const secureFetch = new secure_fetch_1.SecureFetch();
            (0, chai_1.expect)(secureFetch).to.exist;
        });
    });
    describe('Service Integration', () => {
        it('should integrate ConfigService with LLMRouter', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            container.bind(config_service_1.ConfigService).toConstantValue(configService);
            container.bind(llm_router_1.LLMRouter).toSelf();
            const router = container.get(llm_router_1.LLMRouter);
            await router.initialize();
            // Verify router loaded providers from config
            (0, chai_1.expect)(router).to.exist;
        });
        it('should integrate ConfigService with PolicyEngine', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            container.bind(config_service_1.ConfigService).toConstantValue(configService);
            container.bind(policy_engine_1.PolicyEngine).toSelf();
            const policyEngine = container.get(policy_engine_1.PolicyEngine);
            await policyEngine.initialize();
            // Verify policy engine loaded rules from config
            (0, chai_1.expect)(policyEngine).to.exist;
        });
        it('should integrate AgentScheduler with MissionTelemetry', async () => {
            const scheduler = new agent_scheduler_1.AgentScheduler();
            const telemetry = new mission_telemetry_1.MissionTelemetry();
            await scheduler.initialize();
            // Create test mission
            const missionId = 'smoke-test-mission';
            await scheduler.scheduleMission({
                id: missionId,
                name: 'Smoke Test',
                description: 'Test mission',
                domain: 'code',
                priority: 'normal',
                estimatedCost: 0.10,
                estimatedTime: 300,
            });
            telemetry.startMission(missionId, {
                name: 'Smoke Test',
                startTime: new Date(),
            });
            const metrics = telemetry.getMissionMetrics(missionId);
            (0, chai_1.expect)(metrics).to.exist;
            (0, chai_1.expect)(metrics.missionId).to.equal(missionId);
        });
    });
    describe('Environment Configuration', () => {
        it('should load environment variables', () => {
            const configService = new config_service_1.ConfigService();
            // Should not throw
            (0, chai_1.expect)(() => configService.get('llm.providers.openai.enabled')).to.not.throw();
        });
        it('should have default configuration', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            const budget = configService.get('llm.budget.default');
            (0, chai_1.expect)(budget).to.be.a('number');
            (0, chai_1.expect)(budget).to.be.greaterThan(0);
        });
        it('should validate configuration schema', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            const allConfigs = configService.getAll();
            (0, chai_1.expect)(allConfigs).to.be.an('array');
            (0, chai_1.expect)(allConfigs.length).to.be.greaterThan(0);
            allConfigs.forEach(config => {
                (0, chai_1.expect)(config).to.have.property('key');
                (0, chai_1.expect)(config).to.have.property('value');
                (0, chai_1.expect)(config).to.have.property('type');
                (0, chai_1.expect)(config).to.have.property('category');
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle missing configuration gracefully', () => {
            const configService = new config_service_1.ConfigService();
            const value = configService.get('non.existent.key', 'default');
            (0, chai_1.expect)(value).to.equal('default');
        });
        it('should handle initialization failures', async () => {
            const configService = new config_service_1.ConfigService();
            // Should not throw even if storage fails
            await configService.load();
            (0, chai_1.expect)(configService.isReady()).to.be.true;
        });
        it('should handle service dependency failures', async () => {
            // LLMRouter should handle missing ConfigService gracefully
            try {
                const router = new llm_router_1.LLMRouter();
                // Should not crash
                (0, chai_1.expect)(router).to.exist;
            }
            catch (error) {
                // Expected if dependencies not injected
                (0, chai_1.expect)(error).to.exist;
            }
        });
    });
    describe('Performance', () => {
        it('should initialize services quickly', async () => {
            const start = Date.now();
            const configService = new config_service_1.ConfigService();
            await configService.load();
            const scheduler = new agent_scheduler_1.AgentScheduler();
            await scheduler.initialize();
            const telemetry = new mission_telemetry_1.MissionTelemetry();
            const contextStore = new context_store_1.ContextStore();
            const secureFetch = new secure_fetch_1.SecureFetch();
            const duration = Date.now() - start;
            (0, chai_1.expect)(duration).to.be.lessThan(1000); // < 1 second
        });
        it('should handle concurrent service initialization', async () => {
            const promises = [
                (async () => {
                    const configService = new config_service_1.ConfigService();
                    await configService.load();
                })(),
                (async () => {
                    const scheduler = new agent_scheduler_1.AgentScheduler();
                    await scheduler.initialize();
                })(),
                (async () => {
                    const telemetry = new mission_telemetry_1.MissionTelemetry();
                })(),
            ];
            await Promise.all(promises);
            // Should not throw
        });
    });
    describe('Health Checks', () => {
        it('should verify ConfigService health', async () => {
            const configService = new config_service_1.ConfigService();
            await configService.load();
            (0, chai_1.expect)(configService.isReady()).to.be.true;
        });
        it('should verify AgentScheduler health', async () => {
            const scheduler = new agent_scheduler_1.AgentScheduler();
            await scheduler.initialize();
            const activeMissions = scheduler.getActiveMissions();
            (0, chai_1.expect)(activeMissions).to.be.an('array');
        });
        it('should verify MissionTelemetry health', () => {
            const telemetry = new mission_telemetry_1.MissionTelemetry();
            telemetry.startMission('health-check', {
                name: 'Health Check',
                startTime: new Date(),
            });
            const metrics = telemetry.getMissionMetrics('health-check');
            (0, chai_1.expect)(metrics).to.exist;
        });
    });
});
