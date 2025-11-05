"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
var RemotePortForwardingProviderImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotePortForwardingProviderImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const net_1 = require("net");
const remote_connection_service_1 = require("./remote-connection-service");
let RemotePortForwardingProviderImpl = RemotePortForwardingProviderImpl_1 = class RemotePortForwardingProviderImpl {
    async forwardPort(connectionPort, portToForward) {
        const currentConnection = this.connectionService.getConnectionFromPort(connectionPort);
        if (!currentConnection) {
            throw new Error(`No connection found for port ${connectionPort}`);
        }
        const server = (0, net_1.createServer)(socket => {
            currentConnection === null || currentConnection === void 0 ? void 0 : currentConnection.forwardOut(socket, portToForward.port);
        }).listen(portToForward.port, portToForward.address);
        currentConnection.onDidDisconnect(() => {
            this.portRemoved(portToForward);
        });
        RemotePortForwardingProviderImpl_1.forwardedPorts.push({ connection: currentConnection, port: portToForward, server });
    }
    async portRemoved(forwardedPort) {
        const forwardInfo = RemotePortForwardingProviderImpl_1.forwardedPorts.find(info => info.port.port === forwardedPort.port);
        if (forwardInfo) {
            forwardInfo.server.close();
            RemotePortForwardingProviderImpl_1.forwardedPorts.splice(RemotePortForwardingProviderImpl_1.forwardedPorts.indexOf(forwardInfo), 1);
        }
    }
    async getForwardedPorts() {
        return Array.from(RemotePortForwardingProviderImpl_1.forwardedPorts)
            .map(forwardInfo => ({ ...forwardInfo.port, editing: false }));
    }
};
exports.RemotePortForwardingProviderImpl = RemotePortForwardingProviderImpl;
RemotePortForwardingProviderImpl.forwardedPorts = [];
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_connection_service_1.RemoteConnectionService),
    tslib_1.__metadata("design:type", remote_connection_service_1.RemoteConnectionService)
], RemotePortForwardingProviderImpl.prototype, "connectionService", void 0);
exports.RemotePortForwardingProviderImpl = RemotePortForwardingProviderImpl = RemotePortForwardingProviderImpl_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemotePortForwardingProviderImpl);
//# sourceMappingURL=remote-port-forwarding-provider.js.map