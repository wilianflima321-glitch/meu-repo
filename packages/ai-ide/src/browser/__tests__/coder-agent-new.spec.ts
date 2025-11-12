import { expect } from 'chai';
import { CoderAgentNew } from '../coder-agent-new';

describe('CoderAgentNew', () => {
    let agent: CoderAgentNew;
    let mockProviderService: any;

    beforeEach(() => {
        mockProviderService = {
            sendRequestToProvider: async (providerId: string, options: any) => ({
                content: 'function add(a: number, b: number): number { return a + b; }',
                tokensIn: 50,
                tokensOut: 30,
                model: 'gpt-4'
            })
        };

        agent = new CoderAgentNew(mockProviderService);
    });

    it('should have correct ID and name', () => {
        expect(agent.id).to.equal('coder');
        expect(agent.name).to.equal('Coder');
    });

    it('should invoke successfully with valid request', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Write a TypeScript function to add two numbers' }
            ]
        };

        const context = {
            preferredProvider: 'openai'
        };

        const response = await agent.invoke(request, context);

        expect(response.agentId).to.equal('coder');
        expect(response.content).to.be.a('string');
        expect(response.content).to.include('function');
        expect(response.metadata).to.exist;
        expect(response.metadata?.tokensUsed).to.equal(80);
    });

    it('should detect TypeScript language', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Write a TypeScript class' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.language).to.equal('typescript');
    });

    it('should detect Python language', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Write a Python function' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.language).to.equal('python');
    });

    it('should detect refactor task', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Refactor this code to be more readable' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.taskType).to.equal('refactor');
    });

    it('should detect bug fix task', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Fix the bug in this function' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.taskType).to.equal('fix');
    });

    it('should detect test task', async () => {
        const request = {
            messages: [
                { role: 'user' as const, content: 'Write tests for this function' }
            ]
        };

        const context = { preferredProvider: 'openai' };

        const response = await agent.invoke(request, context);

        expect(response.metadata?.taskType).to.equal('test');
    });

    it('should use lower temperature for code generation', async () => {
        let capturedOptions: any;
        mockProviderService.sendRequestToProvider = async (providerId: string, options: any) => {
            capturedOptions = options;
            return {
                content: 'code',
                tokensIn: 10,
                tokensOut: 10,
                model: 'gpt-4'
            };
        };

        const request = {
            messages: [
                { role: 'user' as const, content: 'Write code' }
            ]
        };

        await agent.invoke(request, { preferredProvider: 'openai' });

        expect(capturedOptions.temperature).to.equal(0.3);
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

    it('should handle multiple languages', async () => {
        const languages = ['java', 'go', 'rust', 'javascript'];

        for (const lang of languages) {
            const request = {
                messages: [
                    { role: 'user' as const, content: `Write a ${lang} function` }
                ]
            };

            const response = await agent.invoke(request, { preferredProvider: 'openai' });

            expect(response.metadata?.language).to.equal(lang);
        }
    });
});
