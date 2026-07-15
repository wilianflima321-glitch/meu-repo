import { EventEmitter } from 'events';

import {
  fetchDebugAdapterEvents,
  sendDebugAdapterRequest,
  startDebugAdapterSession,
} from './real-debug-adapter-transport';
import type {
  Breakpoint,
  Capabilities,
  DebugAdapterState,
  DebugConfiguration,
  DebugEvent,
  StoppedReason,
  Thread,
} from './real-debug-adapter-contracts';

function createInitializeArguments(config: DebugConfiguration): Record<string, unknown> {
  return {
    clientID: 'aethel-ide',
    clientName: 'Aethel Engine IDE',
    adapterID: config.type,
    pathFormat: 'path',
    linesStartAt1: true,
    columnsStartAt1: true,
    supportsVariableType: true,
    supportsVariablePaging: true,
    supportsRunInTerminalRequest: true,
    supportsMemoryReferences: true,
    supportsProgressReporting: true,
    supportsInvalidatedEvent: true,
  };
}

function createLaunchArguments(config: DebugConfiguration): Record<string, unknown> {
  const launchArgs: Record<string, unknown> = {
    type: config.type,
    request: 'launch',
    name: config.name,
    program: config.program,
    args: config.args,
    cwd: config.cwd,
    env: config.env,
    stopOnEntry: config.stopOnEntry,
  };

  if (config.type === 'python') {
    if (config.pythonPath) launchArgs.pythonPath = config.pythonPath;
    if (config.module) launchArgs.module = config.module;
    if (config.django) launchArgs.django = true;
    if (config.flask) launchArgs.flask = true;
  } else if (config.type === 'node' || config.type === 'nodejs') {
    if (config.runtimeExecutable) launchArgs.runtimeExecutable = config.runtimeExecutable;
    if (config.runtimeArgs) launchArgs.runtimeArgs = config.runtimeArgs;
    if (config.skipFiles) launchArgs.skipFiles = config.skipFiles;
  } else if (config.type === 'go') {
    if (config.mode) launchArgs.mode = config.mode;
  }

  return launchArgs;
}

export class RealDebugAdapterCore extends EventEmitter {
  protected sessionId: string | null = null;
  protected config: DebugConfiguration;
  protected capabilities: Capabilities = {};
  protected state: DebugAdapterState = 'idle';
  protected threads: Thread[] = [];
  protected currentThreadId = 1;
  protected breakpoints: Map<string, Breakpoint[]> = new Map();

  private eventPollingInterval: NodeJS.Timeout | null = null;
  private lastEventSeq = 0;

  constructor(config: DebugConfiguration) {
    super();
    this.config = config;
  }

  async initialize(): Promise<Capabilities> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot initialize in state: ${this.state}`);
    }

    this.state = 'initializing';

    try {
      this.sessionId = await startDebugAdapterSession(this.config);
      this.capabilities = await this.sendRequest('initialize', createInitializeArguments(this.config));
      this.startEventPolling();
      this.emit('initialized', this.capabilities);
      return this.capabilities;
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }

  async launch(): Promise<void> {
    this.assertInitialized();
    await this.sendRequest('launch', createLaunchArguments(this.config));
    await this.sendRequest('configurationDone', {});

    this.state = 'running';
    this.emit('launched');
  }

  async attach(): Promise<void> {
    this.assertInitialized();
    await this.sendRequest('attach', {
      type: this.config.type,
      host: this.config.host || 'localhost',
      port: this.config.port,
    });

    await this.sendRequest('configurationDone', {});

    this.state = 'running';
    this.emit('attached');
  }

  async disconnect(terminateDebuggee = true): Promise<void> {
    if (!this.sessionId) return;

    this.stopEventPolling();

    try {
      await this.sendRequest('disconnect', { terminateDebuggee });
    } catch {
      // Ignore errors during disconnect.
    }

    try {
      await fetch('/api/dap/session/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch {
      // Ignore shutdown failures; the runtime may already be gone.
    }

    this.state = 'terminated';
    this.sessionId = null;
    this.emit('terminated');
  }

  async terminate(): Promise<void> {
    await this.disconnect(true);
  }

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

  protected async sendRequest<T = Record<string, unknown>>(command: string, args: Record<string, unknown>): Promise<T> {
    return sendDebugAdapterRequest<T>(this.sessionId, command, args);
  }

  private assertInitialized(): void {
    if (!this.sessionId) {
      throw new Error('Debug session not initialized');
    }
  }

  private startEventPolling(): void {
    if (this.eventPollingInterval) return;

    this.eventPollingInterval = setInterval(async () => {
      if (!this.sessionId) return;

      try {
        const events = await fetchDebugAdapterEvents(this.sessionId, this.lastEventSeq);
        for (const event of events) {
          this.handleEvent(event);
          const eventSeq = event.seq ?? this.lastEventSeq;
          if (eventSeq > this.lastEventSeq) this.lastEventSeq = eventSeq;
        }
      } catch {
        // Polling is best-effort; UI state is reconciled by the next fetch.
      }
    }, 100);
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
        if (body?.threadId) this.currentThreadId = body.threadId as number;
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
        if (body?.reason === 'started') this.emit('threadStarted', { threadId: body?.threadId });
        else if (body?.reason === 'exited') this.emit('threadExited', { threadId: body?.threadId });
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
