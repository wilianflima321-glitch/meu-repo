import type { BaselineMetricSummary } from './analytics-types'

export const METRIC_LABELS: Record<string, string> = {
  FCP: 'First Contentful Paint',
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  TTI: 'Time to Interactive',
  ai_chat_latency: 'AI chat latency',
  first_value_time: 'First value time',
}

export const METRIC_ORDER = ['FCP', 'LCP', 'CLS', 'TTI', 'ai_chat_latency', 'first_value_time']

export function emptyMetric(unit = 'ms'): BaselineMetricSummary {
  return {
    count: 0,
    avg: null,
    p50: null,
    p95: null,
    lastValue: null,
    lastSeenAt: null,
    target: null,
    unit,
    status: 'no_data',
  }
}

export function formatValue(value: number | null, unit: string): string {
  if (value === null) return '--'
  if (unit === 'ms') return `${Math.round(value)} ms`
  if (unit === 'count') return value.toFixed(3)
  return `${value}`
}

export function statusBadgeMeta(status: 'ok' | 'warn' | 'no_data') {
  if (status === 'ok') return { variant: 'success' as const, label: 'OK' }
  if (status === 'warn') return { variant: 'warning' as const, label: 'WARN' }
  return { variant: 'secondary' as const, label: 'NO DATA' }
}
