/**
 * Base class for DAP (Debug Adapter Protocol) implementations
 *
 * @deprecated Prefer DAPClient from './dap-client' (same real `/api/dap` session path).
 * Legacy adapters remain for language-specific helpers only.
 * P2b BLOCKER 11: never invent mock DAP responses with success:true when the API is down.
 */

import { EventEmitter } from 'events';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('dap/dap-adapter-base')

/** Explicit opt-in for unit tests that must exercise the legacy mock path. Never a prod default. */
export function isDapMockExplicitlyAllowed(): boolean {
  return process.env.AETHEL_DAP_ALLOW_MOCK === '1' || process.env.AETHEL_DAP_ALLOW_MOCK === 'true'
}

export const DAP_SESSION_UNAVAILABLE =
  'DAP_SESSION_UNAVAILABLE: real debug adapter session required via /api/dap (mock success path forbidden)'

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

export type DAPRequestArguments = object;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type DAPApiSessionStartResponse = {
  success?: boolean;
  sessionId?: string;
};

type DAPApiRequestResponse<TResult = unknown> = {
  success?: boolean;
  body?: TResult;
  message?: string;
};

type DAPProtocolResponse<TResult = unknown> = {
  type?: string;
  request_seq: number;
  success: boolean;
  command?: string;
  message?: string;
  body?: TResult;
};

type DAPProtocolEvent = {
  type?: string;
  event: string;
  body?: unknown;
};

export abstract class DAPAdapterBase extends EventEmitter {
  protected config: DAPAdapterConfig;
  protected process: unknown = null;
  protected messageId = 0;
  protected pendingRequests = new Map<number, PendingRequest>();
  protected buffer = '';
  protected initialized = false;
  protected capabilities: Capabilities = {};
  protected sessionActive = false;
  protected sessionId: string | null = null;
  protected useRealAPI = true; // Try real API first

  constructor(config: DAPAdapterConfig) {
    super();
    this.config = config;
    log.warn('[DAP] DAPAdapterBase is deprecated. Use DAPClient from @/lib/dap instead.');
  }

  /**
   * Start the debug adapter process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Adapter already started');
    }

    try {
      if (!(this.useRealAPI && typeof fetch !== 'undefined')) {
        throw new Error(DAP_SESSION_UNAVAILABLE);
      }

      const response = await fetch('/api/dap/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: this.getAdapterID(),
          request: 'launch',
          name: `Debug ${this.getAdapterID()}`,
          cwd: this.config.cwd,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `${DAP_SESSION_UNAVAILABLE} (HTTP ${response.status})`,
        );
      }

      const data = await response.json() as DAPApiSessionStartResponse;
      if (!data.success || !data.sessionId) {
        throw new Error(
          `${DAP_SESSION_UNAVAILABLE} (session start returned no sessionId)`,
        );
      }

      this.sessionId = data.sessionId;
      this.emit('ready');
      log.info(`[DAP] ${this.config.command} adapter started (real API, session: ${this.sessionId})`);
    } catch (error) {
      this.useRealAPI = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the debug adapter process
   */
  async stop(): Promise<void> {
    try {
      if (this.sessionActive) {
        await this.disconnect();
      }

      // Stop real session if exists
      if (this.sessionId && this.useRealAPI && typeof fetch !== 'undefined') {
        try {
          await fetch('/api/dap/session/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: this.sessionId }),
          });
        } catch (e) {
          log.warn('[DAP] Failed to stop session via API:', e);
        }
      }

      this.process = null;
      this.initialized = false;
      this.sessionId = null;
      this.emit('stopped');
      log.info(`[DAP] ${this.config.command} adapter stopped`);
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

    const result = await this.sendRequest<Capabilities>('initialize', {
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
    const result = await this.sendRequest<{ breakpoints?: Breakpoint[] }>('setBreakpoints', args);
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
    const result = await this.sendRequest<{ stackFrames?: StackFrame[] }>('stackTrace', {
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
    const result = await this.sendRequest<{ scopes?: Scope[] }>('scopes', { frameId });
    return result.scopes || [];
  }

  /**
   * Get variables
   */
  async variables(variablesReference: number): Promise<Variable[]> {
    const result = await this.sendRequest<{ variables?: Variable[] }>('variables', { variablesReference });
    return result.variables || [];
  }

  /**
   * Evaluate expression
   */
  async evaluate(expression: string, frameId?: number, context?: string): Promise<unknown> {
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
    const result = await this.sendRequest<{ threads?: Thread[] }>('threads', {});
    return result.threads || [];
  }

  /**
   * Send a request to the debug adapter
   */
  protected async sendRequest<TResult = unknown>(command: string, args: DAPRequestArguments): Promise<TResult> {
    const seq = ++this.messageId;

    // Try real API if session is active
    if (this.useRealAPI && this.sessionId && typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/dap/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            command,
            arguments: args,
            seq,
          }),
        });

        if (response.ok) {
          const data = await response.json() as DAPApiRequestResponse<TResult>;
          if (data.success === true) {
            return (data.body || {}) as TResult;
          }
          throw new Error(data.message || 'DAP request failed');
        }
        throw new Error(`DAP request HTTP ${response.status} for ${command}`);
      } catch (apiError) {
        log.warn(`[DAP] API request failed for ${command} (fail-closed, no mock):`, apiError);
        throw apiError instanceof Error
          ? apiError
          : new Error(`${DAP_SESSION_UNAVAILABLE} (command=${command})`);
      }
    }

    // Explicit test-only mock path — never a silent production fallback.
    if (isDapMockExplicitlyAllowed()) {
      return new Promise<TResult>((resolve, reject) => {
        this.pendingRequests.set(seq, { resolve: resolve as (value: unknown) => void, reject });
        setTimeout(() => {
          try {
            const mockResponse = this.getMockResponse(command, args);
            this.handleResponse({
              type: 'response',
              request_seq: seq,
              success: true,
              command,
              body: mockResponse,
            });
          } catch (mockError) {
            reject(mockError instanceof Error ? mockError : new Error(String(mockError)));
          }
        }, 50);
      });
    }

    throw new Error(`${DAP_SESSION_UNAVAILABLE} (command=${command})`);
  }

  /**
   * Handle response from debug adapter
   */
  protected handleResponse(response: DAPProtocolResponse): void {
    const { request_seq, success, message, body } = response;
    const pending = this.pendingRequests.get(request_seq);

    if (!pending) {
      log.warn(`[DAP] No pending request for seq ${request_seq}`);
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
  protected handleEvent(event: DAPProtocolEvent): void {
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
   * Mock responses are forbidden on the ship path (P2b BLOCKER 11).
   * Only reachable when AETHEL_DAP_ALLOW_MOCK=1; subclasses may override for tests.
   */
  protected getMockResponse(command: string, _args: DAPRequestArguments): unknown {
    throw new Error(
      `DAP_MOCK_FORBIDDEN: mock response for '${command}' is not implemented — use a real /api/dap session`,
    );
  }

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
