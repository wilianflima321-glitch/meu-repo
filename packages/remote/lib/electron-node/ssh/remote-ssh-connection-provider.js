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
exports.RemoteSSHConnection = exports.RemoteSSHConnectionProviderImpl = void 0;
const tslib_1 = require("tslib");
const ssh2 = require("ssh2");
const fs = require("@theia/core/shared/fs-extra");
const SftpClient = require("ssh2-sftp-client");
const ssh_config_1 = require("ssh-config");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const remote_connection_service_1 = require("../remote-connection-service");
const remote_proxy_server_provider_1 = require("../remote-proxy-server-provider");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const ssh_identity_file_collector_1 = require("./ssh-identity-file-collector");
const remote_setup_service_1 = require("../setup/remote-setup-service");
const uuid_1 = require("@theia/core/lib/common/uuid");
let RemoteSSHConnectionProviderImpl = class RemoteSSHConnectionProviderImpl {
    constructor() {
        this.passwordRetryCount = 3;
        this.passphraseRetryCount = 3;
    }
    async matchSSHConfigHost(host, user, customConfigFile) {
        const sshConfig = await this.doGetSSHConfig(customConfigFile);
        const host2 = host.trim().split(':');
        const record = Object.fromEntries(Object.entries(sshConfig.compute(host2[0])).map(([k, v]) => [k.toLowerCase(), v]));
        // Generate a regexp to find wildcards and process the hostname with the wildcards
        if (record.host) {
            const checkHost = new RegExp('^' + record.host
                .replace(/([^\w\*\?])/g, '\\$1')
                .replace(/([\?]+)/g, (...m) => '(' + '.'.repeat(m[1].length) + ')')
                .replace(/\*/g, '(.+)') + '$');
            const match = host2[0].match(checkHost);
            if (match) {
                if (record.hostname) {
                    record.hostname = record.hostname.replace('%h', match[1]);
                }
            }
            if (host2[1]) {
                record.port = host2[1];
            }
        }
        return record;
    }
    async getSSHConfig(customConfigFile) {
        return this.doGetSSHConfig(customConfigFile);
    }
    async doGetSSHConfig(customConfigFile) {
        const empty = new ssh_config_1.default();
        if (!customConfigFile) {
            return empty;
        }
        try {
            const buff = await fs.promises.readFile(customConfigFile);
            const sshConfig = ssh_config_1.default.parse(buff.toString());
            return sshConfig;
        }
        catch {
            return empty;
        }
    }
    async establishConnection(options) {
        const progress = await this.messageService.showProgress({
            text: 'Remote SSH'
        });
        const report = message => progress.report({ message });
        report('Connecting to remote system...');
        try {
            const remote = await this.establishSSHConnection(options.host, options.user, options.customConfigFile);
            await this.remoteSetup.setup({
                connection: remote,
                report,
                nodeDownloadTemplate: options.nodeDownloadTemplate
            });
            const registration = this.remoteConnectionService.register(remote);
            const server = await this.serverProvider.getProxyServer(socket => {
                remote.forwardOut(socket);
            });
            remote.onDidDisconnect(() => {
                server.close();
                registration.dispose();
            });
            const localPort = server.address().port;
            remote.localPort = localPort;
            return localPort.toString();
        }
        finally {
            progress.cancel();
        }
    }
    async establishSSHConnection(host, user, customConfigFile) {
        const deferred = new promise_util_1.Deferred();
        const sshClient = new ssh2.Client();
        const sshHostConfig = await this.matchSSHConfigHost(host, user, customConfigFile);
        const identityFiles = await this.identityFileCollector.gatherIdentityFiles(undefined, sshHostConfig === null || sshHostConfig === void 0 ? void 0 : sshHostConfig.identityfile);
        let algorithms = undefined;
        if (sshHostConfig) {
            if (!user && sshHostConfig.user) {
                user = sshHostConfig.user;
            }
            if (sshHostConfig.hostname) {
                host = sshHostConfig.hostname + ':' + (sshHostConfig.port || '22');
            }
            else if (sshHostConfig.port) {
                host = sshHostConfig.host + ':' + (sshHostConfig.port || '22');
            }
            if (sshHostConfig.compression && sshHostConfig.compression.toLowerCase() === 'yes') {
                algorithms = { compress: ['zlib@openssh.com', 'zlib'] };
            }
        }
        const hostUrl = new URL(`ssh://${host}`);
        const sshAuthHandler = this.getAuthHandler(user, hostUrl.hostname, identityFiles);
        sshClient
            .on('ready', async () => {
            const connection = new RemoteSSHConnection({
                client: sshClient,
                id: (0, uuid_1.generateUuid)(),
                name: hostUrl.hostname,
                type: 'SSH'
            });
            try {
                await this.testConnection(connection);
                deferred.resolve(connection);
            }
            catch (err) {
                deferred.reject(err);
            }
        }).on('end', () => {
            console.log(`Ended remote connection to host '${user}@${hostUrl.hostname}'`);
        }).on('error', err => {
            deferred.reject(err);
        }).connect({
            host: hostUrl.hostname,
            port: hostUrl.port ? parseInt(hostUrl.port, 10) : undefined,
            username: user,
            algorithms: algorithms,
            authHandler: (methodsLeft, successes, callback) => (sshAuthHandler(methodsLeft, successes, callback), undefined)
        });
        return deferred.promise;
    }
    /**
     * Sometimes, ssh2.exec will not execute and retrieve any data right after the `ready` event fired.
     * In this method, we just perform `echo hello` in a loop to ensure that the connection is really ready.
     * See also https://github.com/mscdex/ssh2/issues/48
     */
    async testConnection(connection) {
        for (let i = 0; i < 100; i++) {
            const result = await connection.exec('echo hello');
            if (result.stdout.includes('hello')) {
                return;
            }
            await (0, promise_util_1.timeout)(50);
        }
        throw new Error('SSH connection failed testing. Could not execute "echo"');
    }
    getAuthHandler(user, host, identityKeys) {
        let passwordRetryCount = this.passwordRetryCount;
        let keyboardRetryCount = this.passphraseRetryCount;
        // `false` is a valid return value, indicating that the authentication has failed
        const END_AUTH = false;
        // `null` indicates that we just want to continue with the next auth type
        // eslint-disable-next-line no-null/no-null
        const NEXT_AUTH = null;
        return async (methodsLeft, _partialSuccess, callback) => {
            if (!methodsLeft) {
                return callback({
                    type: 'none',
                    username: user,
                });
            }
            if (methodsLeft && methodsLeft.includes('publickey') && identityKeys.length) {
                const identityKey = identityKeys.shift();
                if (identityKey.isPrivate) {
                    return callback({
                        type: 'publickey',
                        username: user,
                        key: identityKey.parsedKey
                    });
                }
                if (!await fs.pathExists(identityKey.filename)) {
                    // Try next identity file
                    return callback(NEXT_AUTH);
                }
                const keyBuffer = await fs.promises.readFile(identityKey.filename);
                let result = ssh2.utils.parseKey(keyBuffer); // First try without passphrase
                if (result instanceof Error && result.message.match(/no passphrase given/)) {
                    let passphraseRetryCount = this.passphraseRetryCount;
                    while (result instanceof Error && passphraseRetryCount > 0) {
                        const passphrase = await this.quickInputService.input({
                            title: `Enter passphrase for ${identityKey.filename}`,
                            password: true
                        });
                        if (!passphrase) {
                            break;
                        }
                        result = ssh2.utils.parseKey(keyBuffer, passphrase);
                        passphraseRetryCount--;
                    }
                }
                if (!result || result instanceof Error) {
                    // Try next identity file
                    return callback(NEXT_AUTH);
                }
                const key = Array.isArray(result) ? result[0] : result;
                return callback({
                    type: 'publickey',
                    username: user,
                    key
                });
            }
            if (methodsLeft && methodsLeft.includes('password') && passwordRetryCount > 0) {
                const password = await this.quickInputService.input({
                    title: `Enter password for ${user}@${host}`,
                    password: true
                });
                passwordRetryCount--;
                return callback(password
                    ? {
                        type: 'password',
                        username: user,
                        password
                    }
                    : END_AUTH);
            }
            if (methodsLeft && methodsLeft.includes('keyboard-interactive') && keyboardRetryCount > 0) {
                return callback({
                    type: 'keyboard-interactive',
                    username: user,
                    prompt: async (_name, _instructions, _instructionsLang, prompts, finish) => {
                        const responses = [];
                        for (const prompt of prompts) {
                            const response = await this.quickInputService.input({
                                title: `(${user}@${host}) ${prompt.prompt}`,
                                password: !prompt.echo
                            });
                            if (response === undefined) {
                                keyboardRetryCount = 0;
                                break;
                            }
                            responses.push(response);
                        }
                        keyboardRetryCount--;
                        finish(responses);
                    }
                });
            }
            callback(END_AUTH);
        };
    }
};
exports.RemoteSSHConnectionProviderImpl = RemoteSSHConnectionProviderImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_connection_service_1.RemoteConnectionService),
    tslib_1.__metadata("design:type", remote_connection_service_1.RemoteConnectionService)
], RemoteSSHConnectionProviderImpl.prototype, "remoteConnectionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_proxy_server_provider_1.RemoteProxyServerProvider),
    tslib_1.__metadata("design:type", remote_proxy_server_provider_1.RemoteProxyServerProvider)
], RemoteSSHConnectionProviderImpl.prototype, "serverProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ssh_identity_file_collector_1.SSHIdentityFileCollector),
    tslib_1.__metadata("design:type", ssh_identity_file_collector_1.SSHIdentityFileCollector)
], RemoteSSHConnectionProviderImpl.prototype, "identityFileCollector", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(remote_setup_service_1.RemoteSetupService),
    tslib_1.__metadata("design:type", remote_setup_service_1.RemoteSetupService)
], RemoteSSHConnectionProviderImpl.prototype, "remoteSetup", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.QuickInputService),
    tslib_1.__metadata("design:type", Object)
], RemoteSSHConnectionProviderImpl.prototype, "quickInputService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], RemoteSSHConnectionProviderImpl.prototype, "messageService", void 0);
exports.RemoteSSHConnectionProviderImpl = RemoteSSHConnectionProviderImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RemoteSSHConnectionProviderImpl);
class RemoteSSHConnection {
    get onDidDisconnect() {
        return this.onDidDisconnectEmitter.event;
    }
    constructor(options) {
        this.localPort = 0;
        this.remotePort = 0;
        this.onDidDisconnectEmitter = new core_1.Emitter();
        this.id = options.id;
        this.type = options.type;
        this.name = options.name;
        this.client = options.client;
        this.onDidDisconnect(() => this.dispose());
        this.client.on('end', () => {
            this.onDidDisconnectEmitter.fire();
        });
        this.sftpClientPromise = this.setupSftpClient();
    }
    async setupSftpClient() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sftpClient = new SftpClient();
        // A hack to set the internal ssh2 client of the sftp client
        // That way, we don't have to create a second connection
        sftpClient.client = this.client;
        // Calling this function establishes the sftp connection on the ssh client
        await sftpClient.getSftpChannel();
        return sftpClient;
    }
    forwardOut(socket, port) {
        this.client.forwardOut(socket.localAddress, socket.localPort, '127.0.0.1', port !== null && port !== void 0 ? port : this.remotePort, (err, stream) => {
            if (err) {
                console.debug('Proxy message rejected', err);
            }
            else {
                stream.pipe(socket).pipe(stream);
            }
        });
    }
    async copy(localPath, remotePath) {
        const sftpClient = await this.sftpClientPromise;
        await sftpClient.put(localPath, remotePath);
    }
    exec(cmd, args, options = {}) {
        const deferred = new promise_util_1.Deferred();
        cmd = this.buildCmd(cmd, args);
        this.client.exec(cmd, options, (err, stream) => {
            if (err) {
                return deferred.reject(err);
            }
            let stdout = '';
            let stderr = '';
            stream.on('close', () => {
                deferred.resolve({ stdout, stderr });
            }).on('data', (data) => {
                stdout += data.toString();
            }).stderr.on('data', (data) => {
                stderr += data.toString();
            });
        });
        return deferred.promise;
    }
    execPartial(cmd, tester, args, options = {}) {
        const deferred = new promise_util_1.Deferred();
        cmd = this.buildCmd(cmd, args);
        this.client.exec(cmd, {
            ...options,
            // Ensure that the process on the remote ends when the connection is closed
            pty: true
        }, (err, stream) => {
            if (err) {
                return deferred.reject(err);
            }
            // in pty mode we only have an stdout stream
            // return stdout as stderr as well
            let stdout = '';
            stream.on('close', () => {
                if (deferred.state === 'unresolved') {
                    deferred.resolve({ stdout, stderr: stdout });
                }
            }).on('data', (data) => {
                if (deferred.state === 'unresolved') {
                    stdout += data.toString();
                    if (tester(stdout, stdout)) {
                        deferred.resolve({ stdout, stderr: stdout });
                    }
                }
            });
        });
        return deferred.promise;
    }
    buildCmd(cmd, args) {
        const escapedArgs = (args === null || args === void 0 ? void 0 : args.map(arg => `"${arg.replace(/"/g, '\\"')}"`)) || [];
        const fullCmd = cmd + (escapedArgs.length > 0 ? (' ' + escapedArgs.join(' ')) : '');
        return fullCmd;
    }
    dispose() {
        this.client.end();
        this.client.destroy();
    }
}
exports.RemoteSSHConnection = RemoteSSHConnection;
//# sourceMappingURL=remote-ssh-connection-provider.js.map