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
exports.HeadlessPluginHostRPC = void 0;
const tslib_1 = require("tslib");
const dynamic_require_1 = require("@theia/core/lib/node/dynamic-require");
const inversify_1 = require("@theia/core/shared/inversify");
const env_1 = require("@theia/plugin-ext/lib/plugin/env");
const plugin_ext_1 = require("@theia/plugin-ext");
const localization_ext_1 = require("@theia/plugin-ext/lib/plugin/localization-ext");
const headless_plugin_rpc_1 = require("../../common/headless-plugin-rpc");
const plugin_host_rpc_1 = require("@theia/plugin-ext/lib/hosted/node/plugin-host-rpc");
/**
 * The RPC handler for headless plugins.
 */
let HeadlessPluginHostRPC = class HeadlessPluginHostRPC extends plugin_host_rpc_1.AbstractPluginHostRPC {
    constructor() {
        super('HEADLESS_PLUGIN_HOST', undefined, {
            $pluginManager: headless_plugin_rpc_1.HEADLESSMAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT,
        });
    }
    createExtInterfaces() {
        return {
            envExt: this.envExt,
            localizationExt: this.localizationExt
        };
    }
    createAPIFactory(_extInterfaces) {
        // As yet there is no default API namespace for backend plugins to access the Theia framework
        return null;
    }
    getBackendPluginPath(pluginModel) {
        return pluginModel.entryPoint.headless;
    }
    initExtApi(extApi) {
        if (extApi.headlessInitPath) {
            const { containerModule, provideApi } = (0, dynamic_require_1.dynamicRequire)(extApi.headlessInitPath);
            if (containerModule) {
                this.loadContainerModule(containerModule);
            }
            if (provideApi) {
                provideApi(this.rpc, this.pluginManager);
            }
        }
    }
};
exports.HeadlessPluginHostRPC = HeadlessPluginHostRPC;
tslib_1.__decorate([
    (0, inversify_1.inject)(env_1.EnvExtImpl),
    tslib_1.__metadata("design:type", env_1.EnvExtImpl)
], HeadlessPluginHostRPC.prototype, "envExt", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_ext_1.LocalizationExt),
    tslib_1.__metadata("design:type", localization_ext_1.LocalizationExtImpl)
], HeadlessPluginHostRPC.prototype, "localizationExt", void 0);
exports.HeadlessPluginHostRPC = HeadlessPluginHostRPC = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], HeadlessPluginHostRPC);
//# sourceMappingURL=plugin-host-headless-rpc.js.map