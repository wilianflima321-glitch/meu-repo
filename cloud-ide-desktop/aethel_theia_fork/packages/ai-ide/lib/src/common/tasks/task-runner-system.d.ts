/**
 * Task Runner System - Professional Build & Task Infrastructure
 *
 * Sistema de build e tasks profissional para IDE de produção.
 * Inspirado em VS Code Tasks, JetBrains Run Configurations, Make, Gulp.
 * Suporta:
 * - Shell tasks
 * - Process tasks
 * - Problem matchers
 * - Task dependencies
 * - Composite tasks
 * - Background tasks
 * - Watch tasks
 * - Custom task providers
 * - Task variables
 * - Task groups (build, test, clean)
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Task type
 */
export declare enum TaskType {
    Shell = "shell",
    Process = "process",
    Composite = "composite",
    Custom = "custom"
}
/**
 * Task state
 */
export declare enum TaskState {
    Idle = "idle",
    Running = "running",
    Succeeded = "succeeded",
    Failed = "failed",
    Cancelled = "cancelled"
}
/**
 * Task group
 */
export declare enum TaskGroup {
    Build = "build",
    Test = "test",
    Clean = "clean",
    Rebuild = "rebuild",
    Deploy = "deploy",
    None = "none"
}
/**
 * Task presentation
 */
export declare enum TaskPresentation {
    Always = "always",
    Never = "never",
    Silent = "silent"
}
/**
 * Panel behavior
 */
export declare enum PanelBehavior {
    Shared = "shared",
    Dedicated = "dedicated",
    New = "new"
}
/**
 * Problem matcher severity
 */
export declare enum ProblemSeverity {
    Error = "error",
    Warning = "warning",
    Info = "info"
}
/**
 * Task source
 */
export declare enum TaskSource {
    Workspace = "workspace",
    Folder = "folder",
    Extension = "extension",
    Auto = "auto",
    User = "user"
}
/**
 * Problem pattern
 */
export interface ProblemPattern {
    name?: string;
    regexp: string;
    file?: number;
    location?: number;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    severity?: number;
    code?: number;
    message?: number;
    loop?: boolean;
}
/**
 * Problem matcher
 */
export interface ProblemMatcher {
    name?: string;
    owner: string;
    source?: string;
    severity?: ProblemSeverity;
    applyTo?: 'allDocuments' | 'openDocuments' | 'closedDocuments';
    fileLocation?: 'absolute' | 'relative' | 'autoDetect' | ['relative', string];
    pattern: ProblemPattern | ProblemPattern[];
    background?: {
        activeOnStart?: boolean;
        beginsPattern?: string | {
            regexp: string;
        };
        endsPattern?: string | {
            regexp: string;
        };
    };
}
/**
 * Task presentation options
 */
export interface TaskPresentationOptions {
    reveal?: TaskPresentation;
    echo?: boolean;
    focus?: boolean;
    panel?: PanelBehavior;
    showReuseMessage?: boolean;
    clear?: boolean;
    group?: string;
    close?: boolean;
}
/**
 * Run options
 */
export interface RunOptions {
    reevaluateOnRerun?: boolean;
    runOn?: 'default' | 'folderOpen';
    instanceLimit?: number;
}
/**
 * Task definition
 */
export interface TaskDefinition {
    id: string;
    label: string;
    type: TaskType;
    command?: string;
    args?: string[];
    options?: TaskOptions;
    presentation?: TaskPresentationOptions;
    problemMatcher?: string | string[] | ProblemMatcher | ProblemMatcher[];
    group?: TaskGroup | {
        kind: TaskGroup;
        isDefault?: boolean;
    };
    dependsOn?: string | string[] | {
        task: string;
        type?: string;
    }[];
    dependsOrder?: 'parallel' | 'sequence';
    runOptions?: RunOptions;
    detail?: string;
    source?: TaskSource;
    scope?: 'global' | 'workspace' | 'folder';
    workspaceFolder?: string;
    icon?: {
        id: string;
        color?: string;
    };
    hide?: boolean;
    [key: string]: unknown;
}
/**
 * Task options
 */
export interface TaskOptions {
    cwd?: string;
    env?: Record<string, string>;
    shell?: ShellConfiguration;
}
/**
 * Shell configuration
 */
export interface ShellConfiguration {
    executable?: string;
    args?: string[];
    quoting?: 'escape' | 'strong' | 'weak';
}
/**
 * Task execution
 */
export interface TaskExecution {
    id: string;
    task: TaskDefinition;
    state: TaskState;
    startTime: number;
    endTime?: number;
    exitCode?: number;
    pid?: number;
    output: string[];
    errors: TaskProblem[];
}
/**
 * Task problem
 */
export interface TaskProblem {
    severity: ProblemSeverity;
    message: string;
    source?: string;
    code?: string | number;
    file?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
}
/**
 * Task variable
 */
export interface TaskVariable {
    name: string;
    value: string | (() => string | Promise<string>);
    description?: string;
}
/**
 * Watch options
 */
