"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
const browser_1 = require("@theia/core/lib/browser");
const remote_ssh_contribution_1 = require("./remote-ssh-contribution");
const remote_ssh_connection_provider_1 = require("../electron-common/remote-ssh-connection-provider");
const remote_frontend_contribution_1 = require("./remote-frontend-contribution");
const remote_registry_contribution_1 = require("./remote-registry-contribution");
const remote_service_1 = require("./remote-service");
const remote_status_service_1 = require("../electron-common/remote-status-service");
const electron_file_dialog_service_1 = require("@theia/filesystem/lib/electron-browser/file-dialog/electron-file-dialog-service");
const remote_electron_file_dialog_service_1 = require("./remote-electron-file-dialog-service");
const remote_preferences_1 = require("../electron-common/remote-preferences");
const port_forwarding_widget_1 = require("./port-forwarding/port-forwarding-widget");
const port_forwading_contribution_1 = require("./port-forwarding/port-forwading-contribution");
const port_forwarding_service_1 = require("./port-forwarding/port-forwarding-service");
const remote_port_forwarding_provider_1 = require("../electron-common/remote-port-forwarding-provider");
const service_connection_provider_1 = require("@theia/core/lib/browser/messaging/service-connection-provider");
require("../../src/electron-browser/style/port-forwarding-widget.css");
const user_storage_contribution_1 = require("@theia/userstorage/lib/browser/user-storage-contribution");
const remote_user_storage_provider_1 = require("./remote-user-storage-provider");
const remote_file_system_provider_1 = require("@theia/filesystem/lib/common/remote-file-system-provider");
const local_backend_services_1 = require("./local-backend-services");
const env_variables_1 = require("@theia/core/lib/common/env-variables");
exports.default = new inversify_1.ContainerModule((bind, _, __, rebind) => {
    bind(remote_frontend_contribution_1.RemoteFrontendContribution).toSelf().inSingletonScope();
    bind(browser_1.FrontendApplicationContribution).toService(remote_frontend_contribution_1.RemoteFrontendContribution);
    bind(core_1.CommandContribution).toService(remote_frontend_contribution_1.RemoteFrontendContribution);
    (0, core_1.bindContributionProvider)(bind, remote_registry_contribution_1.RemoteRegistryContribution);
    bind(remote_ssh_contribution_1.RemoteSSHContribution).toSelf().inSingletonScope();
    bind(remote_registry_contribution_1.RemoteRegistryContribution).toService(remote_ssh_contribution_1.RemoteSSHContribution);
    (0, remote_preferences_1.bindRemotePreferences)(bind);
    rebind(electron_file_dialog_service_1.ElectronFileDialogService).to(remote_electron_file_dialog_service_1.RemoteElectronFileDialogService).inSingletonScope();
    bind(remote_service_1.RemoteService).toSelf().inSingletonScope();
    bind(port_forwarding_widget_1.PortForwardingWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue(context => ({
        id: port_forwarding_widget_1.PORT_FORWARDING_WIDGET_ID,
        createWidget: () => context.container.get(port_forwarding_widget_1.PortForwardingWidget)
    }));
    (0, browser_1.bindViewContribution)(bind, port_forwading_contribution_1.PortForwardingContribution);
    bind(port_forwarding_service_1.PortForwardingService).toSelf().inSingletonScope();
    bind(remote_ssh_connection_provider_1.RemoteSSHConnectionProvider).toDynamicValue(ctx => service_connection_provider_1.ServiceConnectionProvider.createLocalProxy(ctx.container, remote_ssh_connection_provider_1.RemoteSSHConnectionProviderPath)).inSingletonScope();
    bind(remote_status_service_1.RemoteStatusService).toDynamicValue(ctx => service_connection_provider_1.ServiceConnectionProvider.createLocalProxy(ctx.container, remote_status_service_1.RemoteStatusServicePath)).inSingletonScope();
    bind(remote_port_forwarding_provider_1.RemotePortForwardingProvider).toDynamicValue(ctx => service_connection_provider_1.ServiceConnectionProvider.createLocalProxy(ctx.container, remote_port_forwarding_provider_1.RemoteRemotePortForwardingProviderPath)).inSingletonScope();
    bind(local_backend_services_1.LocalRemoteFileSytemServer).toDynamicValue(ctx => browser_1.isRemote ?
        service_connection_provider_1.ServiceConnectionProvider.createLocalProxy(ctx.container, remote_file_system_provider_1.remoteFileSystemPath, new remote_file_system_provider_1.RemoteFileSystemProxyFactory()) :
        ctx.container.get(remote_file_system_provider_1.RemoteFileSystemServer));
    bind(local_backend_services_1.LocalEnvVariablesServer).toDynamicValue(ctx => browser_1.isRemote ?
        service_connection_provider_1.ServiceConnectionProvider.createLocalProxy(ctx.container, env_variables_1.envVariablesPath) :
        ctx.container.get(env_variables_1.EnvVariablesServer));
    bind(local_backend_services_1.LocalRemoteFileSystemProvider).toSelf().inSingletonScope();
    rebind(user_storage_contribution_1.UserStorageContribution).to(remote_user_storage_provider_1.RemoteUserStorageContribution);
});
//# sourceMappingURL=remote-frontend-module.js.map