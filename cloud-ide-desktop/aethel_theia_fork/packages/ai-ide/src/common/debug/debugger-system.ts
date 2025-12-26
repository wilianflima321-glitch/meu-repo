/**
 * Debugger System - Professional Debug Infrastructure
 * 
 * Sistema de debug profissional para IDE de produção.
 * Implementação completa do Debug Adapter Protocol (DAP).
 * Inspirado em VS Code, JetBrains, Unreal Engine.
 * Suporta:
 * - Breakpoints (condicionais, logpoints, hit count)
 * - Watch expressions
 * - Call stack navigation
 * - Variable inspection
 * - Step over/into/out
 * - Hot reload
 * - Multi-session debugging
 * - Remote debugging
 */

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Debug Types ====================

/**
 * Debug session state
 */
export enum DebugSessionState {
    Inactive = 'inactive',
    Initializing = 'initializing',
    Running = 'running',
    Paused = 'paused',
    Stopped = 'stopped',
    Terminated = 'terminated'
}

/**
 * Breakpoint type
 */
export enum BreakpointType {
    Line = 'line',
    Conditional = 'conditional',
    Logpoint = 'logpoint',
    Function = 'function',
    Data = 'data',
    Exception = 'exception'
}

/**
 * Breakpoint state
 */
export enum BreakpointState {
    Pending = 'pending',
    Verified = 'verified',
    Invalid = 'invalid',
    Disabled = 'disabled'
}

/**
 * Step action
 */
export enum StepAction {
    Continue = 'continue',
    StepOver = 'stepOver',
    StepInto = 'stepInto',
    StepOut = 'stepOut',
    StepBack = 'stepBack',
    ReverseContinue = 'reverseContinue',
    Restart = 'restart',
    Pause = 'pause',
    Terminate = 'terminate'
}

/**
 * Variable scope
 */
export enum VariableScope {
    Local = 'local',
    Arguments = 'arguments',
    Closure = 'closure',
    Global = 'global',
    Register = 'register'
}

/**
 * Thread state
 */
export enum ThreadState {
    Running = 'running',
    Paused = 'paused',
    Waiting = 'waiting',
    Blocked = 'blocked',
    Terminated = 'terminated'
}

/**
 * Breakpoint
 */
export interface Breakpoint {
    id: string;
    type: BreakpointType;
    state: BreakpointState;
    enabled: boolean;
    
    // Location
    source: DebugSource;
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    
    // Conditional
    condition?: string;
    hitCondition?: string;
    hitCount?: number;
    
    // Logpoint
    logMessage?: string;
    
    // Function breakpoint
    functionName?: string;
    
    // Data breakpoint
    dataId?: string;
    accessType?: 'read' | 'write' | 'readWrite';
    
    // Message
    message?: string;
    verified: boolean;
}

/**
 * Debug source
 */
export interface DebugSource {
    name: string;
    path?: string;
    sourceReference?: number;
    presentationHint?: 'normal' | 'emphasize' | 'deemphasize';
    origin?: string;
    adapterData?: unknown;
}

/**
 * Stack frame
 */
export interface StackFrame {
    id: number;
    name: string;
    source?: DebugSource;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    canRestart?: boolean;
    instructionPointerReference?: string;
    moduleId?: number | string;
    presentationHint?: 'normal' | 'label' | 'subtle';
}

/**
 * Thread
 */
export interface DebugThread {
    id: number;
    name: string;
    state: ThreadState;
    stackFrames?: StackFrame[];
}

/**
 * Variable
 */
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

/**
 * Variable presentation hint
 */
export interface VariablePresentationHint {
    kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual' | 'dataBreakpoint';
    attributes?: ('static' | 'constant' | 'readOnly' | 'rawString' | 'hasObjectId' | 'canHaveObjectId' | 'hasSideEffects' | 'hasDataBreakpoint')[];
    visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final';
    lazy?: boolean;
}

/**
 * Scope
 */
export interface Scope {
    name: string;
    presentationHint?: string;
    variablesReference: number;
    namedVariables?: number;
    indexedVariables?: number;
    expensive: boolean;
    source?: DebugSource;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
}

