import { WorkspaceExecutor, ExecutionResult } from '../common/workspace-executor-protocol';
export declare const ExecutorOutputChannel: unique symbol;
export interface ExecutorOutputChannel {
    append(text: string): void;
    appendLine(text: string): void;
    clear(): void;
    show(): void;
    hide(): void;
}
export declare const ExecutorNotificationService: unique symbol;
export interface ExecutorNotificationService {
    showError(message: string): void;
    showWarning(message: string): void;
    showInfo(message: string): void;
}
export declare class WorkspaceExecutorFrontend {
    private executor;
    private channel;
    private notifications;
    constructor(executor: WorkspaceExecutor);
    setOutputChannel(channel: ExecutorOutputChannel): void;
    setNotificationService(notifications: ExecutorNotificationService): void;
    executeCommand(command: string, cwd?: string): Promise<ExecutionResult>;
    private handleProgress;
    private showResultNotification;
    showLogs(): void;
}
