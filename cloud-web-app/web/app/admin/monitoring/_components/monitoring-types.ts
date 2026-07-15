export interface HealthCheckResult {
  endpoint: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  lastChecked: string
}

export interface MonitoringMetrics {
  errorRate: number
  p50Latency: number
  p95Latency: number
  activeUsers: number
  requestsPerMinute: number
  uptimePercent: number
  healthChecks: HealthCheckResult[]
}

export interface CoreLoopPromotionSnapshot {
  promotionEligible: boolean
  blockers: string[]
  production: {
    sampleSize: number
    applySuccessRate?: number
    learnFeedbackCoverage?: number
    sandboxCoverage?: number
    workspaceCoverage?: number
    regressionRate?: number
    reviewedApplyRuns?: number
  } | null
  updatedAt: string | null
}

export type MonitoringTone = 'healthy' | 'partial' | 'blocked'
