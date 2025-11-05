"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
const core_1 = require("@theia/core");
const common_1 = require("../common");
const scanoss_service_impl_1 = require("./scanoss-service-impl");
const scanoss_preferences_1 = require("../common/scanoss-preferences");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(core_1.PreferenceContribution).toConstantValue({ schema: scanoss_preferences_1.ScanOSSPreferencesSchema });
    bind(scanoss_service_impl_1.ScanOSSServiceImpl).toSelf().inSingletonScope();
    bind(common_1.ScanOSSService).toService(scanoss_service_impl_1.ScanOSSServiceImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(common_1.SCANOSS_SERVICE_PATH, () => ctx.container.get(common_1.ScanOSSService))).inSingletonScope();
});
//# sourceMappingURL=scanoss-backend-module.js.map