/**
 * Watch expression
 */
export interface WatchExpression {
    id: string;
    expression: string;
    result?: string;
    type?: string;
    variablesReference?: number;
    error?: string;
}

/**
 * Debug configuration
 */
export interface DebugConfiguration {
    type: string;
    name: string;
    request: 'launch' | 'attach';
    
    // Launch specific
    program?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    
    // Attach specific
    processId?: number;
    port?: number;
    host?: string;
    
    // Common
    stopOnEntry?: boolean;
    console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
    sourceMaps?: boolean;
    outFiles?: string[];
    
    // Custom
    [key: string]: unknown;
}

/**
 * Debug session
 */
export interface DebugSession {
    id: string;
    name: string;
    type: string;
    configuration: DebugConfiguration;
    state: DebugSessionState;
    threads: DebugThread[];
    capabilities: DebugCapabilities;
    startTime: number;
    endTime?: number;
}

/**
 * Debug capabilities
 */
export interface DebugCapabilities {
    supportsConfigurationDoneRequest?: boolean;
    supportsFunctionBreakpoints?: boolean;
    supportsConditionalBreakpoints?: boolean;
    supportsHitConditionalBreakpoints?: boolean;
    supportsEvaluateForHovers?: boolean;
    exceptionBreakpointFilters?: ExceptionBreakpointFilter[];
    supportsStepBack?: boolean;
    supportsSetVariable?: boolean;
    supportsRestartFrame?: boolean;
    supportsGotoTargetsRequest?: boolean;
    supportsStepInTargetsRequest?: boolean;
    supportsCompletionsRequest?: boolean;
    supportsModulesRequest?: boolean;
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

/**
 * Exception breakpoint filter
 */
export interface ExceptionBreakpointFilter {
    filter: string;
    label: string;
    description?: string;
    default?: boolean;
    supportsCondition?: boolean;
    conditionDescription?: string;
}

/**
 * Output event
 */
export interface DebugOutput {
    category: 'console' | 'important' | 'stdout' | 'stderr' | 'telemetry';
    output: string;
    group?: 'start' | 'startCollapsed' | 'end';
    variablesReference?: number;
    source?: DebugSource;
    line?: number;
    column?: number;
    data?: unknown;
}

/**
 * Evaluate result
 */
export interface EvaluateResult {
    result: string;
    type?: string;
    presentationHint?: VariablePresentationHint;
    variablesReference: number;
    namedVariables?: number;
    indexedVariables?: number;
    memoryReference?: string;
}

// ==================== Events ====================

export interface SessionStartedEvent {
    session: DebugSession;
}

export interface SessionStoppedEvent {
    session: DebugSession;
    reason: 'step' | 'breakpoint' | 'exception' | 'pause' | 'entry' | 'goto' | 'function breakpoint' | 'data breakpoint' | 'instruction breakpoint';
    threadId?: number;
    allThreadsStopped?: boolean;
    hitBreakpointIds?: string[];
}

export interface SessionTerminatedEvent {
    session: DebugSession;
    restart?: boolean;
}

export interface BreakpointChangedEvent {
    breakpoint: Breakpoint;
    reason: 'changed' | 'new' | 'removed';
}

export interface OutputEvent {
    sessionId: string;
    output: DebugOutput;
}

// ==================== Debug Adapter Interface ====================

export interface DebugAdapter {
    type: string;
    label: string;
    
    // Lifecycle
    initialize(capabilities: DebugCapabilities): Promise<DebugCapabilities>;
    launch(config: DebugConfiguration): Promise<void>;
    attach(config: DebugConfiguration): Promise<void>;
    disconnect(restart?: boolean): Promise<void>;
    terminate(): Promise<void>;
    
    // Execution
    continue(threadId: number): Promise<void>;
    pause(threadId: number): Promise<void>;
    stepOver(threadId: number): Promise<void>;
    stepInto(threadId: number): Promise<void>;
    stepOut(threadId: number): Promise<void>;
    stepBack?(threadId: number): Promise<void>;
    restartFrame?(frameId: number): Promise<void>;
    
