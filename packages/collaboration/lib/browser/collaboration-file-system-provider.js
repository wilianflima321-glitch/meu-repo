"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
exports.CollaborationFileSystemProvider = exports.CollaborationURI = void 0;
const core_1 = require("@theia/core");
var CollaborationURI;
(function (CollaborationURI) {
    CollaborationURI.scheme = 'collaboration';
    function create(workspace, path) {
        return new core_1.URI(`${CollaborationURI.scheme}:///${workspace.name}${path ? '/' + path : ''}`);
    }
    CollaborationURI.create = create;
})(CollaborationURI || (exports.CollaborationURI = CollaborationURI = {}));
class CollaborationFileSystemProvider {
    get readonly() {
        return this._readonly;
    }
    set readonly(value) {
        if (this._readonly !== value) {
            this._readonly = value;
            if (value) {
                this.capabilities |= 2048 /* FileSystemProviderCapabilities.Readonly */;
            }
            else {
                this.capabilities &= ~2048 /* FileSystemProviderCapabilities.Readonly */;
            }
            this.onDidChangeCapabilitiesEmitter.fire();
        }
    }
    constructor(connection, host, yjs) {
        this.connection = connection;
        this.host = host;
        this.yjs = yjs;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.onDidChangeCapabilitiesEmitter = new core_1.Emitter();
        this.onDidChangeFileEmitter = new core_1.Emitter();
        this.onFileWatchErrorEmitter = new core_1.Emitter();
    }
    get onDidChangeCapabilities() {
        return this.onDidChangeCapabilitiesEmitter.event;
    }
    get onDidChangeFile() {
        return this.onDidChangeFileEmitter.event;
    }
    get onFileWatchError() {
        return this.onFileWatchErrorEmitter.event;
    }
    async readFile(resource) {
        const path = this.getHostPath(resource);
        if (this.yjs.share.has(path)) {
            const stringValue = this.yjs.getText(path);
            return this.encoder.encode(stringValue.toString());
        }
        else {
            const data = await this.connection.fs.readFile(this.host.id, path);
            return data.content;
        }
    }
    async writeFile(resource, content, opts) {
        const path = this.getHostPath(resource);
        await this.connection.fs.writeFile(this.host.id, path, { content });
    }
    watch(resource, opts) {
        return core_1.Disposable.NULL;
    }
    stat(resource) {
        return this.connection.fs.stat(this.host.id, this.getHostPath(resource));
    }
    mkdir(resource) {
        return this.connection.fs.mkdir(this.host.id, this.getHostPath(resource));
    }
    async readdir(resource) {
        const record = await this.connection.fs.readdir(this.host.id, this.getHostPath(resource));
        return Object.entries(record);
    }
    delete(resource, opts) {
        return this.connection.fs.delete(this.host.id, this.getHostPath(resource));
    }
    rename(from, to, opts) {
        return this.connection.fs.rename(this.host.id, this.getHostPath(from), this.getHostPath(to));
    }
    getHostPath(uri) {
        const path = uri.path.toString().substring(1).split('/');
        return path.slice(1).join('/');
    }
    triggerEvent(changes) {
        this.onDidChangeFileEmitter.fire(changes);
    }
}
exports.CollaborationFileSystemProvider = CollaborationFileSystemProvider;
//# sourceMappingURL=collaboration-file-system-provider.js.map