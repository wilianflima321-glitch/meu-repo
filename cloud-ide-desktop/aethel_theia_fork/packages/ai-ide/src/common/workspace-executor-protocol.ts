// Protocol for workspace command execution with streaming output

export const WorkspaceExecutorPath = '/services/workspace-executor';

export const WorkspaceExecutor = Symbol('WorkspaceExecutor');

export interface ExecutionRequest {
    command: string;
    cwd?: string;
    timeout?: number;
    requestId?: string;
}

export interface ExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    truncated: boolean;
    timedOut: boolean;
    wasTerminated: boolean;
    duration: number;
}

export interface ExecutionProgress {
    type: 'stdout' | 'stderr' | 'exit' | 'error';
    data: string;
    timestamp: number;
}

export interface WorkspaceExecutor {
    execute(request: ExecutionRequest): Promise<ExecutionResult>;
    executeWithProgress(
        request: ExecutionRequest,
        onProgress: (progress: ExecutionProgress) => void
    ): Promise<ExecutionResult>;
}
