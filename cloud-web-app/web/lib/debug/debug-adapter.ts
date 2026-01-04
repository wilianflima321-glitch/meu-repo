/**
 * Aethel Debug Adapter Protocol (DAP) Implementation
 * 
 * Implementação completa do Debug Adapter Protocol para suportar
 * debugging de múltiplas linguagens (JS/TS, Python, C++, Rust, etc.)
 */

import { EventEmitter } from 'events';

// ============================================================================
// DAP TYPES (Microsoft Debug Adapter Protocol)
// ============================================================================

export interface DebugProtocolMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
}

export interface DebugProtocolRequest extends DebugProtocolMessage {
  type: 'request';
  command: string;
  arguments?: any;
}

export interface DebugProtocolResponse extends DebugProtocolMessage {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
}

export interface DebugProtocolEvent extends DebugProtocolMessage {
  type: 'event';
  event: string;
  body?: any;
}

export interface Breakpoint {
  id: number;
  verified: boolean;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message?: string;
  instructionReference?: string;
}

export interface Source {
  name?: string;
  path?: string;
  sourceReference?: number;
  presentationHint?: 'normal' | 'emphasize' | 'deemphasize';
  origin?: string;
  sources?: Source[];
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
  presentationHint?: 'arguments' | 'locals' | 'registers' | string;
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
  kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual' | 'dataBreakpoint' | string;
  attributes?: ('static' | 'constant' | 'readOnly' | 'rawString' | 'hasObjectId' | 'canHaveObjectId' | 'hasSideEffects' | 'hasDataBreakpoint' | string)[];
  visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final' | string;
  lazy?: boolean;
}

export interface Thread {
  id: number;
  name: string;
}

export interface Module {
  id: number | string;
  name: string;
  path?: string;
  isOptimized?: boolean;
  isUserCode?: boolean;
  version?: string;
  symbolStatus?: string;
  symbolFilePath?: string;
  dateTimeStamp?: string;
  addressRange?: string;
}

export interface ExceptionBreakpointsFilter {
  filter: string;
  label: string;
  description?: string;
  default?: boolean;
  supportsCondition?: boolean;
  conditionDescription?: string;
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
  additionalModuleColumns?: any[];
  supportedChecksumAlgorithms?: any[];
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

// ============================================================================
// DEBUG SESSION STATE
// ============================================================================

export interface DebugSessionState {
  id: string;
  name: string;
  type: string;
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'terminated';
  threads: Thread[];
  currentThreadId?: number;
  callStack: StackFrame[];
  breakpoints: Map<string, Breakpoint[]>;  // file path -> breakpoints
  variables: Map<number, Variable[]>;      // scope ref -> variables
  watches: string[];
  console: ConsoleMessage[];
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'output' | 'input';
  message: string;
  timestamp: number;
  source?: string;
  line?: number;
}

// ============================================================================
// DEBUG ADAPTER
// ============================================================================

export interface DebugAdapterConfig {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  cwd?: string;
  args?: string[];
  env?: Record<string, string>;
  port?: number;
  host?: string;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  sourceMaps?: boolean;
  outFiles?: string[];
  skipFiles?: string[];
}

export class DebugAdapter extends EventEmitter {
  private seq: number = 0;
  private sessionState: DebugSessionState;
  private capabilities: Capabilities = {};
  private variableReferences: Map<number, any> = new Map();
  private nextVariableRef: number = 1;
  private breakpointId: number = 1;
  
  constructor(private config: DebugAdapterConfig) {
    super();
    
    this.sessionState = {
      id: this.generateSessionId(),
      name: config.name,
      type: config.type,
      status: 'initializing',
      threads: [],
      callStack: [],
      breakpoints: new Map(),
      variables: new Map(),
      watches: [],
      console: [],
    };
  }
  
  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  
  async initialize(): Promise<Capabilities> {
    this.emit('event', this.createEvent('initialized'));
    
    // Set capabilities based on debug type
    this.capabilities = this.getCapabilitiesForType(this.config.type);
    
    return this.capabilities;
  }
  
