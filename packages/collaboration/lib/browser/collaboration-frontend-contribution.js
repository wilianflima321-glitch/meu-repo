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
exports.CollaborationFrontendContribution = exports.DEFAULT_COLLABORATION_SERVER_URL = exports.COLLABORATION_SERVER_URL = exports.COLLABORATION_AUTH_TOKEN = exports.COLLABORATION_STATUS_BAR_ID = exports.CollaborationCommands = exports.COLLABORATION_CATEGORY = void 0;
const tslib_1 = require("tslib");
require("../../src/browser/style/index.css");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const open_collaboration_protocol_1 = require("open-collaboration-protocol");
const window_service_1 = require("@theia/core/lib/browser/window/window-service");
const collaboration_instance_1 = require("./collaboration-instance");
const env_variables_1 = require("@theia/core/lib/common/env-variables");
const collaboration_workspace_service_1 = require("./collaboration-workspace-service");
const status_bar_1 = require("@theia/core/lib/browser/status-bar");
const widget_1 = require("@theia/core/lib/browser/widgets/widget");
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
(0, open_collaboration_protocol_1.initializeProtocol)({
    cryptoModule: window.crypto
});
exports.COLLABORATION_CATEGORY = 'Collaboration';
var CollaborationCommands;
(function (CollaborationCommands) {
    CollaborationCommands.CREATE_ROOM = {
        id: 'collaboration.create-room'
    };
    CollaborationCommands.JOIN_ROOM = {
        id: 'collaboration.join-room'
    };
    CollaborationCommands.SIGN_OUT = {
        id: 'collaboration.sign-out',
        label: core_1.nls.localizeByDefault('Sign Out'),
        category: exports.COLLABORATION_CATEGORY,
    };
})(CollaborationCommands || (exports.CollaborationCommands = CollaborationCommands = {}));
exports.COLLABORATION_STATUS_BAR_ID = 'statusBar.collaboration';
exports.COLLABORATION_AUTH_TOKEN = 'THEIA_COLLAB_AUTH_TOKEN';
exports.COLLABORATION_SERVER_URL = 'COLLABORATION_SERVER_URL';
exports.DEFAULT_COLLABORATION_SERVER_URL = 'https://api.open-collab.tools/';
let CollaborationFrontendContribution = class CollaborationFrontendContribution {
    init() {
        this.setStatusBarEntryDefault();
    }
    async createConnectionProvider() {
        var _a;
        const serverUrl = await this.getCollaborationServerUrl();
        return new open_collaboration_protocol_1.ConnectionProvider({
            url: serverUrl,
            client: frontend_application_config_provider_1.FrontendApplicationConfigProvider.get().applicationName,
            fetch: window.fetch.bind(window),
            authenticationHandler: (token, meta) => this.handleAuth(serverUrl, token, meta),
            transports: [open_collaboration_protocol_1.SocketIoTransportProvider],
            userToken: (_a = localStorage.getItem(exports.COLLABORATION_AUTH_TOKEN)) !== null && _a !== void 0 ? _a : undefined
        });
    }
    async handleAuth(serverUrl, token, metaData) {
        const hasAuthProviders = Boolean(metaData.providers.length);
        if (!hasAuthProviders && metaData.loginPageUrl) {
            if (metaData.loginPageUrl) {
                this.windowService.openNewWindow(metaData.loginPageUrl, { external: true });
                return true;
            }
            else {
                this.messageService.error(core_1.nls.localize('theia/collaboration/noAuth', 'No authentication method provided by the server.'));
                return false;
            }
        }
        if (!this.quickInputService) {
            return false;
        }
        const quickPickItems = metaData.providers.map(provider => {
            var _a;
            return ({
                label: provider.label.message,
                detail: (_a = provider.details) === null || _a === void 0 ? void 0 : _a.message,
                provider
            });
        });
        const item = await this.quickInputService.pick(quickPickItems, {
            title: core_1.nls.localize('theia/collaboration/selectAuth', 'Select Authentication Method'),
        });
        if (item) {
            switch (item.provider.type) {
                case 'form':
                    return this.handleFormAuth(serverUrl, token, item.provider);
                case 'web':
                    return this.handleWebAuth(serverUrl, token, item.provider);
            }
        }
        return false;
    }
    async handleFormAuth(serverUrl, token, provider) {
        const fields = provider.fields;
        const values = {
            token
        };
        for (const field of fields) {
            let placeHolder;
            if (field.placeHolder) {
                placeHolder = field.placeHolder.message;
            }
            else {
                placeHolder = field.label.message;
            }
            placeHolder += field.required ? '' : ` (${core_1.nls.localize('theia/collaboration/optional', 'optional')})`;
            const value = await this.quickInputService.input({
                prompt: field.label.message,
                placeHolder,
            });
            // Test for thruthyness to also test for empty string
            if (value) {
                values[field.name] = value;
            }
            else if (field.required) {
                this.messageService.error(core_1.nls.localize('theia/collaboration/fieldRequired', 'The {0} field is required. Login aborted.', field.label.message));
                return false;
            }
        }
        const endpointUrl = new core_1.URI(serverUrl).withPath(provider.endpoint);
        const response = await fetch(endpointUrl.toString(true), {
            method: 'POST',
            body: JSON.stringify(values),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            this.messageService.info(core_1.nls.localize('theia/collaboration/loginSuccessful', 'Login successful.'));
        }
        else {
            this.messageService.error(core_1.nls.localize('theia/collaboration/loginFailed', 'Login failed.'));
        }
        return response.ok;
    }
    async handleWebAuth(serverUrl, token, provider) {
        const uri = new core_1.URI(serverUrl).withPath(provider.endpoint).withQuery('token=' + token);
        this.windowService.openNewWindow(uri.toString(true), { external: true });
        return true;
    }
    async onStatusDefaultClick() {
        var _a;
        const items = [];
        if (this.workspaceService.opened) {
            items.push({
                label: core_1.nls.localize('theia/collaboration/createRoom', 'Create New Collaboration Session'),
                iconClasses: (0, widget_1.codiconArray)('add'),
                execute: () => this.commands.executeCommand(CollaborationCommands.CREATE_ROOM.id)
            });
        }
        items.push({
            label: core_1.nls.localize('theia/collaboration/joinRoom', 'Join Collaboration Session'),
            iconClasses: (0, widget_1.codiconArray)('vm-connect'),
            execute: () => this.commands.executeCommand(CollaborationCommands.JOIN_ROOM.id)
        });
        await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.showQuickPick(items, {
            placeholder: core_1.nls.localize('theia/collaboration/selectCollaboration', 'Select collaboration option')
        }));
    }
    async onStatusSharedClick(code) {
        var _a;
        const items = [{
                label: core_1.nls.localize('theia/collaboration/invite', 'Invite Others'),
                detail: core_1.nls.localize('theia/collaboration/inviteDetail', 'Copy the invitation code for sharing it with others to join the session.'),
                iconClasses: (0, widget_1.codiconArray)('clippy'),
                execute: () => this.displayCopyNotification(code)
            }];
        if (this.currentInstance) {
            // TODO: Implement readonly mode
            // if (this.currentInstance.readonly) {
            //     items.push({
            //         label: nls.localize('theia/collaboration/enableEditing', 'Enable Workspace Editing'),
            //         detail: nls.localize('theia/collaboration/enableEditingDetail', 'Allow collaborators to modify content in your workspace.'),
            //         iconClasses: codiconArray('unlock'),
            //         execute: () => {
            //             if (this.currentInstance) {
            //                 this.currentInstance.readonly = false;
            //             }
            //         }
            //     });
            // } else {
            //     items.push({
            //         label: nls.localize('theia/collaboration/disableEditing', 'Disable Workspace Editing'),
            //         detail: nls.localize('theia/collaboration/disableEditingDetail', 'Restrict others from making changes to your workspace.'),
            //         iconClasses: codiconArray('lock'),
            //         execute: () => {
            //             if (this.currentInstance) {
            //                 this.currentInstance.readonly = true;
            //             }
            //         }
            //     });
            // }
        }
        items.push({
            label: core_1.nls.localize('theia/collaboration/end', 'End Collaboration Session'),
            detail: core_1.nls.localize('theia/collaboration/endDetail', 'Terminate the session, cease content sharing, and revoke access for others.'),
            iconClasses: (0, widget_1.codiconArray)('circle-slash'),
            execute: () => { var _a; return (_a = this.currentInstance) === null || _a === void 0 ? void 0 : _a.dispose(); }
        });
        await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.showQuickPick(items, {
            placeholder: core_1.nls.localize('theia/collaboration/whatToDo', 'What would you like to do with other collaborators?')
        }));
    }
    async onStatusConnectedClick(code) {
        var _a;
        const items = [{
                label: core_1.nls.localize('theia/collaboration/invite', 'Invite Others'),
                detail: core_1.nls.localize('theia/collaboration/inviteDetail', 'Copy the invitation code for sharing it with others to join the session.'),
                iconClasses: (0, widget_1.codiconArray)('clippy'),
                execute: () => this.displayCopyNotification(code)
            }];
        items.push({
            label: core_1.nls.localize('theia/collaboration/leave', 'Leave Collaboration Session'),
            detail: core_1.nls.localize('theia/collaboration/leaveDetail', 'Disconnect from the current collaboration session and close the workspace.'),
            iconClasses: (0, widget_1.codiconArray)('circle-slash'),
            execute: () => { var _a; return (_a = this.currentInstance) === null || _a === void 0 ? void 0 : _a.dispose(); }
        });
        await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.showQuickPick(items, {
            placeholder: core_1.nls.localize('theia/collaboration/whatToDo', 'What would you like to do with other collaborators?')
        }));
    }
    async setStatusBarEntryDefault() {
        await this.setStatusBarEntry({
            text: '$(codicon-live-share) ' + core_1.nls.localize('theia/collaboration/collaborate', 'Collaborate'),
            tooltip: core_1.nls.localize('theia/collaboration/startSession', 'Start or join collaboration session'),
            onclick: () => this.onStatusDefaultClick()
        });
    }
    async setStatusBarEntryShared(code) {
        await this.setStatusBarEntry({
            text: '$(codicon-broadcast) ' + core_1.nls.localizeByDefault('Shared'),
            tooltip: core_1.nls.localize('theia/collaboration/sharedSession', 'Shared a collaboration session'),
            onclick: () => this.onStatusSharedClick(code)
        });
    }
    async setStatusBarEntryConnected(code) {
        await this.setStatusBarEntry({
            text: '$(codicon-broadcast) ' + core_1.nls.localize('theia/collaboration/connected', 'Connected'),
            tooltip: core_1.nls.localize('theia/collaboration/connectedSession', 'Connected to a collaboration session'),
            onclick: () => this.onStatusConnectedClick(code)
        });
    }
    async setStatusBarEntry(entry) {
        await this.statusBar.setElement(exports.COLLABORATION_STATUS_BAR_ID, {
            ...entry,
            alignment: status_bar_1.StatusBarAlignment.LEFT,
            priority: 5
        });
    }
    async getCollaborationServerUrl() {
        const serverUrlVariable = await this.envVariables.getValue(exports.COLLABORATION_SERVER_URL);
        const serverUrlPreference = this.preferenceService.get('collaboration.serverUrl');
        return (serverUrlVariable === null || serverUrlVariable === void 0 ? void 0 : serverUrlVariable.value) || serverUrlPreference || exports.DEFAULT_COLLABORATION_SERVER_URL;
    }
    registerCommands(commands) {
        commands.registerCommand(CollaborationCommands.CREATE_ROOM, {
            execute: async () => {
                var _a;
                const cancelTokenSource = new core_1.CancellationTokenSource();
                const progress = await this.messageService.showProgress({
                    text: core_1.nls.localize('theia/collaboration/creatingRoom', 'Creating Session'),
                    options: {
                        cancelable: true
                    }
                }, () => cancelTokenSource.cancel());
                try {
                    const authHandler = await this.createConnectionProvider();
                    const roomClaim = await authHandler.createRoom({
                        reporter: info => progress.report({ message: info.message }),
                        abortSignal: this.toAbortSignal(cancelTokenSource.token)
                    });
                    if (roomClaim.loginToken) {
                        localStorage.setItem(exports.COLLABORATION_AUTH_TOKEN, roomClaim.loginToken);
                    }
                    (_a = this.currentInstance) === null || _a === void 0 ? void 0 : _a.dispose();
                    const connection = await authHandler.connect(roomClaim.roomToken);
                    this.currentInstance = this.collaborationInstanceFactory({
                        role: 'host',
                        connection
                    });
                    this.currentInstance.onDidClose(() => {
                        this.setStatusBarEntryDefault();
                    });
                    const roomCode = roomClaim.roomId;
                    this.setStatusBarEntryShared(roomCode);
                    this.displayCopyNotification(roomCode, true);
                }
                catch (err) {
                    await this.messageService.error(core_1.nls.localize('theia/collaboration/failedCreate', 'Failed to create room: {0}', err.message));
                }
                finally {
                    progress.cancel();
                }
            }
        });
        commands.registerCommand(CollaborationCommands.JOIN_ROOM, {
            execute: async () => {
                var _a, _b;
                let joinRoomProgress;
                const cancelTokenSource = new core_1.CancellationTokenSource();
                try {
                    const authHandler = await this.createConnectionProvider();
                    const id = await ((_a = this.quickInputService) === null || _a === void 0 ? void 0 : _a.input({
                        placeHolder: core_1.nls.localize('theia/collaboration/enterCode', 'Enter collaboration session code')
                    }));
                    if (!id) {
                        return;
                    }
                    joinRoomProgress = await this.messageService.showProgress({
                        text: core_1.nls.localize('theia/collaboration/joiningRoom', 'Joining Session'),
                        options: {
                            cancelable: true
                        }
                    }, () => cancelTokenSource.cancel());
                    const roomClaim = await authHandler.joinRoom({
                        roomId: id,
                        reporter: info => joinRoomProgress === null || joinRoomProgress === void 0 ? void 0 : joinRoomProgress.report({ message: info.message }),
                        abortSignal: this.toAbortSignal(cancelTokenSource.token)
                    });
                    joinRoomProgress.cancel();
                    if (roomClaim.loginToken) {
                        localStorage.setItem(exports.COLLABORATION_AUTH_TOKEN, roomClaim.loginToken);
                    }
                    (_b = this.currentInstance) === null || _b === void 0 ? void 0 : _b.dispose();
                    const connection = await authHandler.connect(roomClaim.roomToken, roomClaim.host);
                    this.currentInstance = this.collaborationInstanceFactory({
                        role: 'guest',
                        connection
                    });
                    this.currentInstance.onDidClose(() => {
                        this.setStatusBarEntryDefault();
                    });
                    this.setStatusBarEntryConnected(roomClaim.roomId);
                }
                catch (err) {
                    joinRoomProgress === null || joinRoomProgress === void 0 ? void 0 : joinRoomProgress.cancel();
                    await this.messageService.error(core_1.nls.localize('theia/collaboration/failedJoin', 'Failed to join room: {0}', err.message));
                }
            }
        });
        commands.registerCommand(CollaborationCommands.SIGN_OUT, {
            execute: async () => {
                localStorage.removeItem(exports.COLLABORATION_AUTH_TOKEN);
            }
        });
    }
    toAbortSignal(...tokens) {
        const controller = new AbortController();
        tokens.forEach(token => token.onCancellationRequested(() => controller.abort()));
        return controller.signal;
    }
    async displayCopyNotification(code, firstTime = false) {
        navigator.clipboard.writeText(code);
        const notification = core_1.nls.localize('theia/collaboration/copiedInvitation', 'Invitation code copied to clipboard.');
        if (firstTime) {
            // const makeReadonly = nls.localize('theia/collaboration/makeReadonly', 'Make readonly');
            const copyAgain = core_1.nls.localize('theia/collaboration/copyAgain', 'Copy Again');
            const copyResult = await this.messageService.info(notification, 
            // makeReadonly,
            copyAgain);
            // if (copyResult === makeReadonly && this.currentInstance) {
            //     this.currentInstance.readonly = true;
            // }
            if (copyResult === copyAgain) {
                navigator.clipboard.writeText(code);
            }
        }
        else {
            await this.messageService.info(notification);
        }
    }
};
exports.CollaborationFrontendContribution = CollaborationFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(window_service_1.WindowService),
    tslib_1.__metadata("design:type", Object)
], CollaborationFrontendContribution.prototype, "windowService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], CollaborationFrontendContribution.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(env_variables_1.EnvVariablesServer),
    tslib_1.__metadata("design:type", Object)
], CollaborationFrontendContribution.prototype, "envVariables", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_workspace_service_1.CollaborationWorkspaceService),
    tslib_1.__metadata("design:type", collaboration_workspace_service_1.CollaborationWorkspaceService)
], CollaborationFrontendContribution.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], CollaborationFrontendContribution.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], CollaborationFrontendContribution.prototype, "commands", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], CollaborationFrontendContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(status_bar_1.StatusBar),
    tslib_1.__metadata("design:type", Object)
], CollaborationFrontendContribution.prototype, "statusBar", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(collaboration_instance_1.CollaborationInstanceFactory),
    tslib_1.__metadata("design:type", Function)
], CollaborationFrontendContribution.prototype, "collaborationInstanceFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], CollaborationFrontendContribution.prototype, "init", null);
exports.CollaborationFrontendContribution = CollaborationFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CollaborationFrontendContribution);
//# sourceMappingURL=collaboration-frontend-contribution.js.map