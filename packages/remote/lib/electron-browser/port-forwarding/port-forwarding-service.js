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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortForwardingService = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_port_forwarding_provider_1 = require("../../electron-common/remote-port-forwarding-provider");
const electron_local_ws_connection_source_1 = require("@theia/core/lib/electron-browser/messaging/electron-local-ws-connection-source");
let PortForwardingService = class PortForwardingService {
    constructor() {
        this.onDidChangePortsEmitter = new core_1.Emitter();
        this.onDidChangePorts = this.onDidChangePortsEmitter.event;
        this.forwardedPorts = [];
    }
    init() {
        this.provider.getForwardedPorts().then(ports => {
            this.forwardedPorts = ports.map(p => ({ address: p.address, localPort: p.port, editing: false }));
            this.onDidChangePortsEmitter.fire();
        });
    }
    forwardNewPort(origin) {
        const index = this.forwardedPorts.push({ editing: true, origin });
        return this.forwardedPorts[index - 1];
    }
    updatePort(port, newAdress) {
        const connectionPort = (0, electron_local_ws_connection_source_1.getCurrentPort)();
        if (!connectionPort) {
            // if there is no open remote connection we can't forward a port
            return;
        }
        const parts = newAdress.split(':');
        if (parts.length === 2) {
            port.address = parts[0];
            port.localPort = parseInt(parts[1]);
        }
        else {
            port.localPort = parseInt(parts[0]);
        }
        port.editing = false;
        this.provider.forwardPort(parseInt(connectionPort), { port: port.localPort, address: port.address });
        this.onDidChangePortsEmitter.fire();
    }
    removePort(port) {
        const index = this.forwardedPorts.indexOf(port);
        if (index !== -1) {
            this.forwardedPorts.splice(index, 1);
            this.provider.portRemoved({ port: port.localPort });
            this.onDidChangePortsEmitter.fire();
        }
    }
    isValidAddress(address) {
        const match = address.match(/^(.*:)?\d+$/);
        if (!match) {
            return false;
        }
        const port = parseInt(address.includes(':') ? address.split(':')[1] : address);
        return !this.forwardedPorts.some(p => p.localPort === port);
    }
};
exports.PortForwardingService = PortForwardingService;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_port_forwarding_provider_1.RemotePortForwardingProvider),
    tslib_1.__metadata("design:type", Object)
], PortForwardingService.prototype, "provider", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], PortForwardingService.prototype, "init", null);
exports.PortForwardingService = PortForwardingService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], PortForwardingService);
//# sourceMappingURL=port-forwarding-service.js.map