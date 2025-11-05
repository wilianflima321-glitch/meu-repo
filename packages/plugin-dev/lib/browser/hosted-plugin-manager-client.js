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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostedPluginManagerClient = exports.HostedInstanceState = exports.HostedPluginCommands = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const uri_1 = require("@theia/core/lib/common/uri");
const path_1 = require("@theia/core/lib/common/path");
const common_1 = require("@theia/core/lib/common");
const browser_1 = require("@theia/core/lib/browser");
const window_service_1 = require("@theia/core/lib/browser/window/window-service");
const browser_2 = require("@theia/workspace/lib/browser");
const browser_3 = require("@theia/filesystem/lib/browser");
const plugin_dev_protocol_1 = require("../common/plugin-dev-protocol");
const debug_session_manager_1 = require("@theia/debug/lib/browser/debug-session-manager");
const hosted_plugin_preferences_1 = require("../common/hosted-plugin-preferences");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const env_variables_1 = require("@theia/core/lib/common/env-variables");
const nls_1 = require("@theia/core/lib/common/nls");
/**
 * Commands to control Hosted plugin instances.
 */
var HostedPluginCommands;
(function (HostedPluginCommands) {
    const HOSTED_PLUGIN_CATEGORY_KEY = 'theia/plugin-dev/hostedPlugin';
    const HOSTED_PLUGIN_CATEGORY = 'Hosted Plugin';
    HostedPluginCommands.START = common_1.Command.toLocalizedCommand({
        id: 'hosted-plugin:start',
        category: HOSTED_PLUGIN_CATEGORY,
        label: 'Start Instance'
    }, 'theia/plugin-dev/startInstance', HOSTED_PLUGIN_CATEGORY_KEY);
    HostedPluginCommands.DEBUG = common_1.Command.toLocalizedCommand({
        id: 'hosted-plugin:debug',
        category: HOSTED_PLUGIN_CATEGORY,
        label: 'Debug Instance'
    }, 'theia/plugin-dev/debugInstance', HOSTED_PLUGIN_CATEGORY_KEY);
    HostedPluginCommands.STOP = common_1.Command.toLocalizedCommand({
        id: 'hosted-plugin:stop',
        category: HOSTED_PLUGIN_CATEGORY,
        label: 'Stop Instance'
    }, 'theia/plugin-dev/stopInstance', HOSTED_PLUGIN_CATEGORY_KEY);
    HostedPluginCommands.RESTART = common_1.Command.toLocalizedCommand({
        id: 'hosted-plugin:restart',
        category: HOSTED_PLUGIN_CATEGORY,
        label: 'Restart Instance'
    }, 'theia/plugin-dev/restartInstance', HOSTED_PLUGIN_CATEGORY_KEY);
    HostedPluginCommands.SELECT_PATH = common_1.Command.toLocalizedCommand({
        id: 'hosted-plugin:select-path',
        category: HOSTED_PLUGIN_CATEGORY,
        label: 'Select Path'
    }, 'theia/plugin-dev/selectPath', HOSTED_PLUGIN_CATEGORY_KEY);
})(HostedPluginCommands || (exports.HostedPluginCommands = HostedPluginCommands = {}));
/**
 * Available states of hosted plugin instance.
 */
var HostedInstanceState;
(function (HostedInstanceState) {
    HostedInstanceState["STOPPED"] = "stopped";
    HostedInstanceState["STARTING"] = "starting";
    HostedInstanceState["RUNNING"] = "running";
    HostedInstanceState["STOPPING"] = "stopping";
    HostedInstanceState["FAILED"] = "failed";
})(HostedInstanceState || (exports.HostedInstanceState = HostedInstanceState = {}));
/**
 * Responsible for UI to set up and control Hosted Plugin Instance.
 */
