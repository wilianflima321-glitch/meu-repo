"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_automation_protocol_1 = require("../common/browser-automation-protocol");
const browser_automation_impl_1 = require("./app-tester-agent/browser-automation-impl");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const workspace_preferences_1 = require("../common/workspace-preferences");
const ai_configuration_preferences_1 = require("../common/ai-configuration-preferences");
const ai_ide_preferences_1 = require("../common/ai-ide-preferences");
const workspace_executor_service_1 = require("./workspace-executor-service");
const browserAutomationModule = connection_container_module_1.ConnectionContainerModule.create(({ bind, bindBackendService, bindFrontendService }) => {
    // Mark unused injected helpers as referenced to avoid lint warnings in this conservative change set.
    void bindBackendService;
    void bindFrontendService;
    bind(browser_automation_protocol_1.BrowserAutomation).to(browser_automation_impl_1.BrowserAutomationImpl).inSingletonScope();
    bind(core_1.ConnectionHandler).toDynamicValue((ctx) => new core_1.RpcConnectionHandler(browser_automation_protocol_1.browserAutomationPath, (client) => {
        const server = ctx.container.get(browser_automation_protocol_1.BrowserAutomation);
        server.setClient(client);
        // The client may or may not implement onDidCloseConnection; guard the call.
        if (typeof client.onDidCloseConnection === 'function') {
            client.onDidCloseConnection(() => server.close());
        }
        return server;
    })).inSingletonScope();
});
exports.default = new inversify_1.ContainerModule(bind => {
    // ========== Preferences ==========
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_ide_preferences_1.aiIdePreferenceSchema });
    bind(core_1.PreferenceContribution).toConstantValue({ schema: workspace_preferences_1.WorkspacePreferencesSchema });
    bind(core_1.PreferenceContribution).toConstantValue({ schema: ai_configuration_preferences_1.AiConfigurationPreferences });
    // ========== Connection Modules ==========
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(browserAutomationModule);
    // ========== Backend Services ==========
    bind(workspace_executor_service_1.WorkspaceExecutorService).toSelf().inSingletonScope();
});