    // Breakpoints
    setBreakpoints(source: DebugSource, breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    setFunctionBreakpoints?(breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    setExceptionBreakpoints?(filters: string[], filterOptions?: unknown[]): Promise<Breakpoint[]>;
    setDataBreakpoints?(breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    
    // Stack & Threads
    threads(): Promise<DebugThread[]>;
    stackTrace(threadId: number, startFrame?: number, levels?: number): Promise<StackFrame[]>;
    scopes(frameId: number): Promise<Scope[]>;
    variables(variablesReference: number, filter?: 'indexed' | 'named', start?: number, count?: number): Promise<Variable[]>;
    
    // Evaluation
    evaluate(expression: string, frameId?: number, context?: string): Promise<EvaluateResult>;
    setVariable?(variablesReference: number, name: string, value: string): Promise<Variable>;
    setExpression?(frameId: number, expression: string, value: string): Promise<EvaluateResult>;
    
    // Events
    onOutput: Event<DebugOutput>;
    onStopped: Event<{ reason: string; threadId?: number; allThreadsStopped?: boolean }>;
    onContinued: Event<{ threadId: number; allThreadsContinued?: boolean }>;
    onExited: Event<{ exitCode?: number }>;
    onTerminated: Event<{ restart?: boolean }>;
    onThread: Event<{ reason: 'started' | 'exited'; threadId: number }>;
    onBreakpoint: Event<{ reason: 'changed' | 'new' | 'removed'; breakpoint: Breakpoint }>;
}

// ==================== Main Debugger System ====================

@injectable()
export class DebuggerSystem {
    // Sessions
    private readonly sessions: Map<string, DebugSession> = new Map();
    private activeSessionId: string | null = null;
    
    // Breakpoints
    private readonly breakpoints: Map<string, Breakpoint> = new Map();
    private readonly breakpointsBySource: Map<string, Set<string>> = new Map();
    private breakpointIdCounter = 0;
    
    // Watch expressions
    private readonly watchExpressions: Map<string, WatchExpression> = new Map();
    private watchIdCounter = 0;
    
    // Adapters
    private readonly adapters: Map<string, () => DebugAdapter> = new Map();
    private readonly activeAdapters: Map<string, DebugAdapter> = new Map();
    
    // Configurations
    private readonly configurations: DebugConfiguration[] = [];
    
    // Events
    private readonly onSessionStartedEmitter = new Emitter<SessionStartedEvent>();
    readonly onSessionStarted: Event<SessionStartedEvent> = this.onSessionStartedEmitter.event;
    
    private readonly onSessionStoppedEmitter = new Emitter<SessionStoppedEvent>();
    readonly onSessionStopped: Event<SessionStoppedEvent> = this.onSessionStoppedEmitter.event;
    
    private readonly onSessionTerminatedEmitter = new Emitter<SessionTerminatedEvent>();
    readonly onSessionTerminated: Event<SessionTerminatedEvent> = this.onSessionTerminatedEmitter.event;
    
    private readonly onBreakpointChangedEmitter = new Emitter<BreakpointChangedEvent>();
    readonly onBreakpointChanged: Event<BreakpointChangedEvent> = this.onBreakpointChangedEmitter.event;
    
    private readonly onOutputEmitter = new Emitter<OutputEvent>();
    readonly onOutput: Event<OutputEvent> = this.onOutputEmitter.event;
    
    private readonly onStateChangedEmitter = new Emitter<{ sessionId: string; state: DebugSessionState }>();
    readonly onStateChanged: Event<{ sessionId: string; state: DebugSessionState }> = this.onStateChangedEmitter.event;

    constructor() {
        this.registerDefaultAdapters();
    }

    // ==================== Adapter Registration ====================

    /**
     * Register debug adapter factory
     */
    registerAdapter(type: string, factory: () => DebugAdapter): Disposable {
        this.adapters.set(type, factory);
        return {
            dispose: () => this.adapters.delete(type)
        };
    }

    /**
     * Register default adapters
     */
    private registerDefaultAdapters(): void {
        // Node.js adapter would be registered here
        // Python adapter would be registered here
        // C++ adapter would be registered here
        // etc.
    }

    /**
     * Get available adapter types
     */
    getAdapterTypes(): string[] {
        return Array.from(this.adapters.keys());
    }

    // ==================== Session Management ====================

    /**
     * Start debug session
     */
    async startSession(config: DebugConfiguration): Promise<DebugSession> {
        const adapterFactory = this.adapters.get(config.type);
        if (!adapterFactory) {
            throw new Error(`No debug adapter registered for type: ${config.type}`);
        }

        const sessionId = this.generateSessionId();
        const adapter = adapterFactory();
        
        // Initialize adapter
        const capabilities = await adapter.initialize({});
        
        // Create session
        const session: DebugSession = {
            id: sessionId,
            name: config.name,
            type: config.type,
            configuration: config,
            state: DebugSessionState.Initializing,
            threads: [],
            capabilities,
            startTime: Date.now()
        };

        this.sessions.set(sessionId, session);
        this.activeAdapters.set(sessionId, adapter);
        
        // Setup event handlers
        this.setupAdapterEvents(sessionId, adapter);
        
        // Launch or attach
        try {
            if (config.request === 'launch') {
                await adapter.launch(config);
            } else {
                await adapter.attach(config);
            }
            
            session.state = DebugSessionState.Running;
            this.activeSessionId = sessionId;
            
            // Set breakpoints
            await this.syncBreakpoints(sessionId);
            
            this.onSessionStartedEmitter.fire({ session });
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
            
        } catch (error) {
            session.state = DebugSessionState.Terminated;
            this.sessions.delete(sessionId);
            this.activeAdapters.delete(sessionId);
            throw error;
        }

        return session;
    }

    /**
     * Stop debug session
     */
    async stopSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        const adapter = this.activeAdapters.get(sessionId);
        
        if (!session || !adapter) return;

        try {
            await adapter.terminate();
        } catch {
            // Ignore termination errors
        }

        session.state = DebugSessionState.Terminated;
        session.endTime = Date.now();
        
        this.activeAdapters.delete(sessionId);
        
        if (this.activeSessionId === sessionId) {
            this.activeSessionId = null;
        }

        this.onSessionTerminatedEmitter.fire({ session });
        this.onStateChangedEmitter.fire({ sessionId, state: session.state });
    }

    /**
     * Restart debug session
     */
    async restartSession(sessionId: string): Promise<DebugSession> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        await this.stopSession(sessionId);
        return this.startSession(session.configuration);
    }

    /**
     * Get session
     */
    getSession(sessionId: string): DebugSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Get active session
     */
    getActiveSession(): DebugSession | undefined {
        return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
    }

    /**
     * Get all sessions
     */
    getAllSessions(): DebugSession[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Set active session
     */
    setActiveSession(sessionId: string): void {
        if (this.sessions.has(sessionId)) {
            this.activeSessionId = sessionId;
        }
    }

    // ==================== Execution Control ====================

    /**
     * Continue execution
     */
    async continue(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        
        await adapter.continue(thread);
        session.state = DebugSessionState.Running;
        this.onStateChangedEmitter.fire({ sessionId: session.id, state: session.state });
    }

    /**
     * Pause execution
     */
    async pause(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        
        await adapter.pause(thread);
    }

    /**
     * Step over
     */
    async stepOver(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        
        await adapter.stepOver(thread);
    }

    /**
     * Step into
     */
    async stepInto(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        
        await adapter.stepInto(thread);
    }

    /**
     * Step out
     */
    async stepOut(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        
        await adapter.stepOut(thread);
    }

    /**
     * Step back (if supported)
     */
    async stepBack(sessionId?: string, threadId?: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        
        if (!session.capabilities.supportsStepBack || !adapter.stepBack) {
            throw new Error('Step back not supported');
        }
        
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.stepBack(thread);
    }

    /**
     * Restart frame
     */
    async restartFrame(sessionId: string, frameId: number): Promise<void> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        
        if (!session.capabilities.supportsRestartFrame || !adapter.restartFrame) {
            throw new Error('Restart frame not supported');
        }
        
        await adapter.restartFrame(frameId);
    }

    // ==================== Breakpoints ====================

    /**
     * Add breakpoint
     */
    addBreakpoint(breakpoint: Omit<Breakpoint, 'id' | 'state' | 'verified'>): Breakpoint {
        const id = `bp_${++this.breakpointIdCounter}`;
        
        const bp: Breakpoint = {
            ...breakpoint,
            id,
            state: BreakpointState.Pending,
            verified: false
        };
        
        this.breakpoints.set(id, bp);
        
        // Index by source
        const sourcePath = bp.source.path || bp.source.name;
        let sourceBreakpoints = this.breakpointsBySource.get(sourcePath);
        if (!sourceBreakpoints) {
            sourceBreakpoints = new Set();
            this.breakpointsBySource.set(sourcePath, sourceBreakpoints);
        }
        sourceBreakpoints.add(id);
        
        // Sync with active sessions
        this.syncBreakpointsToAllSessions();
        
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'new' });
        
