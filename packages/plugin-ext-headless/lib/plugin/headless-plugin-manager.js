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
exports.HeadlessPluginManagerExtImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const plugin_manager_1 = require("@theia/plugin-ext/lib/plugin/plugin-manager");
let HeadlessPluginManagerExtImpl = class HeadlessPluginManagerExtImpl extends plugin_manager_1.AbstractPluginManagerExtImpl {
    constructor() {
        super(...arguments);
        this.supportedActivationEvents = new Set();
    }
    async $init(params) {
        var _a;
        (_a = params.activationEvents) === null || _a === void 0 ? void 0 : _a.forEach(event => this.supportedActivationEvents.add(event));
        this.storage.init(params.globalState, {});
        this.envExt.setLanguage(params.env.language);
        this.envExt.setApplicationName(params.env.appName);
        this.envExt.setAppHost(params.env.appHost);
        if (params.extApi) {
            this.host.initExtApi(params.extApi);
        }
    }
    getActivationEvents(plugin) {
        var _a, _b;
        const result = (_b = (_a = plugin.rawModel) === null || _a === void 0 ? void 0 : _a.headless) === null || _b === void 0 ? void 0 : _b.activationEvents;
        return Array.isArray(result) ? result : undefined;
    }
    isSupportedActivationEvent(activationEvent) {
        return this.supportedActivationEvents.has(activationEvent.split(':')[0]);
    }
};
exports.HeadlessPluginManagerExtImpl = HeadlessPluginManagerExtImpl;
exports.HeadlessPluginManagerExtImpl = HeadlessPluginManagerExtImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HeadlessPluginManagerExtImpl);
//# sourceMappingURL=headless-plugin-manager.js.map