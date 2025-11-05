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
exports.ChangeSetDecoratorService = exports.ChangeSetDecorator = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const debounce = require("@theia/core/shared/lodash.debounce");
/**
 * A decorator for a change set element.
 * It allows to add additional information to the element, such as icons.
 */
exports.ChangeSetDecorator = Symbol('ChangeSetDecorator');
let ChangeSetDecoratorService = class ChangeSetDecoratorService {
    constructor() {
        this.onDidChangeDecorationsEmitter = new core_1.Emitter();
        this.onDidChangeDecorations = this.onDidChangeDecorationsEmitter.event;
        this.fireDidChangeDecorations = debounce(() => {
            this.onDidChangeDecorationsEmitter.fire(undefined);
        }, 150);
    }
    initialize() {
        this.contributions.getContributions().map(decorator => decorator.onDidChangeDecorations(this.fireDidChangeDecorations));
    }
    getDecorations(element) {
        const decorators = this.contributions.getContributions();
        const decorations = [];
        for (const decorator of decorators) {
            const decoration = decorator.decorate(element);
            if (decoration) {
                decorations.push(decoration);
            }
        }
        decorations.sort((a, b) => { var _a, _b; return ((_a = b.priority) !== null && _a !== void 0 ? _a : 0) - ((_b = a.priority) !== null && _b !== void 0 ? _b : 0); });
        return decorations;
    }
    getAdditionalInfoSuffixIcon(element) {
        var _a;
        const decorations = this.getDecorations(element);
        return (_a = decorations.find(d => d.additionalInfoSuffixIcon)) === null || _a === void 0 ? void 0 : _a.additionalInfoSuffixIcon;
    }
};
exports.ChangeSetDecoratorService = ChangeSetDecoratorService;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(exports.ChangeSetDecorator),
    tslib_1.__metadata("design:type", Object)
], ChangeSetDecoratorService.prototype, "contributions", void 0);
exports.ChangeSetDecoratorService = ChangeSetDecoratorService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetDecoratorService);
//# sourceMappingURL=change-set-decorator-service.js.map