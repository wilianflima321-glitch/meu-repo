"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH and others.
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
exports.TaskContextService = exports.TaskContextStorageService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const common_1 = require("../common");
const common_2 = require("@theia/core/lib/common");
const chat_session_summary_agent_1 = require("../common/chat-session-summary-agent");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const ai_core_1 = require("@theia/ai-core");
const chat_session_summary_agent_prompt_1 = require("../common/chat-session-summary-agent-prompt");
const change_set_file_element_1 = require("./change-set-file-element");
const yaml = require("js-yaml");
exports.TaskContextStorageService = Symbol('TaskContextStorageService');
let TaskContextService = class TaskContextService {
    constructor() {
        this.pendingSummaries = new Map();
    }
    get onDidChange() {
        return this.storageService.onDidChange;
    }
    getAll() {
        return this.storageService.getAll();
    }
    async getSummary(sessionIdOrFilePath) {
        const existing = this.storageService.get(sessionIdOrFilePath);
        if (existing) {
            return existing.summary;
        }
        const pending = this.pendingSummaries.get(sessionIdOrFilePath);
        if (pending) {
            return pending.then(({ summary }) => summary);
        }
        const session = this.chatService.getSession(sessionIdOrFilePath);
        if (session) {
            return this.summarize(session);
        }
        throw new Error('Unable to resolve summary request.');
    }
    /** Returns an ID that can be used to refer to the summary in the future. */
    async summarize(session, promptId, agent, override = true) {
        const pending = this.pendingSummaries.get(session.id);
        if (pending) {
            return pending.then(({ id }) => id);
        }
        const existing = this.getSummaryForSession(session);
        if (existing && !override) {
            return existing.id;
        }
        const summaryId = (0, core_1.generateUuid)();
        const summaryDeferred = new promise_util_1.Deferred();
        const progress = await this.progressService.showProgress({ text: `Summarize: ${session.title || session.id}`, options: { location: 'ai-chat' } });
        this.pendingSummaries.set(session.id, summaryDeferred.promise);
        try {
            const prompt = await this.getSystemPrompt(session, promptId);
            const newSummary = {
                summary: await this.getLlmSummary(session, prompt, agent),
                label: session.title || session.id,
                sessionId: session.id,
                id: summaryId
            };
            await this.storageService.store(newSummary);
            return summaryId;
        }
        catch (err) {
            summaryDeferred.reject(err);
            const errorSummary = {
                summary: `Summary creation failed: ${err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'}`,
                label: session.title || session.id,
                sessionId: session.id,
                id: summaryId
            };
            await this.storageService.store(errorSummary);
            throw err;
        }
        finally {
            progress.cancel();
            this.pendingSummaries.delete(session.id);
        }
    }
    async update(session, promptId, agent, override = true) {
        // Get the existing summary for the session
        const existingSummary = this.getSummaryForSession(session);
        if (!existingSummary) {
            // If no summary exists, create one instead
            // TODO: Maybe we could also look into the task context folder and ask for the existing ones with an additional menu to create a new one?
            return this.summarize(session, promptId, agent, override);
        }
        const progress = await this.progressService.showProgress({ text: `Updating: ${session.title || session.id}`, options: { location: 'ai-chat' } });
        try {
            const prompt = await this.getSystemPrompt(session, promptId);
            if (!prompt) {
                return '';
            }
            // Get the task context file path
            const taskContextStorageDirectory = this.preferenceService.get(
            // preference key is defined in TASK_CONTEXT_STORAGE_DIRECTORY_PREF in @theia/ai-ide
            'ai-features.promptTemplates.taskContextStorageDirectory', '.prompts/task-contexts');
            const taskContextFileVariable = session.model.context.getVariables().find(variableReq => variableReq.variable.id === 'file-provider' &&
                typeof variableReq.arg === 'string' &&
                (variableReq.arg.startsWith(taskContextStorageDirectory)));
            // Check if we have a document path to update
            if (taskContextFileVariable && typeof taskContextFileVariable.arg === 'string') {
                // Set document path in prompt template
                const documentPath = taskContextFileVariable.arg;
                // Modify prompt to include the document path and content
                prompt.text = prompt.text + '\nThe document to update is: ' + documentPath + '\n\n## Current Document Content\n\n' + existingSummary.summary;
                // Get updated document content from LLM
                const updatedDocumentContent = await this.getLlmSummary(session, prompt, agent);
                if (existingSummary.uri) {
                    // updated document metadata shall be updated.
                    // otherwise, frontmatter won't be set
                    const frontmatter = {
                        sessionId: existingSummary.sessionId,
                        date: new Date().toISOString(),
                        label: existingSummary.label,
                    };
                    const content = yaml.dump(frontmatter).trim() + `${core_1.EOL}---${core_1.EOL}` + updatedDocumentContent;
                    session.model.changeSet.addElements(this.fileChangeFactory({
                        uri: existingSummary.uri,
                        type: 'modify',
                        state: 'pending',
                        targetState: content,
                        requestId: session.model.id, // not a request id, as no changeRequest made yet.
                        chatSessionId: session.id
                    }));
                }
                else {
                    const updatedSummary = {
                        ...existingSummary,
                        summary: updatedDocumentContent
                    };
                    // Store the updated summary
                    await this.storageService.store(updatedSummary);
                }
                return existingSummary.id;
            }
            else {
                // Fall back to standard update if no document path is found
                const updatedSummaryText = await this.getLlmSummary(session, prompt, agent);
                const updatedSummary = {
                    ...existingSummary,
                    summary: updatedSummaryText
                };
                await this.storageService.store(updatedSummary);
                return updatedSummary.id;
            }
        }
        catch (err) {
            const errorSummary = {
                ...existingSummary,
                summary: `Summary update failed: ${err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'}`
            };
            await this.storageService.store(errorSummary);
            throw err;
        }
        finally {
            progress.cancel();
        }
    }
    async getLlmSummary(session, prompt, agent) {
        var _a, _b;
        if (!prompt) {
            return '';
        }
        agent = agent || this.agentService.getAgents().find((candidate) => 'invoke' in candidate
            && typeof candidate.invoke === 'function'
            && candidate.id === chat_session_summary_agent_1.ChatSessionSummaryAgent.ID);
        if (!agent) {
            throw new Error('Unable to identify agent for summary.');
        }
        const model = new common_1.MutableChatModel(common_1.ChatAgentLocation.Panel);
        const messages = session.model.getRequests().filter((candidate) => candidate instanceof common_1.MutableChatRequestModel);
        messages.forEach(message => model['_hierarchy'].append(message));
        const summaryRequest = model.addRequest({
            variables: (_a = prompt.variables) !== null && _a !== void 0 ? _a : [],
            request: { text: prompt.text },
            parts: [new common_1.ParsedChatRequestTextPart({ start: 0, endExclusive: prompt.text.length }, prompt.text)],
            toolRequests: (_b = prompt.functionDescriptions) !== null && _b !== void 0 ? _b : new Map()
        }, agent.id);
        await agent.invoke(summaryRequest);
        return summaryRequest.response.response.asDisplayString();
    }
    async getSystemPrompt(session, promptId = chat_session_summary_agent_prompt_1.CHAT_SESSION_SUMMARY_PROMPT.id) {
        const prompt = await this.promptService.getResolvedPromptFragment(promptId || chat_session_summary_agent_prompt_1.CHAT_SESSION_SUMMARY_PROMPT.id, undefined, { model: session.model });
        return prompt;
    }
    hasSummary(chatSession) {
        return !!this.getSummaryForSession(chatSession);
    }
    getSummaryForSession(chatSession) {
        return this.storageService.getAll().find(candidate => candidate.sessionId === chatSession.id);
    }
    getLabel(id) {
        var _a;
        return (_a = this.storageService.get(id)) === null || _a === void 0 ? void 0 : _a.label;
    }
    open(id) {
        return this.storageService.open(id);
    }
};
exports.TaskContextService = TaskContextService;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], TaskContextService.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], TaskContextService.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], TaskContextService.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.TaskContextStorageService),
    tslib_1.__metadata("design:type", Object)
], TaskContextService.prototype, "storageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ProgressService),
    tslib_1.__metadata("design:type", core_1.ProgressService)
], TaskContextService.prototype, "progressService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_2.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], TaskContextService.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_element_1.ChangeSetFileElementFactory),
    tslib_1.__metadata("design:type", Function)
], TaskContextService.prototype, "fileChangeFactory", void 0);
exports.TaskContextService = TaskContextService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskContextService);
//# sourceMappingURL=task-context-service.js.map