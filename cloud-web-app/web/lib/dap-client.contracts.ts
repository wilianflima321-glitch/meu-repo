export interface DapMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
}

export interface DapRequest extends DapMessage {
  type: 'request';
  command: string;
  arguments?: Record<string, unknown>;
}

export interface DapResponse extends DapMessage {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: Record<string, unknown>;
}

export interface DapEvent extends DapMessage {
  type: 'event';
  event: string;
  body?: Record<string, unknown>;
}

export interface Source {
  name?: string;
  path?: string;
  sourceReference?: number;
}

export interface Breakpoint {
  id?: number;
  verified: boolean;
  message?: string;
  source?: Source;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: Source;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  moduleId?: number | string;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Thread {
  id: number;
  name: string;
}

export interface Scope {
  name: string;
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
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  evaluateName?: string;
  memoryReference?: string;
}

export interface StoppedEventBody {
  reason: 'step' | 'breakpoint' | 'exception' | 'pause' | 'entry' | 'goto' | 'function breakpoint' | 'data breakpoint' | 'instruction breakpoint' | string;
  description?: string;
  threadId?: number;
  preserveFocusHint?: boolean;
  text?: string;
  allThreadsStopped?: boolean;
  hitBreakpointIds?: number[];
}

export interface OutputEventBody {
  category?: 'console' | 'important' | 'stdout' | 'stderr' | 'telemetry';
  output: string;
  group?: 'start' | 'startCollapsed' | 'end';
  variablesReference?: number;
  source?: Source;
  line?: number;
  column?: number;
  data?: unknown;
}

export interface BreakpointEventBody {
  reason: 'changed' | 'new' | 'removed';
  breakpoint: Breakpoint;
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
  host?: string;
}

export interface DapClientEvents {
  initialized: () => void;
  stopped: (body: StoppedEventBody) => void;
  continued: (threadId: number) => void;
  exited: (exitCode: number) => void;
  terminated: () => void;
  thread: (reason: 'started' | 'exited', threadId: number) => void;
  output: (body: OutputEventBody) => void;
  breakpoint: (body: BreakpointEventBody) => void;
  module: (reason: 'new' | 'changed' | 'removed', module: unknown) => void;
  loadedSource: (reason: 'new' | 'changed' | 'removed', source: Source) => void;
  process: (name: string, startMethod?: string) => void;
  capabilities: (capabilities: Record<string, unknown>) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
}
