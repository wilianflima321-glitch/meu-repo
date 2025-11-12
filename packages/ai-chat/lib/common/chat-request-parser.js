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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatRequestParser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestParserImpl = exports.ChatRequestParser = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agent_service_1 = require("./chat-agent-service");
const parsed_chat_request_1 = require("./parsed-chat-request");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const agentReg = /^@([\w_\-\.]+)(?=(\s|$|\b))/i; // An @-agent
const functionReg = /^~([\w_\-\.]+)(?=(\s|$|\b))/i; // A ~ tool function
const functionPromptFormatReg = /^\~\{\s*(.*?)\s*\}/i; // A ~{} prompt-format tool function
const variableReg = /^#([\w_\-]+)(?::([\w_\-_\/\\.:]+))?(?=(\s|$|\b))/i; // A #-variable with an optional : arg (#file:workspace/path/name.ext)
exports.ChatRequestParser = Symbol('ChatRequestParser');
function offsetRange(start, endExclusive) {
    if (start > endExclusive) {
        throw new Error(`Invalid range: start=${start} endExclusive=${endExclusive}`);
    }
    return { start, endExclusive };
}
let ChatRequestParserImpl = class ChatRequestParserImpl {
    constructor(agentService, variableService, toolInvocationRegistry, logger) {
        this.agentService = agentService;
        this.variableService = variableService;
        this.toolInvocationRegistry = toolInvocationRegistry;
        this.logger = logger;
    }
    async parseChatRequest(request, location, context) {
        // Parse the request into parts
        const { parts, toolRequests } = this.parseParts(request, location);
        // Resolve all variables and add them to the variable parts.
        // Parse resolved variable texts again for tool requests.
        // These are not added to parts as they are not visible in the initial chat message.
        // However, they need to be added to the result to be considered by the executing agent.
        const variableCache = (0, ai_core_1.createAIResolveVariableCache)();
        for (const part of parts) {
            if (part instanceof parsed_chat_request_1.ParsedChatRequestVariablePart) {
                const resolvedVariable = await this.variableService.resolveVariable({ variable: part.variableName, arg: part.variableArg }, context, variableCache);
                if (resolvedVariable) {
                    part.resolution = resolvedVariable;
                    // Resolve tool requests in resolved variables
                    this.parseFunctionsFromVariableText(resolvedVariable.value, toolRequests);
                }
                else {
                    this.logger.warn(`Failed to resolve variable ${part.variableName} for ${location}`);
                }
            }
        }
        // Get resolved variables from variable cache after all variables have been resolved.
        // We want to return all recursively resolved variables, thus use the whole cache.
        const resolvedVariables = await (0, ai_core_1.getAllResolvedAIVariables)(variableCache);
        return { request, parts, toolRequests, variables: resolvedVariables };
    }
    parseParts(request, location) {
        var _a, _b;
        const parts = [];
        const variables = new Map();
        const toolRequests = new Map();
        if (!request.text) {
            return { parts, toolRequests, variables };
        }
        const message = request.text;
        for (let i = 0; i < message.length; i++) {
            const previousChar = message.charAt(i - 1);
            const char = message.charAt(i);
            let newPart;
            if (previousChar.match(/\s/) || i === 0) {
                if (char === parsed_chat_request_1.chatFunctionLeader) {
                    const functionPart = this.tryToParseFunction(message.slice(i), i);
                    newPart = functionPart;
                    if (functionPart) {
                        toolRequests.set(functionPart.toolRequest.id, functionPart.toolRequest);
                    }
                }
                else if (char === parsed_chat_request_1.chatVariableLeader) {
                    const variablePart = this.tryToParseVariable(message.slice(i), i, parts);
                    newPart = variablePart;
                    if (variablePart) {
                        const variable = this.variableService.getVariable(variablePart.variableName);
                        if (variable) {
                            variables.set(variable.name, variable);
                        }
                    }
                }
                else if (char === parsed_chat_request_1.chatAgentLeader) {
                    newPart = this.tryToParseAgent(message.slice(i), i, parts, location);
                }
            }
            if (newPart) {
                if (i !== 0) {
                    // Insert a part for all the text we passed over, then insert the new parsed part
                    const previousPart = parts.at(-1);
                    const previousPartEnd = (_a = previousPart === null || previousPart === void 0 ? void 0 : previousPart.range.endExclusive) !== null && _a !== void 0 ? _a : 0;
                    parts.push(new parsed_chat_request_1.ParsedChatRequestTextPart(offsetRange(previousPartEnd, i), message.slice(previousPartEnd, i)));
                }
                parts.push(newPart);
            }
        }
        const lastPart = parts.at(-1);
        const lastPartEnd = (_b = lastPart === null || lastPart === void 0 ? void 0 : lastPart.range.endExclusive) !== null && _b !== void 0 ? _b : 0;
        if (lastPartEnd < message.length) {
            parts.push(new parsed_chat_request_1.ParsedChatRequestTextPart(offsetRange(lastPartEnd, message.length), message.slice(lastPartEnd, message.length)));
        }
        return { parts, toolRequests, variables };
    }
    /**
     * Parse text for tool requests and add them to the given map
     */
    parseFunctionsFromVariableText(text, toolRequests) {
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            // Check for function markers at start of words
            if (char === parsed_chat_request_1.chatFunctionLeader) {
                const functionPart = this.tryToParseFunction(text.slice(i), i);
                if (functionPart) {
                    // Add the found tool request to the given map
                    toolRequests.set(functionPart.toolRequest.id, functionPart.toolRequest);
                }
            }
        }
    }
    tryToParseAgent(message, offset, parts, location) {
        const nextAgentMatch = message.match(agentReg);
        if (!nextAgentMatch) {
            return;
        }
        const [full, name] = nextAgentMatch;
        const agentRange = offsetRange(offset, offset + full.length);
        let agents = this.agentService.getAgents().filter(a => a.name === name);
        if (!agents.length) {
            const fqAgent = this.agentService.getAgent(name);
            if (fqAgent) {
                agents = [fqAgent];
            }
        }
        // If there is more than one agent with this name, and the user picked it from the suggest widget, then the selected agent should be in the
        // context and we use that one. Otherwise just pick the first.
        const agent = agents[0];
        if (!agent || !agent.locations.includes(location)) {
            return;
        }
        if (parts.some(p => p instanceof parsed_chat_request_1.ParsedChatRequestAgentPart)) {
            // Only one agent allowed
            return;
        }
        return new parsed_chat_request_1.ParsedChatRequestAgentPart(agentRange, agent.id, agent.name);
    }
    tryToParseVariable(message, offset, _parts) {
        const nextVariableMatch = message.match(variableReg);
        if (!nextVariableMatch) {
            return;
        }
        const [full, name] = nextVariableMatch;
        const variableArg = nextVariableMatch[2];
        const varRange = offsetRange(offset, offset + full.length);
        return new parsed_chat_request_1.ParsedChatRequestVariablePart(varRange, name, variableArg);
    }
    tryToParseFunction(message, offset) {
        // Support both the and chat and prompt formats for functions
        const nextFunctionMatch = message.match(functionPromptFormatReg) || message.match(functionReg);
        if (!nextFunctionMatch) {
            return;
        }
        const [full, id] = nextFunctionMatch;
        const maybeToolRequest = this.toolInvocationRegistry.getFunction(id);
        if (!maybeToolRequest) {
            return;
        }
        const functionRange = offsetRange(offset, offset + full.length);
        return new parsed_chat_request_1.ParsedChatRequestFunctionPart(functionRange, maybeToolRequest);
    }
};
exports.ChatRequestParserImpl = ChatRequestParserImpl;
exports.ChatRequestParserImpl = ChatRequestParserImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService)),
    tslib_1.__param(1, (0, inversify_1.inject)(ai_core_1.AIVariableService)),
    tslib_1.__param(2, (0, inversify_1.inject)(ai_core_1.ToolInvocationRegistry)),
    tslib_1.__param(3, (0, inversify_1.inject)(core_1.ILogger)),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object, Object])
], ChatRequestParserImpl);
//# sourceMappingURL=chat-request-parser.js.map