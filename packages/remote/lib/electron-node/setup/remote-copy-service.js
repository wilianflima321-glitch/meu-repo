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
exports.RemoteCopyService = void 0;
const tslib_1 = require("tslib");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const os = require("os");
const application_package_1 = require("@theia/core/shared/@theia/application-package");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_native_dependency_service_1 = require("./remote-native-dependency-service");
const core_1 = require("@theia/core");
const remote_copy_contribution_1 = require("./remote-copy-contribution");
const remote_copy_contribution_2 = require("@theia/core/lib/node/remote/remote-copy-contribution");
let RemoteCopyService = class RemoteCopyService {
    constructor() {
        this.initialized = false;
    }
    async copyToRemote(remote, remotePlatform, destination) {
        var _a;
        const zipName = path.basename(destination);
        const projectPath = this.applicationPackage.projectPath;
        const tempDir = await this.getTempDir();
        const zipPath = path.join(tempDir, zipName);
        const files = await this.getFiles(remotePlatform, tempDir);
        // We stream to a file here and then copy it because it is faster
        // Copying files via sftp is 4x times faster compared to readable streams
        const stream = fs.createWriteStream(zipPath);
        const archive = archiver('tar', {
            gzip: true
        });
        archive.pipe(stream);
        for (const file of files) {
            const filePath = path.isAbsolute(file.path)
                ? file.path
                : path.join(projectPath, file.path);
            archive.file(filePath, {
                name: file.target,
                mode: (_a = file.options) === null || _a === void 0 ? void 0 : _a.mode
            });
        }
        await archive.finalize();
        await remote.copy(zipPath, destination);
        await fs.promises.rm(tempDir, {
            recursive: true,
            force: true
        });
    }
    async getFiles(remotePlatform, tempDir) {
        const [localFiles, nativeDependencies] = await Promise.all([
            this.loadCopyContributions(),
            this.loadNativeDependencies(remotePlatform, tempDir)
        ]);
        return [...localFiles, ...nativeDependencies];
    }
    async loadCopyContributions() {
        if (this.initialized) {
            return this.copyRegistry.getFiles();
        }
        await Promise.all(this.copyContributions.getContributions()
            .map(copyContribution => copyContribution.copy(this.copyRegistry)));
        this.initialized = true;
        return this.copyRegistry.getFiles();
    }
    async loadNativeDependencies(remotePlatform, tempDir) {
        const dependencyFiles = await this.nativeDependencyService.downloadDependencies(remotePlatform, tempDir);
        return dependencyFiles.map(file => ({
            path: file.path,
            target: file.target,
            options: {
                mode: file.mode
            }
        }));
    }
    async getTempDir() {
        const dir = path.join(os.tmpdir(), 'theia-remote-');
        const tempDir = await fs.promises.mkdtemp(dir);
        return tempDir;
    }
    async getRemoteDownloadLocation() {
        return undefined;
    }
};
exports.RemoteCopyService = RemoteCopyService;
tslib_1.__decorate([
    (0, inversify_1.inject)(application_package_1.ApplicationPackage),
    tslib_1.__metadata("design:type", application_package_1.ApplicationPackage)
], RemoteCopyService.prototype, "applicationPackage", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_copy_contribution_1.RemoteCopyRegistryImpl),
    tslib_1.__metadata("design:type", remote_copy_contribution_1.RemoteCopyRegistryImpl)
], RemoteCopyService.prototype, "copyRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_native_dependency_service_1.RemoteNativeDependencyService),
    tslib_1.__metadata("design:type", remote_native_dependency_service_1.RemoteNativeDependencyService)
], RemoteCopyService.prototype, "nativeDependencyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(remote_copy_contribution_2.RemoteCopyContribution),
    tslib_1.__metadata("design:type", Object)
], RemoteCopyService.prototype, "copyContributions", void 0);
exports.RemoteCopyService = RemoteCopyService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteCopyService);
//# sourceMappingURL=remote-copy-service.js.map