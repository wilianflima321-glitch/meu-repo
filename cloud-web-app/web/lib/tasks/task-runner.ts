/**
 * Aethel Task Runner System
 * 
 * Sistema de execução de tasks configuráveis com
 * watch mode, dependências e múltiplos runners.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskDefinition {
  label: string;
  type: 'shell' | 'process' | 'npm' | 'custom';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  group?: 'build' | 'test' | 'clean' | 'deploy' | 'none';
  isDefault?: boolean;
  dependsOn?: string[];
  problemMatcher?: string | string[];
  presentation?: TaskPresentation;
  options?: TaskOptions;
  runOptions?: TaskRunOptions;
}

export interface TaskPresentation {
  reveal: 'always' | 'silent' | 'never';
  echo: boolean;
  focus: boolean;
  panel: 'shared' | 'dedicated' | 'new';
  showReuseMessage: boolean;
  clear: boolean;
  close: boolean;
}

export interface TaskOptions {
  shell?: {
    executable?: string;
    args?: string[];
  };
  cwd?: string;
  env?: Record<string, string>;
}

export interface TaskRunOptions {
  reevaluateOnRerun?: boolean;
  runOn?: 'default' | 'folderOpen';
  instanceLimit?: number;
}

export interface TaskExecution {
  id: string;
  task: TaskDefinition;
  startTime: number;
  endTime?: number;
  exitCode?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  output: string[];
  pid?: number;
}

export interface TasksConfig {
  version: string;
  tasks: TaskDefinition[];
  inputs?: TaskInput[];
}

export interface TaskInput {
  id: string;
  type: 'pickString' | 'promptString' | 'command';
  description: string;
  default?: string;
  options?: string[];
  command?: string;
}

export interface ProblemMatch {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  source?: string;
}

// ============================================================================
// PROBLEM MATCHERS
// ============================================================================

export const PROBLEM_MATCHERS: Record<string, RegExp> = {
  '$tsc': /^(.+)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/,
  '$eslint-stylish': /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/,
  '$gcc': /^(.+):(\d+):(\d+): (error|warning): (.+)$/,
  '$node': /^(.+):(\d+)\s*$/,
  '$go': /^(.+):(\d+):(\d+): (.+)$/,
  '$python': /^\s+File "(.+)", line (\d+)/,
  '$rust': /^error(\[E\d+\])?: (.+)\n\s*--> (.+):(\d+):(\d+)/,
};

// ============================================================================
// TASK RUNNER
// ============================================================================

export class TaskRunner extends EventEmitter {
  private tasks: Map<string, TaskDefinition> = new Map();
  private executions: Map<string, TaskExecution> = new Map();
  private defaultTasks: Map<string, string> = new Map();
  private workspaceRoot: string;
  private abortControllers: Map<string, AbortController> = new Map();
  
  constructor(workspaceRoot: string) {
    super();
    this.workspaceRoot = workspaceRoot;
  }
  
  // ==========================================================================
  // TASK MANAGEMENT
  // ==========================================================================
  
  async loadTasks(config: TasksConfig): Promise<void> {
    this.tasks.clear();
    this.defaultTasks.clear();
    
    for (const task of config.tasks) {
      this.tasks.set(task.label, task);
      
      if (task.isDefault && task.group) {
        this.defaultTasks.set(task.group, task.label);
      }
    }
    
    this.emit('tasksLoaded', config.tasks);
  }
  
  getTask(label: string): TaskDefinition | undefined {
    return this.tasks.get(label);
  }
  
  getAllTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }
  
  getTasksByGroup(group: string): TaskDefinition[] {
    return this.getAllTasks().filter(t => t.group === group);
  }
  
  getDefaultTask(group: string): TaskDefinition | undefined {
    const label = this.defaultTasks.get(group);
    return label ? this.tasks.get(label) : undefined;
  }
  
  // ==========================================================================
  // TASK EXECUTION
  // ==========================================================================
  
  async runTask(label: string, variables?: Record<string, string>): Promise<TaskExecution> {
    const task = this.tasks.get(label);
    if (!task) {
      throw new Error(`Task "${label}" not found`);
    }
    
    // Run dependencies first
    if (task.dependsOn && task.dependsOn.length > 0) {
      for (const dep of task.dependsOn) {
        await this.runTask(dep, variables);
      }
    }
    
    return this.executeTask(task, variables);
  }
  
  async runBuildTask(): Promise<TaskExecution | undefined> {
    const task = this.getDefaultTask('build');
    if (task) {
      return this.runTask(task.label);
    }
    
    // Try to find any build task
    const buildTasks = this.getTasksByGroup('build');
    if (buildTasks.length > 0) {
      return this.runTask(buildTasks[0].label);
    }
    
    return undefined;
  }
  
  async runTestTask(): Promise<TaskExecution | undefined> {
    const task = this.getDefaultTask('test');
    if (task) {
      return this.runTask(task.label);
    }
    
    const testTasks = this.getTasksByGroup('test');
    if (testTasks.length > 0) {
      return this.runTask(testTasks[0].label);
    }
    
    return undefined;
  }
  
  private async executeTask(task: TaskDefinition, variables?: Record<string, string>): Promise<TaskExecution> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const execution: TaskExecution = {
      id,
      task,
      startTime: Date.now(),
      status: 'running',
      output: [],
    };
    
    this.executions.set(id, execution);
    this.emit('taskStarted', execution);
    
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);
    
    try {
      // Resolve variables in command
      let command = this.resolveVariables(task.command, variables);
      let args = task.args?.map(arg => this.resolveVariables(arg, variables)) || [];
      
      // Execute task based on type
      let exitCode: number;
      
      switch (task.type) {
        case 'npm':
          exitCode = await this.executeNpm(command, args, task, execution, abortController.signal);
          break;
        case 'process':
          exitCode = await this.executeProcess(command, args, task, execution, abortController.signal);
          break;
        case 'shell':
        default:
          exitCode = await this.executeShell(command, args, task, execution, abortController.signal);
          break;
      }
      
      execution.exitCode = exitCode;
      execution.status = exitCode === 0 ? 'completed' : 'failed';
      execution.endTime = Date.now();
      
      // Parse problems from output
      if (task.problemMatcher) {
        const problems = this.parseProblems(execution.output.join('\n'), task.problemMatcher);
        if (problems.length > 0) {
          this.emit('problemsFound', { executionId: id, problems });
        }
      }
      
      this.emit('taskCompleted', execution);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        execution.status = 'cancelled';
        this.emit('taskCancelled', execution);
      } else {
        execution.status = 'failed';
        execution.output.push(`Error: ${error.message}`);
        this.emit('taskFailed', { execution, error });
      }
      execution.endTime = Date.now();
    } finally {
      this.abortControllers.delete(id);
    }
    
    return execution;
  }
  
  private async executeShell(
    command: string,
    args: string[],
    task: TaskDefinition,
    execution: TaskExecution,
    signal: AbortSignal
  ): Promise<number> {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    
    const response = await fetch('/api/terminal/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: fullCommand,
        cwd: task.cwd || task.options?.cwd || this.workspaceRoot,
        env: { ...task.env, ...task.options?.env },
        shell: task.options?.shell,
      }),
      signal,
    });
    
    if (!response.ok) {
      throw new Error('Task execution failed');
    }
    
    const result = await response.json();
    execution.output.push(...(result.output || '').split('\n'));
    execution.pid = result.pid;
    
    return result.exitCode;
  }
  
  private async executeProcess(
    command: string,
    args: string[],
    task: TaskDefinition,
    execution: TaskExecution,
    signal: AbortSignal
  ): Promise<number> {
    // Same as shell but without shell wrapper
    return this.executeShell(command, args, task, execution, signal);
  }
  
  private async executeNpm(
    script: string,
    args: string[],
    task: TaskDefinition,
    execution: TaskExecution,
    signal: AbortSignal
  ): Promise<number> {
    const command = 'npm';
    const fullArgs = ['run', script, ...args];
    return this.executeShell(command, fullArgs, task, execution, signal);
  }
  
  // ==========================================================================
  // TASK CONTROL
  // ==========================================================================
  
  async cancelTask(executionId: string): Promise<void> {
    const controller = this.abortControllers.get(executionId);
    if (controller) {
      controller.abort();
    }
    
    // Also send kill signal to server
    await fetch('/api/terminal/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionId }),
    });
  }
  
  async restartTask(executionId: string): Promise<TaskExecution | undefined> {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;
    
    await this.cancelTask(executionId);
    return this.runTask(execution.task.label);
  }
  
  // ==========================================================================
  // EXECUTIONS
  // ==========================================================================
  
  getExecution(id: string): TaskExecution | undefined {
    return this.executions.get(id);
  }
  
  getRunningExecutions(): TaskExecution[] {
    return Array.from(this.executions.values()).filter(e => e.status === 'running');
  }
  
  getAllExecutions(): TaskExecution[] {
    return Array.from(this.executions.values());
  }
  
  clearExecutions(): void {
    this.executions.clear();
    this.emit('executionsCleared');
  }
  
  // ==========================================================================
  // PROBLEM PARSING
  // ==========================================================================
  
  private parseProblems(output: string, matchers: string | string[]): ProblemMatch[] {
    const matcherNames = Array.isArray(matchers) ? matchers : [matchers];
    const problems: ProblemMatch[] = [];
    
    for (const matcherName of matcherNames) {
      const pattern = PROBLEM_MATCHERS[matcherName];
      if (!pattern) continue;
      
      const lines = output.split('\n');
      
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          problems.push(this.extractProblemFromMatch(matcherName, match));
        }
      }
    }
    
    return problems;
  }
  
  private extractProblemFromMatch(matcherName: string, match: RegExpMatchArray): ProblemMatch {
    // Different extractors for different matchers
    switch (matcherName) {
      case '$tsc':
        return {
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          severity: match[4] as 'error' | 'warning',
          code: match[5],
          message: match[6],
        };
      
      case '$eslint-stylish':
        return {
          file: '', // eslint outputs file before the line
          line: parseInt(match[1]),
          column: parseInt(match[2]),
          severity: match[3] as 'error' | 'warning',
          message: match[4],
          code: match[5],
        };
      
      case '$gcc':
        return {
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          severity: match[4] as 'error' | 'warning',
          message: match[5],
        };
      
      default:
        return {
          file: match[1] || '',
          line: parseInt(match[2]) || 1,
          severity: 'error',
          message: match[match.length - 1] || '',
        };
    }
  }
  
  // ==========================================================================
  // VARIABLE RESOLUTION
  // ==========================================================================
  
  private resolveVariables(str: string, customVars?: Record<string, string>): string {
    const variables: Record<string, string> = {
      workspaceFolder: this.workspaceRoot,
      workspaceFolderBasename: this.workspaceRoot.split(/[/\\]/).pop() || '',
      file: '', // Would be filled from active editor
      fileBasename: '',
      fileBasenameNoExtension: '',
      fileDirname: '',
      fileExtname: '',
      cwd: this.workspaceRoot,
      lineNumber: '1',
      selectedText: '',
      ...customVars,
    };
    
    return str.replace(/\$\{([^}]+)\}/g, (_, name) => {
      if (name.startsWith('env:')) {
        const envVar = name.slice(4);
        return process.env?.[envVar] || '';
      }
      return variables[name] || '';
    });
  }
}

// ============================================================================
// DEFAULT TASKS
// ============================================================================

export const DEFAULT_TASKS_CONFIG: TasksConfig = {
  version: '2.0.0',
  tasks: [
    {
      label: 'npm: build',
      type: 'npm',
      command: 'build',
      group: 'build',
      isDefault: true,
      problemMatcher: ['$tsc'],
      presentation: {
        reveal: 'always',
        echo: true,
        focus: false,
        panel: 'shared',
        showReuseMessage: true,
        clear: true,
        close: false,
      },
    },
    {
      label: 'npm: dev',
      type: 'npm',
      command: 'dev',
      group: 'none',
      presentation: {
        reveal: 'always',
        echo: true,
        focus: false,
        panel: 'dedicated',
        showReuseMessage: false,
        clear: true,
        close: false,
      },
    },
    {
      label: 'npm: test',
      type: 'npm',
      command: 'test',
      group: 'test',
      isDefault: true,
      problemMatcher: [],
    },
    {
      label: 'npm: lint',
      type: 'npm',
      command: 'lint',
      group: 'none',
      problemMatcher: ['$eslint-stylish'],
    },
    {
      label: 'npm: clean',
      type: 'shell',
      command: 'rm -rf dist node_modules/.cache',
      group: 'clean',
      presentation: {
        reveal: 'silent',
        echo: true,
        focus: false,
        panel: 'shared',
        showReuseMessage: false,
        clear: false,
        close: true,
      },
    },
  ],
};

// ============================================================================
// FACTORY
// ============================================================================

export function createTaskRunner(workspaceRoot: string): TaskRunner {
  const runner = new TaskRunner(workspaceRoot);
  runner.loadTasks(DEFAULT_TASKS_CONFIG);
  return runner;
}

export default TaskRunner;
