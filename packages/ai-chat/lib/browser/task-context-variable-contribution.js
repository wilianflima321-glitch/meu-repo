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
exports.TaskContextVariableContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/ai-core/lib/browser");
const core_1 = require("@theia/core");
const common_1 = require("../common");
const monaco = require("@theia/monaco-editor-core");
const task_context_service_1 = require("./task-context-service");
const task_context_variable_1 = require("./task-context-variable");
const ai_chat_frontend_contribution_1 = require("./ai-chat-frontend-contribution");
let TaskContextVariableContribution = class TaskContextVariableContribution {
    registerVariables(service) {
        service.registerResolver(task_context_variable_1.TASK_CONTEXT_VARIABLE, this);
        service.registerArgumentPicker(task_context_variable_1.TASK_CONTEXT_VARIABLE, this.pickSession.bind(this));
        service.registerArgumentCompletionProvider(task_context_variable_1.TASK_CONTEXT_VARIABLE, this.provideCompletionItems.bind(this));
        service.registerOpener(task_context_variable_1.TASK_CONTEXT_VARIABLE, this);
    }
    async pickSession() {
        const items = this.getItems();
        const selection = await this.quickInputService.showQuickPick(items);
        return selection === null || selection === void 0 ? void 0 : selection.id;
    }
    async provideCompletionItems(model, position, matchString) {
        const context = browser_1.AIVariableCompletionContext.get(task_context_variable_1.TASK_CONTEXT_VARIABLE.name, model, position, matchString);
        if (!context) {
            return undefined;
        }
        const { userInput, range, prefix } = context;
        return this.getItems().filter(candidate => core_1.QuickPickItem.is(candidate) && candidate.label.startsWith(userInput)).map(({ label, id }) => ({
            label,
            kind: monaco.languages.CompletionItemKind.Class,
            range,
            insertText: `${prefix}${id}`,
            detail: id,
            filterText: userInput,
            command: {
                title: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.label,
                id: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.id,
                arguments: [task_context_variable_1.TASK_CONTEXT_VARIABLE.name, id]
            }
        }));
    }
    getItems() {
        const currentSession = this.chatService.getSessions().find(candidate => candidate.isActive);
        const existingSummaries = this.taskContextService.getAll().filter(candidate => !currentSession || currentSession.id !== candidate.sessionId);
        return existingSummaries;
    }
    canResolve(request, context) {
        return request.variable.id === task_context_variable_1.TASK_CONTEXT_VARIABLE.id ? 10000 : -5;
    }
    async resolve(request, _context) {
        if (request.variable.id !== task_context_variable_1.TASK_CONTEXT_VARIABLE.id || !request.arg) {
            return;
        }
        const value = await this.taskContextService.getSummary(request.arg).catch(() => undefined);
        return value ? { ...request, value, contextValue: value } : undefined;
    }
    canOpen(request, context) {
        return this.canResolve(request, context);
    }
    async open(request, _context) {
        if (request.variable.id !== task_context_variable_1.TASK_CONTEXT_VARIABLE.id || !request.arg) {
            throw new Error('Unable to service open request.');
        }
        return this.taskContextService.open(request.arg);
    }
};
exports.TaskContextVariableContribution = TaskContextVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], TaskContextVariableContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], TaskContextVariableContribution.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_service_1.TaskContextService),
    tslib_1.__metadata("design:type", task_context_service_1.TaskContextService)
], TaskContextVariableContribution.prototype, "taskContextService", void 0);
exports.TaskContextVariableContribution = TaskContextVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskContextVariableContribution);
//# sourceMappingURL=task-context-variable-contribution.js.map