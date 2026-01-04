import { WorkspaceExecutorService } from '../../node/workspace-executor-service';
/**
 * Tasks and Launch Configuration Service
 * Professional task execution with clear feedback
 */
export interface TaskDefinition {
    label: string;
    type: string;
    command: string;
    args?: string[];
    options?: {
        cwd?: string;
        env?: Record<string, string>;
    };
    problemMatcher?: string[];
    presentation?: {
        reveal?: 'always' | 'silent' | 'never';
        panel?: 'shared' | 'dedicated' | 'new';
        clear?: boolean;
    };
    group?: {
        kind: 'build' | 'test';
        isDefault?: boolean;
    };
}
export interface LaunchConfiguration {
    name: string;
    type: string;
    request: 'launch' | 'attach';
    program?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    preLaunchTask?: string;
    postDebugTask?: string;
}
export interface TaskExecution {
    taskLabel: string;
    startTime: number;
    endTime?: number;
    exitCode?: number;
    success?: boolean;
    output: string;
    error?: string;
}
export declare class TasksService {
    private executor;
    private tasks;
    private launchConfigs;
    private executions;
    private readonly MAX_EXECUTIONS;
    constructor(executor: WorkspaceExecutorService);
    /**
     * Load default tasks
     */
    private loadDefaultTasks;
    /**
     * Load tasks from tasks.json
     */
    loadTasksFromFile(tasksJson: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Load launch configurations from launch.json
     */
    loadLaunchFromFile(launchJson: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Run task
     */
    runTask(taskLabel: string): Promise<TaskExecution>;
    /**
     * Run launch configuration
     */
    runLaunch(configName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get all tasks
     */
    getTasks(): TaskDefinition[];
    /**
     * Get build tasks
     */
    getBuildTasks(): TaskDefinition[];
    /**
     * Get test tasks
     */
    getTestTasks(): TaskDefinition[];
    /**
     * Get default build task
     */
    getDefaultBuildTask(): TaskDefinition | undefined;
    /**
     * Get default test task
     */
    getDefaultTestTask(): TaskDefinition | undefined;
    /**
     * Get all launch configurations
     */
    getLaunchConfigurations(): LaunchConfiguration[];
    /**
     * Get task executions
     */
    getExecutions(): TaskExecution[];
    /**
     * Get recent executions
     */
    getRecentExecutions(count?: number): TaskExecution[];
    /**
     * Clear execution history
     */
    clearExecutions(): void;
    /**
     * Build command from task definition
     */
    private buildCommand;
    /**
     * Build command from launch configuration
     */
    private buildLaunchCommand;
    /**
     * Record task execution
     */
    private recordExecution;
    /**
     * Show toast notification
     */
    private showToast;
    /**
     * Get task statistics
     */
    getStatistics(): {
        totalTasks: number;
        buildTasks: number;
        testTasks: number;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageDuration: number;
    };
}
