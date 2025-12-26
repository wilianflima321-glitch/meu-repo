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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Task Types ====================

/**
 * Task type
 */
export enum TaskType {
    Shell = 'shell',
    Process = 'process',
    Composite = 'composite',
    Custom = 'custom'
}

/**
 * Task state
 */
export enum TaskState {
    Idle = 'idle',
    Running = 'running',
    Succeeded = 'succeeded',
    Failed = 'failed',
    Cancelled = 'cancelled'
}

/**
 * Task group
 */
export enum TaskGroup {
    Build = 'build',
    Test = 'test',
    Clean = 'clean',
    Rebuild = 'rebuild',
    Deploy = 'deploy',
    None = 'none'
}

/**
 * Task presentation
 */
export enum TaskPresentation {
    Always = 'always',
    Never = 'never',
    Silent = 'silent'
}

/**
 * Panel behavior
 */
export enum PanelBehavior {
    Shared = 'shared',
    Dedicated = 'dedicated',
    New = 'new'
}

/**
 * Problem matcher severity
 */
export enum ProblemSeverity {
    Error = 'error',
    Warning = 'warning',
    Info = 'info'
}

/**
 * Task source
 */
export enum TaskSource {
    Workspace = 'workspace',
    Folder = 'folder',
    Extension = 'extension',
    Auto = 'auto',
    User = 'user'
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
        beginsPattern?: string | { regexp: string };
        endsPattern?: string | { regexp: string };
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
    
    // Command
    command?: string;
    args?: string[];
    
    // Options
    options?: TaskOptions;
    
    // Presentation
    presentation?: TaskPresentationOptions;
    
    // Problem matching
    problemMatcher?: string | string[] | ProblemMatcher | ProblemMatcher[];
    
    // Group
    group?: TaskGroup | { kind: TaskGroup; isDefault?: boolean };
    
    // Dependencies
    dependsOn?: string | string[] | { task: string; type?: string }[];
    dependsOrder?: 'parallel' | 'sequence';
    
    // Run options
    runOptions?: RunOptions;
    
    // Detail
    detail?: string;
    
    // Source
    source?: TaskSource;
    
    // Scope
    scope?: 'global' | 'workspace' | 'folder';
    workspaceFolder?: string;
    
    // Icon
    icon?: { id: string; color?: string };
    
    // Hide
    hide?: boolean;
    
    // Custom data
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

// ==================== Events ====================

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

// ==================== Main Task Runner System ====================

@injectable()
export class TaskRunnerSystem {
    // Tasks
    private readonly tasks: Map<string, TaskDefinition> = new Map();
    private readonly tasksByGroup: Map<TaskGroup, Set<string>> = new Map();
    
    // Providers
    private readonly providers: Map<string, TaskProvider> = new Map();
    
    // Executions
    private readonly executions: Map<string, TaskExecution> = new Map();
    private executionIdCounter = 0;
    
    // Problem matchers
    private readonly problemMatchers: Map<string, ProblemMatcher> = new Map();
    
    // Variables
    private readonly variables: Map<string, TaskVariable> = new Map();
    
    // Recent tasks
    private readonly recentTasks: string[] = [];
    private readonly maxRecent: number = 10;
    
    // Workspace
    private workspaceRoot: string = '';
    
    // Events
    private readonly onStartedEmitter = new Emitter<TaskStartedEvent>();
    readonly onStarted: Event<TaskStartedEvent> = this.onStartedEmitter.event;
    
    private readonly onEndedEmitter = new Emitter<TaskEndedEvent>();
    readonly onEnded: Event<TaskEndedEvent> = this.onEndedEmitter.event;
    
    private readonly onOutputEmitter = new Emitter<TaskOutputEvent>();
    readonly onOutput: Event<TaskOutputEvent> = this.onOutputEmitter.event;
    
    private readonly onProblemFoundEmitter = new Emitter<TaskProblemFoundEvent>();
    readonly onProblemFound: Event<TaskProblemFoundEvent> = this.onProblemFoundEmitter.event;
    
    private readonly onTasksChangedEmitter = new Emitter<TasksChangedEvent>();
    readonly onTasksChanged: Event<TasksChangedEvent> = this.onTasksChangedEmitter.event;

