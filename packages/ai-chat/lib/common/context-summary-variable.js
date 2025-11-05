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
exports.ContextSummaryVariableContribution = exports.CONTEXT_SUMMARY_VARIABLE = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_string_utils_1 = require("./chat-string-utils");
const chat_agents_1 = require("./chat-agents");
exports.CONTEXT_SUMMARY_VARIABLE = {
    id: 'contextSummary',
    description: core_1.nls.localize('theia/ai/core/contextSummaryVariable/description', 'Describes files in the context for a given session.'),
    name: 'contextSummary',
};
let ContextSummaryVariableContribution = class ContextSummaryVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.CONTEXT_SUMMARY_VARIABLE, this);
    }
    canResolve(request, context) {
        return request.variable.name === exports.CONTEXT_SUMMARY_VARIABLE.name ? 50 : 0;
    }
    async resolve(request, context) {
        if (!chat_agents_1.ChatSessionContext.is(context) || request.variable.name !== exports.CONTEXT_SUMMARY_VARIABLE.name) {
            return undefined;
        }
        const data = chat_agents_1.ChatSessionContext.getVariables(context).filter(variable => variable.variable.isContextVariable)
            .map(variable => ({
            type: variable.variable.name,
            // eslint-disable-next-line no-null/no-null
            instanceData: variable.arg || null,
            contextElementId: variable.variable.id + variable.arg
        }));
        return {
            variable: exports.CONTEXT_SUMMARY_VARIABLE,
            value: (0, chat_string_utils_1.dataToJsonCodeBlock)(data)
        };
    }
};
exports.ContextSummaryVariableContribution = ContextSummaryVariableContribution;
exports.ContextSummaryVariableContribution = ContextSummaryVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextSummaryVariableContribution);
//# sourceMappingURL=context-summary-variable.js.map