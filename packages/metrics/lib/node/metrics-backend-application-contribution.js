"use strict";
// *****************************************************************************
// Copyright (C) 2017-2018 Ericsson and others.
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
var MetricsBackendApplicationContribution_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsBackendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
const metrics_contribution_1 = require("./metrics-contribution");
let MetricsBackendApplicationContribution = MetricsBackendApplicationContribution_1 = class MetricsBackendApplicationContribution {
    constructor(metricsProviders) {
        this.metricsProviders = metricsProviders;
    }
    configure(app) {
        app.get(MetricsBackendApplicationContribution_1.ENDPOINT, (req, res) => {
            const lastMetrics = this.fetchMetricsFromProviders();
            res.send(lastMetrics);
        });
    }
    onStart(server) {
        this.metricsProviders.getContributions().forEach(contribution => {
            contribution.startCollecting();
        });
    }
    fetchMetricsFromProviders() {
        return this.metricsProviders.getContributions().reduce((total, contribution) => total += contribution.getMetrics() + '\n', '');
    }
};
exports.MetricsBackendApplicationContribution = MetricsBackendApplicationContribution;
MetricsBackendApplicationContribution.ENDPOINT = '/metrics';
exports.MetricsBackendApplicationContribution = MetricsBackendApplicationContribution = MetricsBackendApplicationContribution_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(common_1.ContributionProvider)),
    tslib_1.__param(0, (0, inversify_1.named)(metrics_contribution_1.MetricsContribution)),
    tslib_1.__metadata("design:paramtypes", [Object])
], MetricsBackendApplicationContribution);
//# sourceMappingURL=metrics-backend-application-contribution.js.map