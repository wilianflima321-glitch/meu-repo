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
// Partially copied from https://github.com/microsoft/vscode/blob/a2cab7255c0df424027be05d58e1b7b941f4ea60/src/vs/workbench/contrib/chat/common/chatAgents.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractStreamParsingChatAgent = exports.ToolCallChatResponseContentFactory = exports.AbstractTextToModelParsingChatAgent = exports.AbstractChatAgent = exports.ChatAgent = exports.ChatAgentLocation = exports.ChatSessionContext = exports.SystemMessageDescription = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const common_1 = require("@theia/ai-core/lib/common");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_model_1 = require("./chat-model");
const chat_tool_request_service_1 = require("./chat-tool-request-service");
const parse_contents_1 = require("./parse-contents");
const response_content_matcher_1 = require("./response-content-matcher");
const image_context_variable_1 = require("./image-context-variable");
var SystemMessageDescription;
(function (SystemMessageDescription) {
    function fromResolvedPromptFragment(resolvedPrompt) {
        return {
            text: resolvedPrompt.text,
            functionDescriptions: resolvedPrompt.functionDescriptions
        };
    }
    SystemMessageDescription.fromResolvedPromptFragment = fromResolvedPromptFragment;
})(SystemMessageDescription || (exports.SystemMessageDescription = SystemMessageDescription = {}));
var ChatSessionContext;
(function (ChatSessionContext) {
    function is(candidate) {
        return typeof candidate === 'object' && !!candidate && 'model' in candidate;
    }
    ChatSessionContext.is = is;
    function getVariables(context) {
        var _a, _b;
        return (_b = (_a = context.request) === null || _a === void 0 ? void 0 : _a.context.variables.map(ai_core_1.AIVariableResolutionRequest.fromResolved)) !== null && _b !== void 0 ? _b : context.model.context.getVariables();
    }
    ChatSessionContext.getVariables = getVariables;
})(ChatSessionContext || (exports.ChatSessionContext = ChatSessionContext = {}));
/**
 * The location from where an chat agent may be invoked.
 * Based on the location, a different context may be available.
 */