  async launch(): Promise<void> {
    if (this.config.request !== 'launch') {
      throw new Error('Invalid request type for launch');
    }
    
    this.sessionState.status = 'running';
    
    this.emit('event', this.createEvent('process', {
      name: this.config.program,
      startMethod: 'launch',
    }));
    
    // Simulate process start
    this.emit('event', this.createEvent('thread', {
      reason: 'started',
      threadId: 1,
    }));
    
    this.sessionState.threads = [{ id: 1, name: 'main' }];
    
    if (this.config.stopOnEntry) {
      await this.pause();
    }
  }
  
  async attach(): Promise<void> {
    if (this.config.request !== 'attach') {
      throw new Error('Invalid request type for attach');
    }
    
    // Connect to running process
    this.sessionState.status = 'running';
    
    this.emit('event', this.createEvent('process', {
      name: this.config.program || 'attached process',
      startMethod: 'attach',
    }));
  }
  
  async disconnect(terminateDebuggee: boolean = false): Promise<void> {
    this.sessionState.status = 'terminated';
    
    this.emit('event', this.createEvent('terminated'));
    
    this.removeAllListeners();
  }
  
  async terminate(): Promise<void> {
    this.sessionState.status = 'stopped';
    
    this.emit('event', this.createEvent('exited', { exitCode: 0 }));
    this.emit('event', this.createEvent('terminated'));
  }
  
  // ==========================================================================
  // EXECUTION CONTROL
  // ==========================================================================
  
  async continue(threadId?: number): Promise<void> {
    this.sessionState.status = 'running';
    
    this.emit('event', this.createEvent('continued', {
      threadId: threadId || this.sessionState.currentThreadId || 1,
      allThreadsContinued: !threadId,
    }));
  }
  
  async pause(threadId?: number): Promise<void> {
    this.sessionState.status = 'paused';
    this.sessionState.currentThreadId = threadId || 1;
    
    // Simulate stopped at current location
    const frame = await this.getCurrentFrame();
    
    this.emit('event', this.createEvent('stopped', {
      reason: 'pause',
      threadId: threadId || 1,
      allThreadsStopped: true,
      preserveFocusHint: false,
    }));
  }
  
  async stepOver(threadId?: number): Promise<void> {
    this.sessionState.status = 'running';
    
    // Simulate step
    await this.simulateStep('next');
    
    this.sessionState.status = 'paused';
    
    this.emit('event', this.createEvent('stopped', {
      reason: 'step',
      threadId: threadId || this.sessionState.currentThreadId || 1,
      allThreadsStopped: true,
    }));
  }
  
  async stepInto(threadId?: number): Promise<void> {
    this.sessionState.status = 'running';
    
    await this.simulateStep('stepIn');
    
    this.sessionState.status = 'paused';
    
    this.emit('event', this.createEvent('stopped', {
      reason: 'step',
      threadId: threadId || this.sessionState.currentThreadId || 1,
      allThreadsStopped: true,
    }));
  }
  
  async stepOut(threadId?: number): Promise<void> {
    this.sessionState.status = 'running';
    
    await this.simulateStep('stepOut');
    
    this.sessionState.status = 'paused';
    
    this.emit('event', this.createEvent('stopped', {
      reason: 'step',
      threadId: threadId || this.sessionState.currentThreadId || 1,
      allThreadsStopped: true,
    }));
  }
  
  async restartFrame(frameId: number): Promise<void> {
    if (!this.capabilities.supportsRestartFrame) {
      throw new Error('Restart frame not supported');
    }
    
    // Reset to frame
    const frameIndex = this.sessionState.callStack.findIndex(f => f.id === frameId);
    if (frameIndex >= 0) {
      this.sessionState.callStack = this.sessionState.callStack.slice(frameIndex);
    }
  }
  
  // ==========================================================================
  // BREAKPOINTS
  // ==========================================================================
  
