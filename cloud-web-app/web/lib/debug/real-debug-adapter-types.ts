/**
 * DAP protocol contracts extracted from real-debug-adapter.ts.
 */

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

export interface SetBreakpointsResponse {
  breakpoints: Breakpoint[];
}

export interface ThreadsResponse {
  threads: Thread[];
}

export interface StackTraceResponse {
  stackFrames: StackFrame[];
  totalFrames?: number;
}

export interface ScopesResponse {
  scopes: Scope[];
}

export interface VariablesResponse {
  variables: Variable[];
}

export interface SetVariableResponse {
  value: string;
  type?: string;
  variablesReference?: number;
  namedVariables?: number;
  indexedVariables?: number;
}

export interface EvaluateResponse {
  result: string;
  type?: string;
  variablesReference?: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}

export interface CompletionsResponse {
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

export interface SourceResponse {
  content: string;
  mimeType?: string;
}

export interface LoadedSourcesResponse {
  sources: Source[];
}

export interface ReadMemoryResponse {
  address: string;
  unreadableBytes?: number;
  data?: string;
}

export interface WriteMemoryResponse {
  offset?: number;
  bytesWritten?: number;
}

// ============================================================================
// Real Debug Adapter Client
// ============================================================================
