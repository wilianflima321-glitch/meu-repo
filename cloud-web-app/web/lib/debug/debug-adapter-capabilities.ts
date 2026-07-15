import type { Capabilities } from './debug-adapter-contracts';

export function getCapabilitiesForDebugType(type: string): Capabilities {
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

  switch (type) {
    case 'node':
    case 'pwa-node':
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
