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
exports.RemoteElectronFileDialogService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const file_dialog_service_1 = require("@theia/filesystem/lib/browser/file-dialog/file-dialog-service");
const electron_file_dialog_service_1 = require("@theia/filesystem/lib/electron-browser/file-dialog/electron-file-dialog-service");
const remote_service_1 = require("./remote-service");
let RemoteElectronFileDialogService = class RemoteElectronFileDialogService extends electron_file_dialog_service_1.ElectronFileDialogService {
    showOpenDialog(props, folder) {
        if (this.remoteService.isConnected()) {
            return file_dialog_service_1.DefaultFileDialogService.prototype.showOpenDialog.call(this, props, folder);
        }
        else {
            return super.showOpenDialog(props, folder);
        }
    }
    showSaveDialog(props, folder) {
        if (this.remoteService.isConnected()) {
            return file_dialog_service_1.DefaultFileDialogService.prototype.showSaveDialog.call(this, props, folder);
        }
        else {
            return super.showSaveDialog(props, folder);
        }
    }
};
exports.RemoteElectronFileDialogService = RemoteElectronFileDialogService;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_service_1.RemoteService),
    tslib_1.__metadata("design:type", remote_service_1.RemoteService)
], RemoteElectronFileDialogService.prototype, "remoteService", void 0);
exports.RemoteElectronFileDialogService = RemoteElectronFileDialogService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteElectronFileDialogService);
//# sourceMappingURL=remote-electron-file-dialog-service.js.map