/**
 * DAP (Debug Adapter Protocol) Client
 * 
 * Connects to the DAP server via WebSocket for debugging functionality
 * including breakpoints, stepping, variable inspection, etc.
 */

import { EventEmitter } from 'events';

// DAP Message Types
interface DapMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
}

interface DapRequest extends DapMessage {
  type: 'request';
  command: string;
  arguments?: Record<string, unknown>;
}

interface DapResponse extends DapMessage {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: Record<string, unknown>;
}

interface DapEvent extends DapMessage {
  type: 'event';
  event: string;
  body?: Record<string, unknown>;
}

// DAP Types
export interface Source {
  name?: string;
  path?: string;
  sourceReference?: number;
}

export interface Breakpoint {
  id?: number;
  verified: boolean;
  message?: string;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: Source;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  moduleId?: number | string;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Thread {
  id: number;
  name: string;
}

export interface Scope {
  name: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  expensive: boolean;
  source?: Source;
  line?: number;
  column?: number;
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
  evaluateName?: string;
  memoryReference?: string;
}

export interface StoppedEventBody {
  reason: 'step' | 'breakpoint' | 'exception' | 'pause' | 'entry' | 'goto' | 'function breakpoint' | 'data breakpoint' | 'instruction breakpoint' | string;
  description?: string;
  threadId?: number;
  preserveFocusHint?: boolean;
  text?: string;
  allThreadsStopped?: boolean;
  hitBreakpointIds?: number[];
}

export interface OutputEventBody {
  category?: 'console' | 'important' | 'stdout' | 'stderr' | 'telemetry';
  output: string;
  group?: 'start' | 'startCollapsed' | 'end';
  variablesReference?: number;
  source?: Source;
  line?: number;
  column?: number;
  data?: unknown;
}

export interface BreakpointEventBody {
  reason: 'changed' | 'new' | 'removed';
  breakpoint: Breakpoint;
}

// Launch/Attach configuration
export interface LaunchRequestArguments {
  program: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
}

export interface AttachRequestArguments {
  processId?: number;
  port?: number;
  host?: string;
}

// Event types emitted by the client
export interface DapClientEvents {
  initialized: () => void;
  stopped: (body: StoppedEventBody) => void;
  continued: (threadId: number) => void;
  exited: (exitCode: number) => void;
  terminated: () => void;
  thread: (reason: 'started' | 'exited', threadId: number) => void;
  output: (body: OutputEventBody) => void;
  breakpoint: (body: BreakpointEventBody) => void;
  module: (reason: 'new' | 'changed' | 'removed', module: unknown) => void;
  loadedSource: (reason: 'new' | 'changed' | 'removed', source: Source) => void;
  process: (name: string, startMethod?: string) => void;
  capabilities: (capabilities: Record<string, unknown>) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}

/**
 * DAP Client for debugging
 */
export class DapClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private seq = 0;
  private pendingRequests = new Map<number, { resolve: (value: DapResponse) => void; reject: (error: Error) => void }>();
  private capabilities: Record<string, unknown> = {};
  private isInitialized = false;
  private threads: Thread[] = [];
  private breakpoints = new Map<string, Breakpoint[]>(); // uri -> breakpoints
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private wsUrl: string = 'ws://localhost:3001/debug') {
    super();
  }

  /**
   * Connect to DAP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[DAP Client] Connected to debug server');
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      };

      this.ws.onclose = () => {
        console.log('[DAP Client] Disconnected from debug server');
        this.emit('disconnected');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[DAP Client] WebSocket error:', error);
        reject(new Error('Failed to connect to debug server'));
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnect(): Promise<void> {
    this.isInitialized = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[DAP Client] Attempting reconnect in ${delay}ms`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error('[DAP Client] Reconnect failed:', error);
        }
      }, delay);
    }
  }

  /**
   * Send a request to DAP server
   */
  private sendRequest<T extends Record<string, unknown> = Record<string, unknown>>(
    command: string,
    args?: Record<string, unknown>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const seq = ++this.seq;
      const request: DapRequest = {
        seq,
        type: 'request',
        command,
        arguments: args,
      };

      this.pendingRequests.set(seq, {
        resolve: (response: DapResponse) => resolve(response.body as T),
        reject,
      });

      this.ws.send(JSON.stringify(request));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq);
          reject(new Error(`Request ${command} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Handle incoming DAP message
   */
  private handleMessage(message: DapResponse | DapEvent): void {
    if (message.type === 'response') {
      const response = message as DapResponse;
      const pending = this.pendingRequests.get(response.request_seq);
      
      if (pending) {
        this.pendingRequests.delete(response.request_seq);
        if (response.success) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response.message || 'Request failed'));
        }
      }
    } else if (message.type === 'event') {
      this.handleEvent(message as DapEvent);
    }
  }

  /**
   * Handle DAP events
   */
  private handleEvent(event: DapEvent): void {
    const body = event.body || {};

    switch (event.event) {
      case 'initialized':
        this.isInitialized = true;
        this.emit('initialized');
        break;

      case 'stopped':
        this.emit('stopped', body as unknown as StoppedEventBody);
        break;

      case 'continued':
        this.emit('continued', (body as { threadId: number }).threadId);
        break;

      case 'exited':
        this.emit('exited', (body as { exitCode: number }).exitCode);
        break;

      case 'terminated':
        this.emit('terminated');
        break;

      case 'thread':
        const threadBody = body as { reason: 'started' | 'exited'; threadId: number };
        this.emit('thread', threadBody.reason, threadBody.threadId);
        break;

      case 'output':
        this.emit('output', body as unknown as OutputEventBody);
        break;

      case 'breakpoint':
        this.emit('breakpoint', body as unknown as BreakpointEventBody);
        break;

      case 'module':
        const moduleBody = body as { reason: 'new' | 'changed' | 'removed'; module: unknown };
        this.emit('module', moduleBody.reason, moduleBody.module);
        break;

      case 'loadedSource':
        const sourceBody = body as { reason: 'new' | 'changed' | 'removed'; source: Source };
        this.emit('loadedSource', sourceBody.reason, sourceBody.source);
        break;

      case 'process':
        const processBody = body as { name: string; startMethod?: string };
        this.emit('process', processBody.name, processBody.startMethod);
        break;

      case 'capabilities':
        this.capabilities = { ...this.capabilities, ...(body as { capabilities: Record<string, unknown> }).capabilities };
        this.emit('capabilities', this.capabilities);
        break;

      default:
        console.log('[DAP Client] Unknown event:', event.event, body);
    }
  }

  /**
   * Initialize debug session
   */
  async initialize(): Promise<Record<string, unknown>> {
    const response = await this.sendRequest<{ capabilities?: Record<string, unknown> }>('initialize', {
      clientID: 'aethel-engine',
      clientName: 'Aethel Engine IDE',
      adapterID: 'aethel',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true,
      supportsMemoryReferences: true,
      supportsProgressReporting: true,
      supportsInvalidatedEvent: true,
      supportsMemoryEvent: true,
    });

    this.capabilities = response.capabilities || {};
    return this.capabilities;
  }

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

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): Record<string, unknown> {
    return { ...this.capabilities };
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.isInitialized = false;
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
