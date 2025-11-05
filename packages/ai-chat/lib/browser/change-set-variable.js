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
exports.ChangeSetVariableContribution = exports.CHANGE_SET_SUMMARY_VARIABLE = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/workspace/lib/browser");
const common_1 = require("../common");
exports.CHANGE_SET_SUMMARY_VARIABLE = {
    id: common_1.CHANGE_SET_SUMMARY_VARIABLE_ID,
    description: core_1.nls.localize('theia/ai/core/changeSetSummaryVariable/description', 'Provides a summary of the files in a change set and their contents.'),
    name: common_1.CHANGE_SET_SUMMARY_VARIABLE_ID,
};
let ChangeSetVariableContribution = class ChangeSetVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.CHANGE_SET_SUMMARY_VARIABLE, this);
    }
    canResolve(request, context) {
        return request.variable.name === exports.CHANGE_SET_SUMMARY_VARIABLE.name ? 50 : 0;
    }
    async resolve(request, context) {
        if (!common_1.ChatSessionContext.is(context) || request.variable.name !== exports.CHANGE_SET_SUMMARY_VARIABLE.name) {
            return undefined;
        }
        if (!context.model.changeSet.getElements().length) {
            return {
                variable: exports.CHANGE_SET_SUMMARY_VARIABLE,
                value: ''
            };
        }
        const entries = await Promise.all(context.model.changeSet.getElements().map(async (element) => `- file: ${await this.workspaceService.getWorkspaceRelativePath(element.uri)}, status: ${element.state}`));
        return {
            variable: exports.CHANGE_SET_SUMMARY_VARIABLE,
            value: `## Previously Proposed Changes
You have previously proposed changes for the following files. Some suggestions may have been accepted by the user, while others may still be pending.
${entries.join('\n')}
`
        };
    }
};
exports.ChangeSetVariableContribution = ChangeSetVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    tslib_1.__metadata("design:type", browser_1.WorkspaceService)
], ChangeSetVariableContribution.prototype, "workspaceService", void 0);
exports.ChangeSetVariableContribution = ChangeSetVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetVariableContribution);
//# sourceMappingURL=change-set-variable.js.map