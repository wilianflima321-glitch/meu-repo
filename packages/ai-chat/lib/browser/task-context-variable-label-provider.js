"use strict";
// *****************************************************************************
// Copyright (C) 2025 Eclipse GmbH and others.
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
exports.TaskContextVariableLabelProvider = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const task_context_variable_contribution_1 = require("./task-context-variable-contribution");
const common_1 = require("../common");
const task_context_service_1 = require("./task-context-service");
const task_context_variable_1 = require("./task-context-variable");
let TaskContextVariableLabelProvider = class TaskContextVariableLabelProvider {
    isMine(element) {
        return ai_core_1.AIVariableResolutionRequest.is(element) && element.variable.id === task_context_variable_1.TASK_CONTEXT_VARIABLE.id && !!element.arg;
    }
    canHandle(element) {
        return this.isMine(element) ? 10 : -1;
    }
    getIcon(element) {
        if (!this.isMine(element)) {
            return undefined;
        }
        return (0, browser_1.codicon)('clippy');
    }
    getName(element) {
        var _a, _b, _c;
        if (!this.isMine(element)) {
            return undefined;
        }
        const session = this.chatService.getSession(element.arg);
        return (_c = (_b = (_a = session === null || session === void 0 ? void 0 : session.title) !== null && _a !== void 0 ? _a : this.taskContextService.getLabel(element.arg)) !== null && _b !== void 0 ? _b : session === null || session === void 0 ? void 0 : session.id) !== null && _c !== void 0 ? _c : element.arg;
    }
    getLongName(element) {
        const short = this.getName(element);
        const details = this.getDetails(element);
        return `'${short}' (${details})`;
    }
    getDetails(element) {
        if (!this.isMine(element)) {
            return undefined;
        }
        return `id: ${element.arg}`;
    }
    getUri(element) {
        if (!ai_core_1.AIVariableResolutionRequest.is(element)) {
            return undefined;
        }
        return new core_1.URI(element.arg);
    }
};
exports.TaskContextVariableLabelProvider = TaskContextVariableLabelProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], TaskContextVariableLabelProvider.prototype, "chatService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_variable_contribution_1.TaskContextVariableContribution),
    tslib_1.__metadata("design:type", task_context_variable_contribution_1.TaskContextVariableContribution)
], TaskContextVariableLabelProvider.prototype, "chatVariableContribution", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(task_context_service_1.TaskContextService),
    tslib_1.__metadata("design:type", task_context_service_1.TaskContextService)
], TaskContextVariableLabelProvider.prototype, "taskContextService", void 0);
exports.TaskContextVariableLabelProvider = TaskContextVariableLabelProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskContextVariableLabelProvider);
//# sourceMappingURL=task-context-variable-label-provider.js.map