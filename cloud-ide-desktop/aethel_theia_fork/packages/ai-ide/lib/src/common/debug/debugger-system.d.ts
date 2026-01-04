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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Debug session state
 */
export declare enum DebugSessionState {
    Inactive = "inactive",
    Initializing = "initializing",
    Running = "running",
    Paused = "paused",
    Stopped = "stopped",
    Terminated = "terminated"
}
/**
 * Breakpoint type
 */
export declare enum BreakpointType {
    Line = "line",
    Conditional = "conditional",
    Logpoint = "logpoint",
    Function = "function",
    Data = "data",
    Exception = "exception"
}
/**
 * Breakpoint state
 */
export declare enum BreakpointState {
    Pending = "pending",
    Verified = "verified",
    Invalid = "invalid",
    Disabled = "disabled"
}
/**
 * Step action
 */
export declare enum StepAction {
    Continue = "continue",
    StepOver = "stepOver",
    StepInto = "stepInto",
    StepOut = "stepOut",
    StepBack = "stepBack",
    ReverseContinue = "reverseContinue",
    Restart = "restart",
    Pause = "pause",
    Terminate = "terminate"
}
/**
 * Variable scope
 */
export declare enum VariableScope {
    Local = "local",
    Arguments = "arguments",
    Closure = "closure",
    Global = "global",
    Register = "register"
}
/**
 * Thread state
 */
export declare enum ThreadState {
    Running = "running",
    Paused = "paused",
    Waiting = "waiting",
    Blocked = "blocked",
    Terminated = "terminated"
}
/**
 * Breakpoint
 */
