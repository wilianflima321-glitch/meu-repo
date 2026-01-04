"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggerSystem = exports.ThreadState = exports.VariableScope = exports.StepAction = exports.BreakpointState = exports.BreakpointType = exports.DebugSessionState = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Debug Types ====================
/**
 * Debug session state
 */
var DebugSessionState;
(function (DebugSessionState) {
    DebugSessionState["Inactive"] = "inactive";
    DebugSessionState["Initializing"] = "initializing";
    DebugSessionState["Running"] = "running";
    DebugSessionState["Paused"] = "paused";
    DebugSessionState["Stopped"] = "stopped";
    DebugSessionState["Terminated"] = "terminated";
})(DebugSessionState || (exports.DebugSessionState = DebugSessionState = {}));
/**
 * Breakpoint type
 */
var BreakpointType;
(function (BreakpointType) {
    BreakpointType["Line"] = "line";
    BreakpointType["Conditional"] = "conditional";
    BreakpointType["Logpoint"] = "logpoint";
    BreakpointType["Function"] = "function";
    BreakpointType["Data"] = "data";
    BreakpointType["Exception"] = "exception";
})(BreakpointType || (exports.BreakpointType = BreakpointType = {}));
/**
 * Breakpoint state
 */
var BreakpointState;
(function (BreakpointState) {
    BreakpointState["Pending"] = "pending";
    BreakpointState["Verified"] = "verified";
    BreakpointState["Invalid"] = "invalid";
    BreakpointState["Disabled"] = "disabled";
})(BreakpointState || (exports.BreakpointState = BreakpointState = {}));
/**
 * Step action
 */
var StepAction;
(function (StepAction) {
    StepAction["Continue"] = "continue";
    StepAction["StepOver"] = "stepOver";
    StepAction["StepInto"] = "stepInto";
    StepAction["StepOut"] = "stepOut";
    StepAction["StepBack"] = "stepBack";
    StepAction["ReverseContinue"] = "reverseContinue";
    StepAction["Restart"] = "restart";
    StepAction["Pause"] = "pause";
    StepAction["Terminate"] = "terminate";
})(StepAction || (exports.StepAction = StepAction = {}));
/**
 * Variable scope
 */
var VariableScope;
(function (VariableScope) {
    VariableScope["Local"] = "local";
    VariableScope["Arguments"] = "arguments";
    VariableScope["Closure"] = "closure";
    VariableScope["Global"] = "global";
    VariableScope["Register"] = "register";
})(VariableScope || (exports.VariableScope = VariableScope = {}));
/**
 * Thread state
 */
