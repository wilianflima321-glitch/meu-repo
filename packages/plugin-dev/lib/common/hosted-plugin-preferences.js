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
exports.bindHostedPluginPreferences = exports.createNavigatorPreferences = exports.HostedPluginPreferences = exports.HostedPluginPreferenceContribution = exports.HostedPluginConfigSchema = void 0;
const common_1 = require("@theia/core/lib/common");
const nls_1 = require("@theia/core/lib/common/nls");
exports.HostedPluginConfigSchema = {
    properties: {
        'hosted-plugin.watchMode': {
            type: 'boolean',
            description: nls_1.nls.localize('theia/plugin-dev/watchMode', 'Run watcher on plugin under development'),
            default: true
        },
        'hosted-plugin.debugMode': {
            type: 'string',
            description: nls_1.nls.localize('theia/plugin-dev/debugMode', 'Using inspect or inspect-brk for Node.js debug'),
            default: 'inspect',
            enum: ['inspect', 'inspect-brk']
        },
        'hosted-plugin.launchOutFiles': {
            type: 'array',
            items: {
                type: 'string'
            },
            markdownDescription: nls_1.nls.localize('theia/plugin-dev/launchOutFiles', 'Array of glob patterns for locating generated JavaScript files (`${pluginPath}` will be replaced by plugin actual path).'),
            default: ['${pluginPath}/out/**/*.js']
        },
        'hosted-plugin.debugPorts': {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'serverName': {
                        type: 'string',
                        description: nls_1.nls.localize('theia/plugin-dev/debugPorts/serverName', 'The plugin host server name, e.g. "hosted-plugin" as in "--hosted-plugin-inspect=" ' +
                            'or "headless-hosted-plugin" as in "--headless-hosted-plugin-inspect="'),
                    },
                    'debugPort': {
                        type: 'number',
                        minimum: 0,
                        maximum: 65535,
                        description: nls_1.nls.localize('theia/plugin-dev/debugPorts/debugPort', 'Port to use for this server\'s Node.js debug'),
                    }
                },
            },
            default: undefined,
            description: nls_1.nls.localize('theia/plugin-dev/debugPorts', 'Port configuration per server for Node.js debug'),
        }
    }
};
exports.HostedPluginPreferenceContribution = Symbol('HostedPluginPreferenceContribution');
exports.HostedPluginPreferences = Symbol('HostedPluginPreferences');
function createNavigatorPreferences(preferences, schema = exports.HostedPluginConfigSchema) {
    return (0, common_1.createPreferenceProxy)(preferences, schema);
}
exports.createNavigatorPreferences = createNavigatorPreferences;
function bindHostedPluginPreferences(bind) {
    bind(exports.HostedPluginPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get(common_1.PreferenceService);
        const contribution = ctx.container.get(exports.HostedPluginPreferenceContribution);
        return createNavigatorPreferences(preferences, contribution.schema);
    }).inSingletonScope();
    bind(exports.HostedPluginPreferenceContribution).toConstantValue({ schema: exports.HostedPluginConfigSchema });
    bind(common_1.PreferenceContribution).toService(exports.HostedPluginPreferenceContribution);
}
exports.bindHostedPluginPreferences = bindHostedPluginPreferences;
//# sourceMappingURL=hosted-plugin-preferences.js.map