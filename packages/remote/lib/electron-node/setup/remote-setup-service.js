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
exports.RemoteSetupService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_cli_contribution_1 = require("@theia/core/lib/node/remote/remote-cli-contribution");
const application_package_1 = require("@theia/core/shared/@theia/application-package");
const remote_copy_service_1 = require("./remote-copy-service");
const remote_native_dependency_service_1 = require("./remote-native-dependency-service");
const core_1 = require("@theia/core");
const remote_node_setup_service_1 = require("./remote-node-setup-service");
const remote_setup_script_service_1 = require("./remote-setup-script-service");
let RemoteSetupService = class RemoteSetupService {
    async setup(options) {
        const { connection, report, nodeDownloadTemplate } = options;
        report('Identifying remote system...');
        // 1. Identify remote platform
        const platform = await this.detectRemotePlatform(connection);
        // 2. Setup home directory
        const remoteHome = await this.getRemoteHomeDirectory(connection, platform);
        const applicationDirectory = this.scriptService.joinPath(platform, remoteHome, `.${this.getRemoteAppName()}`);
        await this.mkdirRemote(connection, platform, applicationDirectory);
        // 3. Download+copy node for that platform
        const nodeFileName = this.nodeSetupService.getNodeFileName(platform);
        const nodeDirName = this.nodeSetupService.getNodeDirectoryName(platform);
        const remoteNodeDirectory = this.scriptService.joinPath(platform, applicationDirectory, nodeDirName);
        const nodeDirExists = await this.dirExistsRemote(connection, remoteNodeDirectory);
        if (!nodeDirExists) {
            report('Downloading and installing Node.js on remote...');
            // Download the binaries locally and move it via SSH
            const nodeArchive = await this.nodeSetupService.downloadNode(platform, nodeDownloadTemplate);
            const remoteNodeZip = this.scriptService.joinPath(platform, applicationDirectory, nodeFileName);
            await connection.copy(nodeArchive, remoteNodeZip);
            await this.unzipRemote(connection, platform, remoteNodeZip, applicationDirectory);
        }
        // 4. Copy backend to remote system
        const libDir = this.scriptService.joinPath(platform, applicationDirectory, 'lib');
        const libDirExists = await this.dirExistsRemote(connection, libDir);
        if (!libDirExists) {
            report('Installing application on remote...');
            const applicationZipFile = this.scriptService.joinPath(platform, applicationDirectory, `${this.getRemoteAppName()}.tar`);
            await this.copyService.copyToRemote(connection, platform, applicationZipFile);
            await this.unzipRemote(connection, platform, applicationZipFile, applicationDirectory);
        }
        // 5. start remote backend
        report('Starting application on remote...');
        const port = await this.startApplication(connection, platform, applicationDirectory, remoteNodeDirectory);
        connection.remotePort = port;
        return {
            applicationDirectory: libDir,
            nodeDirectory: remoteNodeDirectory
        };
    }
    async startApplication(connection, platform, remotePath, nodeDir) {
        var _a;
        const nodeExecutable = this.scriptService.joinPath(platform, nodeDir, ...(platform.os === core_1.OS.Type.Windows ? ['node.exe'] : ['bin', 'node']));
        const mainJsFile = this.scriptService.joinPath(platform, remotePath, 'lib', 'backend', 'main.js');
        const localAddressRegex = /listening on http:\/\/0.0.0.0:(\d+)/;
        let prefix = '';
        if (platform.os === core_1.OS.Type.Windows) {
            // We might to switch to PowerShell beforehand on Windows
            prefix = this.scriptService.exec(platform) + ' ';
        }
        const remoteContext = {
            platform,
            directory: remotePath
        };
        const args = ['--hostname=0.0.0.0', `--port=${(_a = connection.remotePort) !== null && _a !== void 0 ? _a : 0}`, '--remote'];
        for (const cli of this.cliContributions.getContributions()) {
            if (cli.enhanceArgs) {
                args.push(...await cli.enhanceArgs(remoteContext));
            }
        }
        // Change to the remote application path and start a node process with the copied main.js file
        // This way, our current working directory is set as expected
        const result = await connection.execPartial(`${prefix}cd "${remotePath}";${nodeExecutable}`, stdout => localAddressRegex.test(stdout), [mainJsFile, ...args]);
        const match = localAddressRegex.exec(result.stdout);
        if (!match) {
            throw new Error('Could not start remote system: ' + result.stderr);
        }
        else {
            return Number(match[1]);
        }
    }
    async detectRemotePlatform(connection) {
        const osResult = await connection.exec('uname -s');
        let os;
        if (osResult.stderr) {
            // Only Windows systems return an error stream here
            os = core_1.OS.Type.Windows;
        }
        else if (osResult.stdout) {
            if (osResult.stdout.includes('windows32') || osResult.stdout.includes('MINGW64')) {
                os = core_1.OS.Type.Windows;
            }
            else if (osResult.stdout.includes('Linux')) {
                os = core_1.OS.Type.Linux;
            }
            else if (osResult.stdout.includes('Darwin')) {
                os = core_1.OS.Type.OSX;
            }
        }
        if (!os) {
            throw new Error('Failed to identify remote system: ' + osResult.stdout + '\n' + osResult.stderr);
        }
        let arch;
        if (os === core_1.OS.Type.Windows) {
            const processorArchitecture = await connection.exec('cmd /c echo %PROCESSOR_ARCHITECTURE%');
            if (processorArchitecture.stdout.includes('64')) {
                arch = 'x64';
            }
            else if (processorArchitecture.stdout.includes('x86')) {
                arch = 'x86';
            }
        }
        else {
            const archResult = (await connection.exec('uname -m')).stdout;
            if (archResult.includes('x86_64')) {
                arch = 'x64';
            }
            else if (archResult.match(/i\d83/)) { // i386, i483, i683
                arch = 'x86';
            }
            else if (archResult.includes('aarch64')) {
                arch = 'arm64';
            }
            else {
                arch = archResult.trim();
            }
        }
        if (!arch) {
            throw new Error('Could not identify remote system architecture');
        }
        return {
            os,
            arch
        };
    }
    async getRemoteHomeDirectory(connection, platform) {
        const result = await connection.exec(this.scriptService.home(platform));
        return result.stdout.trim();
    }
    getRemoteAppName() {
        const appName = this.applicationPackage.pck.name || 'theia';
        const appVersion = this.applicationPackage.pck.version || core_1.THEIA_VERSION;
        return `${this.cleanupDirectoryName(`${appName}-${appVersion}`)}-remote`;
    }
    cleanupDirectoryName(name) {
        return name.replace(/[@<>:"\\|?*]/g, '').replace(/\//g, '-');
    }
    async mkdirRemote(connection, platform, remotePath) {
        const result = await connection.exec(this.scriptService.mkdir(platform, remotePath));
        if (result.stderr) {
            throw new Error('Failed to create directory: ' + result.stderr);
        }
    }
    async dirExistsRemote(connection, remotePath) {
        const cdResult = await connection.exec(`cd "${remotePath}"`);
        return !Boolean(cdResult.stderr);
    }
    async unzipRemote(connection, platform, remoteFile, remoteDirectory) {
        const result = await connection.exec(this.scriptService.unzip(platform, remoteFile, remoteDirectory));
        if (result.stderr) {
            throw new Error('Failed to unzip: ' + result.stderr);
        }
    }
    async executeScriptRemote(connection, platform, script) {
        return connection.exec(this.scriptService.exec(platform), [script]);
    }
};
exports.RemoteSetupService = RemoteSetupService;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_copy_service_1.RemoteCopyService),
    tslib_1.__metadata("design:type", remote_copy_service_1.RemoteCopyService)
], RemoteSetupService.prototype, "copyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_native_dependency_service_1.RemoteNativeDependencyService),
    tslib_1.__metadata("design:type", remote_native_dependency_service_1.RemoteNativeDependencyService)
], RemoteSetupService.prototype, "nativeDependencyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_node_setup_service_1.RemoteNodeSetupService),
    tslib_1.__metadata("design:type", remote_node_setup_service_1.RemoteNodeSetupService)
], RemoteSetupService.prototype, "nodeSetupService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_setup_script_service_1.RemoteSetupScriptService),
    tslib_1.__metadata("design:type", remote_setup_script_service_1.RemoteSetupScriptService)
], RemoteSetupService.prototype, "scriptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(application_package_1.ApplicationPackage),
    tslib_1.__metadata("design:type", application_package_1.ApplicationPackage)
], RemoteSetupService.prototype, "applicationPackage", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(remote_cli_contribution_1.RemoteCliContribution),
    tslib_1.__metadata("design:type", Object)
], RemoteSetupService.prototype, "cliContributions", void 0);
exports.RemoteSetupService = RemoteSetupService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteSetupService);
//# sourceMappingURL=remote-setup-service.js.map