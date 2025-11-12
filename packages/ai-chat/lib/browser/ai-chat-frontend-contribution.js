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
exports.AIChatFrontendContribution = exports.VARIABLE_ADD_CONTEXT_COMMAND = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
exports.VARIABLE_ADD_CONTEXT_COMMAND = core_1.Command.toLocalizedCommand({
    id: 'add-context-variable',
    label: 'Add context variable'
}, 'theia/ai/chat-ui/addContextVariable');
let AIChatFrontendContribution = class AIChatFrontendContribution {
    registerCommands(registry) {
        registry.registerCommand(exports.VARIABLE_ADD_CONTEXT_COMMAND, {
            execute: (...args) => args.length > 1 && this.addContextVariable(args[0], args[1]),
            isVisible: () => false,
        });
    }
    async addContextVariable(variableName, arg) {
        var _a;
        const variable = this.variableService.getVariable(variableName);
        if (!variable || !ai_core_1.AIContextVariable.is(variable)) {
            return;
        }
        (_a = this.chatService.getActiveSession()) === null || _a === void 0 ? void 0 : _a.model.context.addVariables({ variable, arg });
    }
};
exports.AIChatFrontendContribution = AIChatFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.AIVariableService),
    tslib_1.__metadata("design:type", Object)
], AIChatFrontendContribution.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.ChatService),
    tslib_1.__metadata("design:type", Object)
], AIChatFrontendContribution.prototype, "chatService", void 0);
exports.AIChatFrontendContribution = AIChatFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIChatFrontendContribution);
//# sourceMappingURL=ai-chat-frontend-contribution.js.map