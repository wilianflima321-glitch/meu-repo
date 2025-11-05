"use strict";
// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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
exports.HostedPluginReader = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const plugin_reader_1 = require("@theia/plugin-ext/lib/hosted/node/plugin-reader");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const plugin_protocol_1 = require("@theia/plugin-ext/lib/common/plugin-protocol");
const plugin_deployer_entry_impl_1 = require("@theia/plugin-ext/lib/main/node/plugin-deployer-entry-impl");
let HostedPluginReader = class HostedPluginReader {
    constructor() {
        this.hostedPlugin = new promise_util_1.Deferred();
    }
    async initialize() {
        this.pluginReader.getPluginMetadata(process.env.HOSTED_PLUGIN)
            .then(this.hostedPlugin.resolve.bind(this.hostedPlugin));
        const pluginPath = process.env.HOSTED_PLUGIN;
        if (pluginPath) {
            const hostedPlugin = new plugin_deployer_entry_impl_1.PluginDeployerEntryImpl('Hosted Plugin', pluginPath, pluginPath);
            hostedPlugin.storeValue('isUnderDevelopment', true);
            const hostedMetadata = await this.hostedPlugin.promise;
            if (hostedMetadata.model.entryPoint && (hostedMetadata.model.entryPoint.backend || hostedMetadata.model.entryPoint.headless)) {
                this.deployerHandler.deployBackendPlugins([hostedPlugin]);
            }
            if (hostedMetadata.model.entryPoint && hostedMetadata.model.entryPoint.frontend) {
                this.deployerHandler.deployFrontendPlugins([hostedPlugin]);
            }
        }
    }
    async getPlugin() {
        return this.hostedPlugin.promise;
    }
};
exports.HostedPluginReader = HostedPluginReader;
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_reader_1.HostedPluginReader),
    tslib_1.__metadata("design:type", plugin_reader_1.HostedPluginReader)
], HostedPluginReader.prototype, "pluginReader", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_protocol_1.PluginDeployerHandler),
    tslib_1.__metadata("design:type", Object)
], HostedPluginReader.prototype, "deployerHandler", void 0);
exports.HostedPluginReader = HostedPluginReader = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HostedPluginReader);
//# sourceMappingURL=hosted-plugin-reader.js.map