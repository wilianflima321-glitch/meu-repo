/**
 * Base class for DAP (Debug Adapter Protocol) implementations
 * Handles process lifecycle, communication, and common debug operations
 */

import { EventEmitter } from 'events';

export interface DAPAdapterConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

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
  address?: string;
}

export interface SetBreakpointsArguments {
  source: {
    path: string;
    name?: string;
  };
  breakpoints?: {
    line: number;
    column?: number;
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
  }[];
  sourceModified?: boolean;
}

export interface Breakpoint {
  id: number;
  verified: boolean;
  line: number;
  column?: number;
  message?: string;
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

export interface Scope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  evaluateName?: string;
}

export interface Thread {
  id: number;
  name: string;
}

export interface Capabilities {
  supportsConfigurationDoneRequest?: boolean;
  supportsFunctionBreakpoints?: boolean;
  supportsConditionalBreakpoints?: boolean;
  supportsHitConditionalBreakpoints?: boolean;
  supportsEvaluateForHovers?: boolean;
  supportsStepBack?: boolean;
  supportsSetVariable?: boolean;
  supportsRestartFrame?: boolean;
  supportsGotoTargetsRequest?: boolean;
  supportsStepInTargetsRequest?: boolean;
  supportsCompletionsRequest?: boolean;
  supportsModulesRequest?: boolean;
  supportsExceptionOptions?: boolean;
  supportsValueFormattingOptions?: boolean;
  supportsExceptionInfoRequest?: boolean;
  supportTerminateDebuggee?: boolean;
  supportsDelayedStackTraceLoading?: boolean;
  supportsLoadedSourcesRequest?: boolean;
  supportsLogPoints?: boolean;
  supportsTerminateThreadsRequest?: boolean;
  supportsSetExpression?: boolean;
  supportsTerminateRequest?: boolean;
  supportsDataBreakpoints?: boolean;
  supportsReadMemoryRequest?: boolean;
  supportsDisassembleRequest?: boolean;
  supportsCancelRequest?: boolean;
  supportsBreakpointLocationsRequest?: boolean;
  supportsClipboardContext?: boolean;
}

export abstract class DAPAdapterBase extends EventEmitter {
  protected config: DAPAdapterConfig;
  protected process: any = null;
  protected messageId = 0;
  protected pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  protected buffer = '';
  protected initialized = false;
  protected capabilities: Capabilities = {};
  protected sessionActive = false;

  constructor(config: DAPAdapterConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the debug adapter process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Adapter already started');
    }

    try {
      // In browser environment, we'll use WebSocket or HTTP
      // For now, emit ready event for mock implementation
      this.emit('ready');
      console.log(`[DAP] ${this.config.command} adapter started (mock mode)`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the debug adapter process
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      if (this.sessionActive) {
        await this.disconnect();
      }
      this.process = null;
      this.initialized = false;
      this.emit('stopped');
      console.log(`[DAP] ${this.config.command} adapter stopped`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize the debug adapter
   */
  async initialize(): Promise<Capabilities> {
    if (this.initialized) {
      throw new Error('Adapter already initialized');
    }

    const result = await this.sendRequest('initialize', {
      clientID: 'ai-ide',
      clientName: 'AI IDE',
      adapterID: this.getAdapterID(),
      locale: 'en-US',
      linesStartAt1: true,
      columnsStartAt1: true,
      pathFormat: 'path',
      supportsVariableType: true,
      supportsVariablePaging: false,
      supportsRunInTerminalRequest: true,
      supportsMemoryReferences: false,
      supportsProgressReporting: true,
      supportsInvalidatedEvent: true,
    });

    this.capabilities = result;
    this.initialized = true;

    this.emit('initialized', result);
    return result;
  }

  /**
   * Get adapter ID (override in subclasses)
   */
  protected abstract getAdapterID(): string;

  /**
   * Launch debug session
   */
  async launch(args: LaunchRequestArguments): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }

    await this.sendRequest('launch', args);
    this.sessionActive = true;
    this.emit('launched');
  }

  /**
   * Attach to running process
   */
  async attach(args: AttachRequestArguments): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }

