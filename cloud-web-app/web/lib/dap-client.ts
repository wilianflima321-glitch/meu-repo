/**
 * DAP (Debug Adapter Protocol) Client
 * 
 * Connects to the DAP server via WebSocket for debugging functionality
 * including breakpoints, stepping, variable inspection, etc.
 */

import { DapTransportClient } from './dap-client.transport';
import type {
  AttachRequestArguments,
  Breakpoint,
  BreakpointEventBody,
  DapClientEvents,
  LaunchRequestArguments,
  OutputEventBody,
  Scope,
  Source,
  StackFrame,
  StoppedEventBody,
  Thread,
  Variable,
} from './dap-client.contracts';

export type {
  AttachRequestArguments,
  Breakpoint,
  BreakpointEventBody,
  DapClientEvents,
  LaunchRequestArguments,
  OutputEventBody,
  Scope,
  Source,
  StackFrame,
  StoppedEventBody,
  Thread,
  Variable,
} from './dap-client.contracts';

/**
 * DAP Client for debugging
 */
export class DapClient extends DapTransportClient {
  private threads: Thread[] = [];
  private breakpoints = new Map<string, Breakpoint[]>(); // uri -> breakpoints

  /**
   * Launch a debug session
   */
  async launch(args: LaunchRequestArguments): Promise<void> {
    await this.sendRequest('launch', args as unknown as Record<string, unknown>);
  }

  /**
   * Attach to a running process
   */
  async attach(args: AttachRequestArguments): Promise<void> {
    await this.sendRequest('attach', args as unknown as Record<string, unknown>);
  }

  /**
   * Disconnect from debug session
   */
  async disconnect(restart = false, terminateDebuggee = true): Promise<void> {
    await this.sendRequest('disconnect', { restart, terminateDebuggee });
  }

  /**
   * Terminate debug session
   */
  async terminate(restart = false): Promise<void> {
    await this.sendRequest('terminate', { restart });
  }

  /**
   * Set breakpoints in a file
   */
  async setBreakpoints(
    source: Source,
    breakpoints: { line: number; column?: number; condition?: string; hitCondition?: string; logMessage?: string }[]
  ): Promise<Breakpoint[]> {
    const response = await this.sendRequest<{ breakpoints: Breakpoint[] }>('setBreakpoints', {
      source,
      breakpoints,
      sourceModified: false,
    });

    const uri = source.path || source.name || '';
    this.breakpoints.set(uri, response.breakpoints);
    return response.breakpoints;
  }

  /**
   * Set function breakpoints
   */
  async setFunctionBreakpoints(
    breakpoints: { name: string; condition?: string; hitCondition?: string }[]
  ): Promise<Breakpoint[]> {
    const response = await this.sendRequest<{ breakpoints: Breakpoint[] }>('setFunctionBreakpoints', {
      breakpoints,
    });
    return response.breakpoints;
  }

  /**
   * Set exception breakpoints
   */
  async setExceptionBreakpoints(
    filters: string[],
    filterOptions?: { filterId: string; condition?: string }[]
  ): Promise<Breakpoint[]> {
    const response = await this.sendRequest<{ breakpoints?: Breakpoint[] }>('setExceptionBreakpoints', {
      filters,
      filterOptions,
    });
    return response.breakpoints || [];
  }

  /**
   * Continue execution
   */
  async continue(threadId: number, singleThread = false): Promise<{ allThreadsContinued: boolean }> {
    return this.sendRequest<{ allThreadsContinued: boolean }>('continue', { threadId, singleThread });
  }

  /**
   * Pause execution
   */
  async pause(threadId: number): Promise<void> {
    await this.sendRequest('pause', { threadId });
  }

  /**
   * Step over (next)
   */
  async next(threadId: number, singleThread = false, granularity?: 'statement' | 'line' | 'instruction'): Promise<void> {
    await this.sendRequest('next', { threadId, singleThread, granularity });
  }

  /**
   * Step into
   */
  async stepIn(threadId: number, singleThread = false, targetId?: number, granularity?: 'statement' | 'line' | 'instruction'): Promise<void> {
    await this.sendRequest('stepIn', { threadId, singleThread, targetId, granularity });
  }

  /**
   * Step out
   */
  async stepOut(threadId: number, singleThread = false, granularity?: 'statement' | 'line' | 'instruction'): Promise<void> {
    await this.sendRequest('stepOut', { threadId, singleThread, granularity });
  }

  /**
   * Step back (reverse debugging)
   */
  async stepBack(threadId: number, singleThread = false, granularity?: 'statement' | 'line' | 'instruction'): Promise<void> {
    await this.sendRequest('stepBack', { threadId, singleThread, granularity });
  }

  /**
   * Reverse continue
   */
  async reverseContinue(threadId: number, singleThread = false): Promise<void> {
    await this.sendRequest('reverseContinue', { threadId, singleThread });
  }