let HostedPluginManagerClient = class HostedPluginManagerClient {
    constructor() {
        this.isDebug = false;
        this.stateChanged = new common_1.Emitter();
    }
    get onStateChanged() {
        return this.stateChanged.event;
    }
    init() {
        this.doInit();
    }
    async doInit() {
        this.openNewTabAskDialog = new OpenHostedInstanceLinkDialog(this.windowService);
        // is needed for case when page is loaded when hosted instance is already running.
        if (await this.hostedPluginServer.isHostedPluginInstanceRunning()) {
            this.pluginLocation = new uri_1.default(await this.hostedPluginServer.getHostedPluginURI());
        }
    }
    get lastPluginLocation() {
        if (this.pluginLocation) {
            return this.pluginLocation.toString();
        }
        return undefined;
    }
    async start(debugConfig) {
        if (await this.hostedPluginServer.isHostedPluginInstanceRunning()) {
            this.messageService.warn(nls_1.nls.localize('theia/plugin-dev/alreadyRunning', 'Hosted instance is already running.'));
            return;
        }
        if (!this.pluginLocation) {
            await this.selectPluginPath();
            if (!this.pluginLocation) {
                // selection was cancelled
                return;
            }
        }
        try {
            this.stateChanged.fire({ state: HostedInstanceState.STARTING, pluginLocation: this.pluginLocation });
            this.messageService.info(nls_1.nls.localize('theia/plugin-dev/starting', 'Starting hosted instance server ...'));
            if (debugConfig) {
                this.isDebug = true;
                this.pluginInstanceURL = await this.hostedPluginServer.runDebugHostedPluginInstance(this.pluginLocation.toString(), debugConfig);
            }
            else {
                this.isDebug = false;
                this.pluginInstanceURL = await this.hostedPluginServer.runHostedPluginInstance(this.pluginLocation.toString());
            }
            await this.openPluginWindow();
            this.messageService.info(`${nls_1.nls.localize('theia/plugin-dev/running', 'Hosted instance is running at:')} ${this.pluginInstanceURL}`);
            this.stateChanged.fire({ state: HostedInstanceState.RUNNING, pluginLocation: this.pluginLocation });
        }
        catch (error) {
            this.messageService.error(nls_1.nls.localize('theia/plugin-dev/failed', 'Failed to run hosted plugin instance: {0}', this.getErrorMessage(error)));
            this.stateChanged.fire({ state: HostedInstanceState.FAILED, pluginLocation: this.pluginLocation });
            this.stop();
        }
    }
    async debug(config) {
        await this.start(this.setDebugConfig(config));
        await this.startDebugSessionManager();
        return this.pluginInstanceURL;
    }
    async startDebugSessionManager() {
        let outFiles = undefined;
        if (this.pluginLocation && this.hostedPluginPreferences['hosted-plugin.launchOutFiles'].length > 0) {
            const fsPath = await this.fileService.fsPath(this.pluginLocation);
            if (fsPath) {
                outFiles = this.hostedPluginPreferences['hosted-plugin.launchOutFiles'].map(outFile => outFile.replace('${pluginPath}', new path_1.Path(fsPath).toString()));
            }
        }
        const name = nls_1.nls.localize('theia/plugin-dev/hostedPlugin', 'Hosted Plugin');
        await this.debugSessionManager.start({
            name,
            configuration: {
                type: 'node',
                request: 'attach',
                timeout: 30000,
                name,
                smartStep: true,
                sourceMaps: !!outFiles,
                outFiles
            }
        });
    }
    async stop(checkRunning = true) {
        if (checkRunning && !await this.hostedPluginServer.isHostedPluginInstanceRunning()) {
            this.messageService.warn(nls_1.nls.localize('theia/plugin-dev/notRunning', 'Hosted instance is not running.'));
            return;
        }
        try {
            this.stateChanged.fire({ state: HostedInstanceState.STOPPING, pluginLocation: this.pluginLocation });
            await this.hostedPluginServer.terminateHostedPluginInstance();
            this.messageService.info((this.pluginInstanceURL
                ? nls_1.nls.localize('theia/plugin-dev/instanceTerminated', '{0} has been terminated', this.pluginInstanceURL)
                : nls_1.nls.localize('theia/plugin-dev/unknownTerminated', 'The instance has been terminated')));
            this.stateChanged.fire({ state: HostedInstanceState.STOPPED, pluginLocation: this.pluginLocation });
        }
        catch (error) {
            this.messageService.error(this.getErrorMessage(error));
        }
    }
    async restart() {
        if (await this.hostedPluginServer.isHostedPluginInstanceRunning()) {
            await this.stop(false);
            this.messageService.info(nls_1.nls.localize('theia/plugin-dev/starting', 'Starting hosted instance server ...'));
            // It takes some time before OS released all resources e.g. port.
            // Keep trying to run hosted instance with delay.
            this.stateChanged.fire({ state: HostedInstanceState.STARTING, pluginLocation: this.pluginLocation });
            let lastError;
            for (let tries = 0; tries < 15; tries++) {
                try {
                    if (this.isDebug) {
                        this.pluginInstanceURL = await this.hostedPluginServer.runDebugHostedPluginInstance(this.pluginLocation.toString(), {
                            debugMode: this.hostedPluginPreferences['hosted-plugin.debugMode'],
                            debugPort: [...this.hostedPluginPreferences['hosted-plugin.debugPorts']]
                        });
                        await this.startDebugSessionManager();
                    }
                    else {
                        this.pluginInstanceURL = await this.hostedPluginServer.runHostedPluginInstance(this.pluginLocation.toString());
                    }
                    await this.openPluginWindow();
                    this.messageService.info(`${nls_1.nls.localize('theia/plugin-dev/running', 'Hosted instance is running at:')} ${this.pluginInstanceURL}`);
                    this.stateChanged.fire({
                        state: HostedInstanceState.RUNNING,
                        pluginLocation: this.pluginLocation
                    });
                    return;
                }
                catch (error) {
                    lastError = error;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            this.messageService.error(nls_1.nls.localize('theia/plugin-dev/failed', 'Failed to run hosted plugin instance: {0}', this.getErrorMessage(lastError)));
            this.stateChanged.fire({ state: HostedInstanceState.FAILED, pluginLocation: this.pluginLocation });
            this.stop();
        }
        else {
            this.messageService.warn(nls_1.nls.localize('theia/plugin-dev/notRunning', 'Hosted instance is not running.'));
            this.start();
        }
    }
    /**
     * Creates directory choose dialog and set selected folder into pluginLocation field.
     */
    async selectPluginPath() {
        const workspaceFolder = (await this.workspaceService.roots)[0] || await this.fileService.resolve(new uri_1.default(await this.environments.getHomeDirUri()));
        if (!workspaceFolder) {
            throw new Error('Unable to find the root');
        }
        const result = await this.fileDialogService.showOpenDialog({
            title: HostedPluginCommands.SELECT_PATH.label,
            openLabel: nls_1.nls.localize('theia/plugin-dev/select', 'Select'),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        }, workspaceFolder);
        if (result) {
            if (await this.hostedPluginServer.isPluginValid(result.toString())) {
                this.pluginLocation = result;
                this.messageService.info(nls_1.nls.localize('theia/plugin-dev/pluginFolder', 'Plugin folder is set to: {0}', this.labelProvider.getLongName(result)));
            }
            else {
                this.messageService.error(nls_1.nls.localize('theia/plugin-dev/noValidPlugin', 'Specified folder does not contain valid plugin.'));
            }
        }
    }
    register(configType, connection) {
        if (configType === 'pwa-extensionHost') {
            this.connection = connection;
            this.connection.onRequest('launchVSCode', (request) => this.launchVSCode(request));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.connection.on('exited', async (args) => {
                await this.stop();
            });
        }
    }
    /**
     * Opens window with URL to the running plugin instance.
     */
    async openPluginWindow() {
        // do nothing for electron browser
        if (browser_1.isNative) {
            return;
        }
        if (this.pluginInstanceURL) {
            try {
                this.windowService.openNewWindow(this.pluginInstanceURL);
            }
            catch (err) {
                // browser blocked opening of a new tab
                this.openNewTabAskDialog.showOpenNewTabAskDialog(this.pluginInstanceURL);
            }
        }
    }
    async launchVSCode({ arguments: { args } }) {
        let result = {};
        let instanceURI;
        const sessions = this.debugSessionManager.sessions.filter(session => session.id !== this.connection.sessionId);
        /* if `launchVSCode` is invoked and sessions do not exist - it means that `start` debug was invoked.
           if `launchVSCode` is invoked and sessions do exist - it means that `restartSessions()` was invoked,
           which invoked `this.sendRequest('restart', {})`, which restarted `vscode-builtin-js-debug` plugin which is
           connected to first session (sessions[0]), which means that other existing (child) sessions need to be terminated
           and new ones will be created by running `startDebugSessionManager()`
         */
        if (sessions.length > 0) {
            sessions.forEach(session => this.debugSessionManager.terminateSession(session));
            await this.startDebugSessionManager();
            instanceURI = this.pluginInstanceURL;
        }
        else {
            instanceURI = await this.debug(this.getDebugPluginConfig(args));
        }
        if (instanceURI) {
            const instanceURL = new URL(instanceURI);
            if (instanceURL.port) {
                result = Object.assign(result, { rendererDebugPort: instanceURL.port });
            }
        }
        return result;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getErrorMessage(error) {
        var _a;
        return ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.substring(error.message.indexOf(':') + 1)) || '';
    }
    setDebugConfig(config) {
        config = Object.assign(config || {}, { debugMode: this.hostedPluginPreferences['hosted-plugin.debugMode'] });
        if (config.pluginLocation) {
            this.pluginLocation = new uri_1.default((!config.pluginLocation.startsWith('/') ? '/' : '') + config.pluginLocation.replace(/\\/g, '/')).withScheme('file');
        }
        if (config.debugPort === undefined) {
            config.debugPort = [...this.hostedPluginPreferences['hosted-plugin.debugPorts']];
        }
        return config;
    }
    getDebugPluginConfig(args) {
        let pluginLocation;
        for (const arg of args) {
            if ((arg === null || arg === void 0 ? void 0 : arg.prefix) === '--extensionDevelopmentPath=') {
                pluginLocation = arg.path;
            }
        }
        return {
            pluginLocation
        };
    }
};
exports.HostedPluginManagerClient = HostedPluginManagerClient;
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_dev_protocol_1.PluginDevServer),
    tslib_1.__metadata("design:type", Object)
], HostedPluginManagerClient.prototype, "hostedPluginServer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.MessageService),
    tslib_1.__metadata("design:type", common_1.MessageService)
], HostedPluginManagerClient.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LabelProvider),
    tslib_1.__metadata("design:type", browser_1.LabelProvider)
], HostedPluginManagerClient.prototype, "labelProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(window_service_1.WindowService),
    tslib_1.__metadata("design:type", Object)
], HostedPluginManagerClient.prototype, "windowService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], HostedPluginManagerClient.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(env_variables_1.EnvVariablesServer),
    tslib_1.__metadata("design:type", Object)
], HostedPluginManagerClient.prototype, "environments", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], HostedPluginManagerClient.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_session_manager_1.DebugSessionManager),
    tslib_1.__metadata("design:type", debug_session_manager_1.DebugSessionManager)
], HostedPluginManagerClient.prototype, "debugSessionManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_preferences_1.HostedPluginPreferences),
    tslib_1.__metadata("design:type", Object)
], HostedPluginManagerClient.prototype, "hostedPluginPreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_3.FileDialogService),
    tslib_1.__metadata("design:type", Object)
], HostedPluginManagerClient.prototype, "fileDialogService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], HostedPluginManagerClient.prototype, "init", null);
exports.HostedPluginManagerClient = HostedPluginManagerClient = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HostedPluginManagerClient);
class OpenHostedInstanceLinkDialog extends browser_1.AbstractDialog {
    constructor(windowService) {
        super({
            title: nls_1.nls.localize('theia/plugin-dev/preventedNewTab', 'Your browser prevented opening of a new tab')
        });
        this.windowService = windowService;
        this.linkNode = document.createElement('a');
        this.linkNode.target = '_blank';
        this.linkNode.setAttribute('style', 'color: var(--theia-editorWidget-foreground);');
        this.contentNode.appendChild(this.linkNode);
        const messageNode = document.createElement('div');
        messageNode.innerText = nls_1.nls.localize('theia/plugin-dev/running', 'Hosted instance is running at:') + ' ';
        messageNode.appendChild(this.linkNode);
        this.contentNode.appendChild(messageNode);
        this.appendCloseButton();
        this.openButton = this.appendAcceptButton(nls_1.nls.localizeByDefault('Open'));
    }
    showOpenNewTabAskDialog(uri) {
        this.value = uri;
        this.linkNode.textContent = uri;
        this.linkNode.href = uri;
        this.openButton.onclick = () => {
            this.windowService.openNewWindow(uri);
        };
        this.open();
    }
}
//# sourceMappingURL=hosted-plugin-manager-client.js.map