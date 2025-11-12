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
exports.AICodeInlineCompletionsProvider = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const code_completion_agent_1 = require("./code-completion-agent");
const ai_core_1 = require("@theia/ai-core");
let AICodeInlineCompletionsProvider = class AICodeInlineCompletionsProvider {
    async provideInlineCompletions(model, position, context, token) {
        if (!this.agentService.isEnabled(this.agent.id)) {
            return undefined;
        }
        return this.agent.provideInlineCompletions(model, position, context, token);
    }
    freeInlineCompletions(completions) {
        // nothing to do
    }
};
exports.AICodeInlineCompletionsProvider = AICodeInlineCompletionsProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(code_completion_agent_1.CodeCompletionAgent),
    tslib_1.__metadata("design:type", Object)
], AICodeInlineCompletionsProvider.prototype, "agent", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AgentService),
    tslib_1.__metadata("design:type", Object)
], AICodeInlineCompletionsProvider.prototype, "agentService", void 0);
exports.AICodeInlineCompletionsProvider = AICodeInlineCompletionsProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AICodeInlineCompletionsProvider);
//# sourceMappingURL=ai-code-inline-completion-provider.js.map