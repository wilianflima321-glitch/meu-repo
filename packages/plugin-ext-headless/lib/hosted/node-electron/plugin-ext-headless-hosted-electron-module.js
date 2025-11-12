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
exports.bindElectronBackend = void 0;
const plugin_ext_headless_hosted_module_1 = require("../node/plugin-ext-headless-hosted-module");
function bindElectronBackend(bind) {
    (0, plugin_ext_headless_hosted_module_1.bindCommonHostedBackend)(bind);
}
exports.bindElectronBackend = bindElectronBackend;
//# sourceMappingURL=plugin-ext-headless-hosted-electron-module.js.map