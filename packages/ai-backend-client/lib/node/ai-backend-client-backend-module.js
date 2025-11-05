"use strict";
// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("@theia/core/shared/inversify");
const aethel_backend_service_1 = require("./aethel-backend-service");
const node_1 = require("@theia/core/lib/node");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(aethel_backend_service_1.AethelBackendService).toSelf().inSingletonScope();
    bind(node_1.BackendApplicationContribution).toService(aethel_backend_service_1.AethelBackendService);
});
//# sourceMappingURL=ai-backend-client-backend-module.js.map