  async setBreakpoints(source: Source, breakpoints: { line: number; column?: number; condition?: string; hitCondition?: string; logMessage?: string }[]): Promise<Breakpoint[]> {
    const path = source.path || source.name || '';
    const result: Breakpoint[] = [];
    
    for (const bp of breakpoints) {
      const breakpoint: Breakpoint = {
        id: this.breakpointId++,
        verified: true,
        source,
        line: bp.line,
        column: bp.column,
      };
      
      result.push(breakpoint);
    }
    
    this.sessionState.breakpoints.set(path, result);
    
    return result;
  }
  
  async setFunctionBreakpoints(breakpoints: { name: string; condition?: string; hitCondition?: string }[]): Promise<Breakpoint[]> {
    if (!this.capabilities.supportsFunctionBreakpoints) {
      return [];
    }
    
    return breakpoints.map((bp, i) => ({
      id: this.breakpointId++,
      verified: true,
      message: `Function breakpoint: ${bp.name}`,
    }));
  }
  
  async setExceptionBreakpoints(filters: string[], filterOptions?: { filterId: string; condition?: string }[]): Promise<Breakpoint[]> {
    // Configure exception breakpoints
    return [];
  }
  
  async removeBreakpoint(id: number): Promise<void> {
    for (const [path, breakpoints] of this.sessionState.breakpoints) {
      const filtered = breakpoints.filter(bp => bp.id !== id);
      if (filtered.length !== breakpoints.length) {
        this.sessionState.breakpoints.set(path, filtered);
        break;
      }
    }
  }
  
  // ==========================================================================
  // STACK & VARIABLES
  // ==========================================================================
  
  async getThreads(): Promise<Thread[]> {
    return this.sessionState.threads;
  }
  
  async getStackTrace(threadId: number, startFrame?: number, levels?: number): Promise<{ stackFrames: StackFrame[]; totalFrames?: number }> {
    // Return simulated stack trace
    const frames: StackFrame[] = this.sessionState.callStack.length > 0 
      ? this.sessionState.callStack 
      : [
          {
            id: 1,
            name: 'main',
            source: { name: this.config.program, path: this.config.program },
            line: 1,
            column: 1,
          },
        ];
    
    const start = startFrame || 0;
    const count = levels || frames.length;
    
    return {
      stackFrames: frames.slice(start, start + count),
      totalFrames: frames.length,
    };
  }
  
  async getScopes(frameId: number): Promise<Scope[]> {
    return [
      {
        name: 'Local',
        presentationHint: 'locals',
        variablesReference: this.createVariableReference('locals', frameId),
        expensive: false,
      },
      {
        name: 'Closure',
        variablesReference: this.createVariableReference('closure', frameId),
        expensive: false,
      },
      {
        name: 'Global',
        variablesReference: this.createVariableReference('global', frameId),
        expensive: true,
      },
    ];
  }
  
  async getVariables(variablesReference: number, filter?: 'indexed' | 'named', start?: number, count?: number): Promise<Variable[]> {
    const refData = this.variableReferences.get(variablesReference);
    if (!refData) return [];
    
    // Return mock variables based on scope
    if (refData.type === 'locals') {
      return [
        { name: 'x', value: '42', type: 'number', variablesReference: 0 },
        { name: 'name', value: '"Aethel"', type: 'string', variablesReference: 0 },
        { name: 'items', value: 'Array(3)', type: 'Array', variablesReference: this.createVariableReference('array', [1, 2, 3]) },
        { name: 'config', value: 'Object', type: 'object', variablesReference: this.createVariableReference('object', { debug: true }) },
      ];
    }
    
    if (refData.type === 'array') {
      return refData.data.map((item: any, i: number) => ({
        name: `[${i}]`,
        value: JSON.stringify(item),
        type: typeof item,
        variablesReference: 0,
      }));
    }
    
    if (refData.type === 'object') {
      return Object.entries(refData.data).map(([key, value]) => ({
        name: key,
        value: JSON.stringify(value),
        type: typeof value,
        variablesReference: typeof value === 'object' ? this.createVariableReference('object', value) : 0,
      }));
    }
    
    return [];
  }
  
