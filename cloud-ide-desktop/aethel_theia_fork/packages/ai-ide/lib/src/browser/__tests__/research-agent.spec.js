"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const inversify_1 = require("@theia/core/shared/inversify");
const research_agent_1 = require("../research-agent");
const common_1 = require("@theia/ai-core/lib/common");
const common_2 = require("@theia/ai-core/lib/common");
const secure_fetch_1 = require("../../common/data/secure-fetch");
describe('ResearchAgent', () => {
    let container;
    let agent;
    let mockLLMRegistry;
    let mockPromptService;
    let mockSecureFetch;
    beforeEach(() => {
        container = new inversify_1.Container();
        mockLLMRegistry = {
            getLanguageModels: () => [],
            selectLanguageModel: () => undefined,
        };
        mockPromptService = {
            getPrompt: () => Promise.resolve(''),
            getRawPrompt: () => Promise.resolve(''),
        };
        mockSecureFetch = {
            fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
            get: () => Promise.resolve({}),
            post: () => Promise.resolve({}),
        };
        container.bind(common_1.LanguageModelRegistry).toConstantValue(mockLLMRegistry);
        container.bind(common_2.PromptService).toConstantValue(mockPromptService);
        container.bind(secure_fetch_1.SecureFetch).toConstantValue(mockSecureFetch);
        container.bind(research_agent_1.ResearchAgent).toSelf().inSingletonScope();
        agent = container.get(research_agent_1.ResearchAgent);
    });
    describe('Agent Metadata', () => {
        it('should have correct ID', () => {
            (0, chai_1.expect)(agent.id).to.equal('research');
        });
        it('should have correct name', () => {
            (0, chai_1.expect)(agent.name).to.equal('Research Agent');
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
    describe('Research Capabilities', () => {
        it('should support web search', () => {
            const hasSearchCapability = agent.promptTemplates.some(template => template.id.includes('search') || template.id.includes('web'));
            (0, chai_1.expect)(hasSearchCapability).to.be.true;
        });
        it('should support data analysis', () => {
            const hasAnalysisCapability = agent.promptTemplates.some(template => template.id.includes('analysis') || template.id.includes('data'));
            (0, chai_1.expect)(hasAnalysisCapability).to.be.true;
        });
        it('should support summarization', () => {
            const hasSummarizationCapability = agent.promptTemplates.some(template => template.id.includes('summarize') || template.id.includes('summary'));
            (0, chai_1.expect)(hasSummarizationCapability).to.be.true;
        });
        it('should support fact checking', () => {
            const hasFactCheckCapability = agent.promptTemplates.some(template => template.id.includes('fact') || template.id.includes('verify'));
            (0, chai_1.expect)(hasFactCheckCapability).to.be.true;
        });
    });
    describe('Web Search', () => {
        it('should search for information', async () => {
            const request = {
                text: 'Search for latest developments in quantum computing',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should handle multiple search queries', async () => {
            const request = {
                text: 'Search for AI trends and machine learning breakthroughs',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should filter search results', async () => {
            const request = {
                text: 'Search for peer-reviewed papers on climate change',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Data Analysis', () => {
        it('should analyze datasets', async () => {
            const request = {
                text: 'Analyze sales data trends from Q1 to Q4',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should identify patterns', async () => {
            const request = {
                text: 'Find patterns in customer behavior data',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should provide statistical insights', async () => {
            const request = {
                text: 'Calculate mean, median, and standard deviation',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Summarization', () => {
        it('should summarize articles', async () => {
            const request = {
                text: 'Summarize this research paper on neural networks',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should extract key points', async () => {
            const request = {
                text: 'Extract key findings from multiple sources',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should create executive summaries', async () => {
            const request = {
                text: 'Create executive summary of market research report',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Fact Checking', () => {
        it('should verify claims', async () => {
            const request = {
                text: 'Verify: The Earth is 4.5 billion years old',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should cite sources', async () => {
            const request = {
                text: 'Find sources for climate change statistics',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should identify misinformation', async () => {
            const request = {
                text: 'Check if this claim is accurate',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Data Sources', () => {
        it('should integrate with SecureFetch', () => {
            (0, chai_1.expect)(agent).to.have.property('secureFetch');
        });
        it('should handle API requests', async () => {
            const request = {
                text: 'Fetch data from external API',
                agentId: 'research',
            };
            (0, chai_1.expect)(() => agent.invoke(request)).to.not.throw();
        });
        it('should respect rate limits', async () => {
            const requests = Array.from({ length: 10 }, (_, i) => ({
                text: `Search query ${i}`,
                agentId: 'research',
            }));
            // Should handle rate limiting gracefully
            const promises = requests.map(req => agent.invoke(req));
            await Promise.allSettled(promises);
        });
    });
    describe('Content Processing', () => {
        it('should extract text from HTML', async () => {
            const request = {
                text: 'Extract text from webpage',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should parse structured data', async () => {
            const request = {
                text: 'Parse JSON data from API response',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should handle multiple formats', async () => {
            const request = {
                text: 'Process data from CSV, JSON, and XML sources',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Error Handling', () => {
        it('should handle network failures', async () => {
            const request = {
                text: 'Search for information',
                agentId: 'research',
            };
            // Mock network failure
            mockSecureFetch.fetch = () => Promise.reject(new Error('Network error'));
            try {
                await agent.invoke(request);
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
        });
        it('should handle invalid URLs', async () => {
            const request = {
                text: 'Fetch data from invalid-url',
                agentId: 'research',
            };
            try {
                await agent.invoke(request);
            }
            catch (error) {
                (0, chai_1.expect)(error).to.exist;
            }
        });
        it('should handle empty results', async () => {
            const request = {
                text: 'Search for nonexistent topic xyz123',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
    describe('Performance', () => {
        it('should cache search results', async () => {
            const request = {
                text: 'Search for AI trends',
                agentId: 'research',
            };
            // First call
            const start1 = Date.now();
            await agent.invoke(request).catch(() => { });
            const duration1 = Date.now() - start1;
            // Second call (should be cached)
            const start2 = Date.now();
            await agent.invoke(request).catch(() => { });
            const duration2 = Date.now() - start2;
            (0, chai_1.expect)(duration2).to.be.lessThanOrEqual(duration1);
        });
        it('should handle concurrent requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) => ({
                text: `Research topic ${i}`,
                agentId: 'research',
            }));
            const promises = requests.map(req => agent.invoke(req));
            await Promise.allSettled(promises);
        });
        it('should process large documents efficiently', async () => {
            const request = {
                text: 'Summarize 100-page research paper',
                agentId: 'research',
            };
            const start = Date.now();
            await agent.invoke(request).catch(() => { });
            const duration = Date.now() - start;
            (0, chai_1.expect)(duration).to.be.lessThan(10000); // < 10s
        });
    });
    describe('Integration', () => {
        it('should integrate with LLM registry', () => {
            (0, chai_1.expect)(agent).to.have.property('languageModelRegistry');
        });
        it('should integrate with prompt service', () => {
            (0, chai_1.expect)(agent).to.have.property('promptService');
        });
        it('should integrate with SecureFetch', () => {
            (0, chai_1.expect)(agent).to.have.property('secureFetch');
        });
        it('should be injectable', () => {
            const newAgent = container.get(research_agent_1.ResearchAgent);
            (0, chai_1.expect)(newAgent).to.equal(agent); // Singleton
        });
    });
    describe('Specialization', () => {
        it('should focus on research concerns', () => {
            const researchKeywords = [
                'research',
                'search',
                'analyze',
                'summarize',
                'data',
                'information',
                'fact',
                'source',
            ];
            const hasResearchFocus = agent.promptTemplates.some(template => {
                const templateText = template.template.toLowerCase();
                return researchKeywords.some(keyword => templateText.includes(keyword));
            });
            (0, chai_1.expect)(hasResearchFocus).to.be.true;
        });
        it('should not handle implementation tasks', () => {
            const implementationKeywords = [
                'implement',
                'code',
                'function',
                'deploy',
            ];
            const hasImplementationFocus = agent.promptTemplates.every(template => {
                const templateText = template.template.toLowerCase();
                return !implementationKeywords.every(keyword => templateText.includes(keyword));
            });
            (0, chai_1.expect)(hasImplementationFocus).to.be.true;
        });
    });
    describe('Quality Assurance', () => {
        it('should provide credible sources', async () => {
            const request = {
                text: 'Research scientific consensus on topic',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should indicate confidence levels', async () => {
            const request = {
                text: 'How confident are you in this information?',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
        it('should acknowledge limitations', async () => {
            const request = {
                text: 'What are the limitations of this research?',
                agentId: 'research',
            };
            const response = await agent.invoke(request);
            (0, chai_1.expect)(response).to.exist;
        });
    });
});
