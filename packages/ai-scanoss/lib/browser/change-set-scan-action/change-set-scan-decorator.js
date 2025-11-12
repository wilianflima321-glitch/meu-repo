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
exports.ChangeSetScanDecorator = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
let ChangeSetScanDecorator = class ChangeSetScanDecorator {
    constructor() {
        this.id = 'thei-change-set-scanoss-decorator';
        this.emitter = new core_1.Emitter();
        this.onDidChangeDecorations = this.emitter.event;
        this.scanResult = [];
    }
    setScanResult(results) {
        this.scanResult = results;
        this.emitter.fire();
    }
    decorate(element) {
        const match = this.scanResult.find(result => {
            if (result.type === 'match') {
                return result.file === element.uri.path.toString();
            }
            return false;
        });
        if (match) {
            return {
                additionalInfoSuffixIcon: ['additional-info-scanoss-icon', 'match', 'codicon', 'codicon-warning'],
            };
        }
        return undefined;
    }
};
exports.ChangeSetScanDecorator = ChangeSetScanDecorator;
exports.ChangeSetScanDecorator = ChangeSetScanDecorator = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChangeSetScanDecorator);
//# sourceMappingURL=change-set-scan-decorator.js.map