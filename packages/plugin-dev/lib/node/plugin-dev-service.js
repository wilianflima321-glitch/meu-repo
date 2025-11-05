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
exports.PluginDevServerImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const hosted_instance_manager_1 = require("./hosted-instance-manager");
const uri_1 = require("@theia/core/lib/common/uri");
const hosted_plugin_reader_1 = require("./hosted-plugin-reader");
const hosted_plugins_manager_1 = require("./hosted-plugins-manager");
const hosted_plugin_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin");
let PluginDevServerImpl = class PluginDevServerImpl {
    dispose() {
        // Terminate the hosted instance if it is currently running.
        if (this.hostedInstanceManager.isRunning()) {
            this.hostedInstanceManager.terminate();
        }
    }
    setClient(client) {
    }
    async getHostedPlugin() {
        const pluginMetadata = await this.reader.getPlugin();
        if (pluginMetadata) {
            this.hostedPlugin.runPlugin(pluginMetadata.model);
        }
        return Promise.resolve(this.reader.getPlugin());
    }
    isPluginValid(uri) {
        return Promise.resolve(this.hostedInstanceManager.isPluginValid(new uri_1.default(uri)));
    }
    runHostedPluginInstance(uri) {
        return this.uriToStrPromise(this.hostedInstanceManager.run(new uri_1.default(uri)));
    }
    runDebugHostedPluginInstance(uri, debugConfig) {
        return this.uriToStrPromise(this.hostedInstanceManager.debug(new uri_1.default(uri), debugConfig));
    }
    terminateHostedPluginInstance() {
        this.hostedInstanceManager.terminate();
        return Promise.resolve();
    }
    isHostedPluginInstanceRunning() {
        return Promise.resolve(this.hostedInstanceManager.isRunning());
    }
    getHostedPluginInstanceURI() {
        return Promise.resolve(this.hostedInstanceManager.getInstanceURI().toString());
    }
    getHostedPluginURI() {
        return Promise.resolve(this.hostedInstanceManager.getPluginURI().toString());
    }
    uriToStrPromise(promise) {
        return new Promise((resolve, reject) => {
            promise.then((uri) => {
                resolve(uri.toString());
            }).catch(error => reject(error));
        });
    }
    runWatchCompilation(path) {
        return this.hostedPluginsManager.runWatchCompilation(path);
    }
    stopWatchCompilation(path) {
        return this.hostedPluginsManager.stopWatchCompilation(path);
    }
    isWatchCompilationRunning(path) {
        return this.hostedPluginsManager.isWatchCompilationRunning(path);
    }
};
exports.PluginDevServerImpl = PluginDevServerImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugins_manager_1.HostedPluginsManager),
    tslib_1.__metadata("design:type", Object)
], PluginDevServerImpl.prototype, "hostedPluginsManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_instance_manager_1.HostedInstanceManager),
    tslib_1.__metadata("design:type", Object)
], PluginDevServerImpl.prototype, "hostedInstanceManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_reader_1.HostedPluginReader),
    tslib_1.__metadata("design:type", hosted_plugin_reader_1.HostedPluginReader)
], PluginDevServerImpl.prototype, "reader", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_1.HostedPluginSupport),
    tslib_1.__metadata("design:type", hosted_plugin_1.HostedPluginSupport)
], PluginDevServerImpl.prototype, "hostedPlugin", void 0);
exports.PluginDevServerImpl = PluginDevServerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], PluginDevServerImpl);
//# sourceMappingURL=plugin-dev-service.js.map