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
exports.SSHIdentityFileCollector = void 0;
const tslib_1 = require("tslib");
const fs = require("@theia/core/shared/fs-extra");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const ssh2 = require("ssh2");
const inversify_1 = require("@theia/core/shared/inversify");
let SSHIdentityFileCollector = class SSHIdentityFileCollector {
    getDefaultIdentityFiles() {
        const homeDir = os.homedir();
        const PATH_SSH_CLIENT_ID_DSA = path.join(homeDir, '.ssh', '/id_dsa');
        const PATH_SSH_CLIENT_ID_ECDSA = path.join(homeDir, '.ssh', '/id_ecdsa');
        const PATH_SSH_CLIENT_ID_RSA = path.join(homeDir, '.ssh', '/id_rsa');
        const PATH_SSH_CLIENT_ID_ED25519 = path.join(homeDir, '.ssh', '/id_ed25519');
        const PATH_SSH_CLIENT_ID_XMSS = path.join(homeDir, '.ssh', '/id_xmss');
        const PATH_SSH_CLIENT_ID_ECDSA_SK = path.join(homeDir, '.ssh', '/id_ecdsa_sk');
        const PATH_SSH_CLIENT_ID_ED25519_SK = path.join(homeDir, '.ssh', '/id_ed25519_sk');
        return [
            PATH_SSH_CLIENT_ID_DSA,
            PATH_SSH_CLIENT_ID_ECDSA,
            PATH_SSH_CLIENT_ID_ECDSA_SK,
            PATH_SSH_CLIENT_ID_ED25519,
            PATH_SSH_CLIENT_ID_ED25519_SK,
            PATH_SSH_CLIENT_ID_RSA,
            PATH_SSH_CLIENT_ID_XMSS
        ];
    }
    async gatherIdentityFiles(sshAgentSock, overrideIdentityFiles) {
        const identityFiles = overrideIdentityFiles || this.getDefaultIdentityFiles();
        const identityFileContentsResult = await Promise.allSettled(identityFiles.map(async (keyPath) => {
            keyPath = await fs.pathExists(keyPath + '.pub') ? keyPath + '.pub' : keyPath;
            return fs.promises.readFile(keyPath);
        }));
        const fileKeys = identityFileContentsResult.map((result, i) => {
            if (result.status === 'rejected') {
                return undefined;
            }
            const parsedResult = ssh2.utils.parseKey(result.value);
            if (parsedResult instanceof Error || !parsedResult) {
                console.log(`Error while parsing SSH public key ${identityFiles[i]}:`, parsedResult);
                return undefined;
            }
            const parsedKey = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;
            const fingerprint = crypto.createHash('sha256').update(parsedKey.getPublicSSH()).digest('base64');
            return {
                filename: identityFiles[i],
                parsedKey,
                fingerprint
            };
        }).filter((v) => !!v);
        let sshAgentParsedKeys = [];
        if (sshAgentSock) {
            sshAgentParsedKeys = await new Promise((resolve, reject) => {
                const sshAgent = new ssh2.OpenSSHAgent(sshAgentSock);
                sshAgent.getIdentities((err, publicKeys) => {
                    if (err) {
                        reject(err);
                    }
                    else if (publicKeys) {
                        resolve(publicKeys.map(key => {
                            if ('pubKey' in key) {
                                const pubKey = key.pubKey;
                                if ('pubKey' in pubKey) {
                                    return pubKey.pubKey;
                                }
                                return pubKey;
                            }
                            else {
                                return key;
                            }
                        }));
                    }
                    else {
                        resolve([]);
                    }
                });
            });
        }
        const sshAgentKeys = sshAgentParsedKeys.map(parsedKey => {
            const fingerprint = crypto.createHash('sha256').update(parsedKey.getPublicSSH()).digest('base64');
            return {
                filename: parsedKey.comment,
                parsedKey,
                fingerprint,
                agentSupport: true
            };
        });
        const agentKeys = [];
        const preferredIdentityKeys = [];
        for (const agentKey of sshAgentKeys) {
            const foundIdx = fileKeys.findIndex(k => agentKey.parsedKey.type === k.parsedKey.type && agentKey.fingerprint === k.fingerprint);
            if (foundIdx >= 0) {
                preferredIdentityKeys.push({ ...fileKeys[foundIdx], agentSupport: true });
                fileKeys.splice(foundIdx, 1);
            }
            else {
                agentKeys.push(agentKey);
            }
        }
        preferredIdentityKeys.push(...agentKeys);
        preferredIdentityKeys.push(...fileKeys);
        return preferredIdentityKeys;
    }
};
exports.SSHIdentityFileCollector = SSHIdentityFileCollector;
exports.SSHIdentityFileCollector = SSHIdentityFileCollector = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SSHIdentityFileCollector);
//# sourceMappingURL=ssh-identity-file-collector.js.map