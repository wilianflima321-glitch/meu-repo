/**
 * Aethel Engine - Real Debug Adapter Client
 * 
 * Conecta ao DAP Runtime real do servidor via API/WebSocket.
 * Substitui todas as simulações por comunicação real com debuggers.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types (DAP Protocol)
// ============================================================================

export interface DebugConfiguration {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  envFile?: string;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  port?: number;
  host?: string;
  
  // Python specific
  pythonPath?: string;
  module?: string;
  django?: boolean;
  flask?: boolean;
  
  // Node specific
  runtimeExecutable?: string;
  runtimeArgs?: string[];
  skipFiles?: string[];
  
  // Go specific
  mode?: 'auto' | 'debug' | 'remote' | 'test' | 'exec';
  
  // Extension
  [key: string]: unknown;
}

export interface SourceBreakpoint {
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface Breakpoint {
  id: number;
  verified: boolean;
  message?: string;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  instructionReference?: string;
  offset?: number;
}

export interface Source {
  name?: string;
  path?: string;
  sourceReference?: number;
  presentationHint?: 'normal' | 'emphasize' | 'deemphasize';
  origin?: string;
  sources?: Source[];
  adapterData?: unknown;
  checksums?: Checksum[];
}

export interface Checksum {
  algorithm: 'MD5' | 'SHA1' | 'SHA256' | 'timestamp';
  checksum: string;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: Source;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  canRestart?: boolean;
  instructionPointerReference?: string;
  moduleId?: number | string;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Scope {
  name: string;
  presentationHint?: 'arguments' | 'locals' | 'registers';
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
  presentationHint?: VariablePresentationHint;
  evaluateName?: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}

export interface VariablePresentationHint {
  kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual' | 'dataBreakpoint';
  attributes?: Array<'static' | 'constant' | 'readOnly' | 'rawString' | 'hasObjectId' | 'canHaveObjectId' | 'hasSideEffects' | 'hasDataBreakpoint'>;
  visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final';
  lazy?: boolean;
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
  exceptionBreakpointFilters?: ExceptionBreakpointsFilter[];
  supportsStepBack?: boolean;
  supportsSetVariable?: boolean;
  supportsRestartFrame?: boolean;
  supportsGotoTargetsRequest?: boolean;
  supportsStepInTargetsRequest?: boolean;
  supportsCompletionsRequest?: boolean;
  completionTriggerCharacters?: string[];
  supportsModulesRequest?: boolean;
  additionalModuleColumns?: ColumnDescriptor[];
  supportedChecksumAlgorithms?: string[];
  supportsRestartRequest?: boolean;
  supportsExceptionOptions?: boolean;
  supportsValueFormattingOptions?: boolean;
  supportsExceptionInfoRequest?: boolean;
  supportTerminateDebuggee?: boolean;
  supportSuspendDebuggee?: boolean;
  supportsDelayedStackTraceLoading?: boolean;
  supportsLoadedSourcesRequest?: boolean;
  supportsLogPoints?: boolean;
  supportsTerminateThreadsRequest?: boolean;
  supportsSetExpression?: boolean;
  supportsTerminateRequest?: boolean;
  supportsDataBreakpoints?: boolean;
  supportsReadMemoryRequest?: boolean;
  supportsWriteMemoryRequest?: boolean;
  supportsDisassembleRequest?: boolean;
  supportsCancelRequest?: boolean;
  supportsBreakpointLocationsRequest?: boolean;
  supportsClipboardContext?: boolean;
  supportsSteppingGranularity?: boolean;
  supportsInstructionBreakpoints?: boolean;
  supportsExceptionFilterOptions?: boolean;
  supportsSingleThreadExecutionRequests?: boolean;
}

export interface ExceptionBreakpointsFilter {
  filter: string;
  label: string;
  description?: string;
  default?: boolean;
  supportsCondition?: boolean;
  conditionDescription?: string;
}

export interface ColumnDescriptor {
  attributeName: string;
  label: string;
  format?: string;
  type?: 'string' | 'number' | 'boolean' | 'unixTimestampUTC';
  width?: number;
}

export type StoppedReason = 'step' | 'breakpoint' | 'exception' | 'pause' | 'entry' | 'goto' | 'function breakpoint' | 'data breakpoint' | 'instruction breakpoint';

export interface DebugEvent {
  event: string;
  body?: Record<string, unknown>;
  seq?: number;
}

export type DebugAdapterState = 'idle' | 'initializing' | 'running' | 'paused' | 'terminated';

// ============================================================================
// Response Types for DAP
// ============================================================================

interface SetBreakpointsResponse {
  breakpoints: Breakpoint[];
}

interface ThreadsResponse {
  threads: Thread[];
}

interface StackTraceResponse {
  stackFrames: StackFrame[];
  totalFrames?: number;
}

interface ScopesResponse {
  scopes: Scope[];
}

interface VariablesResponse {
  variables: Variable[];
}

interface SetVariableResponse {
  value: string;
  type?: string;
  variablesReference?: number;
  namedVariables?: number;
  indexedVariables?: number;
}

interface EvaluateResponse {
  result: string;
  type?: string;
  variablesReference?: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}

interface CompletionsResponse {
  targets: Array<{
    label: string;
    type?: string;
    text?: string;
    sortText?: string;
    detail?: string;
    start?: number;
    length?: number;
    selectionStart?: number;
    selectionLength?: number;
  }>;
}

interface SourceResponse {
  content: string;
  mimeType?: string;
}

interface LoadedSourcesResponse {
  sources: Source[];
}

interface ReadMemoryResponse {
  address: string;
  unreadableBytes?: number;
  data?: string;
}

interface WriteMemoryResponse {
  offset?: number;
  bytesWritten?: number;
}

// ============================================================================
// Real Debug Adapter Client
// ============================================================================

export class RealDebugAdapter extends EventEmitter {
  private sessionId: string | null = null;
  private config: DebugConfiguration;
  private capabilities: Capabilities = {};
  private state: DebugAdapterState = 'idle';
  private threads: Thread[] = [];
  private currentThreadId: number = 1;
  private breakpoints: Map<string, Breakpoint[]> = new Map();
  private eventPollingInterval: NodeJS.Timeout | null = null;
  private lastEventSeq: number = 0;
  
  constructor(config: DebugConfiguration) {
    super();
    this.config = config;
  }
  
  // ==========================================================================
  // Session Management
  // ==========================================================================
  
  async initialize(): Promise<Capabilities> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize in state: ${this.state}`);
    }
    
    this.state = 'initializing';
    
    try {
      // Start DAP session on server
      const response = await fetch('/api/dap/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: this.config.type,
          workspaceRoot: this.config.cwd,
          cwd: this.config.cwd,
          env: this.config.env,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start debug session');
      }
      
      const data = await response.json();
      this.sessionId = data.sessionId;
      
      // Send initialize request
      this.capabilities = await this.sendRequest('initialize', {
        clientID: 'aethel-ide',
        clientName: 'Aethel Engine IDE',
        adapterID: this.config.type,
        pathFormat: 'path',
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: true,
        supportsRunInTerminalRequest: true,
        supportsMemoryReferences: true,
        supportsProgressReporting: true,
        supportsInvalidatedEvent: true,
      });
      
      // Start event polling
      this.startEventPolling();
      
      this.emit('initialized', this.capabilities);
      
      return this.capabilities;
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }
  
  async launch(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Debug session not initialized');
    }
    
    // Build launch configuration
    const launchArgs: Record<string, unknown> = {
      type: this.config.type,
      request: 'launch',
      name: this.config.name,
      program: this.config.program,
      args: this.config.args,
      cwd: this.config.cwd,
      env: this.config.env,
      stopOnEntry: this.config.stopOnEntry,
    };
    
    // Add type-specific options
    if (this.config.type === 'python') {
      if (this.config.pythonPath) launchArgs.pythonPath = this.config.pythonPath;
      if (this.config.module) launchArgs.module = this.config.module;
      if (this.config.django) launchArgs.django = true;
      if (this.config.flask) launchArgs.flask = true;
    } else if (this.config.type === 'node' || this.config.type === 'nodejs') {
      if (this.config.runtimeExecutable) launchArgs.runtimeExecutable = this.config.runtimeExecutable;
      if (this.config.runtimeArgs) launchArgs.runtimeArgs = this.config.runtimeArgs;
      if (this.config.skipFiles) launchArgs.skipFiles = this.config.skipFiles;
    } else if (this.config.type === 'go') {
      if (this.config.mode) launchArgs.mode = this.config.mode;
    }
    
    await this.sendRequest('launch', launchArgs);
    await this.sendRequest('configurationDone', {});
    
    this.state = 'running';
    this.emit('launched');
  }
  
  async attach(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Debug session not initialized');
    }
    
    await this.sendRequest('attach', {
      type: this.config.type,
      host: this.config.host || 'localhost',
      port: this.config.port,
    });
    
    await this.sendRequest('configurationDone', {});
    
    this.state = 'running';
    this.emit('attached');
  }
  
  async disconnect(terminateDebuggee: boolean = true): Promise<void> {
    if (!this.sessionId) return;
    
    this.stopEventPolling();
    
    try {
      await this.sendRequest('disconnect', { terminateDebuggee });
    } catch {
      // Ignore errors during disconnect
    }
    
    // Stop session on server
    try {
      await fetch('/api/dap/session/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch {
      // Ignore
    }
    
    this.state = 'terminated';
    this.sessionId = null;
    this.emit('terminated');
  }
  
  async terminate(): Promise<void> {
    await this.disconnect(true);
  }
  
  // ==========================================================================
  // Execution Control
  // ==========================================================================
  
  async continue(threadId?: number): Promise<void> {
    await this.sendRequest('continue', {
      threadId: threadId || this.currentThreadId,
    });
    
    this.state = 'running';
  }
  
  async pause(threadId?: number): Promise<void> {
    await this.sendRequest('pause', {
      threadId: threadId || this.currentThreadId,
    });
    
    this.state = 'paused';
  }
  
  async stepOver(threadId?: number): Promise<void> {
    await this.sendRequest('next', {
      threadId: threadId || this.currentThreadId,
      granularity: 'statement',
    });
    
    this.state = 'running';
  }
  
  async stepInto(threadId?: number): Promise<void> {
    await this.sendRequest('stepIn', {
      threadId: threadId || this.currentThreadId,
      granularity: 'statement',
    });
    
    this.state = 'running';
  }
  
  async stepOut(threadId?: number): Promise<void> {
    await this.sendRequest('stepOut', {
      threadId: threadId || this.currentThreadId,
      granularity: 'statement',
    });
    
    this.state = 'running';
  }
  
  async restartFrame(frameId: number): Promise<void> {
    if (!this.capabilities.supportsRestartFrame) {
      throw new Error('Restart frame not supported');
    }
    
    await this.sendRequest('restartFrame', { frameId });
  }
  
  async restart(): Promise<void> {
    if (!this.capabilities.supportsRestartRequest) {
      // Manual restart
      await this.disconnect(true);
      await this.initialize();
      await this.launch();
      return;
    }
    
    await this.sendRequest('restart', {});
  }
  
  // ==========================================================================
  // Breakpoints
  // ==========================================================================
  
  async setBreakpoints(
    source: Source,
    breakpoints: SourceBreakpoint[]
  ): Promise<Breakpoint[]> {
    const response = await this.sendRequest<SetBreakpointsResponse>('setBreakpoints', {
      source,
      breakpoints,
      sourceModified: false,
    });
    
    const verifiedBreakpoints = response.breakpoints || [];
    
    // Store breakpoints
    if (source.path) {
      this.breakpoints.set(source.path, verifiedBreakpoints);
    }
    
    return verifiedBreakpoints;
  }
  
  async setFunctionBreakpoints(breakpoints: Array<{
    name: string;
    condition?: string;
    hitCondition?: string;
  }>): Promise<Breakpoint[]> {
    if (!this.capabilities.supportsFunctionBreakpoints) {
      throw new Error('Function breakpoints not supported');
    }
    
    const response = await this.sendRequest<SetBreakpointsResponse>('setFunctionBreakpoints', {
      breakpoints,
    });
    
    return response.breakpoints || [];
  }
  
  async setExceptionBreakpoints(filters: string[], filterOptions?: Array<{
    filterId: string;
    condition?: string;
  }>): Promise<Breakpoint[]> {
    const response = await this.sendRequest<SetBreakpointsResponse>('setExceptionBreakpoints', {
      filters,
      filterOptions,
    });
    
    return response.breakpoints || [];
  }
  
  async setDataBreakpoints(breakpoints: Array<{
    dataId: string;
    accessType?: 'read' | 'write' | 'readWrite';
    condition?: string;
    hitCondition?: string;
  }>): Promise<Breakpoint[]> {
    if (!this.capabilities.supportsDataBreakpoints) {
      throw new Error('Data breakpoints not supported');
    }
    
    const response = await this.sendRequest<SetBreakpointsResponse>('setDataBreakpoints', {
      breakpoints,
    });
    
    return response.breakpoints || [];
  }
  
  async clearAllBreakpoints(): Promise<void> {
    for (const [path] of this.breakpoints) {
      await this.setBreakpoints({ path }, []);
    }
    this.breakpoints.clear();
  }
  
  getBreakpoints(path?: string): Breakpoint[] {
    if (path) {
      return this.breakpoints.get(path) || [];
    }
    
    const all: Breakpoint[] = [];
    for (const bps of this.breakpoints.values()) {
      all.push(...bps);
    }
    return all;
  }
  
  // ==========================================================================
  // Stack & Variables
  // ==========================================================================
  
  async getThreads(): Promise<Thread[]> {
    const response = await this.sendRequest<ThreadsResponse>('threads', {});
    this.threads = response.threads || [];
    return this.threads;
  }
  
  async getStackTrace(
    threadId: number,
    startFrame?: number,
    levels?: number
  ): Promise<{ stackFrames: StackFrame[]; totalFrames?: number }> {
    const response = await this.sendRequest<StackTraceResponse>('stackTrace', {
      threadId,
      startFrame: startFrame || 0,
      levels: levels || 20,
    });
    
    return {
      stackFrames: response.stackFrames || [],
      totalFrames: response.totalFrames,
    };
  }
  
  async getScopes(frameId: number): Promise<Scope[]> {
    const response = await this.sendRequest<ScopesResponse>('scopes', { frameId });
    return response.scopes || [];
  }
  
  async getVariables(
    variablesReference: number,
    filter?: 'indexed' | 'named',
    start?: number,
    count?: number
  ): Promise<Variable[]> {
    const response = await this.sendRequest<VariablesResponse>('variables', {
      variablesReference,
      filter,
      start,
      count,
    });
    
    return response.variables || [];
  }
  
  async setVariable(
    variablesReference: number,
    name: string,
    value: string
  ): Promise<Variable> {
    if (!this.capabilities.supportsSetVariable) {
      throw new Error('Set variable not supported');
    }
    
    const response = await this.sendRequest<SetVariableResponse>('setVariable', {
      variablesReference,
      name,
      value,
    });
    
    return {
      name,
      value: response.value,
      type: response.type,
      variablesReference: response.variablesReference || 0,
      namedVariables: response.namedVariables,
      indexedVariables: response.indexedVariables,
    };
  }
  
  // ==========================================================================
  // Evaluation
  // ==========================================================================
  
  async evaluate(
    expression: string,
    frameId?: number,
    context?: 'watch' | 'repl' | 'hover' | 'clipboard'
  ): Promise<{
    result: string;
    type?: string;
    variablesReference: number;
    namedVariables?: number;
    indexedVariables?: number;
    memoryReference?: string;
  }> {
    const response = await this.sendRequest<EvaluateResponse>('evaluate', {
      expression,
      frameId,
      context: context || 'repl',
    });
    
    return {
      result: response.result,
      type: response.type,
      variablesReference: response.variablesReference || 0,
      namedVariables: response.namedVariables,
      indexedVariables: response.indexedVariables,
      memoryReference: response.memoryReference,
    };
  }
  
  async getCompletions(
    frameId: number | undefined,
    text: string,
    column: number,
    line?: number
  ): Promise<Array<{
    label: string;
    type?: string;
    text?: string;
    sortText?: string;
    detail?: string;
    start?: number;
    length?: number;
    selectionStart?: number;
    selectionLength?: number;
  }>> {
    if (!this.capabilities.supportsCompletionsRequest) {
      return [];
    }
    
    const response = await this.sendRequest<CompletionsResponse>('completions', {
      frameId,
      text,
      column,
      line,
    });
    
    return response.targets || [];
  }
  
  // ==========================================================================
  // Source Management
  // ==========================================================================
  
  async getSource(sourceReference: number): Promise<{ content: string; mimeType?: string }> {
    const response = await this.sendRequest<SourceResponse>('source', { sourceReference });
    return {
      content: response.content,
      mimeType: response.mimeType,
    };
  }
  
  async getLoadedSources(): Promise<Source[]> {
    if (!this.capabilities.supportsLoadedSourcesRequest) {
      return [];
    }
    
    const response = await this.sendRequest<LoadedSourcesResponse>('loadedSources', {});
    return response.sources || [];
  }
  
  // ==========================================================================
  // Memory Operations
  // ==========================================================================
  
  async readMemory(
    memoryReference: string,
    offset?: number,
    count?: number
  ): Promise<{ address: string; unreadableBytes?: number; data?: string }> {
    if (!this.capabilities.supportsReadMemoryRequest) {
      throw new Error('Read memory not supported');
    }
    
    const response = await this.sendRequest<ReadMemoryResponse>('readMemory', {
      memoryReference,
      offset: offset || 0,
      count: count || 256,
    });
    
    return {
      address: response.address,
      unreadableBytes: response.unreadableBytes,
      data: response.data,
    };
  }
  
  async writeMemory(
    memoryReference: string,
    data: string,
    offset?: number
  ): Promise<{ offset?: number; bytesWritten?: number }> {
    if (!this.capabilities.supportsWriteMemoryRequest) {
      throw new Error('Write memory not supported');
    }
    
    return await this.sendRequest<WriteMemoryResponse>('writeMemory', {
      memoryReference,
      offset: offset || 0,
      data,
    });
  }
  
  // ==========================================================================
  // State Getters
  // ==========================================================================
  
  getState(): DebugAdapterState {
    return this.state;
  }
  
  getCapabilities(): Capabilities {
    return this.capabilities;
  }
  
  getConfiguration(): DebugConfiguration {
    return this.config;
  }
  
  getCurrentThreadId(): number {
    return this.currentThreadId;
  }
  
  setCurrentThreadId(threadId: number): void {
    this.currentThreadId = threadId;
  }
  
  isRunning(): boolean {
    return this.state === 'running';
  }
  
  isPaused(): boolean {
    return this.state === 'paused';
  }
  
  isTerminated(): boolean {
    return this.state === 'terminated';
  }
  
  // ==========================================================================
  // Internal Methods
  // ==========================================================================
  
  private async sendRequest<T = Record<string, unknown>>(command: string, args: Record<string, unknown>): Promise<T> {
    if (!this.sessionId) {
      throw new Error('No active debug session');
    }
    
    const response = await fetch('/api/dap/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        command,
        arguments: args,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `DAP request failed: ${command}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || `DAP request failed: ${command}`);
    }
    
    return (data.body || {}) as T;
  }
  
  private startEventPolling(): void {
    if (this.eventPollingInterval) return;
    
    this.eventPollingInterval = setInterval(async () => {
      if (!this.sessionId) return;
      
      try {
        const response = await fetch(`/api/dap/events?sessionId=${this.sessionId}&since=${this.lastEventSeq}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.events && Array.isArray(data.events)) {
          for (const event of data.events) {
            this.handleEvent(event);
            if (event.seq > this.lastEventSeq) {
              this.lastEventSeq = event.seq;
            }
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 100); // Poll every 100ms
  }
  
  private stopEventPolling(): void {
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval);
      this.eventPollingInterval = null;
    }
  }
  
  private handleEvent(event: DebugEvent): void {
    const { event: eventType, body } = event;
    
    switch (eventType) {
      case 'initialized':
        this.emit('initialized', this.capabilities);
        break;
        
      case 'stopped':
        this.state = 'paused';
        if (body?.threadId) {
          this.currentThreadId = body.threadId as number;
        }
        this.emit('stopped', {
          reason: body?.reason as StoppedReason || 'pause',
          threadId: body?.threadId,
          text: body?.text,
          allThreadsStopped: body?.allThreadsStopped,
          preserveFocusHint: body?.preserveFocusHint,
        });
        break;
        
      case 'continued':
        this.state = 'running';
        this.emit('continued', {
          threadId: body?.threadId,
          allThreadsContinued: body?.allThreadsContinued,
        });
        break;
        
      case 'thread':
        if (body?.reason === 'started') {
          this.emit('threadStarted', { threadId: body?.threadId });
        } else if (body?.reason === 'exited') {
          this.emit('threadExited', { threadId: body?.threadId });
        }
        break;
        
      case 'output':
        this.emit('output', {
          category: body?.category || 'console',
          output: body?.output || '',
          source: body?.source,
          line: body?.line,
          column: body?.column,
        });
        break;
        
      case 'breakpoint':
        this.emit('breakpointChanged', {
          reason: body?.reason,
          breakpoint: body?.breakpoint,
        });
        break;
        
      case 'module':
        this.emit('moduleLoaded', body);
        break;
        
      case 'loadedSource':
        this.emit('sourceLoaded', body);
        break;
        
      case 'process':
        this.emit('process', {
          name: body?.name,
          startMethod: body?.startMethod,
        });
        break;
        
      case 'exited':
        this.emit('exited', { exitCode: body?.exitCode });
        break;
        
      case 'terminated':
        this.state = 'terminated';
        this.stopEventPolling();
        this.emit('terminated');
        break;
        
      default:
        this.emit('event', event);
    }
  }
}

// ============================================================================
// Debug Session Manager
// ============================================================================

export class DebugSessionManager {
  private static instance: DebugSessionManager;
  private sessions: Map<string, RealDebugAdapter> = new Map();
  private activeSessionId: string | null = null;
  
  static getInstance(): DebugSessionManager {
    if (!DebugSessionManager.instance) {
      DebugSessionManager.instance = new DebugSessionManager();
    }
    return DebugSessionManager.instance;
  }
  
  async startSession(config: DebugConfiguration): Promise<RealDebugAdapter> {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const adapter = new RealDebugAdapter(config);
    
    // Initialize
    await adapter.initialize();
    
    // Launch or attach
    if (config.request === 'attach') {
      await adapter.attach();
    } else {
      await adapter.launch();
    }
    
    // Store session
    this.sessions.set(sessionId, adapter);
    this.activeSessionId = sessionId;
    
    // Cleanup on termination
    adapter.on('terminated', () => {
      this.sessions.delete(sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    });
    
    return adapter;
  }
  
  getActiveSession(): RealDebugAdapter | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }
  
  getSession(sessionId: string): RealDebugAdapter | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessions(): Map<string, RealDebugAdapter> {
    return new Map(this.sessions);
  }
  
  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
    }
  }
  
  async stopSession(sessionId: string): Promise<void> {
    const adapter = this.sessions.get(sessionId);
    if (adapter) {
      await adapter.disconnect();
      this.sessions.delete(sessionId);
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = null;
      }
    }
  }
  
  async stopAllSessions(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map((id) =>
      this.stopSession(id)
    );
    await Promise.all(promises);
  }
}

export const debugManager = DebugSessionManager.getInstance();
export default RealDebugAdapter;
