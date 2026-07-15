/**
 * Aethel Engine - Real Debug Adapter Client
 *
 * Conecta ao DAP Runtime real do servidor via API/WebSocket.
 * Substitui todas as simulações por comunicação real com debuggers.
 */

import { RealDebugAdapterCore } from './real-debug-adapter-core';

import type {
  Breakpoint,
  Capabilities,
  ColumnDescriptor,
  CompletionsResponse,
  EvaluateResponse,
  LoadedSourcesResponse,
  ReadMemoryResponse,
  Scope,
  ScopesResponse,
  SetBreakpointsResponse,
  SetVariableResponse,
  Source,
  SourceBreakpoint,
  SourceResponse,
  StackFrame,
  StackTraceResponse,
  Thread,
  ThreadsResponse,
  Variable,
  VariablesResponse,
  WriteMemoryResponse,
} from './real-debug-adapter-contracts';

export type {
  Breakpoint,
  Capabilities,
  Checksum,
  ColumnDescriptor,
  CompletionsResponse,
  DebugAdapterState,
  DebugConfiguration,
  DebugEvent,
  EvaluateResponse,
  ExceptionBreakpointsFilter,
  LoadedSourcesResponse,
  ReadMemoryResponse,
  Scope,
  ScopesResponse,
  SetBreakpointsResponse,
  SetVariableResponse,
  Source,
  SourceBreakpoint,
  SourceResponse,
  StackFrame,
  StackTraceResponse,
  StoppedReason,
  Thread,
  ThreadsResponse,
  Variable,
  VariablePresentationHint,
  VariablesResponse,
  WriteMemoryResponse,
} from './real-debug-adapter-contracts';

export class RealDebugAdapter extends RealDebugAdapterCore {
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

}

export { DebugSessionManager, debugManager } from './real-debug-session-manager';
export default RealDebugAdapter;
