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
exports.bindBackendMain = exports.bindHeadlessMain = void 0;
const core_1 = require("@theia/core");
const plugin_ext_1 = require("@theia/plugin-ext");
const plugin_theia_headless_directory_handler_1 = require("./handlers/plugin-theia-headless-directory-handler");
const headless_progress_client_1 = require("./headless-progress-client");
function bindHeadlessMain(bind) {
    bind(plugin_ext_1.PluginDeployerDirectoryHandler).to(plugin_theia_headless_directory_handler_1.PluginTheiaHeadlessDirectoryHandler).inSingletonScope();
}
exports.bindHeadlessMain = bindHeadlessMain;
function bindBackendMain(bind, unbind, isBound, rebind) {
    (0, core_1.bindContributionProvider)(bind, plugin_ext_1.MainPluginApiProvider);
    //
    // Main API dependencies
    //
    bind(core_1.MessageService).toSelf().inSingletonScope();
    bind(core_1.MessageClient).toSelf().inSingletonScope(); // Just logs to console
    bind(core_1.ProgressService).toSelf().inSingletonScope();
    bind(core_1.ProgressClient).to(headless_progress_client_1.HeadlessProgressClient).inSingletonScope();
}
exports.bindBackendMain = bindBackendMain;
//# sourceMappingURL=plugin-ext-headless-main-module.js.map