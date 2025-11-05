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
exports.TheiaHeadlessPluginScanner = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @theia/localization-check */
const inversify_1 = require("@theia/core/shared/inversify");
const scanner_theia_1 = require("@theia/plugin-ext/lib/hosted/node/scanners/scanner-theia");
const objects_1 = require("@theia/core/lib/common/objects");
let TheiaHeadlessPluginScanner = class TheiaHeadlessPluginScanner extends scanner_theia_1.AbstractPluginScanner {
    constructor() {
        super('theiaHeadlessPlugin');
    }
    getEntryPoint(plugin) {
        var _a;
        if ((_a = plugin === null || plugin === void 0 ? void 0 : plugin.theiaPlugin) === null || _a === void 0 ? void 0 : _a.headless) {
            return {
                headless: plugin.theiaPlugin.headless
            };
        }
        ;
        return {
            headless: plugin.main
        };
    }
    /**
     * Adapt the given `plugin`'s metadata for headless deployment, where it does not
     * already natively specify its headless deployment, such as is the case for plugins
     * declaring the `"vscode"` or `"theiaPlugin"` engine. This consists of cloning the
     * relevant properties of its deployment metadata and modifying them as required,
     * including but not limited to:
     *
     * - renaming the `lifecycle` start and stop functions as 'activate' and 'deactivate'
     *   following the VS Code naming convention (in case the `plugin` is a Theia-style
     *   plugin that uses 'start' and 'stop')
     * - deleting inapplicable information such as frontend and backend init script paths
     * - filtering/rewriting contributions and/or activation events
     *
     * The cloning is necessary to retain the original information for the non-headless
     * deployments that the plugin also supports.
     */
    adaptForHeadless(plugin) {
        return {
            type: plugin.type,
            metadata: this.adaptMetadataForHeadless(plugin),
            contributes: this.adaptContributesForHeadless(plugin)
        };
    }
    adaptMetadataForHeadless(plugin) {
        const result = (0, objects_1.deepClone)(plugin.metadata);
        const lifecycle = result.lifecycle;
        delete lifecycle.frontendInitPath;
        delete lifecycle.backendInitPath;
        // Same as in VS Code
        lifecycle.startMethod = 'activate';
        lifecycle.stopMethod = 'deactivate';
        return result;
    }
    adaptContributesForHeadless(plugin) {
        // We don't yet support and contribution points in headless plugins
        return undefined;
    }
};
exports.TheiaHeadlessPluginScanner = TheiaHeadlessPluginScanner;
exports.TheiaHeadlessPluginScanner = TheiaHeadlessPluginScanner = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], TheiaHeadlessPluginScanner);
//# sourceMappingURL=scanner-theia-headless.js.map