    constructor() {
        this.registerBuiltinProblemMatchers();
        this.registerBuiltinVariables();
    }

    // ==================== Initialization ====================

    /**
     * Initialize task runner
     */
    async initialize(config: {
        workspaceRoot: string;
    }): Promise<void> {
        this.workspaceRoot = config.workspaceRoot;
        
        // Load workspace tasks
        await this.loadWorkspaceTasks();
        
        // Auto-detect tasks
        await this.detectTasks();
    }

    // ==================== Builtin Problem Matchers ====================

    /**
     * Register builtin problem matchers
     */
    private registerBuiltinProblemMatchers(): void {
        // TypeScript
        this.registerProblemMatcher({
            name: '$tsc',
            owner: 'typescript',
            source: 'ts',
            severity: ProblemSeverity.Error,
            fileLocation: 'relative',
            pattern: {
                regexp: "^(.*)\\((\\d+),(\\d+)\\):\\s+(error|warning|info)\\s+TS(\\d+):\\s+(.*)$",
                file: 1,
                line: 2,
                column: 3,
                severity: 4,
                code: 5,
                message: 6
            }
        });

        // ESLint
        this.registerProblemMatcher({
            name: '$eslint-compact',
            owner: 'eslint',
            source: 'eslint',
            fileLocation: 'absolute',
            pattern: {
                regexp: "^(.+):\\s+line\\s+(\\d+),\\s+col\\s+(\\d+),\\s+(Error|Warning|Info)\\s+-\\s+(.+)\\s+\\((.+)\\)$",
                file: 1,
                line: 2,
                column: 3,
                severity: 4,
                message: 5,
                code: 6
            }
        });

        // ESLint stylish
        this.registerProblemMatcher({
            name: '$eslint-stylish',
            owner: 'eslint',
            source: 'eslint',
            fileLocation: 'absolute',
            pattern: [
                {
                    regexp: "^([^\\s].*)$",
                    file: 1
                },
                {
                    regexp: "^\\s+(\\d+):(\\d+)\\s+(error|warning|info)\\s+(.+?)\\s+(.+)$",
                    line: 1,
                    column: 2,
                    severity: 3,
                    message: 4,
                    code: 5,
                    loop: true
                }
            ]
        });

        // GCC
        this.registerProblemMatcher({
            name: '$gcc',
            owner: 'gcc',
            source: 'gcc',
            fileLocation: 'relative',
            pattern: {
                regexp: "^(.*):(\\d+):(\\d+):\\s+(warning|error|note):\\s+(.*)$",
                file: 1,
                line: 2,
                column: 3,
                severity: 4,
                message: 5
            }
        });

        // MSBuild / C#
        this.registerProblemMatcher({
            name: '$mscompile',
            owner: 'mscompile',
            source: 'csc',
            fileLocation: 'absolute',
            pattern: {
                regexp: "^(.*)\\((\\d+),(\\d+)\\):\\s+(error|warning)\\s+(\\w+):\\s+(.*)$",
                file: 1,
                line: 2,
                column: 3,
                severity: 4,
                code: 5,
                message: 6
            }
        });

        // Python
        this.registerProblemMatcher({
            name: '$python',
            owner: 'python',
            source: 'python',
            fileLocation: 'absolute',
            pattern: {
                regexp: '^\\s*File\\s+"(.*)",\\s+line\\s+(\\d+)',
                file: 1,
                line: 2,
                message: 0
            }
        });

        // Go
        this.registerProblemMatcher({
            name: '$go',
            owner: 'go',
            source: 'go',
            fileLocation: 'relative',
            pattern: {
                regexp: "^(.*):(\\d+):(\\d+)?:\\s+(.*)$",
                file: 1,
                line: 2,
                column: 3,
                message: 4
            }
        });

        // Rust (cargo)
        this.registerProblemMatcher({
            name: '$rustc',
            owner: 'rustc',
            source: 'rustc',
            fileLocation: 'relative',
            pattern: {
                regexp: "^(error|warning)(?:\\[(\\w+)\\])?:\\s+(.*)$",
                severity: 1,
                code: 2,
                message: 3
            }
        });

        // Jest
        this.registerProblemMatcher({
            name: '$jest',
            owner: 'jest',
            source: 'jest',
            fileLocation: 'absolute',
            pattern: {
                regexp: "^\\s+at\\s+.+\\((.+):(\\d+):(\\d+)\\)$",
                file: 1,
                line: 2,
                column: 3,
                message: 0
            }
        });

        // Node.js
        this.registerProblemMatcher({
            name: '$node',
            owner: 'node',
            source: 'node',
            fileLocation: 'absolute',
            pattern: {
                regexp: "^(.+):(\\d+)$",
                file: 1,
                line: 2,
                message: 0
            }
        });
    }

