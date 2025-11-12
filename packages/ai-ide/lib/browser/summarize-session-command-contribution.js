"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.SummarizeSessionCommandContribution = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@theia/ai-chat/lib/common");
const core_1 = require("@theia/core");
const task_context_service_1 = require("@theia/ai-chat/lib/browser/task-context-service");
const inversify_1 = require("@theia/core/shared/inversify");
const summarize_session_commands_1 = require("../common/summarize-session-commands");
const coder_agent_1 = require("./coder-agent");
const task_context_variable_1 = require("@theia/ai-chat/lib/browser/task-context-variable");
const architect_prompt_template_1 = require("../common/architect-prompt-template");
const file_variable_contribution_1 = require("@theia/ai-core/lib/browser/file-variable-contribution");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const browser_1 = require("@theia/workspace/lib/browser");
const browser_2 = require("@theia/ai-core/lib/browser");
let SummarizeSessionCommandContribution = class SummarizeSessionCommandContribution {
    chatService;
    taskContextService;
    commandService;
    coderAgent;
    taskContextStorageService;
    fileService;
    wsService;
    commandHandlerFactory;
    registerCommands(registry) {
        registry.registerCommand(summarize_session_commands_1.AI_UPDATE_TASK_CONTEXT_COMMAND, this.commandHandlerFactory({
            execute: async () => {
                const activeSession = this.chatService.getActiveSession();
                if (!activeSession) {
                    return;
                }
                // Check if there is an existing summary for this session
                if (!this.taskContextService.hasSummary(activeSession)) {
                    // If no summary exists, create one first
                    await this.taskContextService.summarize(activeSession, architect_prompt_template_1.ARCHITECT_TASK_SUMMARY_PROMPT_TEMPLATE_ID);
                }
                else {
                    // Update existing summary
                    await this.taskContextService.update(activeSession, architect_prompt_template_1.ARCHITECT_TASK_SUMMARY_UPDATE_PROMPT_TEMPLATE_ID);
                }
            }
        }));
        registry.registerCommand(summarize_session_commands_1.AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER, this.commandHandlerFactory({
            execute: async () => {
                const activeSession = this.chatService.getActiveSession();
                if (!activeSession) {
                    return;
                }
                const summaryId = await this.taskContextService.summarize(activeSession, architect_prompt_template_1.ARCHITECT_TASK_SUMMARY_PROMPT_TEMPLATE_ID);
                // Open the summary in a new editor
                await this.taskContextStorageService.open(summaryId);
                // Add the summary file to the context of the active Architect session
                const summary = this.taskContextService.getAll().find(s => s.id === summaryId);
                if (summary?.uri) {
                    if (await this.fileService.exists(summary?.uri)) {
                        const wsRelativePath = await this.wsService.getWorkspaceRelativePath(summary?.uri);
                        // Create a file variable for the summary
                        const fileVariable = {
                            variable: file_variable_contribution_1.FILE_VARIABLE,
                            arg: wsRelativePath
                        };
                        // Add the file to the active session's context
                        activeSession.model.context.addVariables(fileVariable);
                    }
                    // Create a new session with the coder agent
                    const newSession = this.chatService.createSession(common_1.ChatAgentLocation.Panel, { focus: true }, this.coderAgent);
                    const summaryVariable = { variable: task_context_variable_1.TASK_CONTEXT_VARIABLE, arg: summaryId };
                    newSession.model.context.addVariables(summaryVariable);
                }
            }
        }));
    }
};
exports.SummarizeSessionCommandContribution = SummarizeSessionCommandContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], SummarizeSessionCommandContribution.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_service_1.TaskContextService),
    tslib_1.__metadata("design:type", task_context_service_1.TaskContextService)
], SummarizeSessionCommandContribution.prototype, "taskContextService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], SummarizeSessionCommandContribution.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(coder_agent_1.CoderAgent),
    tslib_1.__metadata("design:type", coder_agent_1.CoderAgent)
], SummarizeSessionCommandContribution.prototype, "coderAgent", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_service_1.TaskContextStorageService),
    tslib_1.__metadata("design:type", Object)
], SummarizeSessionCommandContribution.prototype, "taskContextStorageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], SummarizeSessionCommandContribution.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    tslib_1.__metadata("design:type", browser_1.WorkspaceService)
], SummarizeSessionCommandContribution.prototype, "wsService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.AICommandHandlerFactory),
    tslib_1.__metadata("design:type", Function)
], SummarizeSessionCommandContribution.prototype, "commandHandlerFactory", void 0);
exports.SummarizeSessionCommandContribution = SummarizeSessionCommandContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SummarizeSessionCommandContribution);
//# sourceMappingURL=summarize-session-command-contribution.js.map