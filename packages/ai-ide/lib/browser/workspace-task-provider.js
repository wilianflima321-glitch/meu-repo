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
exports.TaskRunnerProvider = exports.TaskListProvider = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const task_service_1 = require("@theia/task/lib/browser/task-service");
const terminal_service_1 = require("@theia/terminal/lib/browser/base/terminal-service");
const workspace_functions_1 = require("../common/workspace-functions");
let TaskListProvider = class TaskListProvider {
    taskService;
    getTool() {
        return {
            id: workspace_functions_1.LIST_TASKS_FUNCTION_ID,
            name: workspace_functions_1.LIST_TASKS_FUNCTION_ID,
            description: 'Lists available tool tasks in the workspace, such as build, run, test. Tasks can be filtered by name.',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: 'Filter to apply on task names (empty string to retrieve all tasks).'
                    }
                },
                required: ['filter']
            },
            handler: async (argString, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const filterArgs = JSON.parse(argString);
                const tasks = await this.getAvailableTasks(filterArgs.filter);
                const taskString = JSON.stringify(tasks);
                return taskString;
            }
        };
    }
    async getAvailableTasks(filter = '') {
        const userActionToken = this.taskService.startUserAction();
        const tasks = await this.taskService.getTasks(userActionToken);
        const filteredTasks = tasks.filter(task => task.label.toLowerCase().includes(filter.toLowerCase()));
        return filteredTasks.map(task => task.label);
    }
};
exports.TaskListProvider = TaskListProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(task_service_1.TaskService),
    tslib_1.__metadata("design:type", task_service_1.TaskService)
], TaskListProvider.prototype, "taskService", void 0);
exports.TaskListProvider = TaskListProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskListProvider);
let TaskRunnerProvider = class TaskRunnerProvider {
    taskService;
    terminalService;
    getTool() {
        return {
            id: workspace_functions_1.RUN_TASK_FUNCTION_ID,
            name: workspace_functions_1.RUN_TASK_FUNCTION_ID,
            description: 'Executes a specified task.',
            parameters: {
                type: 'object',
                properties: {
                    taskName: {
                        type: 'string',
                        description: 'The name of the task to execute.'
                    }
                },
                required: ['taskName']
            },
            handler: async (argString, ctx) => this.handleRunTask(argString, ctx?.response?.cancellationToken)
        };
    }
    async handleRunTask(argString, cancellationToken) {
        try {
            const args = JSON.parse(argString);
            const token = this.taskService.startUserAction();
            const taskInfo = await this.taskService.runTaskByLabel(token, args.taskName);
            if (!taskInfo) {
                return `Did not find a task for the label: '${args.taskName}'`;
            }
            cancellationToken?.onCancellationRequested(() => {
                this.taskService.terminateTask(taskInfo);
            });
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const signal = await this.taskService.getTerminateSignal(taskInfo.taskId);
            if (taskInfo.terminalId) {
                const terminal = this.terminalService.getByTerminalId(taskInfo.terminalId);
                const length = terminal?.buffer.length ?? 0;
                const numberOfLines = Math.min(length, 50);
                const result = [];
                const allLines = terminal?.buffer.getLines(0, length).reverse() ?? [];
                // collect the first 50 lines:
                const firstLines = allLines.slice(0, numberOfLines);
                result.push(...firstLines);
                // collect the last 50 lines:
                if (length > numberOfLines) {
                    const lastLines = allLines.slice(length - numberOfLines);
                    result.push(...lastLines);
                }
                terminal?.clearOutput();
                return result.join('\n');
            }
            return `No terminal output available. The terminate signal was :${signal}.`;
        }
        catch (error) {
            return JSON.stringify({ success: false, message: error.message || 'Failed to run task' });
        }
    }
};
exports.TaskRunnerProvider = TaskRunnerProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(task_service_1.TaskService),
    tslib_1.__metadata("design:type", task_service_1.TaskService)
], TaskRunnerProvider.prototype, "taskService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(terminal_service_1.TerminalService),
    tslib_1.__metadata("design:type", Object)
], TaskRunnerProvider.prototype, "terminalService", void 0);
exports.TaskRunnerProvider = TaskRunnerProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TaskRunnerProvider);
//# sourceMappingURL=workspace-task-provider.js.map