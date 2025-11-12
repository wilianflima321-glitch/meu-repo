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
exports.ContextFilesVariableContribution = exports.CONTEXT_FILES_VARIABLE = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_chat_1 = require("@theia/ai-chat");
const context_variables_1 = require("./context-variables");
exports.CONTEXT_FILES_VARIABLE = {
    id: context_variables_1.CONTEXT_FILES_VARIABLE_ID,
    description: core_1.nls.localize('theia/ai/core/contextSummaryVariable/description', 'Describes files in the context for a given session.'),
    name: context_variables_1.CONTEXT_FILES_VARIABLE_ID,
};
let ContextFilesVariableContribution = class ContextFilesVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.CONTEXT_FILES_VARIABLE, this);
    }
    canResolve(request, context) {
        return request.variable.name === exports.CONTEXT_FILES_VARIABLE.name ? 50 : 0;
    }
    async resolve(request, context) {
        if (!ai_chat_1.ChatSessionContext.is(context) || request.variable.name !== exports.CONTEXT_FILES_VARIABLE.name) {
            return undefined;
        }
        const variables = ai_chat_1.ChatSessionContext.getVariables(context);
        return {
            variable: exports.CONTEXT_FILES_VARIABLE,
            value: variables.filter(variable => variable.variable.name === 'file' && !!variable.arg)
                .map(variable => `- ${variable.arg}`).join('\n')
        };
    }
};
exports.ContextFilesVariableContribution = ContextFilesVariableContribution;
exports.ContextFilesVariableContribution = ContextFilesVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextFilesVariableContribution);
//# sourceMappingURL=context-files-variable.js.map