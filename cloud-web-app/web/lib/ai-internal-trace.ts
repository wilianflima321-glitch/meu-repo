export type AITraceRiskStatus = 'ok' | 'warn' | 'fail';
export type AIToolRunStatus = 'ok' | 'error';

export interface AIDecisionRecord {
  decision: string;
  reasons?: string[];
  tradeoffs?: string[];
}

export interface AIEvidenceRef {
  path?: string;
  url?: string;
}

export interface AIEvidenceItem {
  kind: 'context' | 'file' | 'search' | 'tool' | 'gate' | 'other';
  label: string;
  detail?: string;
  refs?: AIEvidenceRef[];
}

export interface AIRiskCheck {
  risk: string;
  status: AITraceRiskStatus;
  mitigation?: string;
}

export interface AIToolRunSummary {
  toolName: string;
  status: AIToolRunStatus;
  durationMs?: number;
}

export interface AITraceTelemetry {
  model?: string;
  provider?: string;
  estimatedTokens?: number;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface AITraceSummary {
  traceId: string;
  summary: string;
  decisionRecord?: AIDecisionRecord;
  evidence?: AIEvidenceItem[];
  riskChecks?: AIRiskCheck[];
  toolRuns?: AIToolRunSummary[];
  telemetry?: AITraceTelemetry;
}

export function createAITraceId(): string {
  const uuid = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