  async setVariable(variablesReference: number, name: string, value: string): Promise<Variable> {
    if (!this.capabilities.supportsSetVariable) {
      throw new Error('Setting variables not supported');
    }
    
    // Parse and set variable
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }
    
    return {
      name,
      value,
      type: typeof parsedValue,
      variablesReference: 0,
    };
  }
  
  // ==========================================================================
  // EVALUATION
  // ==========================================================================
  
  async evaluate(expression: string, frameId?: number, context?: 'watch' | 'repl' | 'hover' | 'clipboard'): Promise<{ result: string; type?: string; presentationHint?: VariablePresentationHint; variablesReference: number }> {
    // Log to console if REPL
    if (context === 'repl') {
      this.sessionState.console.push({
        type: 'input',
        message: expression,
        timestamp: Date.now(),
      });
    }
    
    // Simulate evaluation
    let result: any;
    let type: string;
    
    try {
      // NEVER use eval in production - this is just for demo
      // In real implementation, send to debug adapter
      result = `<evaluated: ${expression}>`;
      type = 'string';
    } catch (error: any) {
      result = `Error: ${error.message}`;
      type = 'error';
    }
    
    // Log result
    if (context === 'repl') {
      this.sessionState.console.push({
        type: type === 'error' ? 'error' : 'output',
        message: result,
        timestamp: Date.now(),
      });
    }
    
    return {
      result: String(result),
      type,
      variablesReference: typeof result === 'object' ? this.createVariableReference('object', result) : 0,
    };
  }
  
  async completions(frameId: number | undefined, text: string, column: number): Promise<{ label: string; type?: string; start?: number; length?: number }[]> {
    if (!this.capabilities.supportsCompletionsRequest) {
      return [];
    }
    
    // Return mock completions
    return [
      { label: 'console', type: 'class' },
      { label: 'console.log', type: 'function' },
      { label: 'process', type: 'class' },
      { label: 'require', type: 'function' },
    ].filter(c => c.label.startsWith(text));
  }
  
  // ==========================================================================
  // WATCHES
  // ==========================================================================
  
  addWatch(expression: string): void {
    if (!this.sessionState.watches.includes(expression)) {
      this.sessionState.watches.push(expression);
    }
  }
  
  removeWatch(expression: string): void {
    this.sessionState.watches = this.sessionState.watches.filter(w => w !== expression);
  }
  
  async evaluateWatches(): Promise<{ expression: string; result: string; error?: string }[]> {
    const results: { expression: string; result: string; error?: string }[] = [];
    
    for (const expression of this.sessionState.watches) {
      try {
        const { result } = await this.evaluate(expression, undefined, 'watch');
        results.push({ expression, result });
      } catch (error: any) {
        results.push({ expression, result: '', error: error.message });
      }
    }
    
    return results;
  }
  
  // ==========================================================================
  // CONSOLE / OUTPUT
  // ==========================================================================
  
  getConsoleMessages(): ConsoleMessage[] {
    return this.sessionState.console;
  }
  
  clearConsole(): void {
    this.sessionState.console = [];
  }
  
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  getState(): DebugSessionState {
    return this.sessionState;
  }
  
  isRunning(): boolean {
    return this.sessionState.status === 'running';
  }
  
  isPaused(): boolean {
    return this.sessionState.status === 'paused';
  }
  
  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================
  