    /**
     * Register problem matcher
     */
    registerProblemMatcher(matcher: ProblemMatcher): Disposable {
        const name = matcher.name || matcher.owner;
        this.problemMatchers.set(name, matcher);
        return {
            dispose: () => this.problemMatchers.delete(name)
        };
    }

    // ==================== Builtin Variables ====================

    /**
     * Register builtin variables
     */
    private registerBuiltinVariables(): void {
        // Workspace variables
        this.registerVariable({
            name: 'workspaceFolder',
            value: () => this.workspaceRoot,
            description: 'The path of the workspace folder'
        });

        this.registerVariable({
            name: 'workspaceFolderBasename',
            value: () => {
                const parts = this.workspaceRoot.split(/[\/\\]/);
                return parts[parts.length - 1] || '';
            },
            description: 'The name of the workspace folder'
        });

        this.registerVariable({
            name: 'cwd',
            value: () => this.workspaceRoot,
            description: 'Current working directory'
        });

        // File variables (would be populated from editor state)
        this.registerVariable({
            name: 'file',
            value: '',
            description: 'The current opened file'
        });

        this.registerVariable({
            name: 'fileBasename',
            value: '',
            description: 'The current opened file\'s basename'
        });

        this.registerVariable({
            name: 'fileBasenameNoExtension',
            value: '',
            description: 'The current opened file\'s basename without extension'
        });

        this.registerVariable({
            name: 'fileDirname',
            value: '',
            description: 'The current opened file\'s dirname'
        });

        this.registerVariable({
            name: 'fileExtname',
            value: '',
            description: 'The current opened file\'s extension'
        });

        this.registerVariable({
            name: 'relativeFile',
            value: '',
            description: 'The current opened file relative to workspaceFolder'
        });

        // Environment
        this.registerVariable({
            name: 'env',
            value: '',
            description: 'Environment variable (use as ${env:VAR_NAME})'
        });

        // Selection
        this.registerVariable({
            name: 'selectedText',
            value: '',
            description: 'The currently selected text in the active editor'
        });

        // Line/Column
        this.registerVariable({
            name: 'lineNumber',
            value: '',
            description: 'The current cursor line number'
        });

        this.registerVariable({
            name: 'columnNumber',
            value: '',
            description: 'The current cursor column number'
        });

        // Config
        this.registerVariable({
            name: 'config',
            value: '',
            description: 'Configuration value (use as ${config:setting.name})'
        });

        // Input
        this.registerVariable({
            name: 'input',
            value: '',
            description: 'User input (use as ${input:inputId})'
        });

        // Default build task
        this.registerVariable({
            name: 'defaultBuildTask',
            value: () => {
                for (const task of this.tasks.values()) {
                    const group = task.group;
                    if (typeof group === 'object' && group.kind === TaskGroup.Build && group.isDefault) {
                        return task.label;
                    }
                }
                return '';
            },
            description: 'The default build task'
        });
    }

    /**
     * Register variable
     */
    registerVariable(variable: TaskVariable): Disposable {
        this.variables.set(variable.name, variable);
        return {
            dispose: () => this.variables.delete(variable.name)
        };
    }

    // ==================== Task Management ====================

    /**
     * Register task
     */
    registerTask(task: TaskDefinition): void {
        this.tasks.set(task.id, task);
        
        // Index by group
        const group = typeof task.group === 'object' ? task.group.kind : (task.group || TaskGroup.None);
        let groupTasks = this.tasksByGroup.get(group);
        if (!groupTasks) {
            groupTasks = new Set();
            this.tasksByGroup.set(group, groupTasks);
        }
        groupTasks.add(task.id);
        
        this.onTasksChangedEmitter.fire({ tasks: this.getAllTasks() });
    }

