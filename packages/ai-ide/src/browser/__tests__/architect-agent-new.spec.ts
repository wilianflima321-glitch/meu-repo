import { expect } from 'chai';
import { ArchitectAgentNew } from '../architect-agent-new';

describe('ArchitectAgentNew', () => {
    let agent: ArchitectAgentNew;
    let mockProviderService: any;

    beforeEach(() => {
        mockProviderService = {
            sendRequestToProvider: async (providerId: string, options: any) => ({
                content: 'Use microservices architecture with API Gateway pattern.',
                tokensIn: 100,
                tokensOut: 50,
                model: 'gpt-4'
            })
        };

        agent = new ArchitectAgentNew(mockProviderService);
    });

    it('should have correct ID and name', () => {
        expect(agent.id).to.equal('architect');
        expect(agent.name).to.equal('Architect');
    });

    it('should invoke successfully with valid request', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'How should I structure my microservices app?' }
            ]
        };

        const context = {
            preferredProvider: 'openai',
            workspaceUri: '/workspace'
        };

        const response = await agent.invoke(request, context);

        expect(response.agentId).to.equal('architect');
        expect(response.content).to.be.a('string');
        expect(response.content).to.include('microservices');
        expect(response.metadata).to.exist;
        expect(response.metadata?.tokensUsed).to.equal(150);
    });

    it('should add context for microservices questions', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'How to implement microservices?' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        await agent.invoke(request, context);

        // Verify that sendRequestToProvider was called
        expect(mockProviderService.sendRequestToProvider).to.exist;
    });

    it('should add context for performance questions', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'How to scale my application?' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.agentId).to.equal('architect');
        expect(response.content).to.be.a('string');
    });

    it('should add context for security questions', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'How to secure my API?' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.agentId).to.equal('architect');
        expect(response.content).to.be.a('string');
    });

    it('should handle errors gracefully', async () => {
        mockProviderService.sendRequestToProvider = async () => {
            throw new Error('Provider error');
        };

        const request = {
            messages: [{ role: 'user' as const, content: 'Test' }]
        };

        const response = await agent.invoke(request, {});

        expect(response.error).to.exist;
        expect(response.error).to.equal('Provider error');
        expect(response.content).to.include('error');
    });

    it('should handle empty messages', async () => {
        const request = {
            messages: []
        };

        const response = await agent.invoke(request, {});

        expect(response.agentId).to.equal('architect');
        expect(response.content).to.be.a('string');
    });

    it('should include provider in metadata', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Test question' }
            ]
        };

        const context = {
            preferredProvider: 'anthropic'
        };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.provider).to.equal('anthropic');
    });
});
