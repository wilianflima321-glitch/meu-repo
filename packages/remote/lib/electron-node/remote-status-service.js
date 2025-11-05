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
exports.RemoteStatusServiceImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_connection_service_1 = require("./remote-connection-service");
let RemoteStatusServiceImpl = class RemoteStatusServiceImpl {
    async getStatus(localPort) {
        const connection = this.remoteConnectionService.getConnectionFromPort(localPort);
        if (connection) {
            return {
                alive: true,
                name: connection.name,
                type: connection.type
            };
        }
        else {
            return {
                alive: false
            };
        }
    }
    async connectionClosed(localPort) {
        const connection = this.remoteConnectionService.getConnectionFromPort(localPort);
        if (connection) {
            connection.dispose();
        }
    }
};
exports.RemoteStatusServiceImpl = RemoteStatusServiceImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_connection_service_1.RemoteConnectionService),
    tslib_1.__metadata("design:type", remote_connection_service_1.RemoteConnectionService)
], RemoteStatusServiceImpl.prototype, "remoteConnectionService", void 0);
exports.RemoteStatusServiceImpl = RemoteStatusServiceImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteStatusServiceImpl);
//# sourceMappingURL=remote-status-service.js.map