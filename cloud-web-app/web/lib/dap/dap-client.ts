/**
 * DAP Client Implementation
 * Updated to use new adapter implementations
 */

import { DAPAdapterBase } from './dap-adapter-base';
import { createNodeJSDAPAdapter } from './adapters/nodejs-dap';
import { createPythonDAPAdapter } from './adapters/python-dap';

export interface DAPClientConfig {
  type: string; // nodejs, python, go, etc.
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  host?: string;
  workspaceRoot?: string;
}

export interface Breakpoint {
  id: number;
  verified: boolean;
  line: number;
  column?: number;
  source?: {
    path: string;
    name?: string;
  };
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    path: string;
    name?: string;
  };
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
}

export interface Scope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}

export interface Thread {
  id: number;
  name: string;
}

export type DebugEvent = 
  | { type: 'initialized' }
  | { type: 'stopped'; reason: string; threadId?: number; text?: string }
  | { type: 'continued'; threadId: number }
  | { type: 'exited'; exitCode: number }
  | { type: 'terminated' }
  | { type: 'thread'; reason: 'started' | 'exited'; threadId: number }
  | { type: 'output'; category: 'console' | 'stdout' | 'stderr'; output: string }
  | { type: 'breakpoint'; reason: 'changed' | 'new' | 'removed'; breakpoint: Breakpoint };

export class DAPClient {
  private config: DAPClientConfig;
  private initialized: boolean = false;
  private messageId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();
  private eventListeners: Map<string, Array<(event: DebugEvent) => void>> = new Map();
  private sessionId: string | null = null;

  constructor(config: DAPClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Start debug session
      const sessionResponse = await fetch('/api/dap/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });

      const sessionData = await sessionResponse.json();
      this.sessionId = sessionData.sessionId;

      // Initialize debug adapter
      await this.sendRequest('initialize', {
        clientID: 'aethel-ide',
        clientName: 'Aethel IDE',
        adapterID: this.config.type,
        pathFormat: 'path',
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: true,
        supportsRunInTerminalRequest: true,
        supportsMemoryReferences: true,
        supportsProgressReporting: true,
        supportsInvalidatedEvent: true
      });

      this.initialized = true;
      console.log(`DAP client initialized for ${this.config.type}`);

      // Start event polling
      this.startEventPolling();
    } catch (error) {
      console.error(`Failed to initialize DAP client for ${this.config.type}:`, error);
      throw error;
    }
  }

  async launch(): Promise<void> {
    if (!this.initialized) {
      throw new Error('DAP client not initialized');
    }

    await this.sendRequest(this.config.request, this.config);
    await this.sendRequest('configurationDone', {});
  }

  async setBreakpoints(source: { path: string }, breakpoints: Array<{
    line: number;
    column?: number;
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
  }>): Promise<Breakpoint[]> {
    const response = await this.sendRequest('setBreakpoints', {
      source,
      breakpoints,
      sourceModified: false
    });

    return response.breakpoints || [];
  }

  async continue(threadId: number): Promise<void> {
    await this.sendRequest('continue', { threadId });
  }

  async pause(threadId: number): Promise<void> {
    await this.sendRequest('pause', { threadId });
  }

  async next(threadId: number): Promise<void> {
    await this.sendRequest('next', { threadId });
  }

  async stepIn(threadId: number): Promise<void> {
    await this.sendRequest('stepIn', { threadId });
  }

  async stepOut(threadId: number): Promise<void> {
    await this.sendRequest('stepOut', { threadId });
  }

  async threads(): Promise<Thread[]> {
    const response = await this.sendRequest('threads', {});
    return response.threads || [];
  }

  async stackTrace(threadId: number, startFrame: number = 0, levels: number = 20): Promise<StackFrame[]> {
    const response = await this.sendRequest('stackTrace', {
      threadId,
      startFrame,
      levels
    });

    return response.stackFrames || [];
  }

  async scopes(frameId: number): Promise<Scope[]> {
    const response = await this.sendRequest('scopes', { frameId });
    return response.scopes || [];
  }

  async variables(variablesReference: number, start?: number, count?: number): Promise<Variable[]> {
    const response = await this.sendRequest('variables', {
      variablesReference,
      start,
      count
    });

    return response.variables || [];
  }

  async evaluate(expression: string, frameId?: number, context?: 'watch' | 'repl' | 'hover'): Promise<{
    result: string;
    type?: string;
    variablesReference: number;
  }> {
    const response = await this.sendRequest('evaluate', {
      expression,
      frameId,
      context: context || 'repl'
    });

    return response;
  }

  async disconnect(terminateDebuggee: boolean = true): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.sendRequest('disconnect', {
        restart: false,
        terminateDebuggee
      });

      if (this.sessionId) {
        await fetch('/api/dap/session/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId })
        });
      }

      this.initialized = false;
      this.sessionId = null;
      console.log(`DAP client disconnected for ${this.config.type}`);
    } catch (error) {
      console.error(`Failed to disconnect DAP client for ${this.config.type}:`, error);
    }
  }

  on(eventType: string, listener: (event: DebugEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: (event: DebugEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private async sendRequest(command: string, args: any): Promise<any> {
    if (!this.sessionId) {
      throw new Error('No active debug session');
    }

    const id = ++this.messageId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      fetch('/api/dap/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          command,
          arguments: args,
          seq: id
        })
      })
        .then(res => res.json())
        .then(data => {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (data.success === false) {
              pending.reject(new Error(data.message || 'Request failed'));
            } else {
              pending.resolve(data.body || {});
            }
          }
        })
        .catch(error => {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            pending.reject(error);
          }
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error('DAP request timeout'));
        }
      }, 30000);
    });
  }

  private startEventPolling(): void {
    if (!this.sessionId) {
      return;
    }

    const poll = async () => {
      if (!this.sessionId || !this.initialized) {
        return;
      }

      try {
        const response = await fetch(`/api/dap/events?sessionId=${this.sessionId}`);
        const data = await response.json();

        if (data.events && Array.isArray(data.events)) {
          for (const event of data.events) {
            this.emitEvent(event);
          }
        }
      } catch (error) {
        console.error('Failed to poll debug events:', error);
      }

      // Poll every 500ms
      if (this.initialized) {
        setTimeout(poll, 500);
      }
    };

    poll();
  }

  private emitEvent(event: DebugEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }

    // Also emit to 'all' listeners
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      for (const listener of allListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }
}

// Debug adapter configurations
export const DAP_CONFIGS: Record<string, Partial<DAPClientConfig>> = {
  nodejs: {
    type: 'node',
    request: 'launch'
  },
  python: {
    type: 'python',
    request: 'launch'
  },
  go: {
    type: 'go',
    request: 'launch'
  },
  cpp: {
    type: 'cppdbg',
    request: 'launch'
  },
  java: {
    type: 'java',
    request: 'launch'
  },
  csharp: {
    type: 'coreclr',
    request: 'launch'
  }
};
