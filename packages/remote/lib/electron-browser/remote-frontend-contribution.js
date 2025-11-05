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
exports.RemoteFrontendContribution = exports.RemoteCommands = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_status_service_1 = require("../electron-common/remote-status-service");
const remote_registry_contribution_1 = require("./remote-registry-contribution");
const remote_service_1 = require("./remote-service");
const window_service_1 = require("@theia/core/lib/browser/window/window-service");
const electron_local_ws_connection_source_1 = require("@theia/core/lib/electron-browser/messaging/electron-local-ws-connection-source");
var RemoteCommands;
(function (RemoteCommands) {
    RemoteCommands.REMOTE_SELECT = {
        id: 'remote.select'
    };
    RemoteCommands.REMOTE_DISCONNECT = core_1.Command.toDefaultLocalizedCommand({
        id: 'remote.disconnect',
        label: 'Close Remote Connection',
    });
})(RemoteCommands || (exports.RemoteCommands = RemoteCommands = {}));
let RemoteFrontendContribution = class RemoteFrontendContribution {
    constructor() {
        this.remoteRegistry = new remote_registry_contribution_1.RemoteRegistry();
    }
    async configure() {
        const port = (0, electron_local_ws_connection_source_1.getCurrentPort)();
        if (port) {
            const status = await this.remoteStatusService.getStatus(Number(port));
            await this.setStatusBar(status);
        }
        else {
            await this.setStatusBar({
                alive: false
            });
        }
    }
    async setStatusBar(info) {
        this.remoteService.setConnected(info.alive);
        const entry = {
            alignment: browser_1.StatusBarAlignment.LEFT,
            command: RemoteCommands.REMOTE_SELECT.id,
            backgroundColor: 'var(--theia-statusBarItem-remoteBackground)',
            color: 'var(--theia-statusBarItem-remoteForeground)',
            priority: 10000,
            ...(info.alive
                ? {
                    text: `$(codicon-remote) ${info.type}: ${info.name.length > 35 ? info.name.substring(0, 32) + '...' : info.name}`,
                    tooltip: core_1.nls.localizeByDefault('Editing on {0}', info.name),
                } : {
                text: '$(codicon-remote)',
                tooltip: core_1.nls.localizeByDefault('Open a Remote Window'),
            })
        };
        this.statusBar.setElement('remoteStatus', entry);
    }
    registerCommands(commands) {
        this.remoteRegistry.onDidRegisterCommand(([command, handler]) => {
            commands.registerCommand(command, handler);
        });
        for (const contribution of this.remoteRegistryContributions.getContributions()) {
            contribution.registerRemoteCommands(this.remoteRegistry);
        }
        commands.registerCommand(RemoteCommands.REMOTE_SELECT, {
            execute: () => this.selectRemote()
        });
        commands.registerCommand(RemoteCommands.REMOTE_DISCONNECT, {
            execute: () => this.disconnectRemote()
        });
    }
    async disconnectRemote() {
        const localPort = (0, electron_local_ws_connection_source_1.getLocalPort)();
        if (localPort) {
            const searchParams = new URLSearchParams(location.search);
            const currentPort = searchParams.get('port');
            this.remoteStatusService.connectionClosed(parseInt(currentPort !== null && currentPort !== void 0 ? currentPort : '0'));
            this.windowService.reload({ search: { port: localPort } });
        }
    }
    async selectRemote() {
        var _a;
        const commands = [...this.remoteRegistry.commands
                .filter(command => this.commandRegistry.isVisible(command.id))];
        if (this.remoteService.isConnected()) {
            commands.push(RemoteCommands.REMOTE_DISCONNECT);
        }
        const quickPicks = [];
        let previousCategory = undefined;
        for (const command of commands) {
            if (previousCategory !== command.category) {
                quickPicks.push({
                    type: 'separator',
                    label: command.category
                });
                previousCategory = command.category;
            }
            quickPicks.push({
                label: command.label,
                id: command.id
            });
        }
        const selection = await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.showQuickPick(quickPicks, {
            placeholder: core_1.nls.localizeByDefault('Select an option to open a Remote Window')
        }));
        if (selection) {
            this.commandRegistry.executeCommand(selection.id);
        }
    }
};
exports.RemoteFrontendContribution = RemoteFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.StatusBar),
    tslib_1.__metadata("design:type", Object)
], RemoteFrontendContribution.prototype, "statusBar", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], RemoteFrontendContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], RemoteFrontendContribution.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_service_1.RemoteService),
    tslib_1.__metadata("design:type", remote_service_1.RemoteService)
], RemoteFrontendContribution.prototype, "remoteService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_status_service_1.RemoteStatusService),
    tslib_1.__metadata("design:type", Object)
], RemoteFrontendContribution.prototype, "remoteStatusService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(window_service_1.WindowService),
    tslib_1.__metadata("design:type", Object)
], RemoteFrontendContribution.prototype, "windowService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(remote_registry_contribution_1.RemoteRegistryContribution),
    tslib_1.__metadata("design:type", Object)
], RemoteFrontendContribution.prototype, "remoteRegistryContributions", void 0);
exports.RemoteFrontendContribution = RemoteFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteFrontendContribution);
//# sourceMappingURL=remote-frontend-contribution.js.map