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
exports.AppNativeDependencyContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const core_1 = require("@theia/core");
let AppNativeDependencyContribution = class AppNativeDependencyContribution {
    constructor() {
        this.appDownloadUrlBase = 'https://github.com/eclipse-theia/theia/releases/download';
    }
    getDefaultURLForFile(remotePlatform, theiaVersion) {
        if (remotePlatform.arch !== 'x64') {
            throw new Error(`Unsupported remote architecture '${remotePlatform.arch}'. Remote support is only available for x64 architectures.`);
        }
        let platform;
        if (remotePlatform.os === core_1.OS.Type.Windows) {
            platform = 'win32';
        }
        else if (remotePlatform.os === core_1.OS.Type.OSX) {
            platform = 'darwin';
        }
        else {
            platform = 'linux';
        }
        return `${this.appDownloadUrlBase}/v${theiaVersion}/native-dependencies-${platform}-${remotePlatform.arch}.zip`;
    }
    async download(options) {
        return {
            buffer: await options.download(this.getDefaultURLForFile(options.remotePlatform, options.theiaVersion)),
            archive: 'zip'
        };
    }
};
exports.AppNativeDependencyContribution = AppNativeDependencyContribution;
exports.AppNativeDependencyContribution = AppNativeDependencyContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AppNativeDependencyContribution);
//# sourceMappingURL=app-native-dependency-contribution.js.map