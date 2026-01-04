"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = __importStar(require("sinon"));
/**
 * Orchestrator Delegation Tests
 * Tests agent selection and delegation with mocked LLM responses
 */
describe('Orchestrator Agent Delegation', () => {
    let mockLLM;
    let mockAgentService;
    let mockAgents;
    beforeEach(() => {
        // Mock LLM that returns agent selection
        mockLLM = sinon.stub();
        // Mock agents
        mockAgents = new Map();
        const createMockAgent = (id) => ({
            id,
            invoke: sinon.stub().resolves({ response: `${id} response` }),
            name: id
        });
        mockAgents.set('Coder', createMockAgent('Coder'));
        mockAgents.set('Architect', createMockAgent('Architect'));
        mockAgents.set('Universal', createMockAgent('Universal'));
        mockAgents.set('Command', createMockAgent('Command'));
        mockAgents.set('AppTester', createMockAgent('AppTester'));
        // Mock agent service
        mockAgentService = {
            getAgent: (id) => mockAgents.get(id),
            getAllAgents: () => Array.from(mockAgents.values())
        };
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('Agent Selection', () => {
        it('should delegate code writing to Coder agent', async () => {
            mockLLM.resolves({
                agent: 'Coder',
                reason: 'code writing task'
            });
            const request = {
                inputText: 'Write a function to sort an array',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgent(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Coder');
            (0, chai_1.expect)(mockLLM.calledOnce).to.be.true;
        });
        it('should delegate architecture questions to Architect agent', async () => {
            mockLLM.resolves({
                agent: 'Architect',
                reason: 'project structure analysis'
            });
            const request = {
                inputText: 'How is this project organized?',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgent(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Architect');
        });
        it('should delegate test execution to AppTester agent', async () => {
            mockLLM.resolves({
                agent: 'AppTester',
                reason: 'test execution'
            });
            const request = {
                inputText: 'Run the unit tests',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgent(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('AppTester');
        });
        it('should delegate IDE commands to Command agent', async () => {
            mockLLM.resolves({
                agent: 'Command',
                reason: 'IDE command'
            });
            const request = {
                inputText: 'Open the settings file',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgent(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Command');
        });
        it('should delegate general questions to Universal agent', async () => {
            mockLLM.resolves({
                agent: 'Universal',
                reason: 'general programming concept'
            });
            const request = {
                inputText: 'What is dependency injection?',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgent(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Universal');
        });
    });
    describe('Delegation Execution', () => {
        it('should invoke selected agent with request', async () => {
            mockLLM.resolves({
                agent: 'Coder',
                reason: 'code task'
            });
            const request = {
                inputText: 'Write a hello world function',
                session: { settings: {} }
            };
            const result = await delegateToAgent(mockLLM, mockAgentService, request);
            const coderAgent = mockAgents.get('Coder');
            (0, chai_1.expect)(coderAgent.invoke.calledOnce).to.be.true;
            (0, chai_1.expect)(coderAgent.invoke.firstCall.args[0]).to.deep.include(request);
            (0, chai_1.expect)(result.response).to.equal('Coder response');
        });
        it('should pass through request context to delegated agent', async () => {
            mockLLM.resolves({
                agent: 'Architect',
                reason: 'architecture'
            });
            const request = {
                inputText: 'Analyze project structure',
                session: {
                    settings: { temperature: 0.7 },
                    context: { workspace: '/path/to/workspace' }
                }
            };
            await delegateToAgent(mockLLM, mockAgentService, request);
            const architectAgent = mockAgents.get('Architect');
            const invokeArgs = architectAgent.invoke.firstCall.args[0];
            (0, chai_1.expect)(invokeArgs.session.settings.temperature).to.equal(0.7);
            (0, chai_1.expect)(invokeArgs.session.context.workspace).to.equal('/path/to/workspace');
        });
    });
    describe('Fallback Behavior', () => {
        it('should fallback to Universal agent when LLM fails', async () => {
            mockLLM.rejects(new Error('LLM unavailable'));
            const request = {
                inputText: 'Some question',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgentWithFallback(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Universal');
        });
        it('should fallback to Universal when selected agent does not exist', async () => {
            mockLLM.resolves({
                agent: 'NonExistentAgent',
                reason: 'unknown'
            });
            const request = {
                inputText: 'Some question',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgentWithFallback(mockLLM, mockAgentService, request);
            (0, chai_1.expect)(selectedAgent).to.equal('Universal');
        });
        it('should fallback to Coder for code-related keywords when LLM fails', async () => {
            mockLLM.rejects(new Error('LLM unavailable'));
            const request = {
                inputText: 'Write a function to parse JSON',
                session: { settings: {} }
            };
            const selectedAgent = await selectAgentWithFallback(mockLLM, mockAgentService, request);
            // Should detect "write" and "function" keywords
            (0, chai_1.expect)(selectedAgent).to.equal('Coder');
        });
    });
    describe('Response Parsing', () => {
        it('should parse JSON response from LLM', async () => {
            mockLLM.resolves('{"agent": "Coder", "reason": "code task"}');
            const parsed = await parseAgentSelection(mockLLM, {});
            (0, chai_1.expect)(parsed.agent).to.equal('Coder');
            (0, chai_1.expect)(parsed.reason).to.equal('code task');
        });
        it('should handle plain text agent name', async () => {
            mockLLM.resolves('Coder');
            const parsed = await parseAgentSelection(mockLLM, {});
            (0, chai_1.expect)(parsed.agent).to.equal('Coder');
        });
        it('should extract agent from markdown code block', async () => {
            mockLLM.resolves('```json\n{"agent": "Architect"}\n```');
            const parsed = await parseAgentSelection(mockLLM, {});
            (0, chai_1.expect)(parsed.agent).to.equal('Architect');
        });
    });
});
// Helper functions simulating orchestrator logic
async function selectAgent(llm, agentService, request) {
    const response = await llm(request);
    return response.agent;
}
async function delegateToAgent(llm, agentService, request) {
    const selection = await llm(request);
    const agent = agentService.getAgent(selection.agent);
    return await agent.invoke(request);
}
async function selectAgentWithFallback(llm, agentService, request) {
    try {
        const response = await llm(request);
        const agent = agentService.getAgent(response.agent);
        if (agent) {
            return response.agent;
        }
    }
    catch (error) {
        // LLM failed, use keyword-based fallback
        const text = request.inputText.toLowerCase();
        if (text.includes('write') || text.includes('function') || text.includes('code')) {
            return 'Coder';
        }
    }
    return 'Universal';
}
async function parseAgentSelection(llm, request) {
    let response = await llm(request);
    if (typeof response === 'string') {
        // Try to extract JSON from markdown code block
        const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            response = jsonMatch[1];
        }
        // Try to parse as JSON
        try {
            return JSON.parse(response);
        }
        catch {
            // Plain text agent name
            return { agent: response.trim() };
        }
    }
    return response;
}
