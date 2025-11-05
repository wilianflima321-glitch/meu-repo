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
exports.RemoteSetupScriptService = exports.RemotePosixScriptStrategy = exports.RemoteWindowsScriptStrategy = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
let RemoteWindowsScriptStrategy = class RemoteWindowsScriptStrategy {
    home() {
        return 'PowerShell -Command $HOME';
    }
    exec() {
        return 'PowerShell -Command';
    }
    downloadFile(url, output) {
        return `PowerShell -Command Invoke-WebRequest -Uri "${url}" -OutFile ${output}`;
    }
    unzip(file, directory) {
        return `tar -xf "${file}" -C "${directory}"`;
    }
    mkdir(path) {
        return `PowerShell -Command New-Item -Force -itemType Directory -Path "${path}"`;
    }
    joinPath(...segments) {
        return segments.join('\\');
    }
    joinScript(...segments) {
        return segments.join('\r\n');
    }
};
exports.RemoteWindowsScriptStrategy = RemoteWindowsScriptStrategy;
exports.RemoteWindowsScriptStrategy = RemoteWindowsScriptStrategy = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteWindowsScriptStrategy);
let RemotePosixScriptStrategy = class RemotePosixScriptStrategy {
    home() {
        return 'eval echo ~';
    }
    exec() {
        return 'sh -c';
    }
    downloadFile(url, output) {
        return `
if [ "$(command -v wget)" ]; then
    echo "Downloading using wget"
    wget -O "${output}" "${url}"
elif [ "$(command -v curl)" ]; then
    echo "Downloading using curl"
    curl "${url}" --output "${output}"
else
    echo "Failed to find wget or curl."
    exit 1
fi
`.trim();
    }
    unzip(file, directory) {
        return `tar -xf "${file}" -C "${directory}"`;
    }
    mkdir(path) {
        return `mkdir -p "${path}"`;
    }
    joinPath(...segments) {
        return segments.join('/');
    }
    joinScript(...segments) {
        return segments.join('\n');
    }
};
exports.RemotePosixScriptStrategy = RemotePosixScriptStrategy;
exports.RemotePosixScriptStrategy = RemotePosixScriptStrategy = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemotePosixScriptStrategy);
let RemoteSetupScriptService = class RemoteSetupScriptService {
    getStrategy(platform) {
        return platform.os === core_1.OS.Type.Windows ? this.windowsStrategy : this.posixStrategy;
    }
    home(platform) {
        return this.getStrategy(platform).home();
    }
    exec(platform) {
        return this.getStrategy(platform).exec();
    }
    downloadFile(platform, url, output) {
        return this.getStrategy(platform).downloadFile(url, output);
    }
    unzip(platform, file, directory) {
        return this.getStrategy(platform).unzip(file, directory);
    }
    mkdir(platform, path) {
        return this.getStrategy(platform).mkdir(path);
    }
    joinPath(platform, ...segments) {
        return this.getStrategy(platform).joinPath(...segments);
    }
    joinScript(platform, ...segments) {
        return this.getStrategy(platform).joinScript(...segments);
    }
};
exports.RemoteSetupScriptService = RemoteSetupScriptService;
tslib_1.__decorate([
    (0, inversify_1.inject)(RemoteWindowsScriptStrategy),
    tslib_1.__metadata("design:type", RemoteWindowsScriptStrategy)
], RemoteSetupScriptService.prototype, "windowsStrategy", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(RemotePosixScriptStrategy),
    tslib_1.__metadata("design:type", RemotePosixScriptStrategy)
], RemoteSetupScriptService.prototype, "posixStrategy", void 0);
exports.RemoteSetupScriptService = RemoteSetupScriptService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteSetupScriptService);
//# sourceMappingURL=remote-setup-script-service.js.map