    /**
     * Unregister task
     */
    unregisterTask(taskId: string): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;
        
        // Remove from group index
        const group = typeof task.group === 'object' ? task.group.kind : (task.group || TaskGroup.None);
        this.tasksByGroup.get(group)?.delete(taskId);
        
        const result = this.tasks.delete(taskId);
        
        if (result) {
            this.onTasksChangedEmitter.fire({ tasks: this.getAllTasks() });
        }
        
        return result;
    }

    /**
     * Get task by ID
     */
    getTask(taskId: string): TaskDefinition | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * Get all tasks
     */
    getAllTasks(): TaskDefinition[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Get tasks by group
     */
    getTasksByGroup(group: TaskGroup): TaskDefinition[] {
        const taskIds = this.tasksByGroup.get(group);
        if (!taskIds) return [];
        
        return Array.from(taskIds)
            .map(id => this.tasks.get(id))
            .filter((task): task is TaskDefinition => task !== undefined);
    }

    /**
     * Get default build task
     */
    getDefaultBuildTask(): TaskDefinition | undefined {
        for (const task of this.tasks.values()) {
            const group = task.group;
            if (typeof group === 'object' && group.kind === TaskGroup.Build && group.isDefault) {
                return task;
            }
        }
        return undefined;
    }

    /**
     * Get default test task
     */
    getDefaultTestTask(): TaskDefinition | undefined {
        for (const task of this.tasks.values()) {
            const group = task.group;
            if (typeof group === 'object' && group.kind === TaskGroup.Test && group.isDefault) {
                return task;
            }
        }
        return undefined;
    }

    /**
     * Get recent tasks
     */
    getRecentTasks(): TaskDefinition[] {
        return this.recentTasks
            .map(id => this.tasks.get(id))
            .filter((task): task is TaskDefinition => task !== undefined);
    }

    // ==================== Task Providers ====================

    /**
     * Register task provider
     */
    registerProvider(provider: TaskProvider): Disposable {
        this.providers.set(provider.type, provider);
        
        // Fetch tasks from provider
        this.fetchProviderTasks(provider);
        
        return {
            dispose: () => this.providers.delete(provider.type)
        };
    }

    /**
     * Fetch tasks from provider
     */
    private async fetchProviderTasks(provider: TaskProvider): Promise<void> {
        try {
            const tasks = await provider.provideTasks();
            for (const task of tasks) {
                task.source = TaskSource.Extension;
                this.registerTask(task);
            }
        } catch (error) {
            console.error(`Failed to fetch tasks from provider ${provider.type}:`, error);
        }
    }

    // ==================== Task Execution ====================

    /**
     * Run task
     */
    async runTask(taskId: string): Promise<TaskExecution> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        
        // Run dependencies first
        if (task.dependsOn) {
            await this.runDependencies(task);
        }
        
        // Create execution
        const execution = await this.createExecution(task);
        
        // Add to recent
        this.addToRecent(taskId);
        
        try {
            // Start execution
            await this.executeTask(execution);
        } catch (error) {
            execution.state = TaskState.Failed;
            execution.endTime = Date.now();
            
            this.onEndedEmitter.fire({ execution, success: false });
        }
        
        return execution;
    }

    /**
     * Run dependencies
     */
    private async runDependencies(task: TaskDefinition): Promise<void> {
        const deps = task.dependsOn;
        if (!deps) return;
        
        const depTasks: string[] = [];
        
        if (typeof deps === 'string') {
            depTasks.push(deps);
        } else if (Array.isArray(deps)) {
            for (const dep of deps) {
                if (typeof dep === 'string') {
                    depTasks.push(dep);
                } else {
                    depTasks.push(dep.task);
                }
            }
        }
        
        if (task.dependsOrder === 'sequence') {
            // Run sequentially
            for (const depId of depTasks) {
                const depTask = this.findTaskByLabel(depId);
                if (depTask) {
                    const execution = await this.runTask(depTask.id);
                    if (execution.state === TaskState.Failed) {
                        throw new Error(`Dependency task failed: ${depId}`);
                    }
                }
            }
        } else {
            // Run in parallel
            await Promise.all(
                depTasks.map(async depId => {
                    const depTask = this.findTaskByLabel(depId);
                    if (depTask) {
                        return this.runTask(depTask.id);
                    }
                })
            );
        }
    }

