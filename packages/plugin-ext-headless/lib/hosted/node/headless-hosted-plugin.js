"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/da5fb7d5b865aa522abc7e82c10b746834b98639/src/vs/workbench/api/node/extHostExtensionService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadlessHostedPluginSupport = exports.isHeadlessPlugin = void 0;
const tslib_1 = require("tslib");
const uuid_1 = require("@theia/core/lib/common/uuid");
const inversify_1 = require("@theia/core/shared/inversify");
const plugin_protocol_1 = require("@theia/plugin-ext/lib/common/plugin-protocol");
const main_context_1 = require("../../main/node/main-context");
const rpc_protocol_1 = require("@theia/plugin-ext/lib/common/rpc-protocol");
const core_1 = require("@theia/core");
const environment_1 = require("@theia/core/shared/@theia/application-package/lib/environment");
const node_1 = require("@theia/core/lib/node");
const backend_application_config_provider_1 = require("@theia/core/lib/node/backend-application-config-provider");
const hosted_plugin_process_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin-process");
const shell_terminal_protocol_1 = require("@theia/terminal/lib/common/shell-terminal-protocol");
const headless_plugin_rpc_1 = require("../../common/headless-plugin-rpc");
const hosted_plugin_1 = require("@theia/plugin-ext/lib/hosted/common/hosted-plugin");
const scanner_theia_headless_1 = require("./scanners/scanner-theia-headless");
const headless_plugin_protocol_1 = require("../../common/headless-plugin-protocol");
const plugin_deployer_impl_1 = require("@theia/plugin-ext/lib/main/node/plugin-deployer-impl");
const uri_1 = require("@theia/core/lib/common/uri");
const asyncFs = require("fs/promises");
function isHeadlessPlugin(plugin) {
    return !!plugin.metadata.model.entryPoint.headless;
}
exports.isHeadlessPlugin = isHeadlessPlugin;
let HeadlessHostedPluginSupport = class HeadlessHostedPluginSupport extends hosted_plugin_1.AbstractHostedPluginSupport {
    constructor() {
        super((0, uuid_1.generateUuid)());
    }
    shutDown() {
        this.pluginProcess.terminatePluginServer();
    }
    createTheiaReadyPromise() {
        return Promise.all([this.envServer.getVariables()]);
    }
    // Only load headless plugins
    acceptPlugin(plugin) {
        if (!isHeadlessPlugin(plugin)) {
            return false;
        }
        if (plugin.metadata.model.engine.type === this.scanner.apiType) {
            // Easy case: take it as it is
            return true;
        }
        // Adapt it for headless
        return this.scanner.adaptForHeadless(plugin);
    }
    handleContributions(_plugin) {
        // We have no contribution points, yet, for headless plugins
        return core_1.Disposable.NULL;
    }
    async beforeSyncPlugins(toDisconnect) {
        await super.beforeSyncPlugins(toDisconnect);
        // Plugin deployment is asynchronous, so wait until that's finished.
        return new Promise((resolve, reject) => {
            this.pluginDeployer.onDidDeploy(resolve);
            toDisconnect.push(core_1.Disposable.create(reject));
        });
    }
    async obtainManager(host, hostContributions, toDisconnect) {
        let manager = this.managers.get(host);
        if (!manager) {
            const pluginId = (0, plugin_protocol_1.getPluginId)(hostContributions[0].plugin.metadata.model);
            const rpc = this.initRpc(host, pluginId);
            toDisconnect.push(rpc);
            manager = rpc.getProxy(headless_plugin_rpc_1.HEADLESSMAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
            this.managers.set(host, manager);
            toDisconnect.push(core_1.Disposable.create(() => this.managers.delete(host)));
            const [extApi, globalState] = await Promise.all([
                this.server.getExtPluginAPI(),
                this.pluginServer.getAllStorageValues(undefined)
            ]);
            if (toDisconnect.disposed) {
                return undefined;
            }
            const activationEvents = this.supportedActivationEventsContributions.getContributions().flatMap(array => array);
            const shell = await this.shellTerminalServer.getDefaultShell();
            const isElectron = environment_1.environment.electron.is();
            await manager.$init({
                activationEvents,
                globalState,
                env: {
                    language: core_1.nls.locale || core_1.nls.defaultLocale,
                    shell,
                    appName: backend_application_config_provider_1.BackendApplicationConfigProvider.get().applicationName,
                    appHost: isElectron ? 'desktop' : 'web' // TODO: 'web' could be the embedder's name, e.g. 'github.dev'
                },
                extApi
            });
            if (toDisconnect.disposed) {
                return undefined;
            }
        }
        return manager;
    }
    initRpc(host, pluginId) {
        const rpc = this.createServerRpc(host);
        this.container.bind(rpc_protocol_1.RPCProtocol).toConstantValue(rpc);
        (0, main_context_1.setUpPluginApi)(rpc, this.container);
        this.mainPluginApiProviders.getContributions().forEach(p => p.initialize(rpc, this.container));
        return rpc;
    }
    createServerRpc(pluginHostId) {
        const channel = new node_1.IPCChannel(this.pluginProcess['childProcess']);
        return new rpc_protocol_1.RPCProtocolImpl(channel);
    }
    async getStoragePath() {
        // Headless plugins are associated with the main Node process, so
        // their storage is the global storage.
        return this.getHostGlobalStoragePath();
    }
    async getHostGlobalStoragePath() {
        const configDirUri = await this.envServer.getConfigDirUri();
        const globalStorageFolderUri = new uri_1.default(configDirUri).resolve('globalStorage');
        const globalStorageFolderUrl = new URL(globalStorageFolderUri.toString());
        let stat;
        try {
            stat = await asyncFs.stat(globalStorageFolderUrl);
        }
        catch (_) {
            // OK, no such directory
        }
        if (stat && !stat.isDirectory()) {
            throw new Error(`Global storage folder is not a directory: ${globalStorageFolderUri}`);
        }
        // Make sure that folder by the path exists
        if (!stat) {
            await asyncFs.mkdir(globalStorageFolderUrl, { recursive: true });
        }
        const globalStorageFolderFsPath = await asyncFs.realpath(globalStorageFolderUrl);
        if (!globalStorageFolderFsPath) {
            throw new Error(`Could not resolve the FS path for URI: ${globalStorageFolderUri}`);
        }
        return globalStorageFolderFsPath;
    }
};
exports.HeadlessHostedPluginSupport = HeadlessHostedPluginSupport;
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_process_1.HostedPluginProcess),
    tslib_1.__metadata("design:type", hosted_plugin_process_1.HostedPluginProcess)
], HeadlessHostedPluginSupport.prototype, "pluginProcess", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(shell_terminal_protocol_1.IShellTerminalServer),
    tslib_1.__metadata("design:type", Object)
], HeadlessHostedPluginSupport.prototype, "shellTerminalServer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(scanner_theia_headless_1.TheiaHeadlessPluginScanner),
    tslib_1.__metadata("design:type", scanner_theia_headless_1.TheiaHeadlessPluginScanner)
], HeadlessHostedPluginSupport.prototype, "scanner", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_protocol_1.PluginDeployer),
    tslib_1.__metadata("design:type", plugin_deployer_impl_1.PluginDeployerImpl)
], HeadlessHostedPluginSupport.prototype, "pluginDeployer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(headless_plugin_protocol_1.SupportedHeadlessActivationEvents),
    tslib_1.__metadata("design:type", Object)
], HeadlessHostedPluginSupport.prototype, "supportedActivationEventsContributions", void 0);
exports.HeadlessHostedPluginSupport = HeadlessHostedPluginSupport = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], HeadlessHostedPluginSupport);
//# sourceMappingURL=headless-hosted-plugin.js.map