export interface WatchOptions {
    include?: string[];
    exclude?: string[];
    debounce?: number;
    usePolling?: boolean;
    pollInterval?: number;
}
/**
 * Task provider
 */
export interface TaskProvider {
    type: string;
    provideTasks(): Promise<TaskDefinition[]>;
    resolveTask?(task: TaskDefinition): Promise<TaskDefinition | undefined>;
}
export interface TaskStartedEvent {
    execution: TaskExecution;
}
export interface TaskEndedEvent {
    execution: TaskExecution;
    success: boolean;
}
export interface TaskOutputEvent {
    executionId: string;
    output: string;
    isError?: boolean;
}
export interface TaskProblemFoundEvent {
    executionId: string;
    problem: TaskProblem;
}
export interface TasksChangedEvent {
    tasks: TaskDefinition[];
}
export declare class TaskRunnerSystem {
    private readonly tasks;
    private readonly tasksByGroup;
    private readonly providers;
    private readonly executions;
    private executionIdCounter;
    private readonly problemMatchers;
    private readonly variables;
    private readonly recentTasks;
    private readonly maxRecent;
    private workspaceRoot;
    private readonly onStartedEmitter;
    readonly onStarted: Event<TaskStartedEvent>;
    private readonly onEndedEmitter;
    readonly onEnded: Event<TaskEndedEvent>;
    private readonly onOutputEmitter;
    readonly onOutput: Event<TaskOutputEvent>;
    private readonly onProblemFoundEmitter;
    readonly onProblemFound: Event<TaskProblemFoundEvent>;
    private readonly onTasksChangedEmitter;
    readonly onTasksChanged: Event<TasksChangedEvent>;
    constructor();
    /**
     * Initialize task runner
     */
    initialize(config: {
        workspaceRoot: string;
    }): Promise<void>;
    /**
     * Register builtin problem matchers
     */
    private registerBuiltinProblemMatchers;
    /**
     * Register problem matcher
     */
    registerProblemMatcher(matcher: ProblemMatcher): Disposable;
    /**
     * Register builtin variables
     */
    private registerBuiltinVariables;
    /**
     * Register variable
     */
    registerVariable(variable: TaskVariable): Disposable;
    /**
     * Register task
     */
    registerTask(task: TaskDefinition): void;
    /**
     * Unregister task
     */
    unregisterTask(taskId: string): boolean;
    /**
     * Get task by ID
     */
    getTask(taskId: string): TaskDefinition | undefined;
    /**
     * Get all tasks
     */
    getAllTasks(): TaskDefinition[];
    /**
     * Get tasks by group
     */
    getTasksByGroup(group: TaskGroup): TaskDefinition[];
    /**
     * Get default build task
     */
    getDefaultBuildTask(): TaskDefinition | undefined;
    /**
     * Get default test task
     */
    getDefaultTestTask(): TaskDefinition | undefined;
    /**
     * Get recent tasks
     */
    getRecentTasks(): TaskDefinition[];
    /**
     * Register task provider
     */
    registerProvider(provider: TaskProvider): Disposable;
    /**
     * Fetch tasks from provider
     */
    private fetchProviderTasks;
    /**
     * Run task
     */
    runTask(taskId: string): Promise<TaskExecution>;
    /**
     * Run dependencies
     */
    private runDependencies;
    /**
     * Find task by label
     */
    private findTaskByLabel;
    /**
     * Create execution
     */
    private createExecution;
    /**
     * Execute task
     */
    private executeTask;
    /**
     * Get problem matchers for task
     */
    private getMatchersForTask;
    /**
     * Parse output for problems
     */
    private parseProblems;
    /**
     * Parse severity
     */
    private parseSeverity;
    /**
     * Terminate task
     */
    terminateTask(executionId: string): Promise<void>;
    /**
     * Terminate all tasks
     */
    terminateAllTasks(): Promise<void>;
    /**
     * Get running executions
     */
    getRunningExecutions(): TaskExecution[];
    /**
     * Get execution
     */
    getExecution(executionId: string): TaskExecution | undefined;
    /**
     * Resolve variables in string
     */
    resolveVariables(value: string): Promise<string>;
    /**
     * Detect tasks
     */
    detectTasks(): Promise<void>;
    /**
     * Detect npm tasks
     */
    private detectNpmTasks;
    /**
     * Detect make tasks
     */
    private detectMakeTasks;
    /**
     * Detect gradle tasks
     */
    private detectGradleTasks;
    /**
     * Detect cargo tasks
     */
    private detectCargoTasks;
    /**
     * Detect python tasks
     */
    private detectPythonTasks;
    /**
     * Detect dotnet tasks
     */
    private detectDotnetTasks;
    /**
     * Load workspace tasks
     */
    private loadWorkspaceTasks;
    /**
     * Save workspace tasks
     */
    saveWorkspaceTasks(): Promise<void>;
    /**
     * Add to recent tasks
     */
    private addToRecent;
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default TaskRunnerSystem;