    /**
     * Find task by label
     */
    private findTaskByLabel(label: string): TaskDefinition | undefined {
        for (const task of this.tasks.values()) {
            if (task.label === label || task.id === label) {
                return task;
            }
        }
        return undefined;
    }

    /**
     * Create execution
     */
    private async createExecution(task: TaskDefinition): Promise<TaskExecution> {
        const executionId = `exec_${++this.executionIdCounter}`;
        
        const execution: TaskExecution = {
            id: executionId,
            task,
            state: TaskState.Running,
            startTime: Date.now(),
            output: [],
            errors: []
        };
        
        this.executions.set(executionId, execution);
        this.onStartedEmitter.fire({ execution });
        
        return execution;
    }

    /**
     * Execute task
     */
    private async executeTask(execution: TaskExecution): Promise<void> {
        const task = execution.task;
        
        if (task.type === TaskType.Composite) {
            // Composite task - run all dependsOn tasks
            // Already handled in runDependencies
            execution.state = TaskState.Succeeded;
            execution.endTime = Date.now();
            this.onEndedEmitter.fire({ execution, success: true });
            return;
        }
        
        // Resolve command with variables
        const command = await this.resolveVariables(task.command || '');
        const args = await Promise.all(
            (task.args || []).map(arg => this.resolveVariables(arg))
        );
        
        // Resolve working directory
        const cwd = task.options?.cwd 
            ? await this.resolveVariables(task.options.cwd)
            : this.workspaceRoot;
        
        // Environment
        const env = { ...process.env, ...task.options?.env };
        
        // Get problem matchers
        const matchers = this.getMatchersForTask(task);
        
        // Execute
        // TODO: Implement actual process execution
        // This would use child_process.spawn or similar
        
        console.log(`Executing task: ${command} ${args.join(' ')}`);
        console.log(`CWD: ${cwd}`);

        // real-or-fail: execução real de processos ainda não implementada.
        // Não marcamos sucesso sem executar de fato.
        execution.state = TaskState.Failed;
        execution.endTime = Date.now();
        execution.exitCode = 127;
        execution.errors.push({
            severity: ProblemSeverity.Error,
            message: 'NOT_IMPLEMENTED: TaskRunnerSystem não executa processos ainda (spawn/pty).'
        });
        this.onEndedEmitter.fire({ execution, success: false });
        throw new Error('NOT_IMPLEMENTED: TaskRunnerSystem não executa processos ainda (spawn/pty).');
    }

    /**
     * Get problem matchers for task
     */
    private getMatchersForTask(task: TaskDefinition): ProblemMatcher[] {
        const result: ProblemMatcher[] = [];
        
        if (!task.problemMatcher) return result;
        
        const matchers = Array.isArray(task.problemMatcher) 
            ? task.problemMatcher 
            : [task.problemMatcher];
        
        for (const matcher of matchers) {
            if (typeof matcher === 'string') {
                const name = matcher.startsWith('$') ? matcher : `$${matcher}`;
                const registered = this.problemMatchers.get(name) || this.problemMatchers.get(matcher);
                if (registered) {
                    result.push(registered);
                }
            } else {
                result.push(matcher);
            }
        }
        
        return result;
    }

    /**
     * Parse output for problems
     */
    private parseProblems(output: string, matchers: ProblemMatcher[], executionId: string): void {
        for (const matcher of matchers) {
            const patterns = Array.isArray(matcher.pattern) ? matcher.pattern : [matcher.pattern];
            
            for (const pattern of patterns) {
                const regex = new RegExp(pattern.regexp, 'gm');
                let match;
                
                while ((match = regex.exec(output)) !== null) {
                    const problem: TaskProblem = {
                        severity: this.parseSeverity(match[pattern.severity || 0], matcher.severity),
                        message: pattern.message !== undefined ? (match[pattern.message] || '') : '',
                        source: matcher.source,
                        code: pattern.code ? match[pattern.code] : undefined,
                        file: pattern.file ? match[pattern.file] : undefined,
                        line: pattern.line ? parseInt(match[pattern.line], 10) : undefined,
                        column: pattern.column ? parseInt(match[pattern.column], 10) : undefined,
                        endLine: pattern.endLine ? parseInt(match[pattern.endLine], 10) : undefined,
                        endColumn: pattern.endColumn ? parseInt(match[pattern.endColumn], 10) : undefined
                    };
                    
                    const execution = this.executions.get(executionId);
                    if (execution) {
                        execution.errors.push(problem);
                    }
                    
                    this.onProblemFoundEmitter.fire({ executionId, problem });
                }
            }
        }
    }

