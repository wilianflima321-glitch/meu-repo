/**
 * Debug Integration
 * Integrates DAP and AI debugging features with the debugger UI
 */

import { getDAPApiClient, DAPAdapterConfig } from '../api/dap-api';
import { getAIApiClient } from '../api/ai-api';

export interface DebugSession {
  id: string;
  name: string;
  type: string;
  status: 'initializing' | 'running' | 'stopped' | 'terminated';
  threadId?: number;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  verified: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  source: { path: string };
  line: number;
  column: number;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export class DebugIntegration {
  private dapClient = getDAPApiClient();
  private aiClient = getAIApiClient();
  private sessions: Map<string, DebugSession> = new Map();
  private breakpoints: Map<string, Breakpoint[]> = new Map();

  /**
   * Start debug session
   */
  async startSession(config: DAPAdapterConfig): Promise<DebugSession> {
    const sessionId = await this.dapClient.startAdapter(config);
    
    const session: DebugSession = {
      id: sessionId,
      name: config.name,
      type: config.type,
      status: 'initializing',
    };

    this.sessions.set(sessionId, session);

    // Initialize adapter
    await this.dapClient.initialize(config.name);

    // Launch or attach
    if (config.request === 'launch') {
      await this.dapClient.launch(config.name, config);
    } else {
      await this.dapClient.attach(config.name, config);
    }

    // Configuration done
    await this.dapClient.configurationDone(config.name);

    session.status = 'running';
    console.log(`[Debug Integration] Started session: ${config.name}`);

    return session;
  }

  /**
   * Stop debug session
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.dapClient.disconnect(session.name);
    await this.dapClient.stopAdapter(session.name);

    session.status = 'terminated';
    this.sessions.delete(sessionId);

    console.log(`[Debug Integration] Stopped session: ${session.name}`);
  }

  /**
   * Set breakpoints
   */
  async setBreakpoints(file: string, breakpoints: Breakpoint[]): Promise<Breakpoint[]> {
    const sessions = Array.from(this.sessions.values());
    if (sessions.length === 0) {
      // Store for when session starts
      this.breakpoints.set(file, breakpoints);
      return breakpoints;
    }

    const session = sessions[0]; // Use first active session
    
    const response = await this.dapClient.setBreakpoints(
      session.name,
      { path: file },
      breakpoints.map(bp => ({
        line: bp.line,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage,
      }))
    );

    const verifiedBreakpoints = breakpoints.map((bp, i) => ({
      ...bp,
      verified: response.breakpoints[i]?.verified || false,
    }));

    this.breakpoints.set(file, verifiedBreakpoints);
    return verifiedBreakpoints;
  }

  /**
   * Continue execution
   */
  async continue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    await this.dapClient.continue(session.name, session.threadId);
    session.status = 'running';
  }

  /**
   * Pause execution
   */
  async pause(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    await this.dapClient.pause(session.name, session.threadId);
    session.status = 'stopped';
  }

  /**
   * Step over
   */
  async stepOver(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    await this.dapClient.next(session.name, session.threadId);
  }

  /**
   * Step into
   */
  async stepInto(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    await this.dapClient.stepIn(session.name, session.threadId);
  }

  /**
   * Step out
   */
  async stepOut(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    await this.dapClient.stepOut(session.name, session.threadId);
  }

  /**
   * Get stack trace
   */
  async getStackTrace(sessionId: string): Promise<StackFrame[]> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    const response = await this.dapClient.stackTrace(session.name, session.threadId);
    return response.stackFrames || [];
  }

  /**
   * Get variables
   */
  async getVariables(sessionId: string, frameId: number): Promise<Variable[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    // Get scopes
    const scopesResponse = await this.dapClient.scopes(session.name, frameId);
    const scopes = scopesResponse.scopes || [];

    // Get variables for each scope
    const allVariables: Variable[] = [];
    for (const scope of scopes) {
      const varsResponse = await this.dapClient.variables(session.name, scope.variablesReference);
      allVariables.push(...(varsResponse.variables || []));
    }

    return allVariables;
  }

  /**
   * Evaluate expression
   */
  async evaluate(sessionId: string, expression: string, frameId?: number): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    return this.dapClient.evaluate(session.name, expression, frameId, 'repl');
  }

  /**
   * Get AI debug analysis
   */
  async getAIAnalysis(sessionId: string): Promise<any> {
    if (!this.aiClient.getConsent()) {
      throw new Error('AI features require user consent');
    }

    const session = this.sessions.get(sessionId);
    if (!session || !session.threadId) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    // Get stack trace
    const stackFrames = await this.getStackTrace(sessionId);
    const stackTrace = stackFrames
      .map(f => `${f.name} (${f.source.path}:${f.line})`)
      .join('\n');

    // Get variables
    const variables: Record<string, any> = {};
    if (stackFrames.length > 0) {
      const vars = await this.getVariables(sessionId, stackFrames[0].id);
      for (const v of vars) {
        variables[v.name] = v.value;
      }
    }

    // Get AI analysis
    return this.aiClient.analyzeDebugState({
      language: session.type,
      stackTrace,
      variables,
    });
  }

  /**
   * Get AI suggestions
   */
  async getAISuggestions(sessionId: string): Promise<string[]> {
    const analysis = await this.getAIAnalysis(sessionId);
    return analysis.suggestions || [];
  }

  /**
   * Handle stopped event
   */
  onStopped(sessionId: string, threadId: number, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      session.threadId = threadId;
      console.log(`[Debug Integration] Session stopped: ${reason}`);
    }
  }

  /**
   * Handle continued event
   */
  onContinued(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'running';
      console.log(`[Debug Integration] Session continued`);
    }
  }

  /**
   * Handle terminated event
   */
  onTerminated(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'terminated';
      console.log(`[Debug Integration] Session terminated`);
    }
  }

  /**
   * Get active sessions
   */
  getSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session
   */
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get breakpoints
   */
  getBreakpoints(file?: string): Breakpoint[] {
    if (file) {
      return this.breakpoints.get(file) || [];
    }

    const all: Breakpoint[] = [];
    for (const bps of this.breakpoints.values()) {
      all.push(...bps);
    }
    return all;
  }
}

// Singleton instance
let debugIntegrationInstance: DebugIntegration | null = null;

export function getDebugIntegration(): DebugIntegration {
  if (!debugIntegrationInstance) {
    debugIntegrationInstance = new DebugIntegration();
  }
  return debugIntegrationInstance;
}
