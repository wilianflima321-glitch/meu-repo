"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.LaunchStopProvider = exports.LaunchRunnerProvider = exports.LaunchListProvider = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const debug_configuration_manager_1 = require("@theia/debug/lib/browser/debug-configuration-manager");
const debug_session_manager_1 = require("@theia/debug/lib/browser/debug-session-manager");
const debug_session_options_1 = require("@theia/debug/lib/browser/debug-session-options");
const workspace_functions_1 = require("../common/workspace-functions");
let LaunchListProvider = class LaunchListProvider {
    debugConfigurationManager;
    getTool() {
        return {
            id: workspace_functions_1.LIST_LAUNCH_CONFIGURATIONS_FUNCTION_ID,
            name: workspace_functions_1.LIST_LAUNCH_CONFIGURATIONS_FUNCTION_ID,
            description: 'Lists available launch configurations in the workspace. Launch configurations can be filtered by name.',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: 'Filter to apply on launch configuration names (empty string to retrieve all configurations).'
                    }
                },
                required: ['filter']
            },
            handler: async (argString) => {
                const filterArgs = JSON.parse(argString);
                const configurations = await this.getAvailableLaunchConfigurations(filterArgs.filter);
                return JSON.stringify(configurations);
            }
        };
    }
    async getAvailableLaunchConfigurations(filter = '') {
        await this.debugConfigurationManager.load();
        const configurations = [];
        for (const options of this.debugConfigurationManager.all) {
            try {
                const name = this.getDisplayName(options || {});
                if (String(name).toLowerCase().includes(filter.toLowerCase())) {
                    configurations.push(name);
                }
            }
            catch (e) {
                // Skip malformed option entries
            }
        }
        return configurations;
    }
    getDisplayName(options) {
        if (debug_session_options_1.DebugSessionOptions.isConfiguration(options)) {
            return options.configuration.name;
        }
        else if (debug_session_options_1.DebugSessionOptions.isCompound(options)) {
            return options.compound.name;
        }
        return 'Unnamed Configuration';
    }
};
exports.LaunchListProvider = LaunchListProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_configuration_manager_1.DebugConfigurationManager),
    tslib_1.__metadata("design:type", debug_configuration_manager_1.DebugConfigurationManager)
], LaunchListProvider.prototype, "debugConfigurationManager", void 0);
exports.LaunchListProvider = LaunchListProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], LaunchListProvider);
let LaunchRunnerProvider = class LaunchRunnerProvider {
    debugConfigurationManager;
    debugSessionManager;
    getTool() {
        return {
            id: workspace_functions_1.RUN_LAUNCH_CONFIGURATION_FUNCTION_ID,
            name: workspace_functions_1.RUN_LAUNCH_CONFIGURATION_FUNCTION_ID,
            description: 'Executes a specified launch configuration to start debugging.',
            parameters: {
                type: 'object',
                properties: {
                    configurationName: {
                        type: 'string',
                        description: 'The name of the launch configuration to execute.'
                    }
                },
                required: ['configurationName']
            },
            handler: async (argString, ctx) => this.handleRunLaunchConfiguration(argString, ctx?.response?.cancellationToken)
        };
    }
    async handleRunLaunchConfiguration(argString, cancellationToken) {
        try {
            const args = JSON.parse(argString);
            await this.debugConfigurationManager.load();
            const options = this.findConfigurationByName(args.configurationName);
            if (!options) {
                return `Did not find a launch configuration for the name: '${args.configurationName}'`;
            }
            const session = await this.debugSessionManager.start(options);
            if (!session) {
                return `Failed to start launch configuration '${args.configurationName}'`;
            }
            if (cancellationToken && typeof session !== 'boolean') {
                cancellationToken.onCancellationRequested(() => {
                    this.debugSessionManager.terminateSession(session);
                });
            }
            const sessionInfo = typeof session === 'boolean'
                ? `Compound launch configuration '${args.configurationName}' started successfully`
                : `Launch configuration '${args.configurationName}' started with session ID: ${session.id}`;
            return sessionInfo;
        }
        catch (error) {
            return JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to run launch configuration'
            });
        }
    }
    findConfigurationByName(name) {
        for (const options of this.debugConfigurationManager.all) {
            const displayName = this.getDisplayName(options);
            if (displayName === name) {
                return options;
            }
        }
        return undefined;
    }
    getDisplayName(options) {
        if (debug_session_options_1.DebugSessionOptions.isConfiguration(options)) {
            return options.configuration.name;
        }
        else if (debug_session_options_1.DebugSessionOptions.isCompound(options)) {
            return options.compound.name;
        }
        return 'Unnamed Configuration';
    }
};
exports.LaunchRunnerProvider = LaunchRunnerProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_configuration_manager_1.DebugConfigurationManager),
    tslib_1.__metadata("design:type", debug_configuration_manager_1.DebugConfigurationManager)
], LaunchRunnerProvider.prototype, "debugConfigurationManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_session_manager_1.DebugSessionManager),
    tslib_1.__metadata("design:type", debug_session_manager_1.DebugSessionManager)
], LaunchRunnerProvider.prototype, "debugSessionManager", void 0);
exports.LaunchRunnerProvider = LaunchRunnerProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], LaunchRunnerProvider);
let LaunchStopProvider = class LaunchStopProvider {
    debugSessionManager;
    getTool() {
        return {
            id: workspace_functions_1.STOP_LAUNCH_CONFIGURATION_FUNCTION_ID,
            name: workspace_functions_1.STOP_LAUNCH_CONFIGURATION_FUNCTION_ID,
            description: 'Stops an active launch configuration or debug session.',
            parameters: {
                type: 'object',
                properties: {
                    configurationName: {
                        type: 'string',
                        description: 'The name of the launch configuration to stop. If not provided, stops the current active session.'
                    }
                },
                required: []
            },
            handler: async (argString) => this.handleStopLaunchConfiguration(argString)
        };
    }
    async handleStopLaunchConfiguration(argString) {
        try {
            const args = JSON.parse(argString);
            if (args.configurationName) {
                // Find and stop specific session by configuration name
                const session = this.findSessionByConfigurationName(args.configurationName);
                if (!session) {
                    return `No active session found for launch configuration: '${args.configurationName}'`;
                }
                await this.debugSessionManager.terminateSession(session);
                return `Successfully stopped launch configuration: '${args.configurationName}'`;
            }
            else {
                // Stop current active session
                const currentSession = this.debugSessionManager.currentSession;
                if (!currentSession) {
                    return 'No active debug session to stop';
                }
                await this.debugSessionManager.terminateSession(currentSession);
                return `Successfully stopped current debug session: '${currentSession.configuration.name}'`;
            }
        }
        catch (error) {
            return JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to stop launch configuration'
            });
        }
    }
    findSessionByConfigurationName(configurationName) {
        return this.debugSessionManager.sessions.find(session => session.configuration.name === configurationName);
    }
};
exports.LaunchStopProvider = LaunchStopProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_session_manager_1.DebugSessionManager),
    tslib_1.__metadata("design:type", debug_session_manager_1.DebugSessionManager)
], LaunchStopProvider.prototype, "debugSessionManager", void 0);
exports.LaunchStopProvider = LaunchStopProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], LaunchStopProvider);
//# sourceMappingURL=workspace-launch-provider.js.map