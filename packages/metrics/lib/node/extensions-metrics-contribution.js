"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionMetricsContribution = void 0;
const tslib_1 = require("tslib");
// *****************************************************************************
// Copyright (C) 2018 Ericsson and others.
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
const application_package_1 = require("@theia/core/shared/@theia/application-package");
const prometheus_1 = require("./prometheus");
const metricsName = 'theia_extension_version';
let ExtensionMetricsContribution = class ExtensionMetricsContribution {
    constructor() {
        this.metrics = '';
    }
    getMetrics() {
        return this.metrics;
    }
    startCollecting() {
        let latestMetrics = '';
        const installedExtensions = this.applicationPackage.extensionPackages;
        latestMetrics += `# HELP ${metricsName} Theia extension version info.\n`;
        latestMetrics += `# TYPE ${metricsName} gauge\n`;
        installedExtensions.forEach(extensionInfo => {
            let extensionName = extensionInfo.name;
            if (!prometheus_1.PROMETHEUS_REGEXP.test(extensionName)) {
                extensionName = (0, prometheus_1.toPrometheusValidName)(extensionName);
            }
            const metricsValue = metricsName + `{extension="${extensionName}",version="${extensionInfo.version}"} 1`;
            latestMetrics += metricsValue + '\n';
        });
        this.metrics = latestMetrics;
    }
};
exports.ExtensionMetricsContribution = ExtensionMetricsContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(application_package_1.ApplicationPackage),
    tslib_1.__metadata("design:type", application_package_1.ApplicationPackage)
], ExtensionMetricsContribution.prototype, "applicationPackage", void 0);
exports.ExtensionMetricsContribution = ExtensionMetricsContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ExtensionMetricsContribution);
//# sourceMappingURL=extensions-metrics-contribution.js.map