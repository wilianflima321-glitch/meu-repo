"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectAgent = void 0;
const tslib_1 = require("tslib");
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
const common_1 = require("@theia/ai-chat/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const architect_prompt_template_1 = require("../common/architect-prompt-template");
const workspace_functions_1 = require("../common/workspace-functions");
const core_1 = require("@theia/core");
const markdown_rendering_1 = require("@theia/core/lib/common/markdown-rendering");
const summarize_session_commands_1 = require("../common/summarize-session-commands");
let ArchitectAgent = class ArchitectAgent extends common_1.AbstractStreamParsingChatAgent {
    chatService;
    name = 'Architect';
    id = 'Architect';
    languageModelRequirements = [{
            purpose: 'chat',
            identifier: 'default/code',
        }];
    defaultLanguageModelPurpose = 'chat';
    description = core_1.nls.localize('theia/ai/workspace/workspaceAgent/description', 'An AI assistant integrated into Theia IDE, designed to assist software developers. This agent can access the users workspace, it can get a list of all available files \
         and folders and retrieve their content. It cannot modify files. It can therefore answer questions about the current project, project files and source code in the \
         workspace, such as how to build the project, where to put source code, where to find specific code or configurations, etc.');
    prompts = [architect_prompt_template_1.architectSystemVariants, architect_prompt_template_1.architectTaskSummaryVariants];
    functions = [workspace_functions_1.GET_WORKSPACE_FILE_LIST_FUNCTION_ID, workspace_functions_1.FILE_CONTENT_FUNCTION_ID];
    systemPromptId = architect_prompt_template_1.architectSystemVariants.id;
    async invoke(request) {
        await super.invoke(request);
        this.suggest(request);
    }
    async suggest(context) {
        const model = common_1.ChatRequestModel.is(context) ? context.session : context.model;
        const session = this.chatService.getSessions().find(candidate => candidate.model.id === model.id);
        if (!(model instanceof common_1.MutableChatModel) || !session) {
            return;
        }
        if (!model.isEmpty()) {
            model.setSuggestions([
                new markdown_rendering_1.MarkdownStringImpl(`[Summarize this session as a task for Coder](command:${summarize_session_commands_1.AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER.id}).`),
                new markdown_rendering_1.MarkdownStringImpl(`[Update current task context](command:${summarize_session_commands_1.AI_UPDATE_TASK_CONTEXT_COMMAND.id}).`)
            ]);
        }
    }
};
exports.ArchitectAgent = ArchitectAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], ArchitectAgent.prototype, "chatService", void 0);
exports.ArchitectAgent = ArchitectAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ArchitectAgent);
//# sourceMappingURL=architect-agent.js.map