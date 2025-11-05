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
const chai_1 = require("chai");
const core_1 = require("@theia/core");
const workspace_task_provider_1 = require("./workspace-task-provider");
const inversify_1 = require("@theia/core/shared/inversify");
const task_service_1 = require("@theia/task/lib/browser/task-service");
const terminal_service_1 = require("@theia/terminal/lib/browser/base/terminal-service");
describe('Workspace Task Provider Cancellation Tests', () => {
    let cancellationTokenSource;
    let mockCtx;
    let container;
    let mockTaskService;
    let mockTerminalService;
    beforeEach(() => {
        cancellationTokenSource = new core_1.CancellationTokenSource();
        // Setup mock context
        mockCtx = {
            response: {
                cancellationToken: cancellationTokenSource.token
            }
        };
        // Create a new container for each test
        container = new inversify_1.Container();
        // Mock dependencies
        mockTaskService = {
            startUserAction: () => 123,
            getTasks: async (token) => [
                {
                    label: 'build',
                    _scope: 'workspace',
                    type: 'shell'
                },
                {
                    label: 'test',
                    _scope: 'workspace',
                    type: 'shell'
                }
            ],
            runTaskByLabel: async (token, taskLabel) => {
                if (taskLabel === 'build' || taskLabel === 'test') {
                    return {
                        taskId: 0,
                        terminalId: 0,
                        config: {
                            label: taskLabel,
                            _scope: 'workspace',
                            type: 'shell'
                        }
                    };
                }
                return undefined;
            },
            terminateTask: async (activeTaskInfo) => {
                // Track termination
            },
            getTerminateSignal: async () => 'SIGTERM'
        };
        mockTerminalService = {
            getByTerminalId: () => ({
                buffer: {
                    length: 10,
                    getLines: () => ['line1', 'line2', 'line3'],
                },
                clearOutput: () => { }
            })
        };
        // Register mocks in the container
        container.bind(task_service_1.TaskService).toConstantValue(mockTaskService);
        container.bind(terminal_service_1.TerminalService).toConstantValue(mockTerminalService);
        container.bind(workspace_task_provider_1.TaskListProvider).toSelf();
        container.bind(workspace_task_provider_1.TaskRunnerProvider).toSelf();
    });
    afterEach(() => {
        cancellationTokenSource.dispose();
    });
    it('TaskListProvider should respect cancellation token', async () => {
        const taskListProvider = container.get(workspace_task_provider_1.TaskListProvider);
        cancellationTokenSource.cancel();
        const handler = taskListProvider.getTool().handler;
        const result = await handler(JSON.stringify({ filter: '' }), mockCtx);
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('TaskRunnerProvider should respect cancellation token at the beginning', async () => {
        const taskRunnerProvider = container.get(workspace_task_provider_1.TaskRunnerProvider);
        cancellationTokenSource.cancel();
        const handler = taskRunnerProvider.getTool().handler;
        const result = await handler(JSON.stringify({ taskName: 'build' }), mockCtx);
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
});
//# sourceMappingURL=workspace-task-provider.spec.js.map