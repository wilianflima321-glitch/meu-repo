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
exports.RemoteNodeSetupService = exports.REMOTE_NODE_VERSION = void 0;
const tslib_1 = require("tslib");
const path = require("path");
const fs = require("@theia/core/shared/fs-extra");
const os = require("os");
const inversify_1 = require("@theia/core/shared/inversify");
const request_1 = require("@theia/core/shared/@theia/request");
const remote_setup_script_service_1 = require("./remote-setup-script-service");
const core_1 = require("@theia/core");
/**
 * The current node version that Theia recommends.
 *
 * Native dependencies are compiled against this version.
 */
exports.REMOTE_NODE_VERSION = '22.17.0';
let RemoteNodeSetupService = class RemoteNodeSetupService {
    getNodeDirectoryName(platform) {
        return `node-v${exports.REMOTE_NODE_VERSION}-${this.getPlatformName(platform)}-${platform.arch}`;
    }
    getPlatformName(platform) {
        let platformId;
        if (platform.os === core_1.OS.Type.Windows) {
            platformId = 'win';
        }
        else if (platform.os === core_1.OS.Type.OSX) {
            platformId = 'darwin';
        }
        else {
            platformId = 'linux';
        }
        return platformId;
    }
    validatePlatform(platform) {
        if (platform.os === core_1.OS.Type.Windows && !platform.arch.match(/^x(64|86)$/)) {
            this.throwPlatformError(platform, 'x64 and x86');
        }
        else if (platform.os === core_1.OS.Type.Linux && !platform.arch.match(/^(x64|armv7l|arm64)$/)) {
            this.throwPlatformError(platform, 'x64, armv7l and arm64');
        }
        else if (platform.os === core_1.OS.Type.OSX && !platform.arch.match(/^(x64|arm64)$/)) {
            this.throwPlatformError(platform, 'x64 and arm64');
        }
    }
    throwPlatformError(platform, supportedArch) {
        throw new Error(`Invalid architecture for ${platform.os}: '${platform.arch}'. Only ${supportedArch} are supported.`);
    }
    getNodeFileExtension(platform) {
        let fileExtension;
        if (platform.os === core_1.OS.Type.Windows) {
            fileExtension = 'zip';
        }
        else if (platform.os === core_1.OS.Type.OSX) {
            fileExtension = 'tar.gz';
        }
        else {
            fileExtension = 'tar.xz';
        }
        return fileExtension;
    }
    getNodeFileName(platform) {
        return `${this.getNodeDirectoryName(platform)}.${this.getNodeFileExtension(platform)}`;
    }
    async downloadNode(platform, downloadTemplate) {
        this.validatePlatform(platform);
        const fileName = this.getNodeFileName(platform);
        const tmpdir = os.tmpdir();
        const localPath = path.join(tmpdir, fileName);
        if (!await fs.pathExists(localPath)) {
            const downloadPath = this.getDownloadPath(platform, downloadTemplate);
            const downloadResult = await this.requestService.request({
                url: downloadPath
            });
            await fs.writeFile(localPath, downloadResult.buffer);
        }
        return localPath;
    }
    generateDownloadScript(platform, targetPath, downloadTemplate) {
        this.validatePlatform(platform);
        const fileName = this.getNodeFileName(platform);
        const downloadPath = this.getDownloadPath(platform, downloadTemplate);
        const zipPath = this.scriptService.joinPath(platform, targetPath, fileName);
        const download = this.scriptService.downloadFile(platform, downloadPath, zipPath);
        const unzip = this.scriptService.unzip(platform, zipPath, targetPath);
        return this.scriptService.joinScript(platform, download, unzip);
    }
    getDownloadPath(platform, downloadTemplate) {
        const template = downloadTemplate || 'https://nodejs.org/dist/v{version}/node-v{version}-{os}-{arch}.{ext}';
        const downloadPath = template
            .replace(/{version}/g, exports.REMOTE_NODE_VERSION)
            .replace(/{os}/g, this.getPlatformName(platform))
            .replace(/{arch}/g, platform.arch)
            .replace(/{ext}/g, this.getNodeFileExtension(platform));
        return downloadPath;
    }
};
exports.RemoteNodeSetupService = RemoteNodeSetupService;
tslib_1.__decorate([
    (0, inversify_1.inject)(request_1.RequestService),
    tslib_1.__metadata("design:type", Object)
], RemoteNodeSetupService.prototype, "requestService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_setup_script_service_1.RemoteSetupScriptService),
    tslib_1.__metadata("design:type", remote_setup_script_service_1.RemoteSetupScriptService)
], RemoteNodeSetupService.prototype, "scriptService", void 0);
exports.RemoteNodeSetupService = RemoteNodeSetupService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteNodeSetupService);
//# sourceMappingURL=remote-node-setup-service.js.map