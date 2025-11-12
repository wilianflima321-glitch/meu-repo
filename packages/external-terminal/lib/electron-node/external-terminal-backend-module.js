"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
exports.bindExternalTerminalService = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
const os_1 = require("@theia/core/lib/common/os");
const external_terminal_1 = require("../common/external-terminal");
const mac_external_terminal_service_1 = require("./mac-external-terminal-service");
const linux_external_terminal_service_1 = require("./linux-external-terminal-service");
const windows_external_terminal_service_1 = require("./windows-external-terminal-service");
function bindExternalTerminalService(bind) {
    const serviceProvider = os_1.isWindows ? windows_external_terminal_service_1.WindowsExternalTerminalService : os_1.isOSX ? mac_external_terminal_service_1.MacExternalTerminalService : linux_external_terminal_service_1.LinuxExternalTerminalService;
    bind(serviceProvider).toSelf().inSingletonScope();
    bind(external_terminal_1.ExternalTerminalService).toService(serviceProvider);
    bind(common_1.ConnectionHandler).toDynamicValue(ctx => new common_1.RpcConnectionHandler(external_terminal_1.externalTerminalServicePath, () => ctx.container.get(external_terminal_1.ExternalTerminalService))).inSingletonScope();
}
exports.bindExternalTerminalService = bindExternalTerminalService;
exports.default = new inversify_1.ContainerModule(bind => {
    bindExternalTerminalService(bind);
});
//# sourceMappingURL=external-terminal-backend-module.js.map