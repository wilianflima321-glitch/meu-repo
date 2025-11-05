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
var ChatSessionSummaryAgent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionSummaryAgent = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agents_1 = require("./chat-agents");
const chat_session_summary_agent_prompt_1 = require("./chat-session-summary-agent-prompt");
let ChatSessionSummaryAgent = ChatSessionSummaryAgent_1 = class ChatSessionSummaryAgent extends chat_agents_1.AbstractStreamParsingChatAgent {
    constructor() {
        super(...arguments);
        this.id = ChatSessionSummaryAgent_1.ID;
        this.name = 'Chat Session Summary';
        this.description = 'Agent for generating chat session summaries.';
        this.variables = [];
        this.prompts = [chat_session_summary_agent_prompt_1.CHAT_SESSION_SUMMARY_PROMPT];
        this.defaultLanguageModelPurpose = 'chat-session-summary';
        this.languageModelRequirements = [{
                purpose: 'chat-session-summary',
                identifier: 'default/summarize',
            }];
        this.agentSpecificVariables = [];
        this.functions = [];
        this.locations = [];
        this.tags = [];
    }
};
exports.ChatSessionSummaryAgent = ChatSessionSummaryAgent;
ChatSessionSummaryAgent.ID = 'chat-session-summary-agent';
exports.ChatSessionSummaryAgent = ChatSessionSummaryAgent = ChatSessionSummaryAgent_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatSessionSummaryAgent);
//# sourceMappingURL=chat-session-summary-agent.js.map