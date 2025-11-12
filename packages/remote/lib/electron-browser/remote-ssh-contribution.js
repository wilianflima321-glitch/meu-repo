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
exports.RemoteSSHContribution = exports.RemoteSSHCommands = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/variable-resolver/lib/browser");
const remote_ssh_connection_provider_1 = require("../electron-common/remote-ssh-connection-provider");
const remote_registry_contribution_1 = require("./remote-registry-contribution");
const remote_preferences_1 = require("../electron-common/remote-preferences");
const ssh_config_1 = require("ssh-config");
var RemoteSSHCommands;
(function (RemoteSSHCommands) {
    RemoteSSHCommands.CONNECT = core_1.Command.toLocalizedCommand({
        id: 'remote.ssh.connect',
        category: 'SSH',
        label: 'Connect to Host...',
    }, 'theia/remote/ssh/connect');
    RemoteSSHCommands.CONNECT_CURRENT_WINDOW = core_1.Command.toLocalizedCommand({
        id: 'remote.ssh.connectCurrentWindow',
        category: 'SSH',
        label: 'Connect Current Window to Host...',
    }, 'theia/remote/ssh/connect');
    RemoteSSHCommands.CONNECT_CURRENT_WINDOW_TO_CONFIG_HOST = core_1.Command.toLocalizedCommand({
        id: 'remote.ssh.connectToConfigHost',
        category: 'SSH',
        label: 'Connect Current Window to Host in Config File...',
    }, 'theia/remote/ssh/connectToConfigHost');
})(RemoteSSHCommands || (exports.RemoteSSHCommands = RemoteSSHCommands = {}));
let RemoteSSHContribution = class RemoteSSHContribution extends remote_registry_contribution_1.AbstractRemoteRegistryContribution {
    registerRemoteCommands(registry) {
        registry.registerCommand(RemoteSSHCommands.CONNECT, {
            execute: () => this.connect(true)
        });
        registry.registerCommand(RemoteSSHCommands.CONNECT_CURRENT_WINDOW, {
            execute: () => this.connect(false)
        });
        registry.registerCommand(RemoteSSHCommands.CONNECT_CURRENT_WINDOW_TO_CONFIG_HOST, {
            execute: () => this.connectToConfigHost()
        });
    }
    async getConfigFilePath() {
        const preference = this.remotePreferences['remote.ssh.configFile'];
        return this.variableResolver.resolve(preference);
    }
    async connectToConfigHost() {
        var _a, _b;
        const quickPicks = [];
        const filePath = await this.getConfigFilePath();
        if (!filePath) {
            this.messageService.error(core_1.nls.localize('theia/remote/sshNoConfigPath', 'No SSH config path found.'));
            return;
        }
        const sshConfig = await this.sshConnectionProvider.getSSHConfig(filePath);
        const wildcardCheck = /[\?\*\%]/;
        for (const record of sshConfig) {
            // check if its a section and if it has a single value
            if (!('config' in record) || !(typeof record.value === 'string')) {
                continue;
            }
            if (record.param.toLowerCase() === 'host' && !wildcardCheck.test(record.value)) {
                const rec = ((record.config)
                    .filter((entry) => entry.type === ssh_config_1.default.DIRECTIVE))
                    .reduce((pv, item) => ({ ...pv, [item.param.toLowerCase()]: item.value }), { 'host': record.value });
                const host = (rec.hostname || rec.host) + ':' + (rec.port || '22');
                const user = rec.user || 'root';
                quickPicks.push({
                    label: rec.host,
                    id: user + '@' + host
                });
            }
        }
        if (quickPicks.length === 0) {
            this.messageService.info(core_1.nls.localize('theia/remote/noConfigHosts', 'No SSH hosts found in the config file: ' + filePath));
            return;
        }
        const selection = await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.showQuickPick(quickPicks, {
            placeholder: core_1.nls.localizeByDefault('Select an option to open a Remote Window')
        }));
        if (selection === null || selection === void 0 ? void 0 : selection.id) {
            try {
                let [user, host] = selection.id.split('@', 2);
                host = selection.label;
                const remotePort = await this.sendSSHConnect(host, user);
                this.openRemote(remotePort, false);
            }
            catch (err) {
                this.messageService.error(`${core_1.nls.localize('theia/remote/ssh/failure', 'Could not open SSH connection to remote.')} ${(_b = err.message) !== null && _b !== void 0 ? _b : String(err)}`);
            }
        }
    }
    async connect(newWindow) {
        var _a;
        let host;
        let user;
        host = await this.quickInputService.input({
            title: core_1.nls.localize('theia/remote/ssh/enterHost', 'Enter SSH host name'),
            placeHolder: core_1.nls.localize('theia/remote/ssh/hostPlaceHolder', 'E.g. hello@example.com')
        });
        if (!host) {
            this.messageService.error(core_1.nls.localize('theia/remote/ssh/needsHost', 'Please enter a host name.'));
            return;
        }
        if (host.includes('@')) {
            const split = host.split('@');
            user = split[0];
            host = split[1];
        }
        if (!user) {
            const configHost = await this.sshConnectionProvider.matchSSHConfigHost(host, undefined, await this.getConfigFilePath());
            if (configHost) {
                if (!user && configHost.user) {
                    user = configHost.user;
                }
            }
        }
        if (!user) {
            user = await this.quickInputService.input({
                title: core_1.nls.localize('theia/remote/ssh/enterUser', 'Enter SSH user name'),
                placeHolder: core_1.nls.localize('theia/remote/ssh/userPlaceHolder', 'E.g. hello')
            });
        }
        if (!user) {
            this.messageService.error(core_1.nls.localize('theia/remote/ssh/needsUser', 'Please enter a user name.'));
            return;
        }
        try {
            const remotePort = await this.sendSSHConnect(host, user);
            this.openRemote(remotePort, newWindow);
        }
        catch (err) {
            this.messageService.error(`${core_1.nls.localize('theia/remote/ssh/failure', 'Could not open SSH connection to remote.')} ${(_a = err.message) !== null && _a !== void 0 ? _a : String(err)}`);
        }
    }
    async sendSSHConnect(host, user) {
        return this.sshConnectionProvider.establishConnection({
            host,
            user,
            nodeDownloadTemplate: this.remotePreferences['remote.nodeDownloadTemplate'],
            customConfigFile: await this.getConfigFilePath()
        });
    }
};
exports.RemoteSSHContribution = RemoteSSHContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], RemoteSSHContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_ssh_connection_provider_1.RemoteSSHConnectionProvider),
    tslib_1.__metadata("design:type", Object)
], RemoteSSHContribution.prototype, "sshConnectionProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], RemoteSSHContribution.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_preferences_1.RemotePreferences),
    tslib_1.__metadata("design:type", Object)
], RemoteSSHContribution.prototype, "remotePreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.VariableResolverService),
    tslib_1.__metadata("design:type", browser_1.VariableResolverService)
], RemoteSSHContribution.prototype, "variableResolver", void 0);
exports.RemoteSSHContribution = RemoteSSHContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteSSHContribution);
//# sourceMappingURL=remote-ssh-contribution.js.map