    await this.sendRequest('attach', args);
    this.sessionActive = true;
    this.emit('attached');
  }

  /**
   * Configuration done (signals end of configuration sequence)
   */
  async configurationDone(): Promise<void> {
    if (this.capabilities.supportsConfigurationDoneRequest) {
      await this.sendRequest('configurationDone', {});
    }
  }

  /**
   * Disconnect from debug session
   */
  async disconnect(restart: boolean = false): Promise<void> {
    await this.sendRequest('disconnect', { restart });
    this.sessionActive = false;
    this.emit('disconnected');
  }

  /**
   * Set breakpoints
   */
  async setBreakpoints(args: SetBreakpointsArguments): Promise<Breakpoint[]> {
    const result = await this.sendRequest('setBreakpoints', args);
    return result.breakpoints || [];
  }

  /**
   * Continue execution
   */
  async continue(threadId: number): Promise<void> {
    await this.sendRequest('continue', { threadId });
  }

  /**
   * Step over
   */
  async next(threadId: number): Promise<void> {
    await this.sendRequest('next', { threadId });
  }

  /**
   * Step into
   */
  async stepIn(threadId: number): Promise<void> {
    await this.sendRequest('stepIn', { threadId });
  }

  /**
   * Step out
   */
  async stepOut(threadId: number): Promise<void> {
    await this.sendRequest('stepOut', { threadId });
  }

  /**
   * Pause execution
   */
  async pause(threadId: number): Promise<void> {
    await this.sendRequest('pause', { threadId });
  }

  /**
   * Get stack trace
   */
  async stackTrace(threadId: number, startFrame: number = 0, levels: number = 20): Promise<StackFrame[]> {
    const result = await this.sendRequest('stackTrace', {
      threadId,
      startFrame,
      levels,
    });
    return result.stackFrames || [];
  }

  /**
   * Get scopes for a stack frame
   */
  async scopes(frameId: number): Promise<Scope[]> {
    const result = await this.sendRequest('scopes', { frameId });
    return result.scopes || [];
  }

  /**
   * Get variables
   */
  async variables(variablesReference: number): Promise<Variable[]> {
    const result = await this.sendRequest('variables', { variablesReference });
    return result.variables || [];
  }

  /**
   * Evaluate expression
   */
  async evaluate(expression: string, frameId?: number, context?: string): Promise<any> {
    return await this.sendRequest('evaluate', {
      expression,
      frameId,
      context: context || 'repl',
    });
  }

  /**
   * Get threads
   */
  async threads(): Promise<Thread[]> {
    const result = await this.sendRequest('threads', {});
    return result.threads || [];
  }

  /**
   * Send a request to the debug adapter
   */
  protected async sendRequest(command: string, args: any): Promise<any> {
    const seq = ++this.messageId;
    const message = {
      type: 'request',
      seq,
      command,
      arguments: args,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(seq, { resolve, reject });
      
      // Mock implementation - will be replaced with real communication
      setTimeout(() => {
        const mockResponse = this.getMockResponse(command, args);
        this.handleResponse({
          type: 'response',
          request_seq: seq,
          success: true,
          command,
          body: mockResponse,
        });
      }, 50);
    });
  }

  /**
   * Handle response from debug adapter
   */
  protected handleResponse(response: any): void {
    const { request_seq, success, message, body } = response;
    const pending = this.pendingRequests.get(request_seq);

    if (!pending) {
      console.warn(`[DAP] No pending request for seq ${request_seq}`);
      return;
    }

    this.pendingRequests.delete(request_seq);

    if (!success) {
      pending.reject(new Error(message || 'Request failed'));
    } else {
      pending.resolve(body);
    }
  }

  /**
   * Handle event from debug adapter
   */
  protected handleEvent(event: any): void {
    const { event: eventType, body } = event;
    this.emit('event', { event: eventType, body });

    // Handle specific events
    switch (eventType) {
      case 'stopped':
        this.emit('stopped', body);
        break;
      case 'continued':
        this.emit('continued', body);
        break;
      case 'exited':
        this.emit('exited', body);
        break;
      case 'terminated':
        this.emit('terminated', body);
        this.sessionActive = false;
        break;
      case 'thread':
        this.emit('thread', body);
        break;
      case 'output':
        this.emit('output', body);
        break;
      case 'breakpoint':
        this.emit('breakpoint', body);
        break;
      case 'module':
        this.emit('module', body);
        break;
      case 'loadedSource':
        this.emit('loadedSource', body);
        break;
      case 'process':
        this.emit('process', body);
        break;
      case 'capabilities':
        this.emit('capabilities', body);
        break;
    }
  }

  /**
   * Get mock response for testing
   * Override in subclasses for adapter-specific mocks
   */
  protected abstract getMockResponse(command: string, args: any): any;

  /**
   * Check if adapter is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.sessionActive;
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities(): Capabilities {
    return this.capabilities;
  }
}
