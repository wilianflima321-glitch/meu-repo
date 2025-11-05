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
exports.TaskContextSummaryVariableContribution = exports.TASK_CONTEXT_SUMMARY_VARIABLE = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_chat_1 = require("@theia/ai-chat");
const task_context_variable_1 = require("@theia/ai-chat/lib/browser/task-context-variable");
const context_variables_1 = require("../common/context-variables");
exports.TASK_CONTEXT_SUMMARY_VARIABLE = {
    id: context_variables_1.TASK_CONTEXT_SUMMARY_VARIABLE_ID,
    description: core_1.nls.localize('theia/ai/core/taskContextSummary/description', 'Resolves all task context items present in the session context.'),
    name: context_variables_1.TASK_CONTEXT_SUMMARY_VARIABLE_ID,
};
let TaskContextSummaryVariableContribution = class TaskContextSummaryVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.TASK_CONTEXT_SUMMARY_VARIABLE, this);
    }
    canResolve(request, context) {
        return request.variable.name === exports.TASK_CONTEXT_SUMMARY_VARIABLE.name ? 50 : 0;
    }
    async resolve(request, context, resolveDependency) {
        if (!resolveDependency || !ai_chat_1.ChatSessionContext.is(context) || request.variable.name !== exports.TASK_CONTEXT_SUMMARY_VARIABLE.name) {
            return undefined;
        }
        const allSummaryRequests = context.model.context.getVariables().filter(candidate => candidate.variable.id === task_context_variable_1.TASK_CONTEXT_VARIABLE.id);
        if (!allSummaryRequests.length) {
            return { ...request, value: '' };
        }
        const allSummaries = await Promise.all(allSummaryRequests.map(summaryRequest => resolveDependency(summaryRequest).then(resolved => resolved?.value)));
        const value = `# Current Task Context\n\n${allSummaries.map((content, index) => `## Task ${index + 1}\n\n${content}`).join('\n\n')}`;
        return {
            ...request,
            value
        };
    }
};
exports.TaskContextSummaryVariableContribution = TaskContextSummaryVariableContribution;
exports.TaskContextSummaryVariableContribution = TaskContextSummaryVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
    /**
     * @class provides a summary of all TaskContextVariables in the context of a given session. Oriented towards use in prompts.
     */
], TaskContextSummaryVariableContribution);
//# sourceMappingURL=task-background-summary-variable.js.map