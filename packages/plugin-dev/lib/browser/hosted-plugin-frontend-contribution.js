"use strict";
// *****************************************************************************
// Copyright (C) 2019 Red Hat, Inc. and others.
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
exports.HostedPluginFrontendContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const hosted_plugin_manager_client_1 = require("./hosted-plugin-manager-client");
let HostedPluginFrontendContribution = class HostedPluginFrontendContribution {
    registerCommands(commands) {
        commands.registerCommand(hosted_plugin_manager_client_1.HostedPluginCommands.START, {
            execute: () => this.hostedPluginManagerClient.start()
        });
        commands.registerCommand(hosted_plugin_manager_client_1.HostedPluginCommands.DEBUG, {
            execute: () => this.hostedPluginManagerClient.debug()
        });
        commands.registerCommand(hosted_plugin_manager_client_1.HostedPluginCommands.STOP, {
            execute: () => this.hostedPluginManagerClient.stop()
        });
        commands.registerCommand(hosted_plugin_manager_client_1.HostedPluginCommands.RESTART, {
            execute: () => this.hostedPluginManagerClient.restart()
        });
        commands.registerCommand(hosted_plugin_manager_client_1.HostedPluginCommands.SELECT_PATH, {
            execute: () => this.hostedPluginManagerClient.selectPluginPath()
        });
    }
};
exports.HostedPluginFrontendContribution = HostedPluginFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_manager_client_1.HostedPluginManagerClient),
    tslib_1.__metadata("design:type", hosted_plugin_manager_client_1.HostedPluginManagerClient)
], HostedPluginFrontendContribution.prototype, "hostedPluginManagerClient", void 0);
exports.HostedPluginFrontendContribution = HostedPluginFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HostedPluginFrontendContribution);
//# sourceMappingURL=hosted-plugin-frontend-contribution.js.map