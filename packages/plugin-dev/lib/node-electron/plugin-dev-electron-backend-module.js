"use strict";
// *****************************************************************************
// Copyright (C) 2019 Red Hat, Inc. and others.
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
const hosted_instance_manager_1 = require("../node/hosted-instance-manager");
const inversify_1 = require("@theia/core/shared/inversify");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const plugin_dev_backend_module_1 = require("../node/plugin-dev-backend-module");
const hostedBackendConnectionModule = connection_container_module_1.ConnectionContainerModule.create(({ bind }) => {
    bind(hosted_instance_manager_1.HostedInstanceManager).to(hosted_instance_manager_1.ElectronNodeHostedPluginRunner);
});
exports.default = new inversify_1.ContainerModule(bind => {
    (0, plugin_dev_backend_module_1.bindCommonHostedBackend)(bind);
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(hostedBackendConnectionModule);
});
//# sourceMappingURL=plugin-dev-electron-backend-module.js.map