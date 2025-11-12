"use strict";
// *****************************************************************************
// Copyright (C) 2023 STMicroelectronics and others.
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
exports.MetricsElectronTokenValidator = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const electron_token_validator_1 = require("@theia/core/lib/electron-node/token/electron-token-validator");
const metrics_backend_application_contribution_1 = require("../node/metrics-backend-application-contribution");
let MetricsElectronTokenValidator = class MetricsElectronTokenValidator extends electron_token_validator_1.ElectronTokenValidator {
    init() {
        super.init();
    }
    allowWsUpgrade(request) {
        return this.allowRequest(request);
    }
    allowRequest(request) {
        return request.url === metrics_backend_application_contribution_1.MetricsBackendApplicationContribution.ENDPOINT || super.allowRequest(request);
    }
};
exports.MetricsElectronTokenValidator = MetricsElectronTokenValidator;
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MetricsElectronTokenValidator.prototype, "init", null);
exports.MetricsElectronTokenValidator = MetricsElectronTokenValidator = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MetricsElectronTokenValidator);
//# sourceMappingURL=electron-token-validator.js.map