export interface Breakpoint {
    id: string;
    type: BreakpointType;
    state: BreakpointState;
    enabled: boolean;
    source: DebugSource;
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    condition?: string;
    hitCondition?: string;
    hitCount?: number;
    logMessage?: string;
    functionName?: string;
    dataId?: string;
    accessType?: 'read' | 'write' | 'readWrite';
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
    program?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    processId?: number;
    port?: number;
    host?: string;
    stopOnEntry?: boolean;
    console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
    sourceMaps?: boolean;
    outFiles?: string[];
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
export interface DebugAdapter {
    type: string;
    label: string;
    initialize(capabilities: DebugCapabilities): Promise<DebugCapabilities>;
    launch(config: DebugConfiguration): Promise<void>;
    attach(config: DebugConfiguration): Promise<void>;
    disconnect(restart?: boolean): Promise<void>;
    terminate(): Promise<void>;
    continue(threadId: number): Promise<void>;
    pause(threadId: number): Promise<void>;
    stepOver(threadId: number): Promise<void>;
    stepInto(threadId: number): Promise<void>;
    stepOut(threadId: number): Promise<void>;
    stepBack?(threadId: number): Promise<void>;
    restartFrame?(frameId: number): Promise<void>;
    setBreakpoints(source: DebugSource, breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    setFunctionBreakpoints?(breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    setExceptionBreakpoints?(filters: string[], filterOptions?: unknown[]): Promise<Breakpoint[]>;
    setDataBreakpoints?(breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
    threads(): Promise<DebugThread[]>;
    stackTrace(threadId: number, startFrame?: number, levels?: number): Promise<StackFrame[]>;
    scopes(frameId: number): Promise<Scope[]>;
    variables(variablesReference: number, filter?: 'indexed' | 'named', start?: number, count?: number): Promise<Variable[]>;
    evaluate(expression: string, frameId?: number, context?: string): Promise<EvaluateResult>;
    setVariable?(variablesReference: number, name: string, value: string): Promise<Variable>;
    setExpression?(frameId: number, expression: string, value: string): Promise<EvaluateResult>;
    onOutput: Event<DebugOutput>;
    onStopped: Event<{
        reason: string;
        threadId?: number;
        allThreadsStopped?: boolean;
    }>;
    onContinued: Event<{
        threadId: number;
        allThreadsContinued?: boolean;
    }>;
    onExited: Event<{
        exitCode?: number;
    }>;
    onTerminated: Event<{
        restart?: boolean;
    }>;
    onThread: Event<{
        reason: 'started' | 'exited';
        threadId: number;
    }>;
    onBreakpoint: Event<{
        reason: 'changed' | 'new' | 'removed';
        breakpoint: Breakpoint;
    }>;
}
export declare class DebuggerSystem {
    private readonly sessions;
    private activeSessionId;
    private readonly breakpoints;
    private readonly breakpointsBySource;
    private breakpointIdCounter;
    private readonly watchExpressions;
    private watchIdCounter;
    private readonly adapters;
    private readonly activeAdapters;
    private readonly configurations;
    private readonly onSessionStartedEmitter;
    readonly onSessionStarted: Event<SessionStartedEvent>;
    private readonly onSessionStoppedEmitter;
    readonly onSessionStopped: Event<SessionStoppedEvent>;
    private readonly onSessionTerminatedEmitter;
    readonly onSessionTerminated: Event<SessionTerminatedEvent>;
    private readonly onBreakpointChangedEmitter;
    readonly onBreakpointChanged: Event<BreakpointChangedEvent>;
    private readonly onOutputEmitter;
    readonly onOutput: Event<OutputEvent>;
    private readonly onStateChangedEmitter;
    readonly onStateChanged: Event<{
        sessionId: string;
        state: DebugSessionState;
    }>;
    constructor();
    /**
     * Register debug adapter factory
     */
    registerAdapter(type: string, factory: () => DebugAdapter): Disposable;
    /**
     * Register default adapters
     */
    private registerDefaultAdapters;
    /**
     * Get available adapter types
     */
    getAdapterTypes(): string[];
    /**
     * Start debug session
     */
    startSession(config: DebugConfiguration): Promise<DebugSession>;
    /**
     * Stop debug session
     */
    stopSession(sessionId: string): Promise<void>;
    /**
     * Restart debug session
     */
    restartSession(sessionId: string): Promise<DebugSession>;
    /**
     * Get session
     */
    getSession(sessionId: string): DebugSession | undefined;
    /**
     * Get active session
     */
    getActiveSession(): DebugSession | undefined;
    /**
     * Get all sessions
     */
    getAllSessions(): DebugSession[];
    /**
     * Set active session
     */
    setActiveSession(sessionId: string): void;
    /**
     * Continue execution
     */
    continue(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Pause execution
     */
    pause(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Step over
     */
    stepOver(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Step into
     */
    stepInto(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Step out
     */
    stepOut(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Step back (if supported)
     */
    stepBack(sessionId?: string, threadId?: number): Promise<void>;
    /**
     * Restart frame
     */
    restartFrame(sessionId: string, frameId: number): Promise<void>;
    /**
     * Add breakpoint
     */
    addBreakpoint(breakpoint: Omit<Breakpoint, 'id' | 'state' | 'verified'>): Breakpoint;
    /**
     * Remove breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean;
    /**
     * Update breakpoint
     */
    updateBreakpoint(breakpointId: string, updates: Partial<Breakpoint>): Breakpoint | undefined;
    /**
     * Toggle breakpoint enabled state
     */
    toggleBreakpoint(breakpointId: string): Breakpoint | undefined;
    /**
     * Get all breakpoints
     */
    getBreakpoints(): Breakpoint[];
    /**
     * Get breakpoints for source
     */
    getBreakpointsForSource(sourcePath: string): Breakpoint[];
    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints(): void;
    /**
     * Sync breakpoints to session
     */
    private syncBreakpoints;
    /**
     * Sync breakpoints to all sessions
     */
    private syncBreakpointsToAllSessions;
    /**
     * Add watch expression
     */
    addWatch(expression: string): WatchExpression;
    /**
     * Remove watch expression
     */
    removeWatch(watchId: string): boolean;
    /**
     * Update watch expression
     */
    updateWatch(watchId: string, expression: string): WatchExpression | undefined;
    /**
     * Evaluate watch expression
     */
    evaluateWatch(watchId: string, frameId?: number): Promise<WatchExpression | undefined>;
    /**
     * Get all watch expressions
     */
    getWatchExpressions(): WatchExpression[];
    /**
     * Evaluate all watches
     */
    evaluateAllWatches(frameId?: number): Promise<void>;
    /**
     * Get threads
     */
    getThreads(sessionId?: string): Promise<DebugThread[]>;
    /**
     * Get stack trace
     */
    getStackTrace(sessionId: string, threadId: number, startFrame?: number, levels?: number): Promise<StackFrame[]>;
    /**
     * Get scopes
     */
    getScopes(sessionId: string, frameId: number): Promise<Scope[]>;
    /**
     * Get variables
     */
    getVariables(sessionId: string, variablesReference: number, filter?: 'indexed' | 'named', start?: number, count?: number): Promise<Variable[]>;
    /**
     * Set variable value
     */
    setVariable(sessionId: string, variablesReference: number, name: string, value: string): Promise<Variable | undefined>;
    /**
     * Evaluate expression
     */
    evaluate(expression: string, sessionId?: string, frameId?: number, context?: 'watch' | 'repl' | 'hover' | 'clipboard'): Promise<EvaluateResult>;
    /**
     * Add debug configuration
     */
    addConfiguration(config: DebugConfiguration): void;
    /**
     * Remove debug configuration
     */
    removeConfiguration(name: string): boolean;
    /**
     * Get all configurations
     */
    getConfigurations(): DebugConfiguration[];
    /**
     * Get configuration by name
     */
    getConfiguration(name: string): DebugConfiguration | undefined;
    /**
     * Setup adapter event handlers
     */
    private setupAdapterEvents;
    /**
     * Get adapter and session
     */
    private getAdapterAndSession;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default DebuggerSystem;
