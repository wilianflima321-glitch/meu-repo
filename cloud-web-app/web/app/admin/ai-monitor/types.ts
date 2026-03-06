export type AICall = {
  id: string;
  userId: string;
  userEmail: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  prompt: string;
  response: string;
  timestamp: string;
  projectId?: string;
  operation: string;
};

export type AIMetrics = {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }>;
};

export type AIReadinessMetrics = {
  providerConfigured: boolean;
  sampleSize: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  learnFeedbackCoverage?: number;
  reviewedApplyRuns?: number;
  unreviewedApplyRuns?: number;
  workspaceCoverage?: number;
  workspaceApplyRuns?: number;
};

export type AIReadiness = {
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  promotionEligible: boolean;
  samplePolicy?: string;
  thresholds: {
    minSample: number;
    successRate: number;
    regressionRateMax: number;
    sandboxCoverage: number;
    feedbackCoverageMin?: number;
  };
  metrics: AIReadinessMetrics;
  metricsAll?: AIReadinessMetrics;
  rehearsalMetrics?: AIReadinessMetrics;
  blockers?: string[];
  windows?: Array<{
    hours: number;
    sinceIso: string;
    metrics: AIReadinessMetrics & {
      promotionEligible: boolean;
      blockers: string[];
    };
  }>;
  updatedAt: string;
};

export type CoreLoopWindowMetrics = {
  sampleSize: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  learnFeedbackCoverage?: number;
  reviewedApplyRuns?: number;
  unreviewedApplyRuns?: number;
  workspaceCoverage: number;
  workspaceApplyRuns: number;
  sandboxApplyRuns: number;
  successfulApplyRuns: number;
  failedApplyRuns: number;
  blockedApplyRuns: number;
  promotionEligible: boolean;
  blockers: string[];
};

export type CoreLoopMetricsWindow = {
  hours: number;
  sinceIso: string;
  metrics: CoreLoopWindowMetrics;
  metricsAll?: CoreLoopWindowMetrics;
  rehearsalMetrics?: CoreLoopWindowMetrics;
  reasonCounts: Record<string, number>;
  allReasonCounts?: Record<string, number>;
  executionModeCounts: Record<string, number>;
  riskCounts: Record<string, number>;
  impactedEndpointCounts: Record<string, number>;
  recommendations: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
  lastEventAt: string | null;
};

export type CoreLoopMetricsResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  samplePolicy?: string;
  providerConfigured: boolean;
  trend?: {
    sampleSize: 'up' | 'down' | 'flat';
    applySuccessRate: 'up' | 'down' | 'flat';
    regressionRate: 'up' | 'down' | 'flat';
    sandboxCoverage: 'up' | 'down' | 'flat';
  } | null;
  reasonPlaybook?: Array<{
    reason: string;
    count: number;
    action: string;
  }>;
  latest?: CoreLoopMetricsWindow;
  windows?: CoreLoopMetricsWindow[];
  updatedAt: string;
};

export type LedgerIntegrityResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  integrityOk: boolean;
  daysLookback: number;
  report: {
    filesChecked: number;
    rowsChecked: number;
    validRows: number;
    invalidRows: number;
    legacyRows: number;
    issues: Array<{ file: string; line: number; reason: string }>;
  };
  updatedAt: string;
};

export type CoreLoopPromotionResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  samplePolicy: string;
  promotionEligible: boolean;
  blockers: string[];
  production: CoreLoopWindowMetrics;
  rehearsal: CoreLoopWindowMetrics;
  updatedAt: string;
  sinceIso: string;
};

export type FullAccessAuditResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  message: string;
  summary: {
    total: number;
    active: number;
    revoked: number;
    expired: number;
  };
  updatedAt: string;
};

export type ChangeRunSummary = {
  total: number;
  apply: number;
  applyBlocked: number;
  applyFailed: number;
  rollback: number;
  rollbackBlocked: number;
  rollbackFailed: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  workspaceCoverage: number;
  workspaceApplyRuns: number;
};

export type ChangeRunGroup = {
  runId: string;
  eventCount: number;
  firstAt: string;
  lastAt: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  projectIds: string[];
  outcomes: Array<'success' | 'blocked' | 'failed'>;
  eventTypes: Array<'apply' | 'rollback' | 'apply_blocked' | 'rollback_blocked'>;
  paths: string[];
  rollbackTokens: string[];
  files?: string[];
};

export type ChangeRunsResponse = {
  error: string;
  message: string;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  metadata?: {
    sampleClass?: 'all' | 'production' | 'rehearsal';
    summary?: ChangeRunSummary;
    summaryAll?: ChangeRunSummary;
    runGroups?: ChangeRunGroup[];
  };
};

export type AIMetricsResponse = {
  metrics: AIMetrics;
};

export type AICallsResponse = {
  calls: AICall[];
};

export type EmergencyResponse = {
  data?: {
    level?: string;
    reason?: string;
  };
};

export type CoreLoopDrillResponse = {
  totals?: {
    runs?: number;
    applySuccess?: number;
    applyBlocked?: number;
    rollbackSuccess?: number;
  };
};

export type ProductionProbeResponse = {
  metadata?: {
    totals?: {
      applySuccess?: number;
      applyBlocked?: number;
      applyFailed?: number;
    };
    runs?: number;
    selectedFile?: string;
  };
};
