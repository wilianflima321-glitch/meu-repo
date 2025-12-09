import { injectable, inject } from 'inversify';
import { WorkspaceExecutorService } from '../../node/workspace-executor-service';
import { nls } from '../../common/nls';

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

@injectable()
export class TasksService {
    private tasks: Map<string, TaskDefinition> = new Map();
    private launchConfigs: Map<string, LaunchConfiguration> = new Map();
    private executions: TaskExecution[] = [];
    private readonly MAX_EXECUTIONS = 50;

    constructor(
        @inject(WorkspaceExecutorService) private executor: WorkspaceExecutorService
    ) {
        this.loadDefaultTasks();
    }

    /**
     * Load default tasks
     */
    private loadDefaultTasks(): void {
        const defaultTasks: TaskDefinition[] = [
            {
                label: 'npm: build',
                type: 'npm',
                command: 'npm',
                args: ['run', 'build'],
                group: { kind: 'build', isDefault: true },
                presentation: { reveal: 'always', panel: 'shared' }
            },
            {
                label: 'npm: test',
                type: 'npm',
                command: 'npm',
                args: ['test'],
                group: { kind: 'test', isDefault: true },
                presentation: { reveal: 'always', panel: 'shared' }
            },
            {
                label: 'npm: start',
                type: 'npm',
                command: 'npm',
                args: ['start'],
                presentation: { reveal: 'always', panel: 'dedicated' }
            },
            {
                label: 'npm: lint',
                type: 'npm',
                command: 'npm',
                args: ['run', 'lint'],
                presentation: { reveal: 'silent', panel: 'shared' }
            }
        ];

        for (const task of defaultTasks) {
            this.tasks.set(task.label, task);
        }
    }

