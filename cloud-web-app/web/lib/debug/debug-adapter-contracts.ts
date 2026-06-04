// Shared Debug Adapter Protocol contracts kept separate from the runtime adapter.

export type DebugPayload = Record<string, unknown>;
export type VariableReferenceData = {
  type: string;
  data?: unknown;
};

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
  arguments?: DebugPayload;
}

export interface DebugProtocolResponse extends DebugProtocolMessage {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: unknown;
}

export interface DebugProtocolEvent extends DebugProtocolMessage {
  type: 'event';
  event: string;
  body?: unknown;
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
  additionalModuleColumns?: unknown[];
  supportedChecksumAlgorithms?: unknown[];
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
