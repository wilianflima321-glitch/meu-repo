/**
 * PAYG constants — safe for client + server (no Prisma).
 */

/** Prepaid → on-demand markup (PAYG spec §3.3) */
export const PAYG_ON_DEMAND_MARKUP = 1.1

/** Starter pack retail: $9.99 / 500 credits → cents per credit */
export const PREPAID_CENTS_PER_CREDIT = (9.99 * 100) / 500

export const PAYG_CAP_PRESETS_USD = [25, 50, 100] as const
export const PAYG_CUSTOM_CAP_MIN_USD = 10
export const PAYG_CUSTOM_CAP_MAX_USD = 500

/** Bill threshold in cents — Cursor-like (6C.4) */
export const PAYG_BILL_THRESHOLD_USD_CENTS = 2500

export function currentPaygPeriodKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
