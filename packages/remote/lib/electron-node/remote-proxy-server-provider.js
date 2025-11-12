"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
exports.RemoteProxyServerProvider = void 0;
const tslib_1 = require("tslib");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const net = require("net");
let RemoteProxyServerProvider = class RemoteProxyServerProvider {
    async getProxyServer(callback) {
        const deferred = new promise_util_1.Deferred();
        const proxy = net.createServer(socket => {
            callback === null || callback === void 0 ? void 0 : callback(socket);
        }).listen(0, () => {
            deferred.resolve();
        });
        await deferred.promise;
        return proxy;
    }
};
exports.RemoteProxyServerProvider = RemoteProxyServerProvider;
exports.RemoteProxyServerProvider = RemoteProxyServerProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteProxyServerProvider);
//# sourceMappingURL=remote-proxy-server-provider.js.map