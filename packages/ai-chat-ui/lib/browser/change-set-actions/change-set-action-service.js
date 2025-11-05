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
exports.ChangeSetActionService = exports.ChangeSetActionRenderer = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
exports.ChangeSetActionRenderer = Symbol('ChangeSetActionRenderer');
let ChangeSetActionService = class ChangeSetActionService {
    constructor() {
        this.onDidChangeEmitter = new core_1.Emitter();
    }
    get onDidChange() {
        return this.onDidChangeEmitter.event;
    }
    init() {
        const actions = this.contributions.getContributions();
        actions.sort((a, b) => { var _a, _b; return ((_a = b.priority) !== null && _a !== void 0 ? _a : 0) - ((_b = a.priority) !== null && _b !== void 0 ? _b : 0); });
        actions.forEach(contribution => { var _a; return (_a = contribution.onDidChange) === null || _a === void 0 ? void 0 : _a.call(contribution, this.onDidChangeEmitter.fire, this.onDidChangeEmitter); });
    }
    getActions() {
        return this.contributions.getContributions();
    }
    getActionsForChangeset(changeSet) {
        return this.getActions().filter(candidate => !candidate.canRender || candidate.canRender(changeSet));
    }
};
exports.ChangeSetActionService = ChangeSetActionService;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(exports.ChangeSetActionRenderer),
    tslib_1.__metadata("design:type", Object)
], ChangeSetActionService.prototype, "contributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChangeSetActionService.prototype, "init", null);
exports.ChangeSetActionService = ChangeSetActionService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetActionService);
//# sourceMappingURL=change-set-action-service.js.map