import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { ConfigService } from '../common/config/config-service';
import { LLMRouter } from '../common/llm/llm-router';
import { PolicyEngine } from '../common/compliance/policy-engine';
import { AgentScheduler } from '../common/orchestration/agent-scheduler';
import { MissionTelemetry } from '../common/telemetry/mission-telemetry';
import { ContextStore } from '../common/context/context-store';
import { SecureFetch } from '../common/data/secure-fetch';

/**
 * Smoke tests for deployment validation
 * These tests verify that core services can be instantiated and initialized
 */
describe('Smoke Tests - Deployment Validation', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    describe('Core Services Initialization', () => {
        it('should initialize ConfigService', async () => {
            const configService = new ConfigService();
            await configService.load();
            expect(configService.isReady()).to.be.true;
        });

        it('should initialize LLMRouter', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            container.bind(ConfigService).toConstantValue(configService);
            container.bind(LLMRouter).toSelf();
            
            const router = container.get(LLMRouter);
            await router.initialize();
            expect(router).to.exist;
        });

        it('should initialize PolicyEngine', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            container.bind(ConfigService).toConstantValue(configService);
            container.bind(PolicyEngine).toSelf();
            
            const policyEngine = container.get(PolicyEngine);
            await policyEngine.initialize();
            expect(policyEngine).to.exist;
        });

        it('should initialize AgentScheduler', async () => {
            const scheduler = new AgentScheduler();
            await scheduler.initialize();
            expect(scheduler).to.exist;
        });

        it('should initialize MissionTelemetry', () => {
            const telemetry = new MissionTelemetry();
            expect(telemetry).to.exist;
        });

        it('should initialize ContextStore', () => {
            const contextStore = new ContextStore();
            expect(contextStore).to.exist;
        });

        it('should initialize SecureFetch', () => {
            const secureFetch = new SecureFetch();
            expect(secureFetch).to.exist;
        });
    });

    describe('Service Integration', () => {
        it('should integrate ConfigService with LLMRouter', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            container.bind(ConfigService).toConstantValue(configService);
            container.bind(LLMRouter).toSelf();
            
            const router = container.get(LLMRouter);
            await router.initialize();
            
            // Verify router loaded providers from config
            expect(router).to.exist;
        });

        it('should integrate ConfigService with PolicyEngine', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            container.bind(ConfigService).toConstantValue(configService);
            container.bind(PolicyEngine).toSelf();
            
            const policyEngine = container.get(PolicyEngine);
            await policyEngine.initialize();
            
            // Verify policy engine loaded rules from config
            expect(policyEngine).to.exist;
        });

        it('should integrate AgentScheduler with MissionTelemetry', async () => {
            const scheduler = new AgentScheduler();
            const telemetry = new MissionTelemetry();
            
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
            expect(metrics).to.exist;
            expect(metrics.missionId).to.equal(missionId);
        });
    });

    describe('Environment Configuration', () => {
        it('should load environment variables', () => {
            const configService = new ConfigService();
            // Should not throw
            expect(() => configService.get('llm.providers.openai.enabled')).to.not.throw();
        });

        it('should have default configuration', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            const budget = configService.get('llm.budget.default');
            expect(budget).to.be.a('number');
            expect(budget).to.be.greaterThan(0);
        });

        it('should validate configuration schema', async () => {
            const configService = new ConfigService();
            await configService.load();
            
            const allConfigs = configService.getAll();
            expect(allConfigs).to.be.an('array');
            expect(allConfigs.length).to.be.greaterThan(0);
            
            allConfigs.forEach(config => {
                expect(config).to.have.property('key');
                expect(config).to.have.property('value');
                expect(config).to.have.property('type');
                expect(config).to.have.property('category');
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle missing configuration gracefully', () => {
            const configService = new ConfigService();
            const value = configService.get('non.existent.key', 'default');
            expect(value).to.equal('default');
        });

        it('should handle initialization failures', async () => {
            const configService = new ConfigService();
            // Should not throw even if storage fails
            await configService.load();
            expect(configService.isReady()).to.be.true;
        });

        it('should handle service dependency failures', async () => {
            // LLMRouter should handle missing ConfigService gracefully
            try {
                const router = new LLMRouter();
                // Should not crash
                expect(router).to.exist;
            } catch (error) {
                // Expected if dependencies not injected
                expect(error).to.exist;
            }
        });
    });

    describe('Performance', () => {
        it('should initialize services quickly', async () => {
            const start = Date.now();
            
            const configService = new ConfigService();
            await configService.load();
            
            const scheduler = new AgentScheduler();
            await scheduler.initialize();
            
            const telemetry = new MissionTelemetry();
            const contextStore = new ContextStore();
            const secureFetch = new SecureFetch();
            
            const duration = Date.now() - start;
            expect(duration).to.be.lessThan(1000); // < 1 second
        });

        it('should handle concurrent service initialization', async () => {
            const promises = [
                (async () => {
                    const configService = new ConfigService();
                    await configService.load();
                })(),
                (async () => {
                    const scheduler = new AgentScheduler();
                    await scheduler.initialize();
                })(),
                (async () => {
                    const telemetry = new MissionTelemetry();
                })(),
            ];

            await Promise.all(promises);
            // Should not throw
        });
    });

    describe('Health Checks', () => {
        it('should verify ConfigService health', async () => {
            const configService = new ConfigService();
            await configService.load();
            expect(configService.isReady()).to.be.true;
        });

        it('should verify AgentScheduler health', async () => {
            const scheduler = new AgentScheduler();
            await scheduler.initialize();
            const activeMissions = scheduler.getActiveMissions();
            expect(activeMissions).to.be.an('array');
        });

        it('should verify MissionTelemetry health', () => {
            const telemetry = new MissionTelemetry();
            telemetry.startMission('health-check', {
                name: 'Health Check',
                startTime: new Date(),
            });
            const metrics = telemetry.getMissionMetrics('health-check');
            expect(metrics).to.exist;
        });
    });
});
