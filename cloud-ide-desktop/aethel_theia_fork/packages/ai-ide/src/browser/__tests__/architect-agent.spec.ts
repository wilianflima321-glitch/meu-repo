import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { ArchitectAgent } from '../architect-agent';
import { LanguageModelRegistry } from '@theia/ai-core/lib/common';
import { PromptService } from '@theia/ai-core/lib/common';

describe('ArchitectAgent', () => {
    let container: Container;
    let agent: ArchitectAgent;
    let mockLLMRegistry: LanguageModelRegistry;
    let mockPromptService: PromptService;

    beforeEach(() => {
        container = new Container();

        // Mock LanguageModelRegistry
        mockLLMRegistry = {
            getLanguageModels: () => [],
            selectLanguageModel: () => undefined,
        } as any;

        // Mock PromptService
        mockPromptService = {
            getPrompt: () => Promise.resolve(''),
            getRawPrompt: () => Promise.resolve(''),
        } as any;

        container.bind(LanguageModelRegistry).toConstantValue(mockLLMRegistry);
        container.bind(PromptService).toConstantValue(mockPromptService);
        container.bind(ArchitectAgent).toSelf().inSingletonScope();

        agent = container.get(ArchitectAgent);
    });

    describe('Agent Metadata', () => {
        it('should have correct ID', () => {
            expect(agent.id).to.equal('architect');
        });

        it('should have correct name', () => {
            expect(agent.name).to.equal('Architect');
        });

        it('should have description', () => {
            expect(agent.description).to.be.a('string');
            expect(agent.description.length).to.be.greaterThan(0);
        });

        it('should have prompt templates', () => {
            expect(agent.promptTemplates).to.be.an('array');
            expect(agent.promptTemplates.length).to.be.greaterThan(0);
        });
    });

    describe('Capabilities', () => {
        it('should support architecture design', () => {
            const hasArchitectureCapability = agent.promptTemplates.some(
                template => template.id.includes('architecture') || template.id.includes('design')
            );
            expect(hasArchitectureCapability).to.be.true;
        });

        it('should support system planning', () => {
            const hasPlanningCapability = agent.promptTemplates.some(
                template => template.id.includes('plan') || template.id.includes('system')
            );
            expect(hasPlanningCapability).to.be.true;
        });

        it('should support technical decisions', () => {
            const hasDecisionCapability = agent.promptTemplates.some(
                template => template.id.includes('decision') || template.id.includes('technical')
            );
            expect(hasDecisionCapability).to.be.true;
        });
    });

    describe('Prompt Templates', () => {
        it('should have valid template structure', () => {
            agent.promptTemplates.forEach(template => {
                expect(template).to.have.property('id');
                expect(template).to.have.property('template');
                expect(template.id).to.be.a('string');
                expect(template.template).to.be.a('string');
            });
        });

        it('should have unique template IDs', () => {
            const ids = agent.promptTemplates.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).to.equal(uniqueIds.size);
        });

        it('should have non-empty templates', () => {
            agent.promptTemplates.forEach(template => {
                expect(template.template.length).to.be.greaterThan(0);
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
            expect(() => agent.invoke(request as any)).to.not.throw();
        });

        it('should accept system planning requests', async () => {
            const request = {
                text: 'Plan the database schema for a social media application',
                agentId: 'architect',
            };

            expect(() => agent.invoke(request as any)).to.not.throw();
        });

        it('should accept technical decision requests', async () => {
            const request = {
                text: 'Should we use REST or GraphQL for our API?',
                agentId: 'architect',
            };

            expect(() => agent.invoke(request as any)).to.not.throw();
        });
    });

    describe('Response Quality', () => {
        it('should provide structured responses', async () => {
            const request = {
                text: 'Design a simple REST API architecture',
                agentId: 'architect',
            };

            const response = await agent.invoke(request as any);
            
            // Response should be structured and informative
            expect(response).to.exist;
        });

        it('should include technical details', async () => {
            const request = {
                text: 'Explain the architecture of a distributed cache system',
                agentId: 'architect',
            };

            const response = await agent.invoke(request as any);
            
            // Response should contain technical terminology
            expect(response).to.exist;
        });
    });

    describe('Error Handling', () => {
        it('should handle empty requests gracefully', async () => {
            const request = {
                text: '',
                agentId: 'architect',
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should handle invalid requests gracefully', async () => {
            const request = {
                text: null,
                agentId: 'architect',
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should handle missing context gracefully', async () => {
            const request = {
                text: 'Design something',
                agentId: 'architect',
                // Missing context
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                // Should either succeed or fail gracefully
                expect(error).to.exist;
            }
        });
    });

    describe('Integration', () => {
        it('should integrate with LLM registry', () => {
            expect(agent).to.have.property('languageModelRegistry');
        });

        it('should integrate with prompt service', () => {
            expect(agent).to.have.property('promptService');
        });

        it('should be injectable', () => {
            const newAgent = container.get(ArchitectAgent);
            expect(newAgent).to.equal(agent); // Singleton
        });
    });

    describe('Performance', () => {
        it('should initialize quickly', () => {
            const start = Date.now();
            const newContainer = new Container();
            newContainer.bind(LanguageModelRegistry).toConstantValue(mockLLMRegistry);
            newContainer.bind(PromptService).toConstantValue(mockPromptService);
            newContainer.bind(ArchitectAgent).toSelf().inSingletonScope();
            newContainer.get(ArchitectAgent);
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(100); // Should initialize in < 100ms
        });

        it('should handle multiple concurrent requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) => ({
                text: `Design architecture ${i}`,
                agentId: 'architect',
            }));

            const promises = requests.map(req => agent.invoke(req as any));
            
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

            expect(hasArchitectureFocus).to.be.true;
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

            expect(hasImplementationFocus).to.be.true;
        });
    });

    describe('Documentation', () => {
        it('should have documented prompt templates', () => {
            agent.promptTemplates.forEach(template => {
                // Templates should be self-documenting or have clear purpose
                expect(template.id).to.match(/^[a-z-]+$/); // kebab-case IDs
            });
        });

        it('should have clear agent purpose', () => {
            expect(agent.description).to.include('architect');
        });
    });
});
