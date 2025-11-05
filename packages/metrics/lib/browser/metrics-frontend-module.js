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
const inversify_1 = require("@theia/core/shared/inversify");
const metrics_frontend_application_contribution_1 = require("./metrics-frontend-application-contribution");
const common_1 = require("../common");
const browser_1 = require("@theia/core/lib/browser");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(browser_1.FrontendApplicationContribution).to(metrics_frontend_application_contribution_1.MetricsFrontendApplicationContribution).inSingletonScope();
    bind(common_1.MeasurementNotificationService).toDynamicValue(ctx => {
        const connection = ctx.container.get(browser_1.WebSocketConnectionProvider);
        return connection.createProxy(common_1.measurementNotificationServicePath);
    }).inSingletonScope();
});
//# sourceMappingURL=metrics-frontend-module.js.map