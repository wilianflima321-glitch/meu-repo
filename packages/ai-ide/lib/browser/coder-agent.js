"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoderAgent = void 0;
const tslib_1 = require("tslib");
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
const common_1 = require("@theia/ai-chat/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const workspace_functions_1 = require("../common/workspace-functions");
const coder_replace_prompt_template_1 = require("../common/coder-replace-prompt-template");
const file_changeset_functions_1 = require("./file-changeset-functions");
const core_1 = require("@theia/core");
const markdown_rendering_1 = require("@theia/core/lib/common/markdown-rendering");
const chat_view_commands_1 = require("@theia/ai-chat-ui/lib/browser/chat-view-commands");
let CoderAgent = class CoderAgent extends common_1.AbstractStreamParsingChatAgent {
    chatService;
    id = 'Coder';
    name = 'Coder';
    languageModelRequirements = [{
            purpose: 'chat',
            identifier: 'default/code',
        }];
    defaultLanguageModelPurpose = 'chat';
    description = core_1.nls.localize('theia/ai/workspace/coderAgent/description', 'An AI assistant integrated into Theia IDE, designed to assist software developers. This agent can access the users workspace, it can get a list of all available files \
        and folders and retrieve their content. Furthermore, it can suggest modifications of files to the user. It can therefore assist the user with coding tasks or other \
        tasks involving file changes.');
    prompts = [{
            id: coder_replace_prompt_template_1.CODER_SYSTEM_PROMPT_ID,
            defaultVariant: (0, coder_replace_prompt_template_1.getCoderPromptTemplateEdit)(),
            variants: [(0, coder_replace_prompt_template_1.getCoderPromptTemplateSimpleEdit)(), (0, coder_replace_prompt_template_1.getCoderAgentModePromptTemplate)()]
        }];
    functions = [workspace_functions_1.GET_WORKSPACE_FILE_LIST_FUNCTION_ID, workspace_functions_1.FILE_CONTENT_FUNCTION_ID, file_changeset_functions_1.SuggestFileContent.ID];
    systemPromptId = coder_replace_prompt_template_1.CODER_SYSTEM_PROMPT_ID;
    async invoke(request) {
        await super.invoke(request);
        this.suggest(request);
    }
    async suggest(context) {
        const contextIsRequest = common_1.ChatRequestModel.is(context);
        const model = contextIsRequest ? context.session : context.model;
        const session = contextIsRequest ? this.chatService.getSessions().find(candidate => candidate.model.id === model.id) : context;
        if (!(model instanceof common_1.MutableChatModel) || !session) {
            return;
        }
        if (model.isEmpty()) {
            model.setSuggestions([
                {
                    kind: 'callback',
                    callback: () => this.chatService.sendRequest(session.id, { text: '@Coder please look at #_f and fix any problems.' }),
                    content: '[Fix problems](_callback) in the current file.'
                },
            ]);
        }
        else {
            model.setSuggestions([new markdown_rendering_1.MarkdownStringImpl(`Keep chats short and focused. [Start a new chat](command:${chat_view_commands_1.AI_CHAT_NEW_CHAT_WINDOW_COMMAND.id}) for a new task`
                    + ` or [start a new chat with a summary of this one](command:${chat_view_commands_1.ChatCommands.AI_CHAT_NEW_WITH_TASK_CONTEXT.id}).`)]);
        }
    }
};
exports.CoderAgent = CoderAgent;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], CoderAgent.prototype, "chatService", void 0);
exports.CoderAgent = CoderAgent = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CoderAgent);
//# sourceMappingURL=coder-agent.js.map