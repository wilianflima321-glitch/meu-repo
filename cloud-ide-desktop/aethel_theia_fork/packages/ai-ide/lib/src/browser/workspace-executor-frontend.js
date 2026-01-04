"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceExecutorFrontend = exports.ExecutorNotificationService = exports.ExecutorOutputChannel = void 0;
const inversify_1 = require("inversify");
const workspace_executor_protocol_1 = require("../common/workspace-executor-protocol");
exports.ExecutorOutputChannel = Symbol('ExecutorOutputChannel');
exports.ExecutorNotificationService = Symbol('ExecutorNotificationService');
let WorkspaceExecutorFrontend = class WorkspaceExecutorFrontend {
    constructor(executor) {
        this.executor = executor;
    }
    setOutputChannel(channel) {
        this.channel = channel;
    }
    setNotificationService(notifications) {
        this.notifications = notifications;
    }
    async executeCommand(command, cwd) {
        const requestId = `exec-${Date.now()}`;
        this.channel?.clear();
        this.channel?.show();
        this.channel?.appendLine(`[${new Date().toISOString()}] Executing: ${command}`);
        this.channel?.appendLine('');
        const result = await this.executor.executeWithProgress({ command, cwd, requestId }, (progress) => this.handleProgress(progress));
        this.channel?.appendLine('');
        this.channel?.appendLine(`[${new Date().toISOString()}] Completed in ${result.duration}ms`);
        this.channel?.appendLine(`Exit code: ${result.exitCode}`);
        this.showResultNotification(result);
        return result;
    }
    handleProgress(progress) {
        switch (progress.type) {
            case 'stdout':
                this.channel?.append(progress.data);
                break;
            case 'stderr':
                this.channel?.append(`[stderr] ${progress.data}`);
                break;
            case 'error':
                this.channel?.appendLine(`[ERROR] ${progress.data}`);
                break;
            case 'exit':
                this.channel?.appendLine(`[${progress.type}] ${progress.data}`);
                break;
        }
    }
    showResultNotification(result) {
        if (!this.notifications)
            return;
        if (result.truncated) {
            this.notifications.showWarning('Command output was truncated due to size limit');
        }
        if (result.timedOut) {
            this.notifications.showError('Command execution timed out and was terminated');
        }
        if (result.wasTerminated && !result.timedOut) {
            this.notifications.showWarning('Command was terminated by signal');
        }
        if (result.exitCode !== 0 && !result.timedOut && !result.wasTerminated) {
            this.notifications.showError(`Command failed with exit code ${result.exitCode}`);
        }
    }
    showLogs() {
        this.channel?.show();
    }
};
exports.WorkspaceExecutorFrontend = WorkspaceExecutorFrontend;
exports.WorkspaceExecutorFrontend = WorkspaceExecutorFrontend = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(workspace_executor_protocol_1.WorkspaceExecutor)),
    __metadata("design:paramtypes", [Object])
], WorkspaceExecutorFrontend);