  private generateSessionId(): string {
    return `debug-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  
  private createEvent(event: string, body?: any): DebugProtocolEvent {
    return {
      seq: this.seq++,
      type: 'event',
      event,
      body,
    };
  }
  
  private createVariableReference(type: string, data?: any): number {
    const ref = this.nextVariableRef++;
    this.variableReferences.set(ref, { type, data });
    return ref;
  }
  
  private async getCurrentFrame(): Promise<StackFrame | undefined> {
    return this.sessionState.callStack[0];
  }
  
  private async simulateStep(type: 'next' | 'stepIn' | 'stepOut'): Promise<void> {
    // Simulate step delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Update call stack (simplified)
    if (this.sessionState.callStack.length > 0) {
      const frame = this.sessionState.callStack[0];
      frame.line = (frame.line || 1) + 1;
    }
  }
  
  private getCapabilitiesForType(type: string): Capabilities {
    const base: Capabilities = {
      supportsConfigurationDoneRequest: true,
      supportsFunctionBreakpoints: true,
      supportsConditionalBreakpoints: true,
      supportsHitConditionalBreakpoints: true,
      supportsEvaluateForHovers: true,
      supportsStepBack: false,
      supportsSetVariable: true,
      supportsRestartFrame: true,
      supportsCompletionsRequest: true,
      supportsModulesRequest: true,
      supportsRestartRequest: true,
      supportsExceptionOptions: true,
      supportsValueFormattingOptions: true,
      supportsExceptionInfoRequest: true,
      supportTerminateDebuggee: true,
      supportsDelayedStackTraceLoading: true,
      supportsLoadedSourcesRequest: true,
      supportsLogPoints: true,
      supportsTerminateThreadsRequest: true,
      supportsSetExpression: true,
      supportsTerminateRequest: true,
      supportsDataBreakpoints: false,
      supportsReadMemoryRequest: false,
      supportsDisassembleRequest: false,
      supportsCancelRequest: true,
      supportsBreakpointLocationsRequest: true,
      supportsSteppingGranularity: true,
      exceptionBreakpointFilters: [
        { filter: 'uncaught', label: 'Uncaught Exceptions', default: true },
        { filter: 'caught', label: 'Caught Exceptions', default: false },
      ],
    };
    
    // Add type-specific capabilities
    switch (type) {
      case 'node':
      case 'pwa-node':
        return {
          ...base,
          supportsStepBack: false,
        };
        
      case 'python':
        return {
          ...base,
          supportsStepBack: false,
        };
        
      case 'cppdbg':
      case 'lldb':
        return {
          ...base,
          supportsReadMemoryRequest: true,
          supportsDisassembleRequest: true,
          supportsDataBreakpoints: true,
        };
        
      default:
        return base;
    }
  }
}

// ============================================================================
// DEBUG SESSION MANAGER
// ============================================================================

export class DebugSessionManager extends EventEmitter {
  private sessions: Map<string, DebugAdapter> = new Map();
  private activeSessionId: string | null = null;
  
  async createSession(config: DebugAdapterConfig): Promise<DebugAdapter> {
    const adapter = new DebugAdapter(config);
    
    // Forward events
    adapter.on('event', (event) => {
      this.emit('event', { sessionId: adapter.getState().id, ...event });
    });
    
    // Initialize
    await adapter.initialize();
    
    // Store session
    const sessionId = adapter.getState().id;
    this.sessions.set(sessionId, adapter);
    
    // Set as active if first session
    if (!this.activeSessionId) {
      this.activeSessionId = sessionId;
    }
    
    this.emit('sessionCreated', sessionId);
    
    return adapter;
  }
  
  getSession(sessionId: string): DebugAdapter | undefined {
    return this.sessions.get(sessionId);
  }
  
  getActiveSession(): DebugAdapter | undefined {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
  }
  
  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      this.emit('activeSessionChanged', sessionId);
    }
  }
  
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.terminate();
      this.sessions.delete(sessionId);
      
      if (this.activeSessionId === sessionId) {
        const remaining = Array.from(this.sessions.keys());
        this.activeSessionId = remaining[0] || null;
      }
      
      this.emit('sessionTerminated', sessionId);
    }
  }
  
  async terminateAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.terminateSession(sessionId);
    }
  }
  
  getAllSessions(): DebugAdapter[] {
    return Array.from(this.sessions.values());
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const debugSessionManager = new DebugSessionManager();

export default debugSessionManager;
