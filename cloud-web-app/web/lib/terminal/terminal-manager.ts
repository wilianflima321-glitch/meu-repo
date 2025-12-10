/**
 * Terminal Manager
 * Manages persistent terminal sessions with task execution
 */

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  env: Record<string, string>;
  shellPath: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface TaskDefinition {
  label: string;
  type: string;
  command: string;
  args?: string[];
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    shell?: {
      executable: string;
      args?: string[];
    };
  };
  problemMatcher?: string | string[] | ProblemMatcher | ProblemMatcher[];
  presentation?: {
    echo?: boolean;
    reveal?: 'always' | 'silent' | 'never';
    focus?: boolean;
    panel?: 'shared' | 'dedicated' | 'new';
    showReuseMessage?: boolean;
    clear?: boolean;
    group?: string;
  };
  runOptions?: {
    runOn?: 'default' | 'folderOpen';
    instanceLimit?: number;
  };
  dependsOn?: string | string[];
  dependsOrder?: 'parallel' | 'sequence';
}

export interface ProblemMatcher {
  owner?: string;
  source?: string;
  severity?: 'error' | 'warning' | 'info';
  fileLocation?: 'absolute' | 'relative' | ['relative', string];
  pattern: ProblemPattern | ProblemPattern[];
  background?: {
    activeOnStart?: boolean;
    beginsPattern?: string | { regexp: string };
    endsPattern?: string | { regexp: string };
  };
}

export interface ProblemPattern {
  regexp: string;
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message: number;
  loop?: boolean;
}

export interface LaunchConfiguration {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  envFile?: string;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  preLaunchTask?: string;
  postDebugTask?: string;
  internalConsoleOptions?: 'neverOpen' | 'openOnSessionStart' | 'openOnFirstSessionStart';
  [key: string]: any;
}

export interface TaskExecution {
  id: string;
  taskLabel: string;
  terminalId: string;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  problems: Problem[];
}

