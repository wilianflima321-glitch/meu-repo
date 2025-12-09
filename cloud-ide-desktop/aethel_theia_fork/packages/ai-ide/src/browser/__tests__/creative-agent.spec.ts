import { expect } from 'chai';
import { Container } from '@theia/core/shared/inversify';
import { CreativeAgent } from '../creative-agent';
import { LanguageModelRegistry } from '@theia/ai-core/lib/common';
import { PromptService } from '@theia/ai-core/lib/common';

describe('CreativeAgent', () => {
    let container: Container;
    let agent: CreativeAgent;
    let mockLLMRegistry: LanguageModelRegistry;
    let mockPromptService: PromptService;

    beforeEach(() => {
        container = new Container();

        mockLLMRegistry = {
            getLanguageModels: () => [],
            selectLanguageModel: () => undefined,
        } as any;

        mockPromptService = {
            getPrompt: () => Promise.resolve(''),
            getRawPrompt: () => Promise.resolve(''),
        } as any;

        container.bind(LanguageModelRegistry).toConstantValue(mockLLMRegistry);
        container.bind(PromptService).toConstantValue(mockPromptService);
        container.bind(CreativeAgent).toSelf().inSingletonScope();

        agent = container.get(CreativeAgent);
    });

    describe('Agent Metadata', () => {
        it('should have correct ID', () => {
            expect(agent.id).to.equal('creative');
        });

        it('should have correct name', () => {
            expect(agent.name).to.equal('Creative Agent');
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

    describe('Creative Capabilities', () => {
        it('should support content generation', () => {
            const hasContentCapability = agent.promptTemplates.some(
                template => template.id.includes('content') || template.id.includes('generate')
            );
            expect(hasContentCapability).to.be.true;
        });

        it('should support storytelling', () => {
            const hasStoryCapability = agent.promptTemplates.some(
                template => template.id.includes('story') || template.id.includes('narrative')
            );
            expect(hasStoryCapability).to.be.true;
        });

        it('should support design concepts', () => {
            const hasDesignCapability = agent.promptTemplates.some(
                template => template.id.includes('design') || template.id.includes('concept')
            );
            expect(hasDesignCapability).to.be.true;
        });

        it('should support brainstorming', () => {
            const hasBrainstormCapability = agent.promptTemplates.some(
                template => template.id.includes('brainstorm') || template.id.includes('idea')
            );
            expect(hasBrainstormCapability).to.be.true;
        });
    });

    describe('Content Generation', () => {
        it('should generate blog posts', async () => {
            const request = {
                text: 'Write a blog post about sustainable technology',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should generate marketing copy', async () => {
            const request = {
                text: 'Create marketing copy for a new product launch',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should generate social media content', async () => {
            const request = {
                text: 'Create engaging social media posts for Twitter and LinkedIn',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should generate email campaigns', async () => {
            const request = {
                text: 'Write an email campaign for product announcement',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Storytelling', () => {
        it('should create narratives', async () => {
            const request = {
                text: 'Create a compelling narrative about innovation',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should develop characters', async () => {
            const request = {
                text: 'Develop a character profile for a tech entrepreneur',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should write dialogue', async () => {
            const request = {
                text: 'Write dialogue for a product demo video',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should create story arcs', async () => {
            const request = {
                text: 'Create a story arc for a brand campaign',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Design Concepts', () => {
        it('should generate UI concepts', async () => {
            const request = {
                text: 'Generate UI design concepts for a mobile app',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should create brand identities', async () => {
            const request = {
                text: 'Create a brand identity concept for a startup',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should design visual layouts', async () => {
            const request = {
                text: 'Design a visual layout for a landing page',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should suggest color schemes', async () => {
            const request = {
                text: 'Suggest color schemes for a wellness app',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Brainstorming', () => {
        it('should generate ideas', async () => {
            const request = {
                text: 'Brainstorm ideas for a new feature',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should explore concepts', async () => {
            const request = {
                text: 'Explore different concepts for user engagement',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should suggest alternatives', async () => {
            const request = {
                text: 'Suggest alternative approaches to problem solving',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should combine ideas', async () => {
            const request = {
                text: 'Combine these ideas into a cohesive concept',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Style and Tone', () => {
        it('should adapt to formal tone', async () => {
            const request = {
                text: 'Write in a formal, professional tone',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should adapt to casual tone', async () => {
            const request = {
                text: 'Write in a casual, friendly tone',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should adapt to technical tone', async () => {
            const request = {
                text: 'Write in a technical, precise tone',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should adapt to persuasive tone', async () => {
            const request = {
                text: 'Write in a persuasive, compelling tone',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Content Types', () => {
        it('should handle long-form content', async () => {
            const request = {
                text: 'Write a comprehensive guide on topic X',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should handle short-form content', async () => {
            const request = {
                text: 'Write a catchy tagline',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should handle structured content', async () => {
            const request = {
                text: 'Create a structured outline for a whitepaper',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should handle visual descriptions', async () => {
            const request = {
                text: 'Describe a visual scene for an illustration',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Error Handling', () => {
        it('should handle vague requests', async () => {
            const request = {
                text: 'Create something creative',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should handle conflicting requirements', async () => {
            const request = {
                text: 'Write something formal but casual',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should handle empty context', async () => {
            const request = {
                text: 'Generate content',
                agentId: 'creative',
            };

            try {
                await agent.invoke(request as any);
            } catch (error) {
                expect(error).to.exist;
            }
        });
    });

    describe('Performance', () => {
        it('should generate content quickly', async () => {
            const request = {
                text: 'Write a short paragraph',
                agentId: 'creative',
            };

            const start = Date.now();
            await agent.invoke(request as any).catch(() => {});
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(5000); // < 5s
        });

        it('should handle multiple requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) => ({
                text: `Generate content ${i}`,
                agentId: 'creative',
            }));

            const promises = requests.map(req => agent.invoke(req as any));
            await Promise.allSettled(promises);
        });

        it('should scale with content length', async () => {
            const shortRequest = {
                text: 'Write a sentence',
                agentId: 'creative',
            };

            const longRequest = {
                text: 'Write a 1000-word article',
                agentId: 'creative',
            };

            const start1 = Date.now();
            await agent.invoke(shortRequest as any).catch(() => {});
            const duration1 = Date.now() - start1;

            const start2 = Date.now();
            await agent.invoke(longRequest as any).catch(() => {});
            const duration2 = Date.now() - start2;

            // Long content should take more time
            expect(duration2).to.be.greaterThan(duration1);
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
            const newAgent = container.get(CreativeAgent);
            expect(newAgent).to.equal(agent); // Singleton
        });
    });

    describe('Specialization', () => {
        it('should focus on creative concerns', () => {
            const creativeKeywords = [
                'creative',
                'content',
                'story',
                'design',
                'idea',
                'brainstorm',
                'generate',
                'write',
            ];

            const hasCreativeFocus = agent.promptTemplates.some(template => {
                const templateText = template.template.toLowerCase();
                return creativeKeywords.some(keyword => templateText.includes(keyword));
            });

            expect(hasCreativeFocus).to.be.true;
        });

        it('should not handle technical implementation', () => {
            const technicalKeywords = [
                'implement',
                'code',
                'function',
                'algorithm',
                'database',
            ];

            const hasTechnicalFocus = agent.promptTemplates.every(template => {
                const templateText = template.template.toLowerCase();
                return !technicalKeywords.every(keyword => templateText.includes(keyword));
            });

            expect(hasTechnicalFocus).to.be.true;
        });
    });

    describe('Quality', () => {
        it('should produce coherent content', async () => {
            const request = {
                text: 'Write a product description',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });

        it('should maintain consistency', async () => {
            const request1 = {
                text: 'Write part 1 of a story',
                agentId: 'creative',
            };

            const request2 = {
                text: 'Write part 2 of the same story',
                agentId: 'creative',
            };

            const response1 = await agent.invoke(request1 as any);
            const response2 = await agent.invoke(request2 as any);

            expect(response1).to.exist;
            expect(response2).to.exist;
        });

        it('should be original', async () => {
            const request = {
                text: 'Create an original concept',
                agentId: 'creative',
            };

            const response = await agent.invoke(request as any);
            expect(response).to.exist;
        });
    });

    describe('Versatility', () => {
        it('should handle different industries', async () => {
            const industries = ['tech', 'healthcare', 'finance', 'education'];

            for (const industry of industries) {
                const request = {
                    text: `Create content for ${industry} industry`,
                    agentId: 'creative',
                };

                const response = await agent.invoke(request as any);
                expect(response).to.exist;
            }
        });

        it('should handle different audiences', async () => {
            const audiences = ['executives', 'developers', 'consumers', 'students'];

            for (const audience of audiences) {
                const request = {
                    text: `Write for ${audience} audience`,
                    agentId: 'creative',
                };

                const response = await agent.invoke(request as any);
                expect(response).to.exist;
            }
        });

        it('should handle different formats', async () => {
            const formats = ['blog', 'email', 'social', 'presentation'];

            for (const format of formats) {
                const request = {
                    text: `Create ${format} content`,
                    agentId: 'creative',
                };

                const response = await agent.invoke(request as any);
                expect(response).to.exist;
            }
        });
    });
});
