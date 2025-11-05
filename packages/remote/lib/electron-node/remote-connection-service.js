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
exports.RemoteConnectionService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
const remote_copy_service_1 = require("./setup/remote-copy-service");
const remote_setup_service_1 = require("./setup/remote-setup-service");
let RemoteConnectionService = class RemoteConnectionService {
    constructor() {
        this.connections = new Map();
    }
    getConnection(id) {
        return this.connections.get(id);
    }
    getConnectionFromPort(port) {
        return Array.from(this.connections.values()).find(connection => connection.localPort === port);
    }
    register(connection) {
        this.connections.set(connection.id, connection);
        return core_1.Disposable.create(() => {
            this.connections.delete(connection.id);
        });
    }
    onStop() {
        for (const connection of this.connections.values()) {
            if (connection.disposeSync) {
                connection.disposeSync();
            }
            else {
                connection.dispose();
            }
            ;
        }
    }
};
exports.RemoteConnectionService = RemoteConnectionService;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_copy_service_1.RemoteCopyService),
    tslib_1.__metadata("design:type", remote_copy_service_1.RemoteCopyService)
], RemoteConnectionService.prototype, "copyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_setup_service_1.RemoteSetupService),
    tslib_1.__metadata("design:type", remote_setup_service_1.RemoteSetupService)
], RemoteConnectionService.prototype, "remoteSetupService", void 0);
exports.RemoteConnectionService = RemoteConnectionService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteConnectionService);
//# sourceMappingURL=remote-connection-service.js.map