export interface Problem {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string;
}

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private executions: Map<string, TaskExecution> = new Map();
  private tasks: Map<string, TaskDefinition> = new Map();
  private launchConfigs: Map<string, LaunchConfiguration> = new Map();

  async createSession(name: string, cwd: string = '/workspace', shellPath: string = '/bin/bash'): Promise<string> {
    const response = await fetch('/api/terminal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cwd, shellPath })
    });

    const data = await response.json();
    const session: TerminalSession = {
      id: data.sessionId,
      name,
      cwd,
      env: data.env || {},
      shellPath,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(session.id, session);
    return session.id;
  }

  async closeSession(sessionId: string): Promise<void> {
    await fetch('/api/terminal/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    this.sessions.delete(sessionId);
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session not found: ${sessionId}`);
    }

    await fetch('/api/terminal/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, data })
    });

    session.lastActivity = new Date();
  }

  async getOutput(sessionId: string, since?: number): Promise<string> {
    const response = await fetch('/api/terminal/output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, since })
    });

    const data = await response.json();
    return data.output || '';
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    await fetch('/api/terminal/resize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, cols, rows })
    });
  }

  async loadTasks(workspaceRoot: string): Promise<void> {
    try {
      const response = await fetch('/api/tasks/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceRoot })
      });

      const data = await response.json();
      if (data.tasks) {
        this.tasks.clear();
        for (const task of data.tasks) {
          this.tasks.set(task.label, task);
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async detectTasks(workspaceRoot: string): Promise<TaskDefinition[]> {
    const response = await fetch('/api/tasks/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceRoot })
    });

    const data = await response.json();
    return data.tasks || [];
  }

  async executeTask(taskLabel: string, terminalId?: string): Promise<string> {
    const task = this.tasks.get(taskLabel);
    if (!task) {
      throw new Error(`Task not found: ${taskLabel}`);
    }

    // Handle dependencies
    if (task.dependsOn) {
      const dependencies = Array.isArray(task.dependsOn) ? task.dependsOn : [task.dependsOn];
      const order = task.dependsOrder || 'parallel';

      if (order === 'sequence') {
        for (const dep of dependencies) {
          await this.executeTask(dep);
        }
      } else {
        await Promise.all(dependencies.map(dep => this.executeTask(dep)));
      }
    }

    // Create or reuse terminal
    let sessionId = terminalId;
    if (!sessionId) {
      const panel = task.presentation?.panel || 'shared';
      if (panel === 'shared') {
        // Reuse existing terminal
        const existing = Array.from(this.sessions.values()).find(s => s.name === 'Task');
        sessionId = existing?.id;
      }

      if (!sessionId) {
        sessionId = await this.createSession(task.label, task.options?.cwd);
      }
    }

    // Build command
    const command = task.args ? `${task.command} ${task.args.join(' ')}` : task.command;

    // Execute
    const executionId = `exec_${Date.now()}`;
    const execution: TaskExecution = {
      id: executionId,
      taskLabel,
      terminalId: sessionId,
      startTime: new Date(),
      problems: []
    };

    this.executions.set(executionId, execution);

    // Send command to terminal
    await this.sendInput(sessionId, command + '\n');

    // Start problem matching
    if (task.problemMatcher) {
      this.startProblemMatching(executionId, task.problemMatcher);
    }

    return executionId;
  }

  async loadLaunchConfigurations(workspaceRoot: string): Promise<void> {
    try {
      const response = await fetch('/api/launch/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceRoot })
      });

      const data = await response.json();
      if (data.configurations) {
        this.launchConfigs.clear();
        for (const config of data.configurations) {
          this.launchConfigs.set(config.name, config);
        }
      }
    } catch (error) {
      console.error('Failed to load launch configurations:', error);
    }
  }

  getLaunchConfiguration(name: string): LaunchConfiguration | undefined {
    return this.launchConfigs.get(name);
  }

  getAllLaunchConfigurations(): LaunchConfiguration[] {
    return Array.from(this.launchConfigs.values());
  }

  getTask(label: string): TaskDefinition | undefined {
    return this.tasks.get(label);
  }

  getAllTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  getExecution(id: string): TaskExecution | undefined {
    return this.executions.get(id);
  }

  getAllExecutions(): TaskExecution[] {
    return Array.from(this.executions.values());
  }

  private async startProblemMatching(executionId: string, matcher: string | string[] | ProblemMatcher | ProblemMatcher[]): Promise<void> {
    // Problem matching implementation
    // This would parse terminal output and extract problems based on patterns
    // For now, this is a placeholder
    console.log(`Started problem matching for execution ${executionId}`);
  }
}

// Singleton instance
let terminalManagerInstance: TerminalManager | null = null;

export function getTerminalManager(): TerminalManager {
  if (!terminalManagerInstance) {
    terminalManagerInstance = new TerminalManager();
  }
  return terminalManagerInstance;
}

export function resetTerminalManager(): void {
  terminalManagerInstance = null;
}

// Built-in problem matchers
export const BUILTIN_PROBLEM_MATCHERS: Record<string, ProblemMatcher> = {
  '$tsc': {
    owner: 'typescript',
    source: 'ts',
    fileLocation: 'relative',
    pattern: {
      regexp: '^([^\\s].*)[\\(:](\\d+)[,:](\\d+)(?:\\):\\s+|\\s+-\\s+)(error|warning|info)\\s+TS(\\d+)\\s*:\\s*(.*)$',
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      code: 5,
      message: 6
    }
  },
  '$eslint-compact': {
    owner: 'eslint',
    source: 'eslint',
    fileLocation: 'relative',
    pattern: {
      regexp: '^(.+):\\sline\\s(\\d+),\\scol\\s(\\d+),\\s(Error|Warning|Info)\\s-\\s(.+)\\s\\((.+)\\)$',
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      message: 5,
      code: 6
    }
  },
  '$go': {
    owner: 'go',
    source: 'go',
    fileLocation: 'relative',
    pattern: {
      regexp: '^([^:]*\\.go):(\\d+):(\\d+):\\s+(.*)$',
      file: 1,
      line: 2,
      column: 3,
      message: 4
    }
  },
  '$rustc': {
    owner: 'rustc',
    source: 'rustc',
    fileLocation: 'relative',
    pattern: [
      {
        regexp: '^(error|warning|note)(?:\\[(E\\d+)\\])?:\\s+(.*)$',
        severity: 1,
        code: 2,
        message: 3
      },
      {
        regexp: '^\\s+-->\\s+(.*):(\\d+):(\\d+)$',
        file: 1,
        line: 2,
        column: 3
      }
    ]
  },
  '$gcc': {
    owner: 'cpp',
    source: 'gcc',
    fileLocation: 'relative',
    pattern: {
      regexp: '^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$',
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      message: 5
    }
  }
};
