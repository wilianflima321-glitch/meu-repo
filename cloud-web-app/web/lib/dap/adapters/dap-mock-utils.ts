import type { DAPRequestArguments, SetBreakpointsArguments } from '../dap-adapter-base';

type EvaluateArguments = {
  expression?: string;
};

type VariablesArguments = {
  variablesReference?: number;
};

export function getMockBreakpoints(args: DAPRequestArguments): NonNullable<SetBreakpointsArguments['breakpoints']> {
  return (args as SetBreakpointsArguments).breakpoints || [];
}

export function getMockVariablesReference(args: DAPRequestArguments): number {
  return (args as VariablesArguments).variablesReference || 0;
}

export function getMockExpression(args: DAPRequestArguments): string {
  return (args as EvaluateArguments).expression || '';
}
