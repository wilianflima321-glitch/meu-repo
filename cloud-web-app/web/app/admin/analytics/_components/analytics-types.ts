export type AdminAnalyticsMetrics = {
  activeUsers: number
  dailyRevenue: number
  aiTokens: number
  requestsPerMinute: number
  aiCostToday: number
}

export type BaselineMetricSummary = {
  count: number
  avg: number | null
  p50: number | null
  p95: number | null
  lastValue: number | null
  lastSeenAt: string | null
  target: number | null
  unit: string
  status: 'ok' | 'warn' | 'no_data'
}

export type PerformanceBaselineResponse = {
  success: boolean
  capability?: string
  capabilityStatus?: 'IMPLEMENTED' | 'PARTIAL' | 'UNAVAILABLE'
  window?: {
    days: number
    startAt: string
    endAt: string
  }
  performance?: Record<string, BaselineMetricSummary>
  funnel?: {
    landingViews: number
    signups: number
    logins: number
    dashboardViews: number
    projectCreates: number
    aiChats: number
    ideOpens: number
    firstValueProjectCreated: number
    firstValueAiSuccess: number
    firstValueIdeOpen: number
    firstValueCompleted: number
  }
  funnelConversions?: {
    signupToProjectCreate: number | null
    signupToAiChat: number | null
    signupToIdeOpen: number | null
    signupToFirstValueComplete: number | null
    projectCreateToFirstValueComplete: number | null
  }
  firstValue?: {
    medianMs: number | null
    p95Ms: number | null
    samples: number
  }
  dataQuality?: {
    missingSamples: string[]
    hasAnyMissingSamples: boolean
  }
  updatedAt?: string
}

export type AnalyticsWindowDays = 7 | 14 | 30
