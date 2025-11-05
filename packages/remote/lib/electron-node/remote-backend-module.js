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
exports.remoteConnectionModule = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const node_1 = require("@theia/core/lib/node");
const remote_connection_service_1 = require("./remote-connection-service");
const remote_proxy_server_provider_1 = require("./remote-proxy-server-provider");
const remote_connection_socket_provider_1 = require("./remote-connection-socket-provider");
const connection_container_module_1 = require("@theia/core/lib/node/messaging/connection-container-module");
const remote_ssh_connection_provider_1 = require("../electron-common/remote-ssh-connection-provider");
const remote_ssh_connection_provider_2 = require("./ssh/remote-ssh-connection-provider");
const ssh_identity_file_collector_1 = require("./ssh/ssh-identity-file-collector");
const remote_copy_service_1 = require("./setup/remote-copy-service");
const remote_setup_service_1 = require("./setup/remote-setup-service");
const remote_native_dependency_service_1 = require("./setup/remote-native-dependency-service");
const backend_remote_service_impl_1 = require("./backend-remote-service-impl");
const backend_remote_service_1 = require("@theia/core/lib/node/remote/backend-remote-service");
const remote_node_setup_service_1 = require("./setup/remote-node-setup-service");
const remote_setup_script_service_1 = require("./setup/remote-setup-script-service");
const remote_status_service_1 = require("../electron-common/remote-status-service");
const remote_status_service_2 = require("./remote-status-service");
const core_1 = require("@theia/core");
const remote_copy_contribution_1 = require("./setup/remote-copy-contribution");
const remote_copy_contribution_2 = require("@theia/core/lib/node/remote/remote-copy-contribution");
const main_copy_contribution_1 = require("./setup/main-copy-contribution");
const remote_native_dependency_contribution_1 = require("./setup/remote-native-dependency-contribution");
const app_native_dependency_contribution_1 = require("./setup/app-native-dependency-contribution");
const remote_port_forwarding_provider_1 = require("./remote-port-forwarding-provider");
const remote_port_forwarding_provider_2 = require("../electron-common/remote-port-forwarding-provider");
const remote_preferences_1 = require("../electron-common/remote-preferences");
exports.remoteConnectionModule = connection_container_module_1.ConnectionContainerModule.create(({ bind, bindBackendService }) => {
    bind(remote_ssh_connection_provider_2.RemoteSSHConnectionProviderImpl).toSelf().inSingletonScope();
    bind(remote_ssh_connection_provider_1.RemoteSSHConnectionProvider).toService(remote_ssh_connection_provider_2.RemoteSSHConnectionProviderImpl);
    bindBackendService(remote_ssh_connection_provider_1.RemoteSSHConnectionProviderPath, remote_ssh_connection_provider_1.RemoteSSHConnectionProvider);
    bind(remote_port_forwarding_provider_1.RemotePortForwardingProviderImpl).toSelf().inSingletonScope();
    bind(remote_port_forwarding_provider_2.RemotePortForwardingProvider).toService(remote_port_forwarding_provider_1.RemotePortForwardingProviderImpl);
    bindBackendService(remote_port_forwarding_provider_2.RemoteRemotePortForwardingProviderPath, remote_port_forwarding_provider_2.RemotePortForwardingProvider);
});
exports.default = new inversify_1.ContainerModule((bind, _unbind, _isBound, rebind) => {
    bind(remote_proxy_server_provider_1.RemoteProxyServerProvider).toSelf().inSingletonScope();
    bind(remote_connection_socket_provider_1.RemoteConnectionSocketProvider).toSelf().inSingletonScope();
    bind(remote_connection_service_1.RemoteConnectionService).toSelf().inSingletonScope();
    bind(node_1.BackendApplicationContribution).toService(remote_connection_service_1.RemoteConnectionService);
    bind(remote_status_service_2.RemoteStatusServiceImpl).toSelf().inSingletonScope();
    bind(remote_status_service_1.RemoteStatusService).toService(remote_status_service_2.RemoteStatusServiceImpl);
    bind(core_1.ConnectionHandler).toDynamicValue(ctx => new core_1.RpcConnectionHandler(remote_status_service_1.RemoteStatusServicePath, () => ctx.container.get(remote_status_service_1.RemoteStatusService))).inSingletonScope();
    bind(remote_copy_service_1.RemoteCopyService).toSelf().inSingletonScope();
    bind(remote_setup_service_1.RemoteSetupService).toSelf().inSingletonScope();
    bind(remote_node_setup_service_1.RemoteNodeSetupService).toSelf().inSingletonScope();
    bind(remote_setup_script_service_1.RemoteWindowsScriptStrategy).toSelf().inSingletonScope();
    bind(remote_setup_script_service_1.RemotePosixScriptStrategy).toSelf().inSingletonScope();
    bind(remote_setup_script_service_1.RemoteSetupScriptService).toSelf().inSingletonScope();
    bind(remote_native_dependency_service_1.RemoteNativeDependencyService).toSelf().inSingletonScope();
    bind(remote_copy_contribution_1.RemoteCopyRegistryImpl).toSelf().inSingletonScope();
    (0, core_1.bindContributionProvider)(bind, remote_copy_contribution_2.RemoteCopyContribution);
    (0, core_1.bindContributionProvider)(bind, remote_native_dependency_contribution_1.RemoteNativeDependencyContribution);
    bind(main_copy_contribution_1.MainCopyContribution).toSelf().inSingletonScope();
    bind(remote_copy_contribution_2.RemoteCopyContribution).toService(main_copy_contribution_1.MainCopyContribution);
    bind(app_native_dependency_contribution_1.AppNativeDependencyContribution).toSelf().inSingletonScope();
    bind(remote_native_dependency_contribution_1.RemoteNativeDependencyContribution).toService(app_native_dependency_contribution_1.AppNativeDependencyContribution);
    bind(connection_container_module_1.ConnectionContainerModule).toConstantValue(exports.remoteConnectionModule);
    bind(backend_remote_service_impl_1.BackendRemoteServiceImpl).toSelf().inSingletonScope();
    rebind(backend_remote_service_1.BackendRemoteService).toService(backend_remote_service_impl_1.BackendRemoteServiceImpl);
    bind(node_1.CliContribution).toService(backend_remote_service_impl_1.BackendRemoteServiceImpl);
    bind(ssh_identity_file_collector_1.SSHIdentityFileCollector).toSelf().inSingletonScope();
    (0, remote_preferences_1.bindRemotePreferences)(bind);
});
//# sourceMappingURL=remote-backend-module.js.map