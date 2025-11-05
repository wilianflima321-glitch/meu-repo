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
exports.PortForwardingWidget = exports.PORT_FORWARDING_WIDGET_ID = void 0;
const tslib_1 = require("tslib");
const React = require("@theia/core/shared/react");
const browser_1 = require("@theia/core/lib/browser");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const port_forwarding_service_1 = require("./port-forwarding-service");
const clipboard_service_1 = require("@theia/core/lib/browser/clipboard-service");
exports.PORT_FORWARDING_WIDGET_ID = 'port-forwarding-widget';
let PortForwardingWidget = class PortForwardingWidget extends browser_1.ReactWidget {
    init() {
        this.id = exports.PORT_FORWARDING_WIDGET_ID;
        this.node.tabIndex = -1;
        this.title.label = core_1.nls.localizeByDefault('Ports');
        this.title.caption = this.title.label;
        this.title.closable = true;
        this.update();
        this.portForwardingService.onDidChangePorts(() => this.update());
    }
    render() {
        if (this.portForwardingService.forwardedPorts.length === 0) {
            return React.createElement("div", null,
                React.createElement("p", { style: { marginLeft: 'calc(var(--theia-ui-padding) * 2)' } }, core_1.nls.localizeByDefault('No forwarded ports. Forward a port to access your locally running services over the internet.\n[Forward a Port]({0})').split('\n')[0]),
                this.renderForwardPortButton());
        }
        return React.createElement("div", null,
            React.createElement("table", { className: 'port-table' },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", { className: 'port-table-header' }, core_1.nls.localizeByDefault('Port')),
                        React.createElement("th", { className: 'port-table-header' }, core_1.nls.localizeByDefault('Address')),
                        React.createElement("th", { className: 'port-table-header' }, core_1.nls.localizeByDefault('Running Process')),
                        React.createElement("th", { className: 'port-table-header' }, core_1.nls.localizeByDefault('Origin')))),
                React.createElement("tbody", null,
                    this.portForwardingService.forwardedPorts.map(port => {
                        var _a;
                        return (React.createElement("tr", { key: (_a = port.localPort) !== null && _a !== void 0 ? _a : 'editing' },
                            this.renderPortColumn(port),
                            this.renderAddressColumn(port),
                            React.createElement("td", null),
                            React.createElement("td", null, port.origin ? core_1.nls.localizeByDefault(port.origin) : '')));
                    }),
                    !this.portForwardingService.forwardedPorts.some(port => port.editing) && React.createElement("tr", null,
                        React.createElement("td", null, this.renderForwardPortButton())))));
    }
    renderForwardPortButton() {
        return React.createElement("button", { className: 'theia-button', onClick: () => {
                this.portForwardingService.forwardNewPort('User Forwarded');
                this.update();
            } }, core_1.nls.localizeByDefault('Forward a Port'));
    }
    renderAddressColumn(port) {
        var _a;
        const address = `${(_a = port.address) !== null && _a !== void 0 ? _a : '0.0.0.0'}:${port.localPort}`;
        return React.createElement("td", null,
            React.createElement("div", { className: 'button-cell' },
                React.createElement("span", { style: { flexGrow: 1 }, className: 'forwarded-address', onClick: async (e) => {
                        if (e.ctrlKey) {
                            const uri = new core_1.URI(`http://${address}`);
                            (await this.openerService.getOpener(uri)).open(uri);
                        }
                    }, title: core_1.nls.localizeByDefault('Follow link') + ' (ctrl/cmd + click)' }, port.localPort ? address : ''),
                port.localPort &&
                    React.createElement("span", { className: 'codicon codicon-clippy action-label', title: core_1.nls.localizeByDefault('Copy Local Address'), onClick: () => {
                            this.clipboardService.writeText(address);
                        } })));
    }
    renderPortColumn(port) {
        return port.editing ?
            React.createElement("td", null,
                React.createElement(PortEditingInput, { port: port, service: this.portForwardingService })) :
            React.createElement("td", null,
                React.createElement("div", { className: 'button-cell' },
                    React.createElement("span", { style: { flexGrow: 1 } }, port.localPort),
                    React.createElement("span", { className: 'codicon codicon-close action-label', title: core_1.nls.localizeByDefault('Stop Forwarding Port'), onClick: () => {
                            this.portForwardingService.removePort(port);
                            this.update();
                        } })));
    }
};
exports.PortForwardingWidget = PortForwardingWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(port_forwarding_service_1.PortForwardingService),
    tslib_1.__metadata("design:type", port_forwarding_service_1.PortForwardingService)
], PortForwardingWidget.prototype, "portForwardingService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.OpenerService),
    tslib_1.__metadata("design:type", Object)
], PortForwardingWidget.prototype, "openerService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(clipboard_service_1.ClipboardService),
    tslib_1.__metadata("design:type", Object)
], PortForwardingWidget.prototype, "clipboardService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], PortForwardingWidget.prototype, "init", null);
exports.PortForwardingWidget = PortForwardingWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], PortForwardingWidget);
function PortEditingInput({ port, service }) {
    var _a;
    const [error, setError] = React.useState(false);
    return React.createElement("input", { className: `theia-input forward-port-button${error ? ' port-edit-input-error' : ''}`, "port-edit-input-error": error, autoFocus: true, defaultValue: port.address ? `${port.address}:${port.localPort}` : (_a = port.localPort) !== null && _a !== void 0 ? _a : '', placeholder: core_1.nls.localizeByDefault('Port number or address (eg. 3000 or 10.10.10.10:2000).'), onKeyDown: e => e.key === 'Enter' && !error && service.updatePort(port, e.currentTarget.value), onKeyUp: e => setError(!service.isValidAddress(e.currentTarget.value)) });
}
//# sourceMappingURL=port-forwarding-widget.js.map