        return bp;
    }

    /**
     * Remove breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp) return false;
        
        this.breakpoints.delete(breakpointId);
        
        // Remove from source index
        const sourcePath = bp.source.path || bp.source.name;
        const sourceBreakpoints = this.breakpointsBySource.get(sourcePath);
        if (sourceBreakpoints) {
            sourceBreakpoints.delete(breakpointId);
            if (sourceBreakpoints.size === 0) {
                this.breakpointsBySource.delete(sourcePath);
            }
        }
        
        // Sync with active sessions
        this.syncBreakpointsToAllSessions();
        
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'removed' });
        
        return true;
    }

    /**
     * Update breakpoint
     */
    updateBreakpoint(breakpointId: string, updates: Partial<Breakpoint>): Breakpoint | undefined {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp) return undefined;
        
        Object.assign(bp, updates);
        
        // Sync with active sessions
        this.syncBreakpointsToAllSessions();
        
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'changed' });
        
        return bp;
    }

    /**
     * Toggle breakpoint enabled state
     */
    toggleBreakpoint(breakpointId: string): Breakpoint | undefined {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp) return undefined;
        
        bp.enabled = !bp.enabled;
        bp.state = bp.enabled ? BreakpointState.Pending : BreakpointState.Disabled;
        
        this.syncBreakpointsToAllSessions();
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'changed' });
        
        return bp;
    }

    /**
     * Get all breakpoints
     */
    getBreakpoints(): Breakpoint[] {
        return Array.from(this.breakpoints.values());
    }

    /**
     * Get breakpoints for source
     */
    getBreakpointsForSource(sourcePath: string): Breakpoint[] {
        const ids = this.breakpointsBySource.get(sourcePath);
        if (!ids) return [];
        
        return Array.from(ids)
            .map(id => this.breakpoints.get(id))
            .filter((bp): bp is Breakpoint => bp !== undefined);
    }

    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints(): void {
        const breakpoints = Array.from(this.breakpoints.values());
        this.breakpoints.clear();
        this.breakpointsBySource.clear();
        
        this.syncBreakpointsToAllSessions();
        
        for (const bp of breakpoints) {
            this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'removed' });
        }
    }

    /**
     * Sync breakpoints to session
     */
    private async syncBreakpoints(sessionId: string): Promise<void> {
        const adapter = this.activeAdapters.get(sessionId);
        if (!adapter) return;
        
        // Group breakpoints by source
        const bySource = new Map<string, Breakpoint[]>();
        
        for (const bp of this.breakpoints.values()) {
            if (!bp.enabled) continue;
            
            const sourcePath = bp.source.path || bp.source.name;
            let bps = bySource.get(sourcePath);
            if (!bps) {
                bps = [];
                bySource.set(sourcePath, bps);
            }
            bps.push(bp);
        }
        
        // Send to adapter
        for (const [sourcePath, bps] of bySource) {
            const source: DebugSource = { name: sourcePath, path: sourcePath };
            const verified = await adapter.setBreakpoints(source, bps);
            
            // Update verification status
            for (let i = 0; i < verified.length; i++) {
                const bp = bps[i];
                bp.verified = verified[i].verified;
                bp.state = verified[i].verified ? BreakpointState.Verified : BreakpointState.Invalid;
                bp.message = verified[i].message;
            }
        }
    }

    /**
     * Sync breakpoints to all sessions
     */
    private async syncBreakpointsToAllSessions(): Promise<void> {
        for (const sessionId of this.activeAdapters.keys()) {
            await this.syncBreakpoints(sessionId);
        }
    }

    // ==================== Watch Expressions ====================

    /**
     * Add watch expression
     */
    addWatch(expression: string): WatchExpression {
        const id = `watch_${++this.watchIdCounter}`;
        
        const watch: WatchExpression = {
            id,
            expression
        };
        
        this.watchExpressions.set(id, watch);
        
        // Evaluate if we have an active session
        if (this.activeSessionId) {
            this.evaluateWatch(id);
        }
        
        return watch;
    }

    /**
     * Remove watch expression
     */
    removeWatch(watchId: string): boolean {
        return this.watchExpressions.delete(watchId);
    }

    /**
     * Update watch expression
     */
    updateWatch(watchId: string, expression: string): WatchExpression | undefined {
        const watch = this.watchExpressions.get(watchId);
        if (!watch) return undefined;
        
        watch.expression = expression;
        watch.result = undefined;
        watch.error = undefined;
        
        // Re-evaluate
        if (this.activeSessionId) {
            this.evaluateWatch(watchId);
        }
        
        return watch;
    }

    /**
     * Evaluate watch expression
     */
    async evaluateWatch(watchId: string, frameId?: number): Promise<WatchExpression | undefined> {
        const watch = this.watchExpressions.get(watchId);
        if (!watch) return undefined;
        
        const session = this.getActiveSession();
        const adapter = this.activeSessionId ? this.activeAdapters.get(this.activeSessionId) : undefined;
        
        if (!session || !adapter || session.state !== DebugSessionState.Paused) {
            watch.result = undefined;
            watch.error = 'Not paused';
            return watch;
        }
        
        try {
            const result = await adapter.evaluate(watch.expression, frameId, 'watch');
            watch.result = result.result;
            watch.type = result.type;
            watch.variablesReference = result.variablesReference;
            watch.error = undefined;
        } catch (error) {
            watch.result = undefined;
            watch.error = error instanceof Error ? error.message : String(error);
        }
        
        return watch;
    }

    /**
     * Get all watch expressions
     */
    getWatchExpressions(): WatchExpression[] {
        return Array.from(this.watchExpressions.values());
    }

    /**
     * Evaluate all watches
     */
    async evaluateAllWatches(frameId?: number): Promise<void> {
        for (const watchId of this.watchExpressions.keys()) {
            await this.evaluateWatch(watchId, frameId);
        }
    }

    // ==================== Stack & Variables ====================

    /**
     * Get threads
     */
    async getThreads(sessionId?: string): Promise<DebugThread[]> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        
        const threads = await adapter.threads();
        session.threads = threads;
        
        return threads;
    }

    /**
     * Get stack trace
     */
    async getStackTrace(sessionId: string, threadId: number, startFrame?: number, levels?: number): Promise<StackFrame[]> {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.stackTrace(threadId, startFrame, levels);
    }

    /**
     * Get scopes
     */
    async getScopes(sessionId: string, frameId: number): Promise<Scope[]> {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.scopes(frameId);
    }

    /**
     * Get variables
     */
    async getVariables(
        sessionId: string,
        variablesReference: number,
        filter?: 'indexed' | 'named',
        start?: number,
        count?: number
    ): Promise<Variable[]> {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.variables(variablesReference, filter, start, count);
    }

    /**
     * Set variable value
     */
    async setVariable(
        sessionId: string,
        variablesReference: number,
        name: string,
        value: string
    ): Promise<Variable | undefined> {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        
        if (!session.capabilities.supportsSetVariable || !adapter.setVariable) {
            throw new Error('Set variable not supported');
        }
        
        return adapter.setVariable(variablesReference, name, value);
    }

    // ==================== Evaluation ====================

    /**
     * Evaluate expression
     */
    async evaluate(
        expression: string,
        sessionId?: string,
        frameId?: number,
        context?: 'watch' | 'repl' | 'hover' | 'clipboard'
    ): Promise<EvaluateResult> {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.evaluate(expression, frameId, context);
    }

    // ==================== Configuration ====================

    /**
     * Add debug configuration
     */
    addConfiguration(config: DebugConfiguration): void {
        this.configurations.push(config);
    }

    /**
     * Remove debug configuration
     */
    removeConfiguration(name: string): boolean {
        const index = this.configurations.findIndex(c => c.name === name);
        if (index !== -1) {
            this.configurations.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all configurations
     */
    getConfigurations(): DebugConfiguration[] {
        return [...this.configurations];
    }

    /**
     * Get configuration by name
     */
    getConfiguration(name: string): DebugConfiguration | undefined {
        return this.configurations.find(c => c.name === name);
    }

    // ==================== Event Setup ====================

    /**
     * Setup adapter event handlers
     */
    private setupAdapterEvents(sessionId: string, adapter: DebugAdapter): void {
        const session = this.sessions.get(sessionId)!;
        
        adapter.onOutput((output: DebugOutput) => {
            this.onOutputEmitter.fire({ sessionId, output });
        });
        
        adapter.onStopped((event: { reason: string; threadId?: number; allThreadsStopped?: boolean }) => {
            session.state = DebugSessionState.Paused;
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
            this.onSessionStoppedEmitter.fire({
                session,
                reason: event.reason as any,
                threadId: event.threadId,
                allThreadsStopped: event.allThreadsStopped
            });
            
            // Evaluate watches when stopped
            this.evaluateAllWatches();
        });
        
        adapter.onContinued(() => {
            session.state = DebugSessionState.Running;
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
        });
        
        adapter.onTerminated((event: { restart?: boolean }) => {
            session.state = DebugSessionState.Terminated;
            session.endTime = Date.now();
            this.activeAdapters.delete(sessionId);
            
            if (this.activeSessionId === sessionId) {
                this.activeSessionId = null;
            }
            
            this.onSessionTerminatedEmitter.fire({ session, restart: event.restart });
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
        });
        
        adapter.onThread((event: { reason: string; threadId: number }) => {
            if (event.reason === 'started') {
                session.threads.push({
                    id: event.threadId,
                    name: `Thread ${event.threadId}`,
                    state: ThreadState.Running
                });
            } else {
                const index = session.threads.findIndex(t => t.id === event.threadId);
                if (index !== -1) {
                    session.threads.splice(index, 1);
                }
            }
        });
        
        adapter.onBreakpoint((event: { breakpoint: Breakpoint; reason: 'removed' | 'changed' | 'new' }) => {
            this.onBreakpointChangedEmitter.fire({
                breakpoint: event.breakpoint,
                reason: event.reason
            });
        });
    }

    // ==================== Utilities ====================

    /**
     * Get adapter and session
     */
    private getAdapterAndSession(sessionId?: string): { adapter: DebugAdapter; session: DebugSession } {
        const id = sessionId || this.activeSessionId;
        if (!id) {
            throw new Error('No active debug session');
        }
        
        const session = this.sessions.get(id);
        const adapter = this.activeAdapters.get(id);
        
        if (!session || !adapter) {
            throw new Error(`Session not found: ${id}`);
        }
        
        return { adapter, session };
    }

    /**
     * Generate session ID
     */
    private generateSessionId(): string {
        return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Dispose
     */
    dispose(): void {
        // Stop all sessions
        for (const sessionId of this.sessions.keys()) {
            this.stopSession(sessionId);
        }
        
        this.sessions.clear();
        this.breakpoints.clear();
        this.breakpointsBySource.clear();
        this.watchExpressions.clear();
        this.adapters.clear();
        this.activeAdapters.clear();
        
        this.onSessionStartedEmitter.dispose();
        this.onSessionStoppedEmitter.dispose();
        this.onSessionTerminatedEmitter.dispose();
        this.onBreakpointChangedEmitter.dispose();
        this.onOutputEmitter.dispose();
        this.onStateChangedEmitter.dispose();
    }
}

// ==================== Interfaces ====================

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default DebuggerSystem;
