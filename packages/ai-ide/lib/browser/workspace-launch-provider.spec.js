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
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const chai_1 = require("chai");
const inversify_1 = require("@theia/core/shared/inversify");
const workspace_launch_provider_1 = require("./workspace-launch-provider");
const debug_configuration_manager_1 = require("@theia/debug/lib/browser/debug-configuration-manager");
const debug_session_manager_1 = require("@theia/debug/lib/browser/debug-session-manager");
const debug_session_options_1 = require("@theia/debug/lib/browser/debug-session-options");
disableJSDOM();
describe('Launch Management Tool Providers', () => {
    let container;
    let launchListProvider;
    let launchRunnerProvider;
    let launchStopProvider;
    let mockDebugConfigurationManager;
    let mockDebugSessionManager;
    before(() => {
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
    });
    after(() => {
        disableJSDOM();
    });
    beforeEach(() => {
        container = new inversify_1.Container();
        const mockConfigs = createMockConfigurations();
        mockDebugConfigurationManager = {
            load: () => Promise.resolve(),
            get all() {
                function* configIterator() {
                    for (const config of mockConfigs) {
                        yield config;
                    }
                }
                return configIterator();
            },
        };
        mockDebugSessionManager = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            start: async (options) => {
                if (typeof options === 'string' ||
                    debug_session_options_1.DebugSessionOptions.isCompound(options)) {
                    return true;
                }
                return {
                    id: 'test-session-id',
                    configuration: { name: 'Test Config' },
                };
            },
            terminateSession: () => Promise.resolve(),
            currentSession: undefined,
            sessions: [],
        };
        container
            .bind(debug_configuration_manager_1.DebugConfigurationManager)
            .toConstantValue(mockDebugConfigurationManager);
        container
            .bind(debug_session_manager_1.DebugSessionManager)
            .toConstantValue(mockDebugSessionManager);
        launchListProvider = container.resolve(workspace_launch_provider_1.LaunchListProvider);
        launchRunnerProvider = container.resolve(workspace_launch_provider_1.LaunchRunnerProvider);
        launchStopProvider = container.resolve(workspace_launch_provider_1.LaunchStopProvider);
    });
    function createMockConfigurations() {
        const config1 = {
            name: 'Node.js Debug',
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/app.js',
        };
        const config2 = {
            name: 'Python Debug',
            type: 'python',
            request: 'launch',
            program: '${workspaceFolder}/main.py',
        };
        const compound = {
            name: 'Launch All',
            configurations: ['Node.js Debug', 'Python Debug'],
        };
        return [
            {
                name: 'Node.js Debug',
                configuration: config1,
                workspaceFolderUri: '/workspace',
            },
            {
                name: 'Python Debug',
                configuration: config2,
                workspaceFolderUri: '/workspace',
            },
            { name: 'Launch All', compound, workspaceFolderUri: '/workspace' },
        ];
    }
    describe('LaunchListProvider', () => {
        it('should provide the correct tool metadata', () => {
            const tool = launchListProvider.getTool();
            (0, chai_1.expect)(tool.id).to.equal('listLaunchConfigurations');
            (0, chai_1.expect)(tool.name).to.equal('listLaunchConfigurations');
            (0, chai_1.expect)(tool.description).to.contain('Lists available launch configurations');
            (0, chai_1.expect)(tool.parameters.required).to.deep.equal(['filter']);
        });
        it('should list all configurations without filter', async () => {
            const tool = launchListProvider.getTool();
            const result = await tool.handler('{"filter":""}');
            (0, chai_1.expect)(result).to.be.a('string');
            const configurations = JSON.parse(result);
            (0, chai_1.expect)(configurations).to.be.an('array');
            (0, chai_1.expect)(configurations).to.have.lengthOf(3);
            (0, chai_1.expect)(configurations).to.include('Node.js Debug');
            (0, chai_1.expect)(configurations).to.include('Python Debug');
            (0, chai_1.expect)(configurations).to.include('Launch All');
        });
        it('should filter configurations by name', async () => {
            const tool = launchListProvider.getTool();
            const result = await tool.handler('{"filter":"Node"}');
            (0, chai_1.expect)(result).to.be.a('string');
            const configurations = JSON.parse(result);
            (0, chai_1.expect)(configurations).to.be.an('array');
            (0, chai_1.expect)(configurations).to.have.lengthOf(1);
            (0, chai_1.expect)(configurations).to.include('Node.js Debug');
        });
        it('should handle case-insensitive filtering', async () => {
            const tool = launchListProvider.getTool();
            const result = await tool.handler('{"filter":"python"}');
            (0, chai_1.expect)(result).to.be.a('string');
            const configurations = JSON.parse(result);
            (0, chai_1.expect)(configurations).to.be.an('array');
            (0, chai_1.expect)(configurations).to.have.lengthOf(1);
            (0, chai_1.expect)(configurations).to.include('Python Debug');
        });
    });
    describe('LaunchRunnerProvider', () => {
        it('should provide the correct tool metadata', () => {
            const tool = launchRunnerProvider.getTool();
            (0, chai_1.expect)(tool.id).to.equal('runLaunchConfiguration');
            (0, chai_1.expect)(tool.name).to.equal('runLaunchConfiguration');
            (0, chai_1.expect)(tool.description).to.contain('Executes a specified launch configuration');
            (0, chai_1.expect)(tool.parameters.required).to.deep.equal([
                'configurationName',
            ]);
        });
        it('should start a valid configuration', async () => {
            const tool = launchRunnerProvider.getTool();
            const result = await tool.handler('{"configurationName":"Node.js Debug"}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('Node.js Debug');
            (0, chai_1.expect)(result).to.contain('started with session ID');
        });
        it('should handle unknown configuration', async () => {
            const tool = launchRunnerProvider.getTool();
            const result = await tool.handler('{"configurationName":"Unknown Config"}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('Did not find a launch configuration');
            (0, chai_1.expect)(result).to.contain('Unknown Config');
        });
        it('should handle compound configurations', async () => {
            const tool = launchRunnerProvider.getTool();
            const result = await tool.handler('{"configurationName":"Launch All"}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('Compound launch configuration');
            (0, chai_1.expect)(result).to.contain('Launch All');
            (0, chai_1.expect)(result).to.contain('started successfully');
        });
    });
    describe('LaunchStopProvider', () => {
        it('should provide the correct tool metadata', () => {
            const tool = launchStopProvider.getTool();
            (0, chai_1.expect)(tool.id).to.equal('stopLaunchConfiguration');
            (0, chai_1.expect)(tool.name).to.equal('stopLaunchConfiguration');
            (0, chai_1.expect)(tool.description).to.contain('Stops an active launch configuration');
            (0, chai_1.expect)(tool.parameters.required).to.deep.equal([]);
        });
        it('should stop current session when no configuration name provided', async () => {
            mockDebugSessionManager.currentSession = {
                id: 'current-session',
                configuration: { name: 'Current Config' },
            };
            const tool = launchStopProvider.getTool();
            const result = await tool.handler('{}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('Successfully stopped current debug session');
            (0, chai_1.expect)(result).to.contain('Current Config');
        });
        it('should handle no active session', async () => {
            mockDebugSessionManager.currentSession = undefined;
            const tool = launchStopProvider.getTool();
            const result = await tool.handler('{}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('No active debug session to stop');
        });
        it('should stop specific session by name', async () => {
            Object.defineProperty(mockDebugSessionManager, 'sessions', {
                value: [
                    {
                        id: 'session-1',
                        configuration: { name: 'Node.js Debug' },
                    },
                    {
                        id: 'session-2',
                        configuration: { name: 'Python Debug' },
                    },
                ],
                writable: true,
                configurable: true,
            });
            const tool = launchStopProvider.getTool();
            const result = await tool.handler('{"configurationName":"Node.js Debug"}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('Successfully stopped launch configuration');
            (0, chai_1.expect)(result).to.contain('Node.js Debug');
        });
        it('should handle session not found by name', async () => {
            Object.defineProperty(mockDebugSessionManager, 'sessions', {
                value: [],
                writable: true,
                configurable: true,
            });
            const tool = launchStopProvider.getTool();
            const result = await tool.handler('{"configurationName":"Unknown Config"}');
            (0, chai_1.expect)(result).to.be.a('string');
            (0, chai_1.expect)(result).to.contain('No active session found');
            (0, chai_1.expect)(result).to.contain('Unknown Config');
        });
    });
});
//# sourceMappingURL=workspace-launch-provider.spec.js.map