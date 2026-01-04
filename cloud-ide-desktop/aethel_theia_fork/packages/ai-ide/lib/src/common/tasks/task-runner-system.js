"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRunnerSystem = exports.TaskSource = exports.ProblemSeverity = exports.PanelBehavior = exports.TaskPresentation = exports.TaskGroup = exports.TaskState = exports.TaskType = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Task Types ====================
/**
 * Task type
 */
var TaskType;
(function (TaskType) {
    TaskType["Shell"] = "shell";
    TaskType["Process"] = "process";
    TaskType["Composite"] = "composite";
    TaskType["Custom"] = "custom";
})(TaskType || (exports.TaskType = TaskType = {}));
/**
 * Task state
 */
var TaskState;
(function (TaskState) {
    TaskState["Idle"] = "idle";
    TaskState["Running"] = "running";
    TaskState["Succeeded"] = "succeeded";
    TaskState["Failed"] = "failed";
    TaskState["Cancelled"] = "cancelled";
})(TaskState || (exports.TaskState = TaskState = {}));
/**
 * Task group
 */
var TaskGroup;
(function (TaskGroup) {
    TaskGroup["Build"] = "build";
    TaskGroup["Test"] = "test";
    TaskGroup["Clean"] = "clean";
    TaskGroup["Rebuild"] = "rebuild";
    TaskGroup["Deploy"] = "deploy";
    TaskGroup["None"] = "none";
})(TaskGroup || (exports.TaskGroup = TaskGroup = {}));
/**
 * Task presentation
 */
var TaskPresentation;
(function (TaskPresentation) {
    TaskPresentation["Always"] = "always";
    TaskPresentation["Never"] = "never";
    TaskPresentation["Silent"] = "silent";
})(TaskPresentation || (exports.TaskPresentation = TaskPresentation = {}));
/**
 * Panel behavior
 */
var PanelBehavior;
(function (PanelBehavior) {
    PanelBehavior["Shared"] = "shared";
    PanelBehavior["Dedicated"] = "dedicated";
    PanelBehavior["New"] = "new";
})(PanelBehavior || (exports.PanelBehavior = PanelBehavior = {}));
/**
 * Problem matcher severity
 */
var ProblemSeverity;
(function (ProblemSeverity) {
    ProblemSeverity["Error"] = "error";
    ProblemSeverity["Warning"] = "warning";
    ProblemSeverity["Info"] = "info";
})(ProblemSeverity || (exports.ProblemSeverity = ProblemSeverity = {}));
/**
 * Task source
 */
