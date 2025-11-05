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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindHeadlessHosted = exports.bindCommonHostedBackend = void 0;
const path = require("path");
const contribution_provider_1 = require("@theia/core/lib/common/contribution-provider");
const node_1 = require("@theia/core/lib/node");
const plugin_ext_1 = require("@theia/plugin-ext");
const hosted_plugin_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin");
const hosted_plugin_process_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin-process");
const plugin_service_1 = require("@theia/plugin-ext/lib/hosted/node/plugin-service");
const headless_plugin_container_1 = require("../../common/headless-plugin-container");
const headless_hosted_plugin_1 = require("./headless-hosted-plugin");
const scanner_theia_headless_1 = require("./scanners/scanner-theia-headless");
const headless_plugin_protocol_1 = require("../../common/headless-plugin-protocol");
const headless_plugin_service_1 = require("./headless-plugin-service");
function bindCommonHostedBackend(bind) {
    bind(hosted_plugin_process_1.HostedPluginProcess).toSelf().inSingletonScope();
    bind(hosted_plugin_1.HostedPluginSupport).toSelf().inSingletonScope();
    (0, contribution_provider_1.bindContributionProvider)(bind, Symbol.for(plugin_ext_1.ExtPluginApiProvider));
    (0, contribution_provider_1.bindContributionProvider)(bind, plugin_ext_1.PluginHostEnvironmentVariable);
    (0, contribution_provider_1.bindContributionProvider)(bind, headless_plugin_protocol_1.SupportedHeadlessActivationEvents);
    bind(headless_plugin_service_1.HeadlessHostedPluginServerImpl).toSelf().inSingletonScope();
    bind(plugin_ext_1.HostedPluginServer).toService(headless_plugin_service_1.HeadlessHostedPluginServerImpl);
    bind(headless_hosted_plugin_1.HeadlessHostedPluginSupport).toSelf().inSingletonScope();
    bind(plugin_service_1.BackendPluginHostableFilter).toConstantValue(headless_hosted_plugin_1.isHeadlessPlugin);
    bind(hosted_plugin_process_1.HostedPluginProcessConfiguration).toConstantValue({
        path: path.join(__dirname, 'plugin-host-headless'),
    });
}
exports.bindCommonHostedBackend = bindCommonHostedBackend;
function bindHeadlessHosted(bind) {
    bind(scanner_theia_headless_1.TheiaHeadlessPluginScanner).toSelf().inSingletonScope();
    bind(plugin_ext_1.PluginScanner).toService(scanner_theia_headless_1.TheiaHeadlessPluginScanner);
    bind(headless_plugin_protocol_1.SupportedHeadlessActivationEvents).toConstantValue(['*', 'onStartupFinished']);
    bind(node_1.BackendApplicationContribution).toDynamicValue(({ container }) => {
        let hostedPluginSupport;
        return {
            onStart() {
                // Create a child container to isolate the Headless Plugin hosting stack
                // from all connection-scoped frontend/backend plugin hosts and
                // also to avoid leaking it into the global container scope
                const headlessPluginsContainer = container.createChild();
                const modules = container.getAll(headless_plugin_container_1.HeadlessPluginContainerModule);
                headlessPluginsContainer.load(...modules);
                hostedPluginSupport = headlessPluginsContainer.get(headless_hosted_plugin_1.HeadlessHostedPluginSupport);
                hostedPluginSupport.onStart(headlessPluginsContainer);
            },
            onStop() {
                hostedPluginSupport === null || hostedPluginSupport === void 0 ? void 0 : hostedPluginSupport.shutDown();
            }
        };
    });
}
exports.bindHeadlessHosted = bindHeadlessHosted;
//# sourceMappingURL=plugin-ext-headless-hosted-module.js.map