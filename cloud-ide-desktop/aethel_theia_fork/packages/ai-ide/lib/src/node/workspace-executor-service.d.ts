import { WorkspaceExecutor, ExecutionRequest, ExecutionResult, ExecutionProgress } from '../common/workspace-executor-protocol';
export declare class WorkspaceExecutorService implements WorkspaceExecutor {
    private executionCount;
    private metrics;
    execute(request: ExecutionRequest): Promise<ExecutionResult>;
    executeWithProgress(request: ExecutionRequest, onProgress: (progress: ExecutionProgress) => void): Promise<ExecutionResult>;
    private parseCommand;
    private recordMetrics;
    getMetrics(): {
        p95: number;
        p99: number;
        durations: undefined;
        total: number;
        success: number;
        failed: number;
        timedOut: number;
        truncated: number;
        terminated: number;
    };
    exportMetricsPrometheus(): string;
}
