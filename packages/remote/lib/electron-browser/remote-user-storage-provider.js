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
exports.RemoteUserStorageContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const user_storage_contribution_1 = require("@theia/userstorage/lib/browser/user-storage-contribution");
const remote_status_service_1 = require("../electron-common/remote-status-service");
const local_backend_services_1 = require("./local-backend-services");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const core_1 = require("@theia/core");
const env_variables_1 = require("@theia/core/lib/common/env-variables");
const electron_local_ws_connection_source_1 = require("@theia/core/lib/electron-browser/messaging/electron-local-ws-connection-source");
/**
 * This overide is to have remote connections still use settings, keymaps, etc. from the local machine.
 */
let RemoteUserStorageContribution = class RemoteUserStorageContribution extends user_storage_contribution_1.UserStorageContribution {
    constructor() {
        super(...arguments);
        this.isRemoteConnection = new promise_util_1.Deferred();
    }
    init() {
        const port = (0, electron_local_ws_connection_source_1.getCurrentPort)();
        if (port) {
            this.remoteStatusService.getStatus(Number(port)).then(status => this.isRemoteConnection.resolve(status.alive));
        }
    }
    async getDelegate(service) {
        return await this.isRemoteConnection.promise ?
            this.localRemoteFileSystemProvider
            : service.activateProvider('file');
    }
    async getCongigDirUri() {
        return await this.isRemoteConnection.promise ?
            new core_1.URI(await this.localEnvironments.getConfigDirUri())
            : super.getCongigDirUri();
    }
};
exports.RemoteUserStorageContribution = RemoteUserStorageContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_status_service_1.RemoteStatusService),
    tslib_1.__metadata("design:type", Object)
], RemoteUserStorageContribution.prototype, "remoteStatusService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(local_backend_services_1.LocalRemoteFileSystemProvider),
    tslib_1.__metadata("design:type", local_backend_services_1.LocalRemoteFileSystemProvider)
], RemoteUserStorageContribution.prototype, "localRemoteFileSystemProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(local_backend_services_1.LocalEnvVariablesServer),
    tslib_1.__metadata("design:type", Object)
], RemoteUserStorageContribution.prototype, "localEnvironments", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], RemoteUserStorageContribution.prototype, "init", null);
exports.RemoteUserStorageContribution = RemoteUserStorageContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteUserStorageContribution);
//# sourceMappingURL=remote-user-storage-provider.js.map