import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/dap-api')


/**
 * DAP API Client
 * Handles communication with backend DAP adapters
 */

export interface DAPAdapterConfig {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  [key: string]: unknown;
}

export interface DAPRequest {
  command: string;
  arguments?: DAPArguments;
}

export interface DAPResponse<TBody = DAPBody> {
  success: boolean;
  body?: TBody;
  message?: string;
}

export interface DAPEvent {
  event: string;
  body?: DAPBody;
}

export type DAPArguments = Record<string, unknown>;
export type DAPBody = Record<string, unknown>;

export interface DAPSource {
  name?: string;
  path?: string;
  sourceReference?: number;
  [key: string]: unknown;
}

export interface DAPSourceBreakpoint {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface DAPFunctionBreakpoint {
  name: string;
  condition?: string;
  hitCondition?: string;
}

export interface DAPBreakpoint {
  id?: number;
  verified: boolean;
  message?: string;
  source?: DAPSource;
  line?: number;
  column?: number;
}

export interface DAPStackFrame {
  id: number;
  name: string;
  source?: DAPSource;
  line: number;
  column: number;
}

export interface DAPScope {
  name: string;
  variablesReference: number;
  expensive?: boolean;
}

export interface DAPVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export interface DAPEvaluateResponse extends DAPBody {
  result?: string;
  type?: string;
  variablesReference?: number;
}

export interface DAPSetBreakpointsResponse extends DAPBody {
  breakpoints: DAPBreakpoint[];
}

export interface DAPStackTraceResponse extends DAPBody {
  stackFrames: DAPStackFrame[];
  totalFrames?: number;
}

export interface DAPScopesResponse extends DAPBody {
  scopes: DAPScope[];
}

export interface DAPVariablesResponse extends DAPBody {
  variables: DAPVariable[];
}

export interface DAPThreadsResponse extends DAPBody {
  threads: Array<{ id: number; name: string }>;
}

export class DAPApiClient {
  private baseUrl: string;
  private sessions: Map<string, string> = new Map(); // sessionName -> sessionId
  private eventHandlers: Map<string, (event: DAPEvent) => void> = new Map();

