"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const mcp_preferences_1 = require("../common/mcp-preferences");
const mcp_server_manager_1 = require("../common/mcp-server-manager");
const core_1 = require("@theia/core");
;
var MCPServersPreference;
(function (MCPServersPreference) {
    function isValue(obj) {
        return !!obj && typeof obj === 'object' &&
            ('command' in obj || 'serverUrl' in obj) &&
            (!('command' in obj) || typeof obj.command === 'string') &&
            (!('args' in obj) || Array.isArray(obj.args) && obj.args.every(arg => typeof arg === 'string')) &&
            (!('env' in obj) || !!obj.env && typeof obj.env === 'object' && Object.values(obj.env).every(value => typeof value === 'string')) &&
            (!('autostart' in obj) || typeof obj.autostart === 'boolean') &&
            (!('serverUrl' in obj) || typeof obj.serverUrl === 'string') &&
            (!('serverAuthToken' in obj) || typeof obj.serverAuthToken === 'string') &&
            (!('serverAuthTokenHeader' in obj) || typeof obj.serverAuthTokenHeader === 'string') &&
            (!('headers' in obj) || !!obj.headers && typeof obj.headers === 'object' && Object.values(obj.headers).every(value => typeof value === 'string'));
    }
    MCPServersPreference.isValue = isValue;
})(MCPServersPreference || (MCPServersPreference = {}));
function filterValidValues(servers) {
    const result = {};
    if (!servers || typeof servers !== 'object') {
        return result;
    }
    for (const [name, value] of Object.entries(servers)) {
        if (typeof name === 'string' && MCPServersPreference.isValue(value)) {
            result[name] = value;
        }
    }
    return result;
}
let McpFrontendApplicationContribution = class McpFrontendApplicationContribution {
    constructor() {
        this.prevServers = new Map();
    }
    onStart() {
        this.preferenceService.ready.then(() => {
            const servers = filterValidValues(this.preferenceService.get(mcp_preferences_1.MCP_SERVERS_PREF, {}));
            this.prevServers = this.convertToMap(servers);
            this.syncServers(this.prevServers);
            this.autoStartServers(this.prevServers);
            this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === mcp_preferences_1.MCP_SERVERS_PREF) {
                    this.handleServerChanges(filterValidValues(event.newValue));
                }
            });
        });
        this.frontendMCPService.registerToolsForAllStartedServers();
    }
    async autoStartServers(servers) {
        const startedServers = await this.frontendMCPService.getStartedServers();
        for (const [name, serverDesc] of servers) {
            if (serverDesc && serverDesc.autostart) {
                if (!startedServers.includes(name)) {
                    await this.frontendMCPService.startServer(name);
                }
            }
        }
    }
    handleServerChanges(newServers) {
        const oldServers = this.prevServers;
        const updatedServers = this.convertToMap(newServers);
        for (const [name] of oldServers) {
            if (!updatedServers.has(name)) {
                this.manager.removeServer(name);
            }
        }
        for (const [name, description] of updatedServers) {
            const oldDescription = oldServers.get(name);
            let diff = false;
            try {
                // We know that that the descriptions are actual JSONObjects as we construct them ourselves
                if (!oldDescription || !core_1.PreferenceUtils.deepEqual(oldDescription, description)) {
                    diff = true;
                }
            }
            catch (e) {
                // In some cases the deepEqual function throws an error, so we fall back to assuming that there is a difference
                // This seems to happen in cases where the objects are structured differently, e.g. whole sub-objects are missing
                console.debug('Failed to compare MCP server descriptions, assuming a difference', e);
                diff = true;
            }
            if (diff) {
                this.manager.addOrUpdateServer(description);
            }
        }
        this.prevServers = updatedServers;
    }
    syncServers(servers) {
        for (const [, description] of servers) {
            this.manager.addOrUpdateServer(description);
        }
        for (const [name] of this.prevServers) {
            if (!servers.has(name)) {
                this.manager.removeServer(name);
            }
        }
    }
    convertToMap(servers) {
        const map = new Map();
        Object.entries(servers).forEach(([name, description]) => {
            let filteredDescription;
            if ('serverUrl' in description) {
                // Create RemoteMCPServerDescription by picking only remote-specific properties
                const { serverUrl, serverAuthToken, serverAuthTokenHeader, headers, autostart } = description;
                filteredDescription = {
                    name,
                    serverUrl,
                    ...(serverAuthToken && { serverAuthToken }),
                    ...(serverAuthTokenHeader && { serverAuthTokenHeader }),
                    ...(headers && { headers }),
                    autostart: autostart !== null && autostart !== void 0 ? autostart : true,
                };
            }
            else {
                // Create LocalMCPServerDescription by picking only local-specific properties
                const { command, args, env, autostart } = description;
                filteredDescription = {
                    name,
                    command,
                    ...(args && { args }),
                    ...(env && { env }),
                    autostart: autostart !== null && autostart !== void 0 ? autostart : true,
                };
            }
            map.set(name, filteredDescription);
        });
        return map;
    }
};
exports.McpFrontendApplicationContribution = McpFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], McpFrontendApplicationContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.MCPServerManager),
    tslib_1.__metadata("design:type", Object)
], McpFrontendApplicationContribution.prototype, "manager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(mcp_server_manager_1.MCPFrontendService),
    tslib_1.__metadata("design:type", Object)
], McpFrontendApplicationContribution.prototype, "frontendMCPService", void 0);
exports.McpFrontendApplicationContribution = McpFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], McpFrontendApplicationContribution);
//# sourceMappingURL=mcp-frontend-application-contribution.js.map