import { injectable, inject } from 'inversify';
import {
    WorkspaceExecutor,
    ExecutionRequest,
    ExecutionResult,
    ExecutionProgress
} from '../common/workspace-executor-protocol';

export const ExecutorOutputChannel = Symbol('ExecutorOutputChannel');

export interface ExecutorOutputChannel {
    append(text: string): void;
    appendLine(text: string): void;
    clear(): void;
    show(): void;
    hide(): void;
}

export const ExecutorNotificationService = Symbol('ExecutorNotificationService');

export interface ExecutorNotificationService {
    showError(message: string): void;
    showWarning(message: string): void;
    showInfo(message: string): void;
}

@injectable()
export class WorkspaceExecutorFrontend {
    private channel: ExecutorOutputChannel | undefined;
    private notifications: ExecutorNotificationService | undefined;

    constructor(
        @inject(WorkspaceExecutor) private executor: WorkspaceExecutor
    ) {}

    setOutputChannel(channel: ExecutorOutputChannel): void {
        this.channel = channel;
    }

    setNotificationService(notifications: ExecutorNotificationService): void {
        this.notifications = notifications;
    }

    async executeCommand(command: string, cwd?: string): Promise<ExecutionResult> {
        const requestId = `exec-${Date.now()}`;
        
        this.channel?.clear();
        this.channel?.show();
        this.channel?.appendLine(`[${new Date().toISOString()}] Executing: ${command}`);
        this.channel?.appendLine('');

        const result = await this.executor.executeWithProgress(
            { command, cwd, requestId },
            (progress) => this.handleProgress(progress)
        );

        this.channel?.appendLine('');
        this.channel?.appendLine(`[${new Date().toISOString()}] Completed in ${result.duration}ms`);
        this.channel?.appendLine(`Exit code: ${result.exitCode}`);

        this.showResultNotification(result);

        return result;
    }

    private handleProgress(progress: ExecutionProgress): void {
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

    private showResultNotification(result: ExecutionResult): void {
        if (!this.notifications) return;

        if (result.truncated) {
            this.notifications.showWarning(
                'Command output was truncated due to size limit'
            );
        }

        if (result.timedOut) {
            this.notifications.showError(
                'Command execution timed out and was terminated'
            );
        }

        if (result.wasTerminated && !result.timedOut) {
            this.notifications.showWarning(
                'Command was terminated by signal'
            );
        }

        if (result.exitCode !== 0 && !result.timedOut && !result.wasTerminated) {
            this.notifications.showError(
                `Command failed with exit code ${result.exitCode}`
            );
        }
    }

    showLogs(): void {
        this.channel?.show();
    }
}