  constructor(baseUrl: string = '/api/dap') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start debug adapter
   */
  async startAdapter(config: DAPAdapterConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to start debug adapter: ${response.statusText}`);
    }

    const data = await response.json() as { sessionId?: string };
    const sessionId = data.sessionId;
    if (!sessionId) {
      throw new Error('Debug adapter did not return a sessionId');
    }
    this.sessions.set(config.name, sessionId);

    log.info(`[DAP API] Started adapter for ${config.name}: ${sessionId}`);
    return sessionId;
  }

  /**
   * Stop debug adapter
   */
  async stopAdapter(sessionName: string): Promise<void> {
    const sessionId = this.sessions.get(sessionName);
    if (!sessionId) {
      throw new Error(`No active session: ${sessionName}`);
    }

    const response = await fetch(`${this.baseUrl}/stop/${sessionId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop debug adapter: ${response.statusText}`);
    }

    this.sessions.delete(sessionName);
    log.info(`[DAP API] Stopped adapter: ${sessionName}`);
  }

  /**
   * Initialize debug adapter
   */
  async initialize(sessionName: string, clientId: string = 'cloud-ide'): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'initialize',
      arguments: {
        clientID: clientId,
        clientName: 'Cloud IDE',
        adapterID: sessionName,
        pathFormat: 'path',
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: true,
        supportsRunInTerminalRequest: true,
        supportsMemoryReferences: true,
        supportsProgressReporting: true,
        supportsInvalidatedEvent: true,
      },
    });
  }

  /**
   * Launch program
   */
  async launch(sessionName: string, config: DAPAdapterConfig): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'launch',
      arguments: config,
    });
  }

  /**
   * Attach to process
   */
  async attach(sessionName: string, config: DAPAdapterConfig): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'attach',
      arguments: config,
    });
  }

  /**
   * Set breakpoints
   */
  async setBreakpoints(sessionName: string, source: DAPSource, breakpoints: DAPSourceBreakpoint[]): Promise<DAPSetBreakpointsResponse> {
    return this.sendRequest(sessionName, {
      command: 'setBreakpoints',
      arguments: {
        source,
        breakpoints,
      },
    });
  }

  /**
   * Set function breakpoints
   */
  async setFunctionBreakpoints(sessionName: string, breakpoints: DAPFunctionBreakpoint[]): Promise<DAPSetBreakpointsResponse> {
    return this.sendRequest(sessionName, {
      command: 'setFunctionBreakpoints',
      arguments: { breakpoints },
    });
  }

  /**
   * Set exception breakpoints
   */
  async setExceptionBreakpoints(sessionName: string, filters: string[]): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'setExceptionBreakpoints',
      arguments: { filters },
    });
  }

  /**
   * Configuration done
   */
  async configurationDone(sessionName: string): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'configurationDone',
    });
  }

  /**
   * Continue execution
   */
  async continue(sessionName: string, threadId: number): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'continue',
      arguments: { threadId },
    });
  }

  /**
   * Pause execution
   */
  async pause(sessionName: string, threadId: number): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'pause',
      arguments: { threadId },
    });
  }

  /**
   * Step over
   */
  async next(sessionName: string, threadId: number): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'next',
      arguments: { threadId },
    });
  }

  /**
   * Step into
   */
  async stepIn(sessionName: string, threadId: number): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'stepIn',
      arguments: { threadId },
    });
  }

  /**
   * Step out
   */
  async stepOut(sessionName: string, threadId: number): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'stepOut',
      arguments: { threadId },
    });
  }

  /**
   * Get stack trace
   */
  async stackTrace(sessionName: string, threadId: number, startFrame?: number, levels?: number): Promise<DAPStackTraceResponse> {
    return this.sendRequest(sessionName, {
      command: 'stackTrace',
      arguments: {
        threadId,
        startFrame,
        levels,
      },
    });
  }

  /**
   * Get scopes
   */
  async scopes(sessionName: string, frameId: number): Promise<DAPScopesResponse> {
    return this.sendRequest(sessionName, {
      command: 'scopes',
      arguments: { frameId },
    });
  }

  /**
   * Get variables
   */
  async variables(sessionName: string, variablesReference: number): Promise<DAPVariablesResponse> {
    return this.sendRequest(sessionName, {
      command: 'variables',
      arguments: { variablesReference },
    });
  }

  /**
   * Set variable
   */
  async setVariable(sessionName: string, variablesReference: number, name: string, value: string): Promise<DAPVariablesResponse> {
    return this.sendRequest(sessionName, {
      command: 'setVariable',
      arguments: {
        variablesReference,
        name,
        value,
      },
    });
  }

  /**
   * Evaluate expression
   */
  async evaluate(sessionName: string, expression: string, frameId?: number, context?: string): Promise<DAPEvaluateResponse> {
    return this.sendRequest(sessionName, {
      command: 'evaluate',
      arguments: {
        expression,
        frameId,
        context,
      },
    });
  }

  /**
   * Get threads
   */
  async threads(sessionName: string): Promise<DAPThreadsResponse> {
    return this.sendRequest(sessionName, {
      command: 'threads',
    });
  }

  /**
   * Disconnect
   */
  async disconnect(sessionName: string, restart: boolean = false): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'disconnect',
      arguments: { restart },
    });
  }

  /**
   * Restart
   */
  async restart(sessionName: string): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'restart',
    });
  }

  /**
   * Terminate
   */
  async terminate(sessionName: string): Promise<DAPBody> {
    return this.sendRequest(sessionName, {
      command: 'terminate',
    });
  }

  /**
   * Send generic request
   */
  async sendRequest<TBody = DAPBody>(sessionName: string, request: DAPRequest): Promise<TBody> {
    const sessionId = this.sessions.get(sessionName);
    if (!sessionId) {
      throw new Error(`No active session: ${sessionName}`);
    }

    const response = await fetch(`${this.baseUrl}/request/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`DAP request failed: ${response.statusText}`);
    }

    const data = await response.json() as DAPResponse<TBody>;
    
    if (!data.success) {
      throw new Error(`DAP error: ${data.message}`);
    }

    return (data.body ?? {} as TBody);
  }

  /**
   * Subscribe to events
   */
  onEvent(sessionName: string, handler: (event: DAPEvent) => void): void {
    this.eventHandlers.set(sessionName, handler);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if session is active
   */
  isSessionActive(sessionName: string): boolean {
    return this.sessions.has(sessionName);
  }
}

// Singleton instance
let dapApiClientInstance: DAPApiClient | null = null;

export function getDAPApiClient(): DAPApiClient {
  if (!dapApiClientInstance) {
    dapApiClientInstance = new DAPApiClient();
  }
  return dapApiClientInstance;
}
