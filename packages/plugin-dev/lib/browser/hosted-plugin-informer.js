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
var HostedPluginInformer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostedPluginInformer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const status_bar_1 = require("@theia/core/lib/browser/status-bar/status-bar");
const browser_1 = require("@theia/core/lib/browser");
const browser_2 = require("@theia/workspace/lib/browser");
const plugin_dev_protocol_1 = require("../common/plugin-dev-protocol");
const connection_status_service_1 = require("@theia/core/lib/browser/connection-status-service");
const frontend_application_state_1 = require("@theia/core/lib/browser/frontend-application-state");
const nls_1 = require("@theia/core/lib/common/nls");
const window_title_service_1 = require("@theia/core/lib/browser/window/window-title-service");
/**
 * Informs the user whether Theia is running with hosted plugin.
 * Adds 'Development Host' status bar element and appends the same prefix to window title.
 */
let HostedPluginInformer = HostedPluginInformer_1 = class HostedPluginInformer {
    initialize() {
        this.hostedPluginServer.getHostedPlugin().then(pluginMetadata => {
            if (pluginMetadata) {
                this.windowTitleService.update({
                    developmentHost: HostedPluginInformer_1.DEVELOPMENT_HOST_TITLE
                });
                this.entry = {
                    text: `$(cube) ${HostedPluginInformer_1.DEVELOPMENT_HOST_TITLE}`,
                    tooltip: `${nls_1.nls.localize('theia/plugin-dev/hostedPlugin', 'Hosted Plugin')} '${pluginMetadata.model.name}'`,
                    alignment: browser_1.StatusBarAlignment.LEFT,
                    priority: 100
                };
                this.frontendApplicationStateService.reachedState('ready').then(() => {
                    this.updateStatusBarElement();
                });
                this.connectionStatusService.onStatusChange(() => this.updateStatusBarElement());
            }
        });
    }
    updateStatusBarElement() {
        if (this.connectionStatusService.currentStatus === connection_status_service_1.ConnectionStatus.OFFLINE) {
            this.entry.className = HostedPluginInformer_1.DEVELOPMENT_HOST_OFFLINE;
        }
        else {
            this.entry.className = HostedPluginInformer_1.DEVELOPMENT_HOST;
        }
        this.statusBar.setElement(HostedPluginInformer_1.DEVELOPMENT_HOST, this.entry);
    }
};
exports.HostedPluginInformer = HostedPluginInformer;
HostedPluginInformer.DEVELOPMENT_HOST_TITLE = nls_1.nls.localize('theia/plugin-dev/devHost', 'Development Host');
HostedPluginInformer.DEVELOPMENT_HOST = 'development-host';
HostedPluginInformer.DEVELOPMENT_HOST_OFFLINE = 'development-host-offline';
tslib_1.__decorate([
    (0, inversify_1.inject)(status_bar_1.StatusBar),
    tslib_1.__metadata("design:type", Object)
], HostedPluginInformer.prototype, "statusBar", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], HostedPluginInformer.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(plugin_dev_protocol_1.PluginDevServer),
    tslib_1.__metadata("design:type", Object)
], HostedPluginInformer.prototype, "hostedPluginServer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(connection_status_service_1.ConnectionStatusService),
    tslib_1.__metadata("design:type", Object)
], HostedPluginInformer.prototype, "connectionStatusService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_application_state_1.FrontendApplicationStateService),
    tslib_1.__metadata("design:type", frontend_application_state_1.FrontendApplicationStateService)
], HostedPluginInformer.prototype, "frontendApplicationStateService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(window_title_service_1.WindowTitleService),
    tslib_1.__metadata("design:type", window_title_service_1.WindowTitleService)
], HostedPluginInformer.prototype, "windowTitleService", void 0);
exports.HostedPluginInformer = HostedPluginInformer = HostedPluginInformer_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], HostedPluginInformer);
//# sourceMappingURL=hosted-plugin-informer.js.map