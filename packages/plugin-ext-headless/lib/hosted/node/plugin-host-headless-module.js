"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
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
require("@theia/core/shared/reflect-metadata");
const inversify_1 = require("@theia/core/shared/inversify");
const rpc_protocol_1 = require("@theia/plugin-ext/lib/common/rpc-protocol");
const plugin_host_rpc_1 = require("@theia/plugin-ext/lib/hosted/node/plugin-host-rpc");
const plugin_manager_1 = require("@theia/plugin-ext/lib/plugin/plugin-manager");
const plugin_host_headless_rpc_1 = require("./plugin-host-headless-rpc");
const headless_plugin_manager_1 = require("../../plugin/headless-plugin-manager");
const node_1 = require("@theia/core/lib/node");
const env_1 = require("@theia/plugin-ext/lib/plugin/env");
const env_node_ext_1 = require("@theia/plugin-ext/lib/plugin/node/env-node-ext");
const plugin_ext_1 = require("@theia/plugin-ext");
const localization_ext_1 = require("@theia/plugin-ext/lib/plugin/localization-ext");
const plugin_storage_1 = require("@theia/plugin-ext/lib/plugin/plugin-storage");
const secrets_ext_1 = require("@theia/plugin-ext/lib/plugin/secrets-ext");
const terminal_ext_1 = require("@theia/plugin-ext/lib/plugin/terminal-ext");
const core_1 = require("@theia/core");
exports.default = new inversify_1.ContainerModule(bind => {
    const channel = new node_1.IPCChannel();
    bind(rpc_protocol_1.RPCProtocol).toConstantValue(new rpc_protocol_1.RPCProtocolImpl(channel));
    bind(plugin_host_rpc_1.PluginContainerModuleLoader).toDynamicValue(({ container }) => (module) => {
        var _a;
        container.load(module);
        const internalModule = module;
        const pluginApiCache = (_a = internalModule.initializeApi) === null || _a === void 0 ? void 0 : _a.call(internalModule, container);
        return pluginApiCache;
    }).inSingletonScope();
    bind(plugin_host_rpc_1.AbstractPluginHostRPC).toService(plugin_host_headless_rpc_1.HeadlessPluginHostRPC);
    bind(plugin_host_headless_rpc_1.HeadlessPluginHostRPC).toSelf().inSingletonScope();
    bind(plugin_manager_1.AbstractPluginManagerExtImpl).toService(headless_plugin_manager_1.HeadlessPluginManagerExtImpl);
    bind(headless_plugin_manager_1.HeadlessPluginManagerExtImpl).toSelf().inSingletonScope();
    bind(env_1.EnvExtImpl).to(env_node_ext_1.EnvNodeExtImpl).inSingletonScope();
    bind(plugin_ext_1.LocalizationExt).to(localization_ext_1.LocalizationExtImpl).inSingletonScope();
    const dummySecrets = {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(undefined),
        delete: () => Promise.resolve(undefined),
        $onDidChangePassword: () => Promise.resolve(),
        onDidChangePassword: () => core_1.Disposable.NULL,
    };
    const dummyStorage = {
        init: () => undefined,
        setPerPluginData: () => Promise.resolve(false),
        getPerPluginData: () => ({}),
        storageDataChangedEvent: () => core_1.Disposable.NULL,
        $updatePluginsWorkspaceData: () => undefined
    };
    const dummyTerminalService = {
        $initEnvironmentVariableCollections: () => undefined,
        $setShell: () => undefined,
        getEnvironmentVariableCollection: () => new terminal_ext_1.EnvironmentVariableCollectionImpl(false),
    };
    bind(secrets_ext_1.InternalSecretsExt).toConstantValue(dummySecrets);
    bind(plugin_storage_1.InternalStorageExt).toConstantValue(dummyStorage);
    bind(plugin_manager_1.MinimalTerminalServiceExt).toConstantValue(dummyTerminalService);
});
//# sourceMappingURL=plugin-host-headless-module.js.map