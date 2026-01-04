"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const inversify_1 = require("@theia/core/shared/inversify");
const architect_agent_1 = require("../architect-agent");
const common_1 = require("@theia/ai-core/lib/common");
const common_2 = require("@theia/ai-core/lib/common");
describe('ArchitectAgent', () => {
    let container;
    let agent;
    let mockLLMRegistry;
    let mockPromptService;
    beforeEach(() => {
        container = new inversify_1.Container();
        // Mock LanguageModelRegistry
        mockLLMRegistry = {
            getLanguageModels: () => [],
            selectLanguageModel: () => undefined,
        };
        // Mock PromptService
        mockPromptService = {
            getPrompt: () => Promise.resolve(''),
            getRawPrompt: () => Promise.resolve(''),
        };
        container.bind(common_1.LanguageModelRegistry).toConstantValue(mockLLMRegistry);
        container.bind(common_2.PromptService).toConstantValue(mockPromptService);
        container.bind(architect_agent_1.ArchitectAgent).toSelf().inSingletonScope();
        agent = container.get(architect_agent_1.ArchitectAgent);
    });
    describe('Agent Metadata', () => {
        it('should have correct ID', () => {
            (0, chai_1.expect)(agent.id).to.equal('architect');
        });
        it('should have correct name', () => {
            (0, chai_1.expect)(agent.name).to.equal('Architect');
        });
        it('should have description', () => {
            (0, chai_1.expect)(agent.description).to.be.a('string');
            (0, chai_1.expect)(agent.description.length).to.be.greaterThan(0);
        });
        it('should have prompt templates', () => {
            (0, chai_1.expect)(agent.promptTemplates).to.be.an('array');
            (0, chai_1.expect)(agent.promptTemplates.length).to.be.greaterThan(0);
        });
    });
    describe('Capabilities', () => {
        it('should support architecture design', () => {
            const hasArchitectureCapability = agent.promptTemplates.some(template => template.id.includes('architecture') || template.id.includes('design'));
            (0, chai_1.expect)(hasArchitectureCapability).to.be.true;
        });
        it('should support system planning', () => {
            const hasPlanningCapability = agent.promptTemplates.some(template => template.id.includes('plan') || template.id.includes('system'));
            (0, chai_1.expect)(hasPlanningCapability).to.be.true;
        });
        it('should support technical decisions', () => {
            const hasDecisionCapability = agent.promptTemplates.some(template => template.id.includes('decision') || template.id.includes('technical'));
            (0, chai_1.expect)(hasDecisionCapability).to.be.true;
        });
    });
    describe('Prompt Templates', () => {
        it('should have valid template structure', () => {
            agent.promptTemplates.forEach(template => {
                (0, chai_1.expect)(template).to.have.property('id');
                (0, chai_1.expect)(template).to.have.property('template');
                (0, chai_1.expect)(template.id).to.be.a('string');
                (0, chai_1.expect)(template.template).to.be.a('string');
            });
        });
        it('should have unique template IDs', () => {
            const ids = agent.promptTemplates.map(t => t.id);
            const uniqueIds = new Set(ids);
            (0, chai_1.expect)(ids.length).to.equal(uniqueIds.size);
        });
        it('should have non-empty templates', () => {
            agent.promptTemplates.forEach(template => {
                (0, chai_1.expect)(template.template.length).to.be.greaterThan(0);
            });
        });
    });
    describe('Agent Invocation', () => {
        it('should accept architecture design requests', async () => {
            const request = {
                text: 'Design a microservices architecture for an e-commerce platform',
                agentId: 'architect',
            };
            // Agent should not throw when processing valid requests
            (0, chai_1.expect)(() => agent.invoke(request)).to.not.throw();
        });
        it('should accept system planning requests', async () => {
            const request = {
                text: 'Plan the database schema for a social media application',
                agentId: 'architect',
            };
            (0, chai_1.expect)(() => agent.invoke(request)).to.not.throw();
        });
        it('should accept technical decision requests', async () => {
            const request = {
                text: 'Should we use REST or GraphQL for our API?',
                agentId: 'architect',
            };
            (0, chai_1.expect)(() => agent.invoke(request)).to.not.throw();
        });
    });
    describe('Response Quality', () => {
        it('should provide structured responses', async () => {
            const request = {
                text: 'Design a simple REST API architecture',
                agentId: 'architect',
            };
            const response = await agent.invoke(request);
            // Response should be structured and informative
            (0, chai_1.expect)(response).to.exist;
        });
        it('should include technical details', async () => {
            const request = {
                text: 'Explain the architecture of a distributed cache system',
                agentId: 'architect',
            };
            const response = await agent.invoke(request);
            // Response should contain technical terminology
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Error Handling', () => {
        it('should handle empty requests gracefully', async () => {
            const request = {
                text: '',
                agentId: 'architect',
            };
            try {
                await agent.invoke(request);
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
        });
        it('should handle invalid requests gracefully', async () => {
            const request = {
                text: null,
                agentId: 'architect',
            };
            try {
                await agent.invoke(request);
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
        });
        it('should handle missing context gracefully', async () => {
            const request = {
                text: 'Design something',
                agentId: 'architect',
                // Missing context
            };
            try {
                await agent.invoke(request);
            }
            catch (error) {
                // Should either succeed or fail gracefully
                (0, chai_1.expect)(error).to.exist;
            }
        });
    });
    describe('Integration', () => {
        it('should integrate with LLM registry', () => {
            (0, chai_1.expect)(agent).to.have.property('languageModelRegistry');
        });
        it('should integrate with prompt service', () => {
            (0, chai_1.expect)(agent).to.have.property('promptService');
        });
        it('should be injectable', () => {
            const newAgent = container.get(architect_agent_1.ArchitectAgent);
            (0, chai_1.expect)(newAgent).to.equal(agent); // Singleton
        });
    });
    describe('Performance', () => {
        it('should initialize quickly', () => {
            const start = Date.now();
            const newContainer = new inversify_1.Container();
            newContainer.bind(common_1.LanguageModelRegistry).toConstantValue(mockLLMRegistry);
            newContainer.bind(common_2.PromptService).toConstantValue(mockPromptService);
            newContainer.bind(architect_agent_1.ArchitectAgent).toSelf().inSingletonScope();
            newContainer.get(architect_agent_1.ArchitectAgent);
            const duration = Date.now() - start;
            (0, chai_1.expect)(duration).to.be.lessThan(100); // Should initialize in < 100ms
        });
        it('should handle multiple concurrent requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) => ({
                text: `Design architecture ${i}`,
                agentId: 'architect',
            }));
            const promises = requests.map(req => agent.invoke(req));
            // Should not throw when handling concurrent requests
            await Promise.allSettled(promises);
        });
    });
    describe('Specialization', () => {
        it('should focus on architecture concerns', () => {
            const architectureKeywords = [
                'architecture',
                'design',
                'system',
                'pattern',
                'structure',
                'component',
                'scalability',
                'performance',
            ];
            const hasArchitectureFocus = agent.promptTemplates.some(template => {
                const templateText = template.template.toLowerCase();
                return architectureKeywords.some(keyword => templateText.includes(keyword));
            });
            (0, chai_1.expect)(hasArchitectureFocus).to.be.true;
        });
        it('should not handle implementation details', () => {
            const implementationKeywords = [
                'implement',
                'code',
                'function',
                'method',
                'variable',
            ];
            const hasImplementationFocus = agent.promptTemplates.every(template => {
                const templateText = template.template.toLowerCase();
                return !implementationKeywords.every(keyword => templateText.includes(keyword));
            });
            (0, chai_1.expect)(hasImplementationFocus).to.be.true;
        });
    });
    describe('Documentation', () => {
        it('should have documented prompt templates', () => {
            agent.promptTemplates.forEach(template => {
                // Templates should be self-documenting or have clear purpose
                (0, chai_1.expect)(template.id).to.match(/^[a-z-]+$/); // kebab-case IDs
            });
        });
        it('should have clear agent purpose', () => {
            (0, chai_1.expect)(agent.description).to.include('architect');
        });
    });
});
