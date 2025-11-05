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
const browser_1 = require("@theia/core/lib/browser");
const mcp_server_manager_1 = require("../common/mcp-server-manager");
const mcp_frontend_application_contribution_1 = require("./mcp-frontend-application-contribution");
const mcp_frontend_service_1 = require("./mcp-frontend-service");
const mcp_frontend_notification_service_1 = require("./mcp-frontend-notification-service");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(browser_1.FrontendApplicationContribution).to(mcp_frontend_application_contribution_1.McpFrontendApplicationContribution).inSingletonScope();
    bind(mcp_server_manager_1.MCPFrontendService).to(mcp_frontend_service_1.MCPFrontendServiceImpl).inSingletonScope();
    bind(mcp_server_manager_1.MCPFrontendNotificationService).to(mcp_frontend_notification_service_1.MCPFrontendNotificationServiceImpl).inSingletonScope();
    bind(mcp_server_manager_1.MCPServerManager).toDynamicValue(ctx => {
        const connection = ctx.container.get(browser_1.RemoteConnectionProvider);
        const client = ctx.container.get(mcp_server_manager_1.MCPFrontendNotificationService);
        return connection.createProxy(mcp_server_manager_1.MCPServerManagerPath, client);
    }).inSingletonScope();
});
//# sourceMappingURL=mcp-frontend-module.js.map