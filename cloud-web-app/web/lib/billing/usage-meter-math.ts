/**
 * Usage meter math — PAYG spec §2.5 / Plans Canonical (educational API-eq).
 * Included pools use displayMarkup = 1.0 — never claim this is what user pays.
 */

/** Reference API ceiling used for educational $ meters ($/M weighted) */
export const USAGE_API_EQ_USD_PER_M = 0.15

/** Premium raw → weighted (canonical weight) */
export const PREMIUM_WEIGHT_FOR_METER = 40

export function poolUsagePercent(used: number, limit: number): number {
  if (limit < 0) return 0 // unlimited
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 1000) / 10)
}

export function remainingTokens(used: number, limit: number): number {
  if (limit < 0) return -1
  return Math.max(0, limit - used)
}

/**
 * Educational $ remaining for a pool.
 * Fast: remaining raw ≈ weighted (1×). Premium: remaining raw × 40.
 */
export function apiEquivalentUsdRemaining(input: {
  remaining: number
  weight?: number
}): number | null {
  if (input.remaining < 0) return null // unlimited
  const weighted = input.remaining * (input.weight ?? 1)
  return (weighted / 1_000_000) * USAGE_API_EQ_USD_PER_M
}

export function formatApiEqUsd(usd: number | null): string {
  if (usd == null) return 'Unlimited'
  if (usd < 0.01 && usd > 0) return '<$0.01 API-eq'
  return `~$${usd.toFixed(2)} API-eq`
}

export function formatTokenCount(n: number): string {
  if (n < 0) return '∞'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

export const POOL_WARN_PERCENT = 80

export function isPoolAtWarnThreshold(used: number, limit: number): boolean {
  if (limit <= 0) return false
  return poolUsagePercent(used, limit) >= POOL_WARN_PERCENT
}

export type ThresholdToastKey = `fast80:${string}` | `prem80:${string}` | `payg50:${string}` | `payg100:${string}`

export function buildThresholdToastKey(
  kind: 'fast80' | 'prem80' | 'payg50' | 'payg100',
  periodKey: string,
): ThresholdToastKey {
  return `${kind}:${periodKey}` as ThresholdToastKey
}
