"use strict";
// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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
var HostedPluginController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostedPluginController = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const status_bar_1 = require("@theia/core/lib/browser/status-bar/status-bar");
const browser_1 = require("@theia/core/lib/browser");
const common_1 = require("@theia/core/lib/common");
const commands_1 = require("@theia/core/shared/@lumino/commands");
const widgets_1 = require("@theia/core/shared/@lumino/widgets");
const frontend_application_state_1 = require("@theia/core/lib/browser/frontend-application-state");
const connection_status_service_1 = require("@theia/core/lib/browser/connection-status-service");
const plugin_dev_protocol_1 = require("../common/plugin-dev-protocol");
const hosted_plugin_manager_client_1 = require("./hosted-plugin-manager-client");
const hosted_plugin_log_viewer_1 = require("./hosted-plugin-log-viewer");
const hosted_plugin_preferences_1 = require("../common/hosted-plugin-preferences");
const nls_1 = require("@theia/core/lib/common/nls");
/**
 * Adds a status bar element displaying the state of secondary Theia instance with hosted plugin and
 * allows controlling the instance by simple clicking on the status bar element.
 */
let HostedPluginController = HostedPluginController_1 = class HostedPluginController {
    constructor() {
        this.pluginState = hosted_plugin_manager_client_1.HostedInstanceState.STOPPED;
    }
    initialize() {
        this.hostedPluginServer.getHostedPlugin().then(pluginMetadata => {
            if (!pluginMetadata) {
                this.frontendApplicationStateService.reachedState('ready').then(() => {
                    // handles status bar item
                    this.hostedPluginManagerClient.onStateChanged(e => {
                        if (e.state === hosted_plugin_manager_client_1.HostedInstanceState.STARTING) {
                            this.onHostedPluginStarting();
                        }
                        else if (e.state === hosted_plugin_manager_client_1.HostedInstanceState.RUNNING) {
                            this.onHostedPluginRunning();
                        }
                        else if (e.state === hosted_plugin_manager_client_1.HostedInstanceState.STOPPED) {
                            this.onHostedPluginStopped();
                        }
                        else if (e.state === hosted_plugin_manager_client_1.HostedInstanceState.FAILED) {
                            this.onHostedPluginFailed();
                        }
                    });
                    // handles watch compilation
                    this.hostedPluginManagerClient.onStateChanged(e => this.handleWatchers(e));
                    // updates status bar if page is loading when hosted instance is already running
                    this.hostedPluginServer.isHostedPluginInstanceRunning().then(running => {
                        if (running) {
                            this.onHostedPluginRunning();
                        }
                    });
                });
                this.connectionStatusService.onStatusChange(() => this.onConnectionStatusChanged());
                this.preferenceService.onPreferenceChanged(preference => this.onPreferencesChanged(preference));
            }
            else {
                console.error(`Need to load plugin ${pluginMetadata.model.id}`);
            }
        });
    }
    /**
     * Display status bar element for stopped plugin.
     */
    async onHostedPluginStopped() {
        this.pluginState = hosted_plugin_manager_client_1.HostedInstanceState.STOPPED;
        this.entry = {
            text: `${nls_1.nls.localize('theia/plugin-dev/hostedPluginStopped', 'Hosted Plugin: Stopped')} $(angle-up)`,
            alignment: browser_1.StatusBarAlignment.LEFT,
            priority: 100,
            onclick: e => {
                this.showMenu(e.clientX, e.clientY);
            }
        };
        this.entry.className = HostedPluginController_1.HOSTED_PLUGIN;
        await this.statusBar.setElement(HostedPluginController_1.HOSTED_PLUGIN, this.entry);
    }
    /**
     * Display status bar element for starting plugin.
     */
    async onHostedPluginStarting() {
        this.pluginState = hosted_plugin_manager_client_1.HostedInstanceState.STARTING;
        this.hostedPluginLogViewer.showLogConsole();
        this.entry = {
            text: `$(cog~spin) ${nls_1.nls.localize('theia/plugin-dev/hostedPluginStarting', 'Hosted Plugin: Starting')}`,
            alignment: browser_1.StatusBarAlignment.LEFT,
            priority: 100
        };
        this.entry.className = HostedPluginController_1.HOSTED_PLUGIN;
        await this.statusBar.setElement(HostedPluginController_1.HOSTED_PLUGIN, this.entry);
    }
    /**
     * Display status bar element for running plugin.
     */
    async onHostedPluginRunning() {
        this.pluginState = hosted_plugin_manager_client_1.HostedInstanceState.RUNNING;
        let entryText;
        if (this.hostedPluginPreferences['hosted-plugin.watchMode'] && this.watcherSuccess) {
            entryText = `$(cog~spin) ${nls_1.nls.localize('theia/plugin-dev/hostedPluginWatching', 'Hosted Plugin: Watching')}$(angle-up)`;
        }
        else {
            entryText = `$(cog~spin) ${nls_1.nls.localize('theia/plugin-dev/hostedPluginRunning', 'Hosted Plugin: Running')} $(angle-up)`;
        }
        this.entry = {
            text: entryText,
            alignment: browser_1.StatusBarAlignment.LEFT,
            priority: 100,
            onclick: e => {
                this.showMenu(e.clientX, e.clientY);
            }
        };
        this.entry.className = HostedPluginController_1.HOSTED_PLUGIN;
        await this.statusBar.setElement(HostedPluginController_1.HOSTED_PLUGIN, this.entry);
    }
    /**
     * Display status bar element for failed plugin.
     */
    async onHostedPluginFailed() {
        this.pluginState = hosted_plugin_manager_client_1.HostedInstanceState.FAILED;
        this.entry = {
            text: `${nls_1.nls.localize('theia/plugin-dev/hostedPluginStopped', 'Hosted Plugin: Stopped')} $(angle-up)`,
            alignment: browser_1.StatusBarAlignment.LEFT,
            priority: 100,
            onclick: e => {
                this.showMenu(e.clientX, e.clientY);
            }
        };
        this.entry.className = HostedPluginController_1.HOSTED_PLUGIN_FAILED;
        await this.statusBar.setElement(HostedPluginController_1.HOSTED_PLUGIN, this.entry);
    }
    async onPreferencesChanged(preference) {
        if (preference.preferenceName === 'hosted-plugin.watchMode') {
            if (await this.hostedPluginServer.isHostedPluginInstanceRunning()) {
                const pluginLocation = await this.hostedPluginServer.getHostedPluginURI();
                const isWatchCompilationRunning = await this.hostedPluginServer.isWatchCompilationRunning(pluginLocation);
                if (preference.newValue === true) {
                    if (!isWatchCompilationRunning) {
                        await this.runWatchCompilation(pluginLocation.toString());
                    }
                }
                else {
                    if (isWatchCompilationRunning) {
                        await this.hostedPluginServer.stopWatchCompilation(pluginLocation.toString());
                    }
                }
                // update status bar
                this.onHostedPluginRunning();
            }
        }
    }
    /**
     * Starts / stops watchers on hosted instance state change.
     *
     * @param event hosted instance state change event
     */
    async handleWatchers(event) {
        if (event.state === hosted_plugin_manager_client_1.HostedInstanceState.RUNNING) {
            if (this.hostedPluginPreferences['hosted-plugin.watchMode']) {
                await this.runWatchCompilation(event.pluginLocation.toString());
                // update status bar
                this.onHostedPluginRunning();
            }
        }
        else if (event.state === hosted_plugin_manager_client_1.HostedInstanceState.STOPPING) {
            if (this.hostedPluginPreferences['hosted-plugin.watchMode']) {
                const isRunning = await this.hostedPluginServer.isWatchCompilationRunning(event.pluginLocation.toString());
                if (isRunning) {
                    try {
                        await this.hostedPluginServer.stopWatchCompilation(event.pluginLocation.toString());
                    }
                    catch (error) {
                        this.messageService.error(this.getErrorMessage(error));
                    }
                }
            }
        }
    }
    async runWatchCompilation(pluginLocation) {
        try {
            await this.hostedPluginServer.runWatchCompilation(pluginLocation);
            this.watcherSuccess = true;
        }
        catch (error) {
            this.messageService.error(this.getErrorMessage(error));
            this.watcherSuccess = false;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getErrorMessage(error) {
        var _a;
        return ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.substring(error.message.indexOf(':') + 1)) || '';
    }
    /**
     * Updating status bar element when changing connection status.
     */
    onConnectionStatusChanged() {
        if (this.connectionStatusService.currentStatus === connection_status_service_1.ConnectionStatus.OFFLINE) {
            // Re-set the element only if it's visible on status bar
            if (this.entry) {
                const offlineElement = {
                    text: nls_1.nls.localize('theia/plugin-dev/hostedPluginStopped', 'Hosted Plugin: Stopped'),
                    alignment: browser_1.StatusBarAlignment.LEFT,
                    priority: 100
                };
                this.entry.className = HostedPluginController_1.HOSTED_PLUGIN_OFFLINE;
                this.statusBar.setElement(HostedPluginController_1.HOSTED_PLUGIN, offlineElement);
            }
        }
        else {
            // ask state of hosted plugin when switching to Online
            if (this.entry) {
                this.hostedPluginServer.isHostedPluginInstanceRunning().then(running => {
                    if (running) {
                        this.onHostedPluginRunning();
                    }
                    else {
                        this.onHostedPluginStopped();
                    }
                });
            }
        }
    }
    /**
     * Show menu containing actions to start/stop/restart hosted plugin.
     */
    showMenu(x, y) {
        const commands = new commands_1.CommandRegistry();
        const menu = new widgets_1.Menu({
            commands
        });
        if (this.pluginState === hosted_plugin_manager_client_1.HostedInstanceState.RUNNING) {
            this.addCommandsForRunningPlugin(commands, menu);
        }
        else if (this.pluginState === hosted_plugin_manager_client_1.HostedInstanceState.STOPPED || this.pluginState === hosted_plugin_manager_client_1.HostedInstanceState.FAILED) {
            this.addCommandsForStoppedPlugin(commands, menu);
        }
        menu.open(x, y);
    }
    /**
     * Adds commands to the menu for running plugin.
     */
    addCommandsForRunningPlugin(commands, menu) {
        commands.addCommand(hosted_plugin_manager_client_1.HostedPluginCommands.STOP.id, {
            label: nls_1.nls.localize('theia/plugin-dev/stopInstance', 'Stop Instance'),
            iconClass: (0, browser_1.codicon)('debug-stop'),
            execute: () => setTimeout(() => this.hostedPluginManagerClient.stop(), 100)
        });
        menu.addItem({
            type: 'command',
            command: hosted_plugin_manager_client_1.HostedPluginCommands.STOP.id
        });
        commands.addCommand(hosted_plugin_manager_client_1.HostedPluginCommands.RESTART.id, {
            label: nls_1.nls.localize('theia/plugin-dev/restartInstance', 'Restart Instance'),
            iconClass: (0, browser_1.codicon)('debug-restart'),
            execute: () => setTimeout(() => this.hostedPluginManagerClient.restart(), 100)
        });
        menu.addItem({
            type: 'command',
            command: hosted_plugin_manager_client_1.HostedPluginCommands.RESTART.id
        });
    }
    /**
     * Adds command to the menu for stopped plugin.
     */
    addCommandsForStoppedPlugin(commands, menu) {
        commands.addCommand(hosted_plugin_manager_client_1.HostedPluginCommands.START.id, {
            label: nls_1.nls.localize('theia/plugin-dev/startInstance', 'Start Instance'),
            iconClass: (0, browser_1.codicon)('play'),
            execute: () => setTimeout(() => this.hostedPluginManagerClient.start(), 100)
        });
        menu.addItem({
            type: 'command',
            command: hosted_plugin_manager_client_1.HostedPluginCommands.START.id
        });
        commands.addCommand(hosted_plugin_manager_client_1.HostedPluginCommands.DEBUG.id, {
            label: nls_1.nls.localize('theia/plugin-dev/debugInstance', 'Debug Instance'),
            iconClass: (0, browser_1.codicon)('debug'),
            execute: () => setTimeout(() => this.hostedPluginManagerClient.debug(), 100)
        });
        menu.addItem({
            type: 'command',
            command: hosted_plugin_manager_client_1.HostedPluginCommands.DEBUG.id
        });
    }
};
exports.HostedPluginController = HostedPluginController;
HostedPluginController.HOSTED_PLUGIN = 'hosted-plugin';
HostedPluginController.HOSTED_PLUGIN_OFFLINE = 'hosted-plugin-offline';
HostedPluginController.HOSTED_PLUGIN_FAILED = 'hosted-plugin-failed';
tslib_1.__decorate([
    (0, inversify_1.inject)(status_bar_1.StatusBar),
    tslib_1.__metadata("design:type", Object)
], HostedPluginController.prototype, "statusBar", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_application_state_1.FrontendApplicationStateService),
    tslib_1.__metadata("design:type", frontend_application_state_1.FrontendApplicationStateService)
], HostedPluginController.prototype, "frontendApplicationStateService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_dev_protocol_1.PluginDevServer),
    tslib_1.__metadata("design:type", Object)
], HostedPluginController.prototype, "hostedPluginServer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_manager_client_1.HostedPluginManagerClient),
    tslib_1.__metadata("design:type", hosted_plugin_manager_client_1.HostedPluginManagerClient)
], HostedPluginController.prototype, "hostedPluginManagerClient", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(connection_status_service_1.ConnectionStatusService),
    tslib_1.__metadata("design:type", Object)
], HostedPluginController.prototype, "connectionStatusService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_log_viewer_1.HostedPluginLogViewer),
    tslib_1.__metadata("design:type", hosted_plugin_log_viewer_1.HostedPluginLogViewer)
], HostedPluginController.prototype, "hostedPluginLogViewer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_preferences_1.HostedPluginPreferences),
    tslib_1.__metadata("design:type", Object)
], HostedPluginController.prototype, "hostedPluginPreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PreferenceServiceImpl),
    tslib_1.__metadata("design:type", common_1.PreferenceServiceImpl)
], HostedPluginController.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.MessageService),
    tslib_1.__metadata("design:type", common_1.MessageService)
], HostedPluginController.prototype, "messageService", void 0);
exports.HostedPluginController = HostedPluginController = HostedPluginController_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HostedPluginController);
//# sourceMappingURL=hosted-plugin-controller.js.map