    /**
     * Load tasks from tasks.json
     */
    async loadTasksFromFile(tasksJson: string): Promise<{ success: boolean; error?: string }> {
        try {
            const config = JSON.parse(tasksJson);
            
            if (config.tasks && Array.isArray(config.tasks)) {
                for (const task of config.tasks) {
                    this.tasks.set(task.label, task);
                }
            }

            return { success: true };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Invalid tasks.json';
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Load launch configurations from launch.json
     */
    async loadLaunchFromFile(launchJson: string): Promise<{ success: boolean; error?: string }> {
        try {
            const config = JSON.parse(launchJson);
            
            if (config.configurations && Array.isArray(config.configurations)) {
                for (const launch of config.configurations) {
                    this.launchConfigs.set(launch.name, launch);
                }
            }

            return { success: true };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Invalid launch.json';
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Run task
     */
    async runTask(taskLabel: string): Promise<TaskExecution> {
        const task = this.tasks.get(taskLabel);
        
        if (!task) {
            const execution: TaskExecution = {
                taskLabel,
                startTime: Date.now(),
                endTime: Date.now(),
                success: false,
                output: '',
                error: `Task "${taskLabel}" not found`
            };
            this.recordExecution(execution);
            this.showToast('error', `Task not found: ${taskLabel}`);
            return execution;
        }

        const execution: TaskExecution = {
            taskLabel,
            startTime: Date.now(),
            output: ''
        };

        this.showToast('info', `Running task: ${taskLabel}`);

        try {
            const command = this.buildCommand(task);
            const result = await this.executor.execute({
                command,
                cwd: task.options?.cwd,
                timeout: 300000 // 5 minutes
            });

            execution.endTime = Date.now();
            execution.exitCode = result.exitCode;
            execution.success = result.exitCode === 0;
            execution.output = result.stdout + result.stderr;

            if (result.exitCode === 0) {
                this.showToast('success', `Task completed: ${taskLabel}`);
            } else {
                execution.error = `Task failed with exit code ${result.exitCode}`;
                this.showToast('error', `Task failed: ${taskLabel} (exit code ${result.exitCode})`);
            }

            if (result.timedOut) {
                execution.error = 'Task timed out';
                this.showToast('error', `Task timed out: ${taskLabel}`);
            }

            if (result.truncated) {
                this.showToast('warning', `Task output was truncated: ${taskLabel}`);
            }

        } catch (error) {
            execution.endTime = Date.now();
            execution.success = false;
            execution.error = error instanceof Error ? error.message : 'Unknown error';
            this.showToast('error', `Task error: ${taskLabel} - ${execution.error}`);
        }

        this.recordExecution(execution);
        return execution;
    }

    /**
     * Run launch configuration
     */
    async runLaunch(configName: string): Promise<{ success: boolean; error?: string }> {
        const config = this.launchConfigs.get(configName);
        
        if (!config) {
            this.showToast('error', `Launch configuration not found: ${configName}`);
            return { success: false, error: `Configuration "${configName}" not found` };
        }

        this.showToast('info', `Starting: ${configName}`);

        try {
            // Run pre-launch task if specified
            if (config.preLaunchTask) {
                const taskResult = await this.runTask(config.preLaunchTask);
                if (!taskResult.success) {
                    this.showToast('error', `Pre-launch task failed: ${config.preLaunchTask}`);
                    return { success: false, error: 'Pre-launch task failed' };
                }
            }

            // Launch program
            if (config.program) {
                const command = this.buildLaunchCommand(config);
                const result = await this.executor.execute({
                    command,
                    cwd: config.cwd
                });

                if (result.exitCode === 0) {
                    this.showToast('success', `Launch completed: ${configName}`);
                    
                    // Run post-debug task if specified
                    if (config.postDebugTask) {
                        await this.runTask(config.postDebugTask);
                    }
                    
                    return { success: true };
                } else {
                    this.showToast('error', `Launch failed: ${configName} (exit code ${result.exitCode})`);
                    return { success: false, error: `Exit code ${result.exitCode}` };
                }
            }

            return { success: true };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.showToast('error', `Launch error: ${configName} - ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Get all tasks
     */
    getTasks(): TaskDefinition[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Get build tasks
     */
    getBuildTasks(): TaskDefinition[] {
        return this.getTasks().filter(t => t.group?.kind === 'build');
    }

    /**
     * Get test tasks
     */
    getTestTasks(): TaskDefinition[] {
        return this.getTasks().filter(t => t.group?.kind === 'test');
    }

    /**
     * Get default build task
     */
    getDefaultBuildTask(): TaskDefinition | undefined {
        return this.getBuildTasks().find(t => t.group?.isDefault);
    }

    /**
     * Get default test task
     */
    getDefaultTestTask(): TaskDefinition | undefined {
        return this.getTestTasks().find(t => t.group?.isDefault);
    }

    /**
     * Get all launch configurations
     */
    getLaunchConfigurations(): LaunchConfiguration[] {
        return Array.from(this.launchConfigs.values());
    }

    /**
     * Get task executions
     */
    getExecutions(): TaskExecution[] {
        return [...this.executions];
    }

    /**
     * Get recent executions
     */
    getRecentExecutions(count: number = 10): TaskExecution[] {
        return this.executions.slice(0, count);
    }

    /**
     * Clear execution history
     */
    clearExecutions(): void {
        this.executions = [];
    }

    /**
     * Build command from task definition
     */
    private buildCommand(task: TaskDefinition): string {
        const parts = [task.command];
        
        if (task.args) {
            parts.push(...task.args);
        }

        return parts.join(' ');
    }

    /**
     * Build command from launch configuration
     */
    private buildLaunchCommand(config: LaunchConfiguration): string {
        const parts = [config.program || ''];
        
        if (config.args) {
            parts.push(...config.args);
        }

        return parts.join(' ');
    }

    /**
     * Record task execution
     */
    private recordExecution(execution: TaskExecution): void {
        this.executions.unshift(execution);

        // Keep only MAX_EXECUTIONS
        if (this.executions.length > this.MAX_EXECUTIONS) {
            this.executions = this.executions.slice(0, this.MAX_EXECUTIONS);
        }
    }

    /**
     * Show toast notification
     */
    private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
        // Placeholder - actual implementation would show toast UI
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

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
    } {
        const tasks = this.getTasks();
        const buildTasks = this.getBuildTasks();
        const testTasks = this.getTestTasks();
        
        const successfulExecutions = this.executions.filter(e => e.success).length;
        const failedExecutions = this.executions.filter(e => !e.success).length;
        
        const durations = this.executions
            .filter(e => e.endTime)
            .map(e => e.endTime! - e.startTime);
        const averageDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        return {
            totalTasks: tasks.length,
            buildTasks: buildTasks.length,
            testTasks: testTasks.length,
            totalExecutions: this.executions.length,
            successfulExecutions,
            failedExecutions,
            averageDuration
        };
    }
}
