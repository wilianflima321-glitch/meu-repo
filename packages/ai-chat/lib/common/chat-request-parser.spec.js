"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chat_agent_service_1 = require("./chat-agent-service");
const chat_request_parser_1 = require("./chat-request-parser");
const chat_agents_1 = require("./chat-agents");
const chai_1 = require("chai");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const parsed_chat_request_1 = require("./parsed-chat-request");
describe('ChatRequestParserImpl', () => {
    const chatAgentService = sinon.createStubInstance(chat_agent_service_1.ChatAgentServiceImpl);
    const variableService = sinon.createStubInstance(ai_core_1.DefaultAIVariableService);
    const toolInvocationRegistry = sinon.createStubInstance(ai_core_1.ToolInvocationRegistryImpl);
    const logger = sinon.createStubInstance(core_1.Logger);
    const parser = new chat_request_parser_1.ChatRequestParserImpl(chatAgentService, variableService, toolInvocationRegistry, logger);
    beforeEach(() => {
        // Reset our stubs before each test
        sinon.reset();
    });
    it('parses simple text', async () => {
        const req = {
            text: 'What is the best pizza topping?'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result.parts).to.deep.contain({
            text: 'What is the best pizza topping?',
            range: { start: 0, endExclusive: 31 }
        });
    });
    it('parses text with variable name', async () => {
        const req = {
            text: 'What is the #best pizza topping?'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result).to.deep.contain({
            parts: [{
                    text: 'What is the ',
                    range: { start: 0, endExclusive: 12 }
                }, {
                    variableName: 'best',
                    variableArg: undefined,
                    range: { start: 12, endExclusive: 17 }
                }, {
                    text: ' pizza topping?',
                    range: { start: 17, endExclusive: 32 }
                }]
        });
    });
    it('parses text with variable name with argument', async () => {
        const req = {
            text: 'What is the #best:by-poll pizza topping?'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result).to.deep.contain({
            parts: [{
                    text: 'What is the ',
                    range: { start: 0, endExclusive: 12 }
                }, {
                    variableName: 'best',
                    variableArg: 'by-poll',
                    range: { start: 12, endExclusive: 25 }
                }, {
                    text: ' pizza topping?',
                    range: { start: 25, endExclusive: 40 }
                }]
        });
    });
    it('parses text with variable name with numeric argument', async () => {
        const req = {
            text: '#size-class:2'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result.parts[0]).to.contain({
            variableName: 'size-class',
            variableArg: '2'
        });
    });
    it('parses text with variable name with POSIX path argument', async () => {
        const req = {
            text: '#file:/path/to/file.ext'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result.parts[0]).to.contain({
            variableName: 'file',
            variableArg: '/path/to/file.ext'
        });
    });
    it('parses text with variable name with Win32 path argument', async () => {
        const req = {
            text: '#file:c:\\path\\to\\file.ext'
        };
        const context = { variables: [] };
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        (0, chai_1.expect)(result.parts[0]).to.contain({
            variableName: 'file',
            variableArg: 'c:\\path\\to\\file.ext'
        });
    });
    it('resolves variable and extracts tool functions from resolved variable', async () => {
        // Set up two test tool requests that will be referenced in the variable content
        const testTool1 = {
            id: 'testTool1',
            name: 'Test Tool 1',
            handler: async () => undefined,
            parameters: {
                type: 'object',
                properties: {}
            },
        };
        const testTool2 = {
            id: 'testTool2',
            name: 'Test Tool 2',
            handler: async () => undefined,
            parameters: {
                type: 'object',
                properties: {}
            },
        };
        // Configure the tool registry to return our test tools
        toolInvocationRegistry.getFunction.withArgs(testTool1.id).returns(testTool1);
        toolInvocationRegistry.getFunction.withArgs(testTool2.id).returns(testTool2);
        // Set up the test variable to include in the request
        const testVariable = {
            id: 'testVariable',
            name: 'testVariable',
            description: 'A test variable',
        };
        // Configure the variable service to return our test variable
        // One tool reference uses chat format and one uses prompt format because the parser needs to handle both.
        variableService.getVariable.withArgs(testVariable.name).returns(testVariable);
        variableService.resolveVariable.withArgs({ variable: testVariable.name, arg: 'myarg' }, sinon.match.any).resolves({
            variable: testVariable,
            arg: 'myarg',
            value: 'This is a test with ~testTool1 and **~{testTool2}** and more text.',
        });
        // Create a request with the test variable
        const req = {
            text: 'Test with #testVariable:myarg'
        };
        const context = { variables: [] };
        // Parse the request
        const result = await parser.parseChatRequest(req, chat_agents_1.ChatAgentLocation.Panel, context);
        // Verify the variable part contains the correct properties
        (0, chai_1.expect)(result.parts.length).to.equal(2);
        (0, chai_1.expect)(result.parts[0] instanceof parsed_chat_request_1.ParsedChatRequestTextPart).to.be.true;
        (0, chai_1.expect)(result.parts[1] instanceof parsed_chat_request_1.ParsedChatRequestVariablePart).to.be.true;
        const variablePart = result.parts[1];
        (0, chai_1.expect)(variablePart).to.have.property('resolution');
        (0, chai_1.expect)(variablePart.resolution).to.deep.equal({
            variable: testVariable,
            arg: 'myarg',
            value: 'This is a test with ~testTool1 and **~{testTool2}** and more text.',
        });
        // Verify both tool functions were extracted from the variable content
        (0, chai_1.expect)(result.toolRequests.size).to.equal(2);
        (0, chai_1.expect)(result.toolRequests.has(testTool1.id)).to.be.true;
        (0, chai_1.expect)(result.toolRequests.has(testTool2.id)).to.be.true;
        // Verify the result contains the tool requests returned by the registry
        (0, chai_1.expect)(result.toolRequests.get(testTool1.id)).to.deep.equal(testTool1);
        (0, chai_1.expect)(result.toolRequests.get(testTool2.id)).to.deep.equal(testTool2);
    });
});
//# sourceMappingURL=chat-request-parser.spec.js.map