var ThreadState;
(function (ThreadState) {
    ThreadState["Running"] = "running";
    ThreadState["Paused"] = "paused";
    ThreadState["Waiting"] = "waiting";
    ThreadState["Blocked"] = "blocked";
    ThreadState["Terminated"] = "terminated";
})(ThreadState || (exports.ThreadState = ThreadState = {}));
// ==================== Main Debugger System ====================
let DebuggerSystem = class DebuggerSystem {
    constructor() {
        // Sessions
        this.sessions = new Map();
        this.activeSessionId = null;
        // Breakpoints
        this.breakpoints = new Map();
        this.breakpointsBySource = new Map();
        this.breakpointIdCounter = 0;
        // Watch expressions
        this.watchExpressions = new Map();
        this.watchIdCounter = 0;
        // Adapters
        this.adapters = new Map();
        this.activeAdapters = new Map();
        // Configurations
        this.configurations = [];
        // Events
        this.onSessionStartedEmitter = new Emitter();
        this.onSessionStarted = this.onSessionStartedEmitter.event;
        this.onSessionStoppedEmitter = new Emitter();
        this.onSessionStopped = this.onSessionStoppedEmitter.event;
        this.onSessionTerminatedEmitter = new Emitter();
        this.onSessionTerminated = this.onSessionTerminatedEmitter.event;
        this.onBreakpointChangedEmitter = new Emitter();
        this.onBreakpointChanged = this.onBreakpointChangedEmitter.event;
        this.onOutputEmitter = new Emitter();
        this.onOutput = this.onOutputEmitter.event;
        this.onStateChangedEmitter = new Emitter();
        this.onStateChanged = this.onStateChangedEmitter.event;
        this.registerDefaultAdapters();
    }
    // ==================== Adapter Registration ====================
    /**
     * Register debug adapter factory
     */
    registerAdapter(type, factory) {
        this.adapters.set(type, factory);
        return {
            dispose: () => this.adapters.delete(type)
        };
    }
    /**
     * Register default adapters
     */
    registerDefaultAdapters() {
        // Node.js adapter would be registered here
        // Python adapter would be registered here
        // C++ adapter would be registered here
        // etc.
    }
    /**
     * Get available adapter types
     */
    getAdapterTypes() {
        return Array.from(this.adapters.keys());
    }
    // ==================== Session Management ====================
    /**
     * Start debug session
     */
    async startSession(config) {
        const adapterFactory = this.adapters.get(config.type);
        if (!adapterFactory) {
            throw new Error(`No debug adapter registered for type: ${config.type}`);
        }
        const sessionId = this.generateSessionId();
        const adapter = adapterFactory();
        // Initialize adapter
        const capabilities = await adapter.initialize({});
        // Create session
        const session = {
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
            }
            else {
                await adapter.attach(config);
            }
            session.state = DebugSessionState.Running;
            this.activeSessionId = sessionId;
            // Set breakpoints
            await this.syncBreakpoints(sessionId);
            this.onSessionStartedEmitter.fire({ session });
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
        }
        catch (error) {
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
    async stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        const adapter = this.activeAdapters.get(sessionId);
        if (!session || !adapter)
            return;
        try {
            await adapter.terminate();
        }
        catch {
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
    async restartSession(sessionId) {
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
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get active session
     */
    getActiveSession() {
        return this.activeSessionId ? this.sessions.get(this.activeSessionId) : undefined;
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Set active session
     */
    setActiveSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.activeSessionId = sessionId;
        }
    }
    // ==================== Execution Control ====================
    /**
     * Continue execution
     */
    async continue(sessionId, threadId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.continue(thread);
        session.state = DebugSessionState.Running;
        this.onStateChangedEmitter.fire({ sessionId: session.id, state: session.state });
    }
    /**
     * Pause execution
     */
    async pause(sessionId, threadId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.pause(thread);
    }
    /**
     * Step over
     */
    async stepOver(sessionId, threadId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.stepOver(thread);
    }
    /**
     * Step into
     */
    async stepInto(sessionId, threadId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.stepInto(thread);
    }
    /**
     * Step out
     */
    async stepOut(sessionId, threadId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const thread = threadId ?? session.threads[0]?.id ?? 0;
        await adapter.stepOut(thread);
    }
    /**
     * Step back (if supported)
     */
    async stepBack(sessionId, threadId) {
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
    async restartFrame(sessionId, frameId) {
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
    addBreakpoint(breakpoint) {
        const id = `bp_${++this.breakpointIdCounter}`;
        const bp = {
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
    removeBreakpoint(breakpointId) {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp)
            return false;
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
    updateBreakpoint(breakpointId, updates) {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp)
            return undefined;
        Object.assign(bp, updates);
        // Sync with active sessions
        this.syncBreakpointsToAllSessions();
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'changed' });
        return bp;
    }
    /**
     * Toggle breakpoint enabled state
     */
    toggleBreakpoint(breakpointId) {
        const bp = this.breakpoints.get(breakpointId);
        if (!bp)
            return undefined;
        bp.enabled = !bp.enabled;
        bp.state = bp.enabled ? BreakpointState.Pending : BreakpointState.Disabled;
        this.syncBreakpointsToAllSessions();
        this.onBreakpointChangedEmitter.fire({ breakpoint: bp, reason: 'changed' });
        return bp;
    }
    /**
     * Get all breakpoints
     */
    getBreakpoints() {
        return Array.from(this.breakpoints.values());
    }
    /**
     * Get breakpoints for source
     */
    getBreakpointsForSource(sourcePath) {
        const ids = this.breakpointsBySource.get(sourcePath);
        if (!ids)
            return [];
        return Array.from(ids)
            .map(id => this.breakpoints.get(id))
            .filter((bp) => bp !== undefined);
    }
    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints() {
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
    async syncBreakpoints(sessionId) {
        const adapter = this.activeAdapters.get(sessionId);
        if (!adapter)
            return;
        // Group breakpoints by source
        const bySource = new Map();
        for (const bp of this.breakpoints.values()) {
            if (!bp.enabled)
                continue;
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
            const source = { name: sourcePath, path: sourcePath };
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
    async syncBreakpointsToAllSessions() {
        for (const sessionId of this.activeAdapters.keys()) {
            await this.syncBreakpoints(sessionId);
        }
    }
    // ==================== Watch Expressions ====================
    /**
     * Add watch expression
     */
    addWatch(expression) {
        const id = `watch_${++this.watchIdCounter}`;
        const watch = {
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
    removeWatch(watchId) {
        return this.watchExpressions.delete(watchId);
    }
    /**
     * Update watch expression
     */
    updateWatch(watchId, expression) {
        const watch = this.watchExpressions.get(watchId);
        if (!watch)
            return undefined;
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
    async evaluateWatch(watchId, frameId) {
        const watch = this.watchExpressions.get(watchId);
        if (!watch)
            return undefined;
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
        }
        catch (error) {
            watch.result = undefined;
            watch.error = error instanceof Error ? error.message : String(error);
        }
        return watch;
    }
    /**
     * Get all watch expressions
     */
    getWatchExpressions() {
        return Array.from(this.watchExpressions.values());
    }
    /**
     * Evaluate all watches
     */
    async evaluateAllWatches(frameId) {
        for (const watchId of this.watchExpressions.keys()) {
            await this.evaluateWatch(watchId, frameId);
        }
    }
    // ==================== Stack & Variables ====================
    /**
     * Get threads
     */
    async getThreads(sessionId) {
        const { adapter, session } = this.getAdapterAndSession(sessionId);
        const threads = await adapter.threads();
        session.threads = threads;
        return threads;
    }
    /**
     * Get stack trace
     */
    async getStackTrace(sessionId, threadId, startFrame, levels) {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.stackTrace(threadId, startFrame, levels);
    }
    /**
     * Get scopes
     */
    async getScopes(sessionId, frameId) {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.scopes(frameId);
    }
    /**
     * Get variables
     */
    async getVariables(sessionId, variablesReference, filter, start, count) {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.variables(variablesReference, filter, start, count);
    }
    /**
     * Set variable value
     */
    async setVariable(sessionId, variablesReference, name, value) {
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
    async evaluate(expression, sessionId, frameId, context) {
        const { adapter } = this.getAdapterAndSession(sessionId);
        return adapter.evaluate(expression, frameId, context);
    }
    // ==================== Configuration ====================
    /**
     * Add debug configuration
     */
    addConfiguration(config) {
        this.configurations.push(config);
    }
    /**
     * Remove debug configuration
     */
    removeConfiguration(name) {
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
    getConfigurations() {
        return [...this.configurations];
    }
    /**
     * Get configuration by name
     */
    getConfiguration(name) {
        return this.configurations.find(c => c.name === name);
    }
    // ==================== Event Setup ====================
    /**
     * Setup adapter event handlers
     */
    setupAdapterEvents(sessionId, adapter) {
        const session = this.sessions.get(sessionId);
        adapter.onOutput((output) => {
            this.onOutputEmitter.fire({ sessionId, output });
        });
        adapter.onStopped((event) => {
            session.state = DebugSessionState.Paused;
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
            this.onSessionStoppedEmitter.fire({
                session,
                reason: event.reason,
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
        adapter.onTerminated((event) => {
            session.state = DebugSessionState.Terminated;
            session.endTime = Date.now();
            this.activeAdapters.delete(sessionId);
            if (this.activeSessionId === sessionId) {
                this.activeSessionId = null;
            }
            this.onSessionTerminatedEmitter.fire({ session, restart: event.restart });
            this.onStateChangedEmitter.fire({ sessionId, state: session.state });
        });
        adapter.onThread((event) => {
            if (event.reason === 'started') {
                session.threads.push({
                    id: event.threadId,
                    name: `Thread ${event.threadId}`,
                    state: ThreadState.Running
                });
            }
            else {
                const index = session.threads.findIndex(t => t.id === event.threadId);
                if (index !== -1) {
                    session.threads.splice(index, 1);
                }
            }
        });
        adapter.onBreakpoint((event) => {
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
    getAdapterAndSession(sessionId) {
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
    generateSessionId() {
        return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Dispose
     */
    dispose() {
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
};
exports.DebuggerSystem = DebuggerSystem;
exports.DebuggerSystem = DebuggerSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], DebuggerSystem);
// ==================== Export ====================
exports.default = DebuggerSystem;
