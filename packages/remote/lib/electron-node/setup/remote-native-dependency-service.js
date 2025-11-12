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
exports.RemoteNativeDependencyService = exports.DEFAULT_HTTP_OPTIONS = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const request_1 = require("@theia/core/shared/@theia/request");
const decompress = require("decompress");
const path = require("path");
const fs = require("fs/promises");
const remote_native_dependency_contribution_1 = require("./remote-native-dependency-contribution");
const decompressTar = require('decompress-tar');
const decompressTargz = require('decompress-targz');
const decompressUnzip = require('decompress-unzip');
exports.DEFAULT_HTTP_OPTIONS = {
    method: 'GET',
    headers: {
        Accept: 'application/octet-stream'
    },
};
let RemoteNativeDependencyService = class RemoteNativeDependencyService {
    async downloadDependencies(remotePlatform, directory) {
        const contributionResults = await Promise.all(this.nativeDependencyContributions.getContributions()
            .map(async (contribution) => {
            const result = await contribution.download({
                remotePlatform,
                theiaVersion: core_1.THEIA_VERSION,
                download: requestInfo => this.downloadDependency(requestInfo)
            });
            const dependency = await this.storeDependency(result, directory);
            return dependency;
        }));
        return contributionResults.flat();
    }
    async downloadDependency(downloadURI) {
        const options = typeof downloadURI === 'string'
            ? { url: downloadURI, ...exports.DEFAULT_HTTP_OPTIONS }
            : { ...exports.DEFAULT_HTTP_OPTIONS, ...downloadURI };
        const req = await this.requestService.request(options);
        if (request_1.RequestContext.isSuccess(req)) {
            if (typeof req.buffer === 'string') {
                return Buffer.from(req.buffer, 'utf8');
            }
            else {
                return Buffer.from(req.buffer);
            }
        }
        else {
            throw new Error('Server error while downloading native dependency from: ' + options.url);
        }
    }
    async storeDependency(dependency, directory) {
        if (remote_native_dependency_contribution_1.DirectoryDependencyDownload.is(dependency)) {
            const archiveBuffer = dependency.buffer;
            const plugins = [];
            if (dependency.archive === 'tar') {
                plugins.push(decompressTar());
            }
            else if (dependency.archive === 'tgz') {
                plugins.push(decompressTargz());
            }
            else if (dependency.archive === 'zip') {
                plugins.push(decompressUnzip());
            }
            const files = await decompress(archiveBuffer, directory, { plugins });
            const result = await Promise.all(files.map(async (file) => {
                const localPath = path.join(directory, file.path);
                return {
                    path: localPath,
                    target: file.path,
                    mode: file.mode
                };
            }));
            return result;
        }
        else {
            const fileName = path.basename(dependency.file.path);
            const localPath = path.join(directory, fileName);
            await fs.writeFile(localPath, dependency.buffer);
            return [{
                    path: localPath,
                    target: dependency.file.path,
                    mode: dependency.file.mode
                }];
        }
    }
};
exports.RemoteNativeDependencyService = RemoteNativeDependencyService;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(remote_native_dependency_contribution_1.RemoteNativeDependencyContribution),
    tslib_1.__metadata("design:type", Object)
], RemoteNativeDependencyService.prototype, "nativeDependencyContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(request_1.RequestService),
    tslib_1.__metadata("design:type", Object)
], RemoteNativeDependencyService.prototype, "requestService", void 0);
exports.RemoteNativeDependencyService = RemoteNativeDependencyService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteNativeDependencyService);
//# sourceMappingURL=remote-native-dependency-service.js.map