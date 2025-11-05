"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
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
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const coreutils_1 = require("@theia/core/shared/@lumino/coreutils");
const common_1 = require("../common");
let MetricsFrontendApplicationContribution = class MetricsFrontendApplicationContribution {
    constructor() {
        this.id = coreutils_1.UUID.uuid4();
    }
    initialize() {
        this.doInitialize();
    }
    async doInitialize() {
        const logLevel = await this.logger.getLogLevel();
        if (logLevel !== core_1.LogLevel.DEBUG) {
            return;
        }
        this.stopwatch.storedMeasurements.forEach(result => this.notify(result));
        this.stopwatch.onDidAddMeasurementResult(result => this.notify(result));
    }
    notify(result) {
        this.notificationService.onFrontendMeasurement(this.id, result);
    }
};
exports.MetricsFrontendApplicationContribution = MetricsFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.Stopwatch),
    tslib_1.__metadata("design:type", core_1.Stopwatch)
], MetricsFrontendApplicationContribution.prototype, "stopwatch", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.MeasurementNotificationService),
    tslib_1.__metadata("design:type", Object)
], MetricsFrontendApplicationContribution.prototype, "notificationService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], MetricsFrontendApplicationContribution.prototype, "logger", void 0);
exports.MetricsFrontendApplicationContribution = MetricsFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MetricsFrontendApplicationContribution);
//# sourceMappingURL=metrics-frontend-application-contribution.js.map