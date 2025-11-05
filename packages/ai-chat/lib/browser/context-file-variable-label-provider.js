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
exports.ContextFileVariableLabelProvider = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const change_set_file_service_1 = require("./change-set-file-service");
let ContextFileVariableLabelProvider = class ContextFileVariableLabelProvider {
    canHandle(element) {
        if (ai_core_1.AIVariableResolutionRequest.is(element) && element.variable.name === 'file') {
            return 10;
        }
        return -1;
    }
    getIcon(element) {
        return this.labelProvider.getIcon(this.getUri(element));
    }
    getName(element) {
        return this.labelProvider.getName(this.getUri(element));
    }
    getLongName(element) {
        return this.labelProvider.getLongName(this.getUri(element));
    }
    getDetails(element) {
        return this.labelProvider.getDetails(this.getUri(element));
    }
    getUri(element) {
        if (!ai_core_1.AIVariableResolutionRequest.is(element)) {
            return undefined;
        }
        return new core_1.URI(element.arg);
    }
};
exports.ContextFileVariableLabelProvider = ContextFileVariableLabelProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LabelProvider),
    tslib_1.__metadata("design:type", browser_1.LabelProvider)
], ContextFileVariableLabelProvider.prototype, "labelProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_service_1.ChangeSetFileService),
    tslib_1.__metadata("design:type", change_set_file_service_1.ChangeSetFileService)
], ContextFileVariableLabelProvider.prototype, "changeSetFileService", void 0);
exports.ContextFileVariableLabelProvider = ContextFileVariableLabelProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ContextFileVariableLabelProvider);
//# sourceMappingURL=context-file-variable-label-provider.js.map