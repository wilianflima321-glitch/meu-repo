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
exports.SupportedHeadlessActivationEvents = exports.PluginPackage = exports.ExtPluginApiProvider = void 0;
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("./headless-plugin-container"), exports);
var plugin_ext_headless_api_contribution_1 = require("./plugin-ext-headless-api-contribution");
Object.defineProperty(exports, "ExtPluginApiProvider", { enumerable: true, get: function () { return plugin_ext_headless_api_contribution_1.ExtPluginApiProvider; } });
var headless_plugin_protocol_1 = require("./headless-plugin-protocol");
Object.defineProperty(exports, "PluginPackage", { enumerable: true, get: function () { return headless_plugin_protocol_1.PluginPackage; } });
Object.defineProperty(exports, "SupportedHeadlessActivationEvents", { enumerable: true, get: function () { return headless_plugin_protocol_1.SupportedHeadlessActivationEvents; } });
tslib_1.__exportStar(require("./headless-plugin-rpc"), exports);
//# sourceMappingURL=index.js.map