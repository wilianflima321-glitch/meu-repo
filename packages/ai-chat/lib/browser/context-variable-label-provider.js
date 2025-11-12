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
exports.ContextVariableLabelProvider = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
let ContextVariableLabelProvider = class ContextVariableLabelProvider {
    canHandle(element) {
        if (ai_core_1.AIVariableResolutionRequest.is(element)) {
            return 1;
        }
        return -1;
    }
    getIcon(element) {
        return 'codicon codicon-variable';
    }
    getName(element) {
        if (!ai_core_1.AIVariableResolutionRequest.is(element)) {
            return undefined;
        }
        return element.variable.name;
    }
    getLongName(element) {
        if (!ai_core_1.AIVariableResolutionRequest.is(element)) {
            return undefined;
        }
        return element.variable.name + (element.arg ? ':' + element.arg : '');
    }
    getDetails(element) {
        if (!ai_core_1.AIVariableResolutionRequest.is(element)) {
            return undefined;
        }
        return element.arg;
    }
};
exports.ContextVariableLabelProvider = ContextVariableLabelProvider;
exports.ContextVariableLabelProvider = ContextVariableLabelProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextVariableLabelProvider);
//# sourceMappingURL=context-variable-label-provider.js.map