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
exports.ContextDetailsVariableContribution = exports.CONTEXT_DETAILS_VARIABLE = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_string_utils_1 = require("./chat-string-utils");
const chat_agents_1 = require("./chat-agents");
const context_variables_1 = require("./context-variables");
exports.CONTEXT_DETAILS_VARIABLE = {
    id: context_variables_1.CHAT_CONTEXT_DETAILS_VARIABLE_ID,
    description: core_1.nls.localize('theia/ai/core/contextDetailsVariable/description', 'Provides full text values and descriptions for all context elements.'),
    name: context_variables_1.CHAT_CONTEXT_DETAILS_VARIABLE_ID,
};
let ContextDetailsVariableContribution = class ContextDetailsVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.CONTEXT_DETAILS_VARIABLE, this);
    }
    canResolve(request, context) {
        return request.variable.name === exports.CONTEXT_DETAILS_VARIABLE.name ? 50 : 0;
    }
    async resolve(request, context) {
        /** By expecting context.request, we're assuming that this variable will not be resolved until the context has been resolved. */
        if (!chat_agents_1.ChatSessionContext.is(context) || request.variable.name !== exports.CONTEXT_DETAILS_VARIABLE.name || !context.request) {
            return undefined;
        }
        const data = context.request.context.variables.map(variable => ({
            type: variable.variable.name,
            ref: variable.value,
            content: variable.contextValue
        }));
        return {
            variable: exports.CONTEXT_DETAILS_VARIABLE,
            value: (0, chat_string_utils_1.dataToJsonCodeBlock)(data)
        };
    }
};
exports.ContextDetailsVariableContribution = ContextDetailsVariableContribution;
exports.ContextDetailsVariableContribution = ContextDetailsVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextDetailsVariableContribution);
//# sourceMappingURL=context-details-variable.js.map