  /**
   * Restart frame
   */
  async restartFrame(frameId: number): Promise<void> {
    await this.sendRequest('restartFrame', { frameId });
  }

  /**
   * Goto target
   */
  async goto(threadId: number, targetId: number): Promise<void> {
    await this.sendRequest('goto', { threadId, targetId });
  }

  /**
   * Get all threads
   */
  async getThreads(): Promise<Thread[]> {
    const response = await this.sendRequest<{ threads: Thread[] }>('threads');
    this.threads = response.threads;
    return response.threads;
  }

  /**
   * Get stack trace for a thread
   */
  async getStackTrace(
    threadId: number,
    startFrame = 0,
    levels = 20
  ): Promise<{ stackFrames: StackFrame[]; totalFrames?: number }> {
    return this.sendRequest<{ stackFrames: StackFrame[]; totalFrames?: number }>('stackTrace', {
      threadId,
      startFrame,
      levels,
    });
  }

  /**
   * Get scopes for a stack frame
   */
  async getScopes(frameId: number): Promise<Scope[]> {
    const response = await this.sendRequest<{ scopes: Scope[] }>('scopes', { frameId });
    return response.scopes;
  }

  /**
   * Get variables for a scope
   */
  async getVariables(
    variablesReference: number,
    filter?: 'indexed' | 'named',
    start?: number,
    count?: number
  ): Promise<Variable[]> {
    const response = await this.sendRequest<{ variables: Variable[] }>('variables', {
      variablesReference,
      filter,
      start,
      count,
    });
    return response.variables;
  }

  /**
   * Set variable value
   */
  async setVariable(
    variablesReference: number,
    name: string,
    value: string
  ): Promise<{ value: string; type?: string; variablesReference?: number }> {
    return this.sendRequest<{ value: string; type?: string; variablesReference?: number }>('setVariable', {
      variablesReference,
      name,
      value,
    });
  }

  /**
   * Evaluate expression
   */
  async evaluate(
    expression: string,
    frameId?: number,
    context?: 'watch' | 'repl' | 'hover' | 'clipboard' | 'variables'
  ): Promise<{ result: string; type?: string; variablesReference: number; memoryReference?: string }> {
    return this.sendRequest<{ result: string; type?: string; variablesReference: number; memoryReference?: string }>(
      'evaluate',
      { expression, frameId, context }
    );
  }

  /**
   * Get source content
   */
  async getSource(source: Source): Promise<{ content: string; mimeType?: string }> {
    return this.sendRequest<{ content: string; mimeType?: string }>('source', { source });
  }

  /**
   * Get completions for REPL
   */
  async getCompletions(
    text: string,
    column: number,
    frameId?: number
  ): Promise<{ targets: { label: string; text?: string; type?: string }[] }> {
    return this.sendRequest<{ targets: { label: string; text?: string; type?: string }[] }>('completions', {
      text,
      column,
      frameId,
    });
  }

  /**
   * Get loaded modules
   */
  async getModules(startModule?: number, moduleCount?: number): Promise<{ modules: unknown[]; totalModules?: number }> {
    return this.sendRequest<{ modules: unknown[]; totalModules?: number }>('modules', {
      startModule,
      moduleCount,
    });
  }

  /**
   * Read memory
   */
  async readMemory(memoryReference: string, offset = 0, count: number): Promise<{ address: string; data?: string; unreadableBytes?: number }> {
    return this.sendRequest<{ address: string; data?: string; unreadableBytes?: number }>('readMemory', {
      memoryReference,
      offset,
      count,
    });
  }

  /**
   * Write memory
   */
  async writeMemory(memoryReference: string, data: string, offset = 0): Promise<{ offset?: number; bytesWritten?: number }> {
    return this.sendRequest<{ offset?: number; bytesWritten?: number }>('writeMemory', {
      memoryReference,
      offset,
      data,
    });
  }

  /**
   * Get exception info
   */
  async getExceptionInfo(threadId: number): Promise<{
    exceptionId: string;
    description?: string;
    breakMode: 'never' | 'always' | 'unhandled' | 'userUnhandled';
    details?: { message?: string; typeName?: string; stackTrace?: string };
  }> {
    return this.sendRequest('exceptionInfo', { threadId });
  }

  /**
   * Get current breakpoints for a file
   */
  getBreakpointsForFile(uri: string): Breakpoint[] {
    return this.breakpoints.get(uri) || [];
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints(): Map<string, Breakpoint[]> {
    return new Map(this.breakpoints);
  }
}

// Singleton instance
let clientInstance: DapClient | null = null;

/**
 * Get or create DAP client instance
 */
export function getDapClient(wsUrl?: string): DapClient {
  if (!clientInstance) {
    clientInstance = new DapClient(wsUrl);
  }
  return clientInstance;
}

/**
 * Initialize DAP client
 */
export async function initializeDapClient(wsUrl?: string): Promise<DapClient> {
  const client = getDapClient(wsUrl);
  await client.connect();
  await client.initialize();
  return client;
}

export default DapClient;
