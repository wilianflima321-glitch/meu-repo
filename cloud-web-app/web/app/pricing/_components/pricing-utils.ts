import type { PLANS } from '@/lib/plans'

export type PricingPlan = (typeof PLANS)[number] & {
  displayPrice: number
  displayPriceBRL: number
}

export function formatStorage(bytes: number) {
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
}

export function formatLimit(value: number) {
  return value < 0 ? 'Unlimited' : String(value)
}
