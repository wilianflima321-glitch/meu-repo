"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
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
const stdio_1 = require("@modelcontextprotocol/sdk/client/stdio");
const sse_1 = require("@modelcontextprotocol/sdk/client/sse");
const streamableHttp_1 = require("@modelcontextprotocol/sdk/client/streamableHttp");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const common_1 = require("../common");
const event_1 = require("@theia/core/lib/common/event");
const types_1 = require("@modelcontextprotocol/sdk/types");
class MCPServer {
    constructor(description) {
        this.onDidUpdateStatusEmitter = new event_1.Emitter();
        this.onDidUpdateStatus = this.onDidUpdateStatusEmitter.event;
        this.update(description);
    }
    getStatus() {
        return this.status;
    }
    setStatus(status) {
        this.status = status;
        this.onDidUpdateStatusEmitter.fire(status);
    }
    isRunnning() {
        return this.status === common_1.MCPServerStatus.Running
            || this.status === common_1.MCPServerStatus.Connected;
    }
    async getDescription() {
        let toReturnTools = undefined;
        if (this.isRunnning()) {
            try {
                const { tools } = await this.getTools();
                toReturnTools = tools.map(tool => ({
                    name: tool.name,
                    description: tool.description
                }));
            }
            catch (error) {
                console.error('Error fetching tools for description:', error);
            }
        }
        return {
            ...this.description,
            status: this.status,
            error: this.error,
            tools: toReturnTools
        };
    }
    async start() {
        var _a;
        if (this.isRunnning()
            && (this.status === common_1.MCPServerStatus.Starting || this.status === common_1.MCPServerStatus.Connecting)) {
            return;
        }
        let connected = false;
        this.client = new index_js_1.Client({
            name: 'theia-client',
            version: '1.0.0',
        }, {
            capabilities: {}
        });
        this.error = undefined;
        if ((0, common_1.isLocalMCPServerDescription)(this.description)) {
            this.setStatus(common_1.MCPServerStatus.Starting);
            console.log(`Starting server "${this.description.name}" with command: ${this.description.command} ` +
                `and args: ${(_a = this.description.args) === null || _a === void 0 ? void 0 : _a.join(' ')} and env: ${JSON.stringify(this.description.env)}`);
            // Filter process.env to exclude undefined values
            const sanitizedEnv = Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined));
            const mergedEnv = {
                ...sanitizedEnv,
                ...(this.description.env || {})
            };
            this.transport = new stdio_1.StdioClientTransport({
                command: this.description.command,
                args: this.description.args,
                env: mergedEnv,
            });
        }
        else if ((0, common_1.isRemoteMCPServerDescription)(this.description)) {
            this.setStatus(common_1.MCPServerStatus.Connecting);
            console.log(`Connecting to server "${this.description.name}" via MCP Server Communication with URL: ${this.description.serverUrl}`);
            let descHeaders;
            if (this.description.headers) {
                descHeaders = this.description.headers;
            }
            // create header for auth token
            if (this.description.serverAuthToken) {
                if (!descHeaders) {
                    descHeaders = {};
                }
                if (this.description.serverAuthTokenHeader) {
                    descHeaders = { ...descHeaders, [this.description.serverAuthTokenHeader]: this.description.serverAuthToken };
                }
                else {
                    descHeaders = { ...descHeaders, Authorization: `Bearer ${this.description.serverAuthToken}` };
                }
            }
            if (descHeaders) {
                this.transport = new streamableHttp_1.StreamableHTTPClientTransport(new URL(this.description.serverUrl), {
                    requestInit: { headers: descHeaders },
                });
            }
            else {
                this.transport = new streamableHttp_1.StreamableHTTPClientTransport(new URL(this.description.serverUrl));
            }
            try {
                await this.client.connect(this.transport);
                connected = true;
                console.log(`MCP Streamable HTTP successful connected: ${this.description.serverUrl}`);
            }
            catch (e) {
                console.log(`MCP SSE fallback initiated: ${this.description.serverUrl}`);
                await this.client.close();
                if (descHeaders) {
                    this.transport = new sse_1.SSEClientTransport(new URL(this.description.serverUrl), {
                        eventSourceInit: {
                            fetch: (url, init) => fetch(url, { ...init, headers: descHeaders }),
                        },
                        requestInit: { headers: descHeaders },
                    });
                }
                else {
                    this.transport = new sse_1.SSEClientTransport(new URL(this.description.serverUrl));
                }
            }
        }
        this.transport.onerror = error => {
            console.error('Error: ', error);
            this.error = 'Error: ' + error;
            this.setStatus(common_1.MCPServerStatus.Errored);
        };
        this.client.onerror = error => {
            console.error('Error in MCP client: ', error);
            this.error = 'Error in MCP client: ' + error;
            this.setStatus(common_1.MCPServerStatus.Errored);
        };
        try {
            if (!connected) {
                await this.client.connect(this.transport);
            }
            this.setStatus((0, common_1.isLocalMCPServerDescription)(this.description) ? common_1.MCPServerStatus.Running : common_1.MCPServerStatus.Connected);
        }
        catch (e) {
            this.error = 'Error on MCP startup: ' + e;
            await this.client.close();
            this.setStatus(common_1.MCPServerStatus.Errored);
        }
    }
    async callTool(toolName, arg_string) {
        let args;
        try {
            args = JSON.parse(arg_string);
        }
        catch (error) {
            console.error(`Failed to parse arguments for calling tool "${toolName}" in MCP server "${this.description.name}".
                Invalid JSON: ${arg_string}`, error);
        }
        const params = {
            name: toolName,
            arguments: args,
        };
        // need to cast since other result schemas (second parameter) might be possible
        return this.client.callTool(params, types_1.CallToolResultSchema);
    }
    async getTools() {
        if (this.isRunnning()) {
            return this.client.listTools();
        }
        return { tools: [] };
    }
    update(description) {
        this.description = description;
        if ((0, common_1.isRemoteMCPServerDescription)(description)) {
            this.status = common_1.MCPServerStatus.NotConnected;
        }
        else {
            this.status = common_1.MCPServerStatus.NotRunning;
        }
    }
    async stop() {
        if (!this.isRunnning() || !this.client) {
            return;
        }
        if ((0, common_1.isLocalMCPServerDescription)(this.description)) {
            console.log(`Stopping MCP server "${this.description.name}"`);
            this.setStatus(common_1.MCPServerStatus.NotRunning);
        }
        else {
            console.log(`Disconnecting MCP server "${this.description.name}"`);
            if (this.transport instanceof streamableHttp_1.StreamableHTTPClientTransport) {
                console.log(`Terminating session for MCP server "${this.description.name}"`);
                await this.transport.terminateSession();
            }
            this.setStatus(common_1.MCPServerStatus.NotConnected);
        }
        await this.client.close();
    }
    readResource(resourceId) {
        const params = { uri: resourceId };
        return this.client.readResource(params);
    }
    getResources() {
        return this.client.listResources();
    }
}
exports.MCPServer = MCPServer;
//# sourceMappingURL=mcp-server.js.map