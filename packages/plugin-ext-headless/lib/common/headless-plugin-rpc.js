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
exports.HEADLESSMAIN_RPC_CONTEXT = exports.HEADLESSPLUGIN_RPC_CONTEXT = void 0;
const rpc_protocol_1 = require("@theia/plugin-ext/lib/common/rpc-protocol");
const plugin_api_rpc_1 = require("@theia/plugin-ext/lib/common/plugin-api-rpc");
exports.HEADLESSPLUGIN_RPC_CONTEXT = {
    MESSAGE_REGISTRY_MAIN: plugin_api_rpc_1.PLUGIN_RPC_CONTEXT.MESSAGE_REGISTRY_MAIN,
    ENV_MAIN: plugin_api_rpc_1.PLUGIN_RPC_CONTEXT.ENV_MAIN,
    NOTIFICATION_MAIN: plugin_api_rpc_1.PLUGIN_RPC_CONTEXT.NOTIFICATION_MAIN,
    LOCALIZATION_MAIN: plugin_api_rpc_1.PLUGIN_RPC_CONTEXT.LOCALIZATION_MAIN,
};
exports.HEADLESSMAIN_RPC_CONTEXT = {
    HOSTED_PLUGIN_MANAGER_EXT: (0, rpc_protocol_1.createProxyIdentifier)('HeadlessPluginManagerExt'),
    NOTIFICATION_EXT: plugin_api_rpc_1.MAIN_RPC_CONTEXT.NOTIFICATION_EXT,
};
//# sourceMappingURL=headless-plugin-rpc.js.map