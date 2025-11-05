"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerManagerImpl = void 0;
const tslib_1 = require("tslib");
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
const inversify_1 = require("@theia/core/shared/inversify");
const mcp_server_1 = require("./mcp-server");
let MCPServerManagerImpl = class MCPServerManagerImpl {
    constructor() {
        this.servers = new Map();
        this.clients = [];
        this.serverListeners = new Map();
    }
    async stopServer(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found.`);
        }
        await server.stop();
        console.log(`MCP server "${serverName}" stopped.`);
        this.notifyClients();
    }
    async getRunningServers() {
        const runningServers = [];
        for (const [name, server] of this.servers.entries()) {
            if (server.isRunnning()) {
                runningServers.push(name);
            }
        }
        return runningServers;
    }
    callTool(serverName, toolName, arg_string) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${toolName}" not found.`);
        }
        return server.callTool(toolName, arg_string);
    }
    async startServer(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found.`);
        }
        await server.start();
        this.notifyClients();
    }
    async getServerNames() {
        return Array.from(this.servers.keys());
    }
    async getServerDescription(name) {
        const server = this.servers.get(name);
        return server ? await server.getDescription() : undefined;
    }
    async getTools(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found.`);
        }
        return await server.getTools();
    }
    addOrUpdateServer(description) {
        const existingServer = this.servers.get(description.name);
        if (existingServer) {
            existingServer.update(description);
        }
        else {
            const newServer = new mcp_server_1.MCPServer(description);
            this.servers.set(description.name, newServer);
            // Subscribe to status updates from the new server
            const listener = newServer.onDidUpdateStatus(() => {
                this.notifyClients();
            });
            // Store the listener for later disposal
            this.serverListeners.set(description.name, listener);
        }
        this.notifyClients();
    }
    removeServer(name) {
        const server = this.servers.get(name);
        if (server) {
            server.stop();
            this.servers.delete(name);
            // Clean up the status listener
            const listener = this.serverListeners.get(name);
            if (listener) {
                listener.dispose();
                this.serverListeners.delete(name);
            }
        }
        else {
            console.warn(`MCP server "${name}" not found.`);
        }
        this.notifyClients();
    }
    setClient(client) {
        this.clients.push(client);
    }
    disconnectClient(client) {
        const index = this.clients.indexOf(client);
        if (index !== -1) {
            this.clients.splice(index, 1);
        }
        this.servers.forEach(server => {
            server.stop();
        });
    }
    notifyClients() {
        this.clients.forEach(client => client.didUpdateMCPServers());
    }
    readResource(serverName, resourceId) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found.`);
        }
        return server.readResource(resourceId);
    }
    getResources(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`MCP server "${serverName}" not found.`);
        }
        return server.getResources();
    }
};
exports.MCPServerManagerImpl = MCPServerManagerImpl;
exports.MCPServerManagerImpl = MCPServerManagerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MCPServerManagerImpl);
//# sourceMappingURL=mcp-server-manager-impl.js.map