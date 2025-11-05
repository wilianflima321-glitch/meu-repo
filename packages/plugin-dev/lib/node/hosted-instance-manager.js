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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronNodeHostedPluginRunner = exports.NodeHostedPluginRunner = exports.AbstractHostedInstanceManager = exports.HostedInstanceManager = void 0;
const tslib_1 = require("tslib");
const request_1 = require("@theia/core/shared/@theia/request");
const inversify_1 = require("@theia/core/shared/inversify");
const cp = require("child_process");
const fs = require("@theia/core/shared/fs-extra");
const net = require("net");
const path = require("path");
const uri_1 = require("@theia/core/lib/common/uri");
const contribution_provider_1 = require("@theia/core/lib/common/contribution-provider");
const hosted_plugin_uri_postprocessor_1 = require("./hosted-plugin-uri-postprocessor");
const core_1 = require("@theia/core");
const file_uri_1 = require("@theia/core/lib/common/file-uri");
const types_1 = require("@theia/plugin-ext/lib/common/types");
const hosted_plugin_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin");
const metadata_scanner_1 = require("@theia/plugin-ext/lib/hosted/node/metadata-scanner");
const hosted_plugin_process_1 = require("@theia/plugin-ext/lib/hosted/node/hosted-plugin-process");
const errors_1 = require("@theia/plugin-ext/lib/common/errors");
const DEFAULT_HOSTED_PLUGIN_PORT = 3030;
exports.HostedInstanceManager = Symbol('HostedInstanceManager');
const HOSTED_INSTANCE_START_TIMEOUT_MS = 30000;
const THEIA_INSTANCE_REGEX = /.*Theia app listening on (.*).*\./;
const PROCESS_OPTIONS = {
    cwd: process.cwd(),
    env: { ...process.env }
};
let AbstractHostedInstanceManager = class AbstractHostedInstanceManager {
    constructor() {
        this.isPluginRunning = false;
    }
    isRunning() {
        return this.isPluginRunning;
    }
    async run(pluginUri, port) {
        return this.doRun(pluginUri, port);
    }
    async debug(pluginUri, debugConfig) {
        return this.doRun(pluginUri, undefined, debugConfig);
    }
    async doRun(pluginUri, port, debugConfig) {
        if (this.isPluginRunning) {
            this.hostedPluginSupport.sendLog({ data: 'Hosted plugin instance is already running.', type: types_1.LogType.Info });
            throw new Error('Hosted instance is already running.');
        }
        let command;
        let processOptions;
        if (pluginUri.scheme === 'file') {
            processOptions = { ...PROCESS_OPTIONS };
            // get filesystem path that work cross operating systems
            processOptions.env.HOSTED_PLUGIN = file_uri_1.FileUri.fsPath(pluginUri.toString());
            // Disable all the other plugins on this instance
            processOptions.env.THEIA_PLUGINS = '';
            command = await this.getStartCommand(port, debugConfig);
        }
        else {
            throw new Error('Not supported plugin location: ' + pluginUri.toString());
        }
        this.instanceUri = await this.postProcessInstanceUri(await this.runHostedPluginTheiaInstance(command, processOptions));
        this.pluginUri = pluginUri;
        // disable redirect to grab the release
        this.instanceOptions = {
            followRedirects: 0
        };
        this.instanceOptions = await this.postProcessInstanceOptions(this.instanceOptions);
        await this.checkInstanceUriReady();
        return this.instanceUri;
    }
    terminate() {
        if (this.isPluginRunning && !!this.hostedInstanceProcess.pid) {
            this.hostedPluginProcess.killProcessTree(this.hostedInstanceProcess.pid);
            this.hostedPluginSupport.sendLog({ data: 'Hosted instance has been terminated', type: types_1.LogType.Info });
            this.isPluginRunning = false;
        }
        else {
            throw new Error('Hosted plugin instance is not running.');
        }
    }
    getInstanceURI() {
        if (this.isPluginRunning) {
            return this.instanceUri;
        }
        throw new Error('Hosted plugin instance is not running.');
    }
    getPluginURI() {
        if (this.isPluginRunning) {
            return this.pluginUri;
        }
        throw new Error('Hosted plugin instance is not running.');
    }
    /**
     * Checks that the `instanceUri` is responding before exiting method
     */
    async checkInstanceUriReady() {
        return new Promise((resolve, reject) => this.pingLoop(60, resolve, reject));
    }
    /**
     * Start a loop to ping, if ping is OK return immediately, else start a new ping after 1second. We iterate for the given amount of loops provided in remainingCount
     * @param remainingCount the number of occurrence to check
     * @param resolve resolve function if ok
     * @param reject reject function if error
     */
    async pingLoop(remainingCount, resolve, reject) {
        const isOK = await this.ping();
        if (isOK) {
            resolve();
        }
        else {
            if (remainingCount > 0) {
                setTimeout(() => this.pingLoop(--remainingCount, resolve, reject), 1000);
            }
            else {
                reject(new Error('Unable to ping the remote server'));
            }
        }
    }
    /**
     * Ping the plugin URI (checking status of the head)
     */
    async ping() {
        try {
            const url = this.instanceUri.toString();
            // Wait that the status is OK
            const response = await this.request.request({ url, type: 'HEAD', ...this.instanceOptions });
            return response.res.statusCode === 200;
        }
        catch {
            return false;
        }
    }
    async isPluginValid(uri) {
        const pckPath = path.join(file_uri_1.FileUri.fsPath(uri), 'package.json');
        try {
            const pck = await fs.readJSON(pckPath);
            this.metadata.getScanner(pck);
            return true;
        }
        catch (err) {
            if (!(0, errors_1.isENOENT)(err)) {
                console.error(err);
            }
            return false;
        }
    }
    async getStartCommand(port, debugConfig) {
        const processArguments = process.argv;
        let command;
        if (core_1.environment.electron.is()) {
            command = ['npm', 'run', 'theia', 'start'];
        }
        else {
            command = processArguments.filter((arg, index, args) => {
                // remove --port=X and --port X arguments if set
                // remove --plugins arguments
                if (arg.startsWith('--port') || args[index - 1] === '--port') {
                    return;
                }
                else {
                    return arg;
                }
            });
        }
        if (process.env.HOSTED_PLUGIN_HOSTNAME) {
            command.push('--hostname=' + process.env.HOSTED_PLUGIN_HOSTNAME);
        }
        if (port) {
            await this.validatePort(port);
            command.push('--port=' + port);
        }
        if (debugConfig) {
            if (debugConfig.debugPort === undefined) {
                command.push(`--hosted-plugin-${debugConfig.debugMode || 'inspect'}=0.0.0.0`);
            }
            else if (typeof debugConfig.debugPort === 'string') {
                command.push(`--hosted-plugin-${debugConfig.debugMode || 'inspect'}=0.0.0.0:${debugConfig.debugPort}`);
            }
            else if (Array.isArray(debugConfig.debugPort)) {
                if (debugConfig.debugPort.length === 0) {
                    // treat empty array just like undefined
                    command.push(`--hosted-plugin-${debugConfig.debugMode || 'inspect'}=0.0.0.0`);
                }
                else {
                    for (const serverToPort of debugConfig.debugPort) {
                        command.push(`--${serverToPort.serverName}-${debugConfig.debugMode || 'inspect'}=0.0.0.0:${serverToPort.debugPort}`);
                    }
                }
            }
        }
        return command;
    }
    async postProcessInstanceUri(uri) {
        return uri;
    }
    async postProcessInstanceOptions(options) {
        return options;
    }
    runHostedPluginTheiaInstance(command, options) {
        this.isPluginRunning = true;
        return new Promise((resolve, reject) => {
            let started = false;
            const outputListener = (data) => {
                const line = data.toString();
                const match = THEIA_INSTANCE_REGEX.exec(line);
                if (match) {
                    this.hostedInstanceProcess.stdout.removeListener('data', outputListener);
                    started = true;
                    resolve(new uri_1.default(match[1]));
                }
            };
            if (core_1.isWindows) {
                // Has to be set for running on windows (electron).
                // See also: https://github.com/nodejs/node/issues/3675
                options.shell = true;
            }
            this.hostedInstanceProcess = cp.spawn(command.shift(), command, options);
            this.hostedInstanceProcess.on('error', () => { this.isPluginRunning = false; });
            this.hostedInstanceProcess.on('exit', () => { this.isPluginRunning = false; });
            this.hostedInstanceProcess.stdout.addListener('data', outputListener);
            this.hostedInstanceProcess.stdout.addListener('data', data => {
                this.hostedPluginSupport.sendLog({ data: data.toString(), type: types_1.LogType.Info });
            });
            this.hostedInstanceProcess.stderr.addListener('data', data => {
                this.hostedPluginSupport.sendLog({ data: data.toString(), type: types_1.LogType.Error });
            });
            setTimeout(() => {
                if (!started) {
                    this.terminate();
                    this.isPluginRunning = false;
                    reject(new Error('Timeout.'));
                }
            }, HOSTED_INSTANCE_START_TIMEOUT_MS);
        });
    }
    async validatePort(port) {
        if (port < 1 || port > 65535) {
            throw new Error('Port value is incorrect.');
        }
        if (!await this.isPortFree(port)) {
            throw new Error('Port ' + port + ' is already in use.');
        }
    }
    isPortFree(port) {
        return new Promise(resolve => {
            const server = net.createServer();
            server.listen(port, '0.0.0.0');
            server.on('error', () => {
                resolve(false);
            });
            server.on('listening', () => {
                server.close();
                resolve(true);
            });
        });
    }
};
exports.AbstractHostedInstanceManager = AbstractHostedInstanceManager;
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_1.HostedPluginSupport),
    tslib_1.__metadata("design:type", hosted_plugin_1.HostedPluginSupport)
], AbstractHostedInstanceManager.prototype, "hostedPluginSupport", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(metadata_scanner_1.MetadataScanner),
    tslib_1.__metadata("design:type", metadata_scanner_1.MetadataScanner)
], AbstractHostedInstanceManager.prototype, "metadata", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(hosted_plugin_process_1.HostedPluginProcess),
    tslib_1.__metadata("design:type", hosted_plugin_process_1.HostedPluginProcess)
], AbstractHostedInstanceManager.prototype, "hostedPluginProcess", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(request_1.RequestService),
    tslib_1.__metadata("design:type", Object)
], AbstractHostedInstanceManager.prototype, "request", void 0);
exports.AbstractHostedInstanceManager = AbstractHostedInstanceManager = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractHostedInstanceManager);
let NodeHostedPluginRunner = class NodeHostedPluginRunner extends AbstractHostedInstanceManager {
    async postProcessInstanceUri(uri) {
        for (const uriPostProcessor of this.uriPostProcessors.getContributions()) {
            uri = await uriPostProcessor.processUri(uri);
        }
        return uri;
    }
    async postProcessInstanceOptions(options) {
        for (const uriPostProcessor of this.uriPostProcessors.getContributions()) {
            options = await uriPostProcessor.processOptions(options);
        }
        return options;
    }
    async getStartCommand(port, debugConfig) {
        if (!port) {
            port = process.env.HOSTED_PLUGIN_PORT ?
                Number(process.env.HOSTED_PLUGIN_PORT) :
                ((debugConfig === null || debugConfig === void 0 ? void 0 : debugConfig.debugPort) ? Number(debugConfig.debugPort) : DEFAULT_HOSTED_PLUGIN_PORT);
        }
        return super.getStartCommand(port, debugConfig);
    }
};
exports.NodeHostedPluginRunner = NodeHostedPluginRunner;
tslib_1.__decorate([
    (0, inversify_1.inject)(contribution_provider_1.ContributionProvider),
    (0, inversify_1.named)(Symbol.for(hosted_plugin_uri_postprocessor_1.HostedPluginUriPostProcessorSymbolName)),
    tslib_1.__metadata("design:type", Object)
], NodeHostedPluginRunner.prototype, "uriPostProcessors", void 0);
exports.NodeHostedPluginRunner = NodeHostedPluginRunner = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], NodeHostedPluginRunner);
let ElectronNodeHostedPluginRunner = class ElectronNodeHostedPluginRunner extends AbstractHostedInstanceManager {
};
exports.ElectronNodeHostedPluginRunner = ElectronNodeHostedPluginRunner;
exports.ElectronNodeHostedPluginRunner = ElectronNodeHostedPluginRunner = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ElectronNodeHostedPluginRunner);
//# sourceMappingURL=hosted-instance-manager.js.map