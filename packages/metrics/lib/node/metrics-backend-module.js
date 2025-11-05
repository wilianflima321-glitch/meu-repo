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
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("@theia/core/shared/inversify");
const node_1 = require("@theia/core/lib/node");
const common_1 = require("@theia/core/lib/common");
const metrics_contribution_1 = require("./metrics-contribution");
const node_metrics_contribution_1 = require("./node-metrics-contribution");
const extensions_metrics_contribution_1 = require("./extensions-metrics-contribution");
const metrics_backend_application_contribution_1 = require("./metrics-backend-application-contribution");
const common_2 = require("../common");
const measurement_metrics_contribution_1 = require("./measurement-metrics-contribution");
exports.default = new inversify_1.ContainerModule(bind => {
    (0, common_1.bindContributionProvider)(bind, metrics_contribution_1.MetricsContribution);
    bind(metrics_contribution_1.MetricsContribution).to(node_metrics_contribution_1.NodeMetricsContribution).inSingletonScope();
    bind(metrics_contribution_1.MetricsContribution).to(extensions_metrics_contribution_1.ExtensionMetricsContribution).inSingletonScope();
    bind(measurement_metrics_contribution_1.MeasurementMetricsBackendContribution).toSelf().inSingletonScope();
    bind(metrics_contribution_1.MetricsContribution).toService(measurement_metrics_contribution_1.MeasurementMetricsBackendContribution);
    bind(common_1.ConnectionHandler).toDynamicValue(ctx => new common_1.RpcConnectionHandler(common_2.measurementNotificationServicePath, () => ctx.container.get(measurement_metrics_contribution_1.MeasurementMetricsBackendContribution)));
    bind(node_1.BackendApplicationContribution).to(metrics_backend_application_contribution_1.MetricsBackendApplicationContribution).inSingletonScope();
});
//# sourceMappingURL=metrics-backend-module.js.map