var TaskSource;
(function (TaskSource) {
    TaskSource["Workspace"] = "workspace";
    TaskSource["Folder"] = "folder";
    TaskSource["Extension"] = "extension";
    TaskSource["Auto"] = "auto";
    TaskSource["User"] = "user";
})(TaskSource || (exports.TaskSource = TaskSource = {}));
// ==================== Main Task Runner System ====================
let TaskRunnerSystem = class TaskRunnerSystem {
    constructor() {
        // Tasks
        this.tasks = new Map();
        this.tasksByGroup = new Map();
        // Providers
        this.providers = new Map();
        // Executions
        this.executions = new Map();
        this.executionIdCounter = 0;
        // Problem matchers
        this.problemMatchers = new Map();
        // Variables
        this.variables = new Map();
        // Recent tasks
        this.recentTasks = [];
        this.maxRecent = 10;
        // Workspace
        this.workspaceRoot = '';
        // Events
        this.onStartedEmitter = new Emitter();
        this.onStarted = this.onStartedEmitter.event;
        this.onEndedEmitter = new Emitter();
        this.onEnded = this.onEndedEmitter.event;
        this.onOutputEmitter = new Emitter();
        this.onOutput = this.onOutputEmitter.event;
        this.onProblemFoundEmitter = new Emitter();
        this.onProblemFound = this.onProblemFoundEmitter.event;
        this.onTasksChangedEmitter = new Emitter();
        this.onTasksChanged = this.onTasksChangedEmitter.event;
        this.registerBuiltinProblemMatchers();
        this.registerBuiltinVariables();
    }
    // ==================== Initialization ====================
    /**
     * Initialize task runner
     */
    async initialize(config) {
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
    registerBuiltinProblemMatchers() {
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
    registerProblemMatcher(matcher) {
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
    registerBuiltinVariables() {
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
    registerVariable(variable) {
        this.variables.set(variable.name, variable);
        return {
            dispose: () => this.variables.delete(variable.name)
        };
    }
    // ==================== Task Management ====================
    /**
     * Register task
     */
    registerTask(task) {
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
    unregisterTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
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
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * Get tasks by group
     */
    getTasksByGroup(group) {
        const taskIds = this.tasksByGroup.get(group);
        if (!taskIds)
            return [];
        return Array.from(taskIds)
            .map(id => this.tasks.get(id))
            .filter((task) => task !== undefined);
    }
    /**
     * Get default build task
     */
    getDefaultBuildTask() {
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
    getDefaultTestTask() {
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
    getRecentTasks() {
        return this.recentTasks
            .map(id => this.tasks.get(id))
            .filter((task) => task !== undefined);
    }
    // ==================== Task Providers ====================
    /**
     * Register task provider
     */
    registerProvider(provider) {
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
    async fetchProviderTasks(provider) {
        try {
            const tasks = await provider.provideTasks();
            for (const task of tasks) {
                task.source = TaskSource.Extension;
                this.registerTask(task);
            }
        }
        catch (error) {
            console.error(`Failed to fetch tasks from provider ${provider.type}:`, error);
        }
    }
    // ==================== Task Execution ====================
    /**
     * Run task
     */
    async runTask(taskId) {
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
        }
        catch (error) {
            execution.state = TaskState.Failed;
            execution.endTime = Date.now();
            this.onEndedEmitter.fire({ execution, success: false });
        }
        return execution;
    }
    /**
     * Run dependencies
     */
    async runDependencies(task) {
        const deps = task.dependsOn;
        if (!deps)
            return;
        const depTasks = [];
        if (typeof deps === 'string') {
            depTasks.push(deps);
        }
        else if (Array.isArray(deps)) {
            for (const dep of deps) {
                if (typeof dep === 'string') {
                    depTasks.push(dep);
                }
                else {
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
        }
        else {
            // Run in parallel
            await Promise.all(depTasks.map(async (depId) => {
                const depTask = this.findTaskByLabel(depId);
                if (depTask) {
                    return this.runTask(depTask.id);
                }
            }));
        }
    }
    /**
     * Find task by label
     */
    findTaskByLabel(label) {
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
    async createExecution(task) {
        const executionId = `exec_${++this.executionIdCounter}`;
        const execution = {
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
    async executeTask(execution) {
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
        const args = await Promise.all((task.args || []).map(arg => this.resolveVariables(arg)));
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
    getMatchersForTask(task) {
        const result = [];
        if (!task.problemMatcher)
            return result;
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
            }
            else {
                result.push(matcher);
            }
        }
        return result;
    }
    /**
     * Parse output for problems
     */
    parseProblems(output, matchers, executionId) {
        for (const matcher of matchers) {
            const patterns = Array.isArray(matcher.pattern) ? matcher.pattern : [matcher.pattern];
            for (const pattern of patterns) {
                const regex = new RegExp(pattern.regexp, 'gm');
                let match;
                while ((match = regex.exec(output)) !== null) {
                    const problem = {
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
    parseSeverity(value, defaultSeverity) {
        if (!value)
            return defaultSeverity || ProblemSeverity.Error;
        const lower = value.toLowerCase();
        if (lower === 'error' || lower === 'e')
            return ProblemSeverity.Error;
        if (lower === 'warning' || lower === 'warn' || lower === 'w')
            return ProblemSeverity.Warning;
        if (lower === 'info' || lower === 'information' || lower === 'i' || lower === 'note')
            return ProblemSeverity.Info;
        return defaultSeverity || ProblemSeverity.Error;
    }
    /**
     * Terminate task
     */
    async terminateTask(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution || execution.state !== TaskState.Running)
            return;
        // TODO: Actually kill the process
        execution.state = TaskState.Cancelled;
        execution.endTime = Date.now();
        this.onEndedEmitter.fire({ execution, success: false });
    }
    /**
     * Terminate all tasks
     */
    async terminateAllTasks() {
        for (const executionId of this.executions.keys()) {
            await this.terminateTask(executionId);
        }
    }
    /**
     * Get running executions
     */
    getRunningExecutions() {
        return Array.from(this.executions.values())
            .filter(e => e.state === TaskState.Running);
    }
    /**
     * Get execution
     */
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    // ==================== Variable Resolution ====================
    /**
     * Resolve variables in string
     */
    async resolveVariables(value) {
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
    async detectTasks() {
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
    async detectNpmTasks() {
        // TODO: Read package.json and create tasks for scripts
        const commonScripts = ['build', 'test', 'start', 'dev', 'lint', 'format'];
        for (const script of commonScripts) {
            const task = {
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
    async detectMakeTasks() {
        // TODO: Parse Makefile for targets
    }
    /**
     * Detect gradle tasks
     */
    async detectGradleTasks() {
        // TODO: Run gradle tasks --all
    }
    /**
     * Detect cargo tasks
     */
    async detectCargoTasks() {
        const cargoTasks = ['build', 'test', 'run', 'check', 'clippy'];
        for (const cmd of cargoTasks) {
            const task = {
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
    async detectPythonTasks() {
        // TODO: Detect pytest, unittest, etc.
    }
    /**
     * Detect dotnet tasks
     */
    async detectDotnetTasks() {
        const dotnetTasks = ['build', 'test', 'run', 'publish', 'clean'];
        for (const cmd of dotnetTasks) {
            const task = {
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
    async loadWorkspaceTasks() {
        // TODO: Load from .vscode/tasks.json or similar
    }
    /**
     * Save workspace tasks
     */
    async saveWorkspaceTasks() {
        const workspaceTasks = Array.from(this.tasks.values())
            .filter(t => t.source === TaskSource.Workspace);
        // TODO: Save to .vscode/tasks.json
    }
    // ==================== Helpers ====================
    /**
     * Add to recent tasks
     */
    addToRecent(taskId) {
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
    dispose() {
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
};
exports.TaskRunnerSystem = TaskRunnerSystem;
exports.TaskRunnerSystem = TaskRunnerSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], TaskRunnerSystem);
// ==================== Export ====================
exports.default = TaskRunnerSystem;
