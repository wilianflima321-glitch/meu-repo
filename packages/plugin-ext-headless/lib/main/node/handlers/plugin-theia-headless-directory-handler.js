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
exports.PluginTheiaHeadlessDirectoryHandler = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const plugin_ext_1 = require("@theia/plugin-ext");
const plugin_theia_directory_handler_1 = require("@theia/plugin-ext/lib/main/node/handlers/plugin-theia-directory-handler");
let PluginTheiaHeadlessDirectoryHandler = class PluginTheiaHeadlessDirectoryHandler extends plugin_theia_directory_handler_1.AbstractPluginDirectoryHandler {
    acceptManifest(plugin) {
        var _a;
        return ((_a = plugin === null || plugin === void 0 ? void 0 : plugin.engines) === null || _a === void 0 ? void 0 : _a.theiaPlugin) === undefined && 'theiaHeadlessPlugin' in plugin.engines;
    }
    async handle(context) {
        await this.copyDirectory(context);
        const types = [plugin_ext_1.PluginDeployerEntryType.HEADLESS];
        context.pluginEntry().accept(...types);
    }
};
exports.PluginTheiaHeadlessDirectoryHandler = PluginTheiaHeadlessDirectoryHandler;
exports.PluginTheiaHeadlessDirectoryHandler = PluginTheiaHeadlessDirectoryHandler = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], PluginTheiaHeadlessDirectoryHandler);
//# sourceMappingURL=plugin-theia-headless-directory-handler.js.map