var ChatAgentLocation;
(function (ChatAgentLocation) {
    ChatAgentLocation["Panel"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    ChatAgentLocation["Editor"] = "editor";
})(ChatAgentLocation || (exports.ChatAgentLocation = ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    ChatAgentLocation.ALL = [ChatAgentLocation.Panel, ChatAgentLocation.Terminal, ChatAgentLocation.Notebook, ChatAgentLocation.Editor];
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Panel;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.Editor;
        }
        return ChatAgentLocation.Panel;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (exports.ChatAgentLocation = ChatAgentLocation = {}));
exports.ChatAgent = Symbol('ChatAgent');
let AbstractChatAgent = class AbstractChatAgent {
    constructor() {
        this.iconClass = 'codicon codicon-copilot';
        this.locations = ChatAgentLocation.ALL;
        this.tags = ['Chat'];
        this.description = '';
        this.variables = [];
        this.prompts = [];
        this.agentSpecificVariables = [];
        this.functions = [];
        this.systemPromptId = undefined;
        this.additionalToolRequests = [];
        this.contentMatchers = [];
    }
    init() {
        this.initializeContentMatchers();
    }
    initializeContentMatchers() {
        const contributedContentMatchers = this.contentMatcherProviders.getContributions().flatMap(provider => provider.matchers);
        this.contentMatchers.push(...contributedContentMatchers);
    }
    async invoke(request) {
        var _a;
        try {
            const languageModel = await this.getLanguageModel(this.defaultLanguageModelPurpose);
            if (!languageModel) {
                throw new Error('Couldn\'t find a matching language model. Please check your setup!');
            }
            const systemMessageDescription = await this.getSystemMessageDescription({ model: request.session, request });
            const messages = await this.getMessages(request.session);
            if (systemMessageDescription) {
                const systemMsg = {
                    actor: 'system',
                    type: 'text',
                    text: systemMessageDescription.text
                };
                // insert system message at the beginning of the request messages
                messages.unshift(systemMsg);
            }
            const systemMessageToolRequests = (_a = systemMessageDescription === null || systemMessageDescription === void 0 ? void 0 : systemMessageDescription.functionDescriptions) === null || _a === void 0 ? void 0 : _a.values();
            const tools = [
                ...this.chatToolRequestService.getChatToolRequests(request),
                ...this.chatToolRequestService.toChatToolRequests(systemMessageToolRequests ? Array.from(systemMessageToolRequests) : [], request),
                ...this.chatToolRequestService.toChatToolRequests(this.additionalToolRequests, request)
            ];
            const languageModelResponse = await this.sendLlmRequest(request, messages, tools, languageModel);
            await this.addContentsToResponse(languageModelResponse, request);
            await this.onResponseComplete(request);
        }
        catch (e) {
            this.handleError(request, e);
        }
    }
    parseContents(text, request) {
        var _a;
        return (0, parse_contents_1.parseContents)(text, request, this.contentMatchers, (_a = this.defaultContentFactory) === null || _a === void 0 ? void 0 : _a.create.bind(this.defaultContentFactory));
    }
    ;
    handleError(request, error) {
        console.error('Error handling chat interaction:', error);
        request.response.response.addContent(new chat_model_1.ErrorChatResponseContentImpl(error));
        request.response.error(error);
    }
    getLanguageModelSelector(languageModelPurpose) {
        return this.languageModelRequirements.find(req => req.purpose === languageModelPurpose);
    }
    async getLanguageModel(languageModelPurpose) {
        return this.selectLanguageModel(this.getLanguageModelSelector(languageModelPurpose));
    }
    async selectLanguageModel(selector) {
        const languageModel = await this.languageModelRegistry.selectLanguageModel({ agent: this.id, ...selector });
        if (!languageModel) {
            throw new Error(`Couldn\'t find a ready language model for agent ${this.id}. Please check your setup!`);
        }
        return languageModel;
    }
    async getSystemMessageDescription(context) {
        if (this.systemPromptId === undefined) {
            return undefined;
        }
        const resolvedPrompt = await this.promptService.getResolvedPromptFragment(this.systemPromptId, undefined, context);
        return resolvedPrompt ? SystemMessageDescription.fromResolvedPromptFragment(resolvedPrompt) : undefined;
    }
    async getMessages(model, includeResponseInProgress = false) {
        const requestMessages = model.getRequests().flatMap(request => {
            const messages = [];
            const text = request.message.parts.map(part => part.promptText).join('');
            if (text.length > 0) {
                messages.push({
                    actor: 'user',
                    type: 'text',
                    text: text,
                });
            }
            const imageMessages = request.context.variables
                .filter(variable => image_context_variable_1.ImageContextVariable.isResolvedImageContext(variable))
                .map(variable => image_context_variable_1.ImageContextVariable.parseResolved(variable))
                .filter(content => content !== undefined)
                .map(content => ({
                actor: 'user',
                type: 'image',
                image: {
                    base64data: content.data,
                    mimeType: content.mimeType
                }
            }));
            messages.push(...imageMessages);
            if (request.response.isComplete || includeResponseInProgress) {
                const responseMessages = request.response.response.content
                    .filter(c => {
                    // we do not send errors or informational content
                    if (chat_model_1.ErrorChatResponseContent.is(c) || chat_model_1.InformationalChatResponseContent.is(c)) {
                        return false;
                    }
                    // content even has an own converter, definitely include it
                    if (chat_model_1.ChatResponseContent.hasToLanguageModelMessage(c)) {
                        return true;
                    }
                    // make sure content did not indicate to be excluded by returning undefined in asString
                    if (chat_model_1.ChatResponseContent.hasAsString(c) && c.asString() === undefined) {
                        return false;
                    }
                    // include the rest
                    return true;
                })
                    .flatMap(c => {
                    var _a, _b;
                    if (chat_model_1.ChatResponseContent.hasToLanguageModelMessage(c)) {
                        return c.toLanguageModelMessage();
                    }
                    return {
                        actor: 'ai',
                        type: 'text',
                        text: ((_a = c.asString) === null || _a === void 0 ? void 0 : _a.call(c)) || ((_b = c.asDisplayString) === null || _b === void 0 ? void 0 : _b.call(c)) || '',
                    };
                });
                messages.push(...responseMessages);
            }
            return messages;
        });
        return requestMessages;
    }
    /**
     * Deduplicate tools by name (falling back to id) while preserving the first occurrence and order.
     */
    deduplicateTools(toolRequests) {
        var _a;
        const seen = new Set();
        const deduped = [];
        for (const tool of toolRequests) {
            const key = (_a = tool.name) !== null && _a !== void 0 ? _a : tool.id;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(tool);
            }
        }
        return deduped;
    }
    async sendLlmRequest(request, messages, toolRequests, languageModel) {
        const agentSettings = this.getLlmSettings();
        const settings = { ...agentSettings, ...request.session.settings };
        const dedupedTools = this.deduplicateTools(toolRequests);
        const tools = dedupedTools.length > 0 ? dedupedTools : undefined;
        return this.languageModelService.sendRequest(languageModel, {
            messages,
            tools,
            settings,
            agentId: this.id,
            sessionId: request.session.id,
            requestId: request.id,
            cancellationToken: request.response.cancellationToken
        });
    }
    /**
     * @returns the settings, such as `temperature`, to be used in all language model requests. Returns `undefined` by default.
     */
    getLlmSettings() {
        return undefined;
    }
    /**
     * Invoked after the response by the LLM completed successfully.
     *
     * The default implementation sets the state of the response to `complete`.
     * Subclasses may override this method to perform additional actions or keep the response open for processing further requests.
     */
    async onResponseComplete(request) {
        return request.response.complete();
    }
};
exports.AbstractChatAgent = AbstractChatAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], AbstractChatAgent.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], AbstractChatAgent.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_tool_request_service_1.ChatToolRequestService),
    tslib_1.__metadata("design:type", chat_tool_request_service_1.ChatToolRequestService)
], AbstractChatAgent.prototype, "chatToolRequestService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelService),
    tslib_1.__metadata("design:type", Object)
], AbstractChatAgent.prototype, "languageModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], AbstractChatAgent.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(response_content_matcher_1.ResponseContentMatcherProvider),
    tslib_1.__metadata("design:type", Object)
], AbstractChatAgent.prototype, "contentMatcherProviders", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(response_content_matcher_1.DefaultResponseContentFactory),
    tslib_1.__metadata("design:type", response_content_matcher_1.DefaultResponseContentFactory)
], AbstractChatAgent.prototype, "defaultContentFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AbstractChatAgent.prototype, "init", null);
exports.AbstractChatAgent = AbstractChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractChatAgent);
let AbstractTextToModelParsingChatAgent = class AbstractTextToModelParsingChatAgent extends AbstractChatAgent {
    async addContentsToResponse(languageModelResponse, request) {
        const responseAsText = await (0, ai_core_1.getTextOfResponse)(languageModelResponse);
        const parsedCommand = await this.parseTextResponse(responseAsText);
        const content = this.createResponseContent(parsedCommand, request);
        request.response.response.addContent(content);
    }
};
exports.AbstractTextToModelParsingChatAgent = AbstractTextToModelParsingChatAgent;
exports.AbstractTextToModelParsingChatAgent = AbstractTextToModelParsingChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractTextToModelParsingChatAgent);
/**
 * Factory for creating ToolCallChatResponseContent instances.
 */
