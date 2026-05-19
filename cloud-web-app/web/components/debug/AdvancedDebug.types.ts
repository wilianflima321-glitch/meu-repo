export type BreakpointType = "breakpoint" | "conditional" | "logpoint";

export interface Breakpoint {
  id: string;
  type: BreakpointType;
  filePath: string;
  line: number;
  column?: number;
  enabled: boolean;
  verified?: boolean;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  hitCount?: number;
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: string;
  type?: string;
  error?: string;
  expandable?: boolean;
  expanded?: boolean;
  children?: WatchExpression[];
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    name: string;
    path: string;
  };
  line: number;
  column: number;
  moduleId?: number;
  presentationHint?: "normal" | "label" | "subtle";
}

export interface Thread {
  id: number;
  name: string;
  stopped?: boolean;
  stoppedReason?: string;
}

export interface ExceptionBreakpoint {
  id: string;
  label: string;
  enabled: boolean;
  description?: string;
  conditionDescription?: string;
  condition?: string;
}
