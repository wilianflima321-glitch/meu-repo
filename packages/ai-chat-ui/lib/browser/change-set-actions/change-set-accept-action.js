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
exports.ChangeSetAcceptAction = void 0;
const tslib_1 = require("tslib");
const React = require("@theia/core/shared/react");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
let ChangeSetAcceptAction = class ChangeSetAcceptAction {
    constructor() {
        this.id = 'change-set-accept-action';
    }
    canRender(changeSet) {
        return changeSet.getElements().length > 0;
    }
    render(changeSet) {
        return React.createElement("button", { className: 'theia-button', disabled: !hasPendingElementsToAccept(changeSet), title: core_1.nls.localize('theia/ai/chat-ui/applyAllTitle', 'Apply all pending changes'), onClick: () => acceptAllPendingElements(changeSet) }, core_1.nls.localize('theia/ai/chat-ui/applyAll', 'Apply All'));
    }
};
exports.ChangeSetAcceptAction = ChangeSetAcceptAction;
exports.ChangeSetAcceptAction = ChangeSetAcceptAction = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetAcceptAction);
function acceptAllPendingElements(changeSet) {
    acceptablePendingElements(changeSet).forEach(e => e.apply());
}
function hasPendingElementsToAccept(changeSet) {
    return acceptablePendingElements(changeSet).length > 0;
}
function acceptablePendingElements(changeSet) {
    return changeSet.getElements().filter(e => e.apply && (e.state === undefined || e.state === 'pending'));
}
//# sourceMappingURL=change-set-accept-action.js.map