let ToolCallChatResponseContentFactory = class ToolCallChatResponseContentFactory {
    create(toolCall) {
        var _a, _b;
        return new chat_model_1.ToolCallChatResponseContentImpl(toolCall.id, (_a = toolCall.function) === null || _a === void 0 ? void 0 : _a.name, (_b = toolCall.function) === null || _b === void 0 ? void 0 : _b.arguments, toolCall.finished, toolCall.result);
    }
};
exports.ToolCallChatResponseContentFactory = ToolCallChatResponseContentFactory;
exports.ToolCallChatResponseContentFactory = ToolCallChatResponseContentFactory = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ToolCallChatResponseContentFactory);
let AbstractStreamParsingChatAgent = class AbstractStreamParsingChatAgent extends AbstractChatAgent {
    async addContentsToResponse(languageModelResponse, request) {
        if ((0, common_1.isLanguageModelTextResponse)(languageModelResponse)) {
            const contents = this.parseContents(languageModelResponse.text, request);
            request.response.response.addContents(contents);
            return;
        }
        if ((0, common_1.isLanguageModelStreamResponse)(languageModelResponse)) {
            await this.addStreamResponse(languageModelResponse, request);
            return;
        }
        this.logger.error('Received unknown response in agent. Return response as text');
        request.response.response.addContent(new chat_model_1.MarkdownChatResponseContentImpl(JSON.stringify(languageModelResponse)));
    }
    async addStreamResponse(languageModelResponse, request) {
        let completeTextBuffer = '';
        let startIndex = request.response.response.content.length;
        for await (const token of languageModelResponse.stream) {
            // Skip unknown tokens. For example OpenAI sends empty tokens around tool calls
            if (!(0, ai_core_1.isLanguageModelStreamResponsePart)(token)) {
                console.debug(`Unknown token: '${JSON.stringify(token)}'. Skipping`);
                continue;
            }
            const newContent = this.parse(token, request);
            if (!(0, ai_core_1.isTextResponsePart)(token)) {
                // For non-text tokens (like tool calls), add them directly
                if ((0, core_1.isArray)(newContent)) {
                    request.response.response.addContents(newContent);
                }
                else {
                    request.response.response.addContent(newContent);
                }
                // And reset the marker index and the text buffer as we skip matching across non-text tokens
                startIndex = request.response.response.content.length;
                completeTextBuffer = '';
            }
            else {
                // parse the entire text so far (since beginning of the stream or last non-text token)
                // and replace the entire content with the currently parsed content parts
                completeTextBuffer += token.content;
                const parsedContents = this.parseContents(completeTextBuffer, request);
                const contentBeforeMarker = startIndex > 0
                    ? request.response.response.content.slice(0, startIndex)
                    : [];
                request.response.response.clearContent();
                request.response.response.addContents(contentBeforeMarker);
                request.response.response.addContents(parsedContents);
            }
        }
    }
    parse(token, request) {
        if ((0, ai_core_1.isTextResponsePart)(token)) {
            const content = token.content;
            // eslint-disable-next-line no-null/no-null
            if (content !== undefined && content !== null) {
                return this.defaultContentFactory.create(content, request);
            }
        }
        if ((0, ai_core_1.isToolCallResponsePart)(token)) {
            const toolCalls = token.tool_calls;
            if (toolCalls !== undefined) {
                const toolCallContents = toolCalls.map(toolCall => this.createToolCallResponseContent(toolCall));
                return toolCallContents;
            }
        }
        if ((0, ai_core_1.isThinkingResponsePart)(token)) {
            return new chat_model_1.ThinkingChatResponseContentImpl(token.thought, token.signature);
        }
        if ((0, ai_core_1.isUsageResponsePart)(token)) {
            return [];
        }
        return this.defaultContentFactory.create('', request);
    }
    /**
     * Creates a ToolCallChatResponseContent instance from the provided tool call data.
     *
     * This method is called when parsing stream response tokens that contain tool call data.
     * Subclasses can override this method to customize the creation of tool call response contents.
     *
     * @param toolCall The ToolCall.
     * @returns A ChatResponseContent representing the tool call.
     */
    createToolCallResponseContent(toolCall) {
        return this.toolCallResponseContentFactory.create(toolCall);
    }
};
exports.AbstractStreamParsingChatAgent = AbstractStreamParsingChatAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(ToolCallChatResponseContentFactory),
    tslib_1.__metadata("design:type", ToolCallChatResponseContentFactory)
], AbstractStreamParsingChatAgent.prototype, "toolCallResponseContentFactory", void 0);
exports.AbstractStreamParsingChatAgent = AbstractStreamParsingChatAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractStreamParsingChatAgent);
//# sourceMappingURL=chat-agents.js.map