    /**
     * Parse severity
     */
    private parseSeverity(value: string | undefined, defaultSeverity?: ProblemSeverity): ProblemSeverity {
        if (!value) return defaultSeverity || ProblemSeverity.Error;
        
        const lower = value.toLowerCase();
        if (lower === 'error' || lower === 'e') return ProblemSeverity.Error;
        if (lower === 'warning' || lower === 'warn' || lower === 'w') return ProblemSeverity.Warning;
        if (lower === 'info' || lower === 'information' || lower === 'i' || lower === 'note') return ProblemSeverity.Info;
        
        return defaultSeverity || ProblemSeverity.Error;
    }

    /**
     * Terminate task
     */
    async terminateTask(executionId: string): Promise<void> {
        const execution = this.executions.get(executionId);
        if (!execution || execution.state !== TaskState.Running) return;
        
        // TODO: Actually kill the process
        
        execution.state = TaskState.Cancelled;
        execution.endTime = Date.now();
        
        this.onEndedEmitter.fire({ execution, success: false });
    }

    /**
     * Terminate all tasks
     */
    async terminateAllTasks(): Promise<void> {
        for (const executionId of this.executions.keys()) {
            await this.terminateTask(executionId);
        }
    }

    /**
     * Get running executions
     */
    getRunningExecutions(): TaskExecution[] {
        return Array.from(this.executions.values())
            .filter(e => e.state === TaskState.Running);
    }

    /**
     * Get execution
     */
    getExecution(executionId: string): TaskExecution | undefined {
        return this.executions.get(executionId);
    }

    // ==================== Variable Resolution ====================

    /**
     * Resolve variables in string
     */
    async resolveVariables(value: string): Promise<string> {
        let result = value;
        
        // Match ${variableName} or ${variableName:arg}
        const regex = /\$\{([^}:]+)(?::([^}]+))?\}/g;
        let match;
        
        while ((match = regex.exec(value)) !== null) {
            const varName = match[1];
            const arg = match[2];
            
            let resolved = '';
            
            // Check registered variables
            const variable = this.variables.get(varName);
            if (variable) {
                const varValue = typeof variable.value === 'function' 
                    ? await variable.value() 
                    : variable.value;
                resolved = varValue;
            }
            // Handle special cases
            else if (varName === 'env' && arg) {
                resolved = process.env[arg] || '';
            }
            else if (varName === 'config' && arg) {
                // TODO: Get from configuration service
                resolved = '';
            }
            else if (varName === 'input' && arg) {
                // TODO: Show input dialog
                resolved = '';
            }
            
            result = result.replace(match[0], resolved);
        }
        
        return result;
    }

    // ==================== Auto-detection ====================

    /**
     * Detect tasks
     */
    async detectTasks(): Promise<void> {
        // Detect npm tasks
        await this.detectNpmTasks();
        
        // Detect make tasks
        await this.detectMakeTasks();
        
        // Detect gradle tasks
        await this.detectGradleTasks();
        
        // Detect cargo tasks
        await this.detectCargoTasks();
        
        // Detect python tasks
        await this.detectPythonTasks();
        
        // Detect dotnet tasks
        await this.detectDotnetTasks();
    }

    /**
     * Detect npm tasks
     */
    private async detectNpmTasks(): Promise<void> {
        // TODO: Read package.json and create tasks for scripts
        const commonScripts = ['build', 'test', 'start', 'dev', 'lint', 'format'];
        
        for (const script of commonScripts) {
            const task: TaskDefinition = {
                id: `npm:${script}`,
                label: `npm: ${script}`,
                type: TaskType.Shell,
                command: 'npm',
                args: ['run', script],
                source: TaskSource.Auto,
                problemMatcher: ['$eslint-stylish', '$tsc'],
                group: script === 'build' 
                    ? { kind: TaskGroup.Build, isDefault: true }
                    : script === 'test'
                    ? { kind: TaskGroup.Test, isDefault: true }
                    : TaskGroup.None
            };
            
            this.registerTask(task);
        }
    }

    /**
     * Detect make tasks
     */
    private async detectMakeTasks(): Promise<void> {
        // TODO: Parse Makefile for targets
    }

    /**
     * Detect gradle tasks
     */
    private async detectGradleTasks(): Promise<void> {
        // TODO: Run gradle tasks --all
    }

    /**
     * Detect cargo tasks
     */
    private async detectCargoTasks(): Promise<void> {
        const cargoTasks = ['build', 'test', 'run', 'check', 'clippy'];
        
        for (const cmd of cargoTasks) {
            const task: TaskDefinition = {
                id: `cargo:${cmd}`,
                label: `cargo ${cmd}`,
                type: TaskType.Shell,
                command: 'cargo',
                args: [cmd],
                source: TaskSource.Auto,
                problemMatcher: '$rustc',
                group: cmd === 'build'
                    ? { kind: TaskGroup.Build, isDefault: false }
                    : cmd === 'test'
                    ? { kind: TaskGroup.Test, isDefault: false }
                    : TaskGroup.None
            };
            
            this.registerTask(task);
        }
    }

    /**
     * Detect python tasks
     */
    private async detectPythonTasks(): Promise<void> {
        // TODO: Detect pytest, unittest, etc.
    }

    /**
     * Detect dotnet tasks
     */
    private async detectDotnetTasks(): Promise<void> {
        const dotnetTasks = ['build', 'test', 'run', 'publish', 'clean'];
        
        for (const cmd of dotnetTasks) {
            const task: TaskDefinition = {
                id: `dotnet:${cmd}`,
                label: `dotnet ${cmd}`,
                type: TaskType.Shell,
                command: 'dotnet',
                args: [cmd],
                source: TaskSource.Auto,
                problemMatcher: '$mscompile',
                group: cmd === 'build'
                    ? { kind: TaskGroup.Build, isDefault: false }
                    : cmd === 'test'
                    ? { kind: TaskGroup.Test, isDefault: false }
                    : cmd === 'clean'
                    ? { kind: TaskGroup.Clean, isDefault: false }
                    : TaskGroup.None
            };
            
            this.registerTask(task);
        }
    }

    // ==================== Workspace Tasks ====================

    /**
     * Load workspace tasks
     */
    private async loadWorkspaceTasks(): Promise<void> {
        // TODO: Load from .vscode/tasks.json or similar
    }

    /**
     * Save workspace tasks
     */
    async saveWorkspaceTasks(): Promise<void> {
        const workspaceTasks = Array.from(this.tasks.values())
            .filter(t => t.source === TaskSource.Workspace);
        
        // TODO: Save to .vscode/tasks.json
    }

    // ==================== Helpers ====================

    /**
     * Add to recent tasks
     */
    private addToRecent(taskId: string): void {
        const index = this.recentTasks.indexOf(taskId);
        if (index !== -1) {
            this.recentTasks.splice(index, 1);
        }
        this.recentTasks.unshift(taskId);
        
        if (this.recentTasks.length > this.maxRecent) {
            this.recentTasks.pop();
        }
    }

    /**
     * Dispose
     */
    dispose(): void {
        // Terminate all running tasks
        this.terminateAllTasks();
        
        this.tasks.clear();
        this.tasksByGroup.clear();
        this.providers.clear();
        this.executions.clear();
        this.problemMatchers.clear();
        this.variables.clear();
        
        this.onStartedEmitter.dispose();
        this.onEndedEmitter.dispose();
        this.onOutputEmitter.dispose();
        this.onProblemFoundEmitter.dispose();
        this.onTasksChangedEmitter.dispose();
    }
}

// ==================== Interfaces ====================

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default TaskRunnerSystem;
