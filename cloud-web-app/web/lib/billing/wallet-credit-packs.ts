/**
 * Canonical prepaid AI credit packs (Block 6B).
 * Prices match CreditWallet UI + PAYG spec §3.2 — single source for API + Stripe.
 */

export type WalletCreditPack = {
  id: string
  name: string
  credits: number
  bonusCredits: number
  /** USD major units (e.g. 9.99) */
  priceUsd: number
  /** Stripe unit_amount in cents */
  unitAmountCents: number
}

export const WALLET_CREDIT_PACKS: readonly WalletCreditPack[] = [
  {
    id: 'pack-500',
    name: 'Starter pack',
    credits: 500,
    bonusCredits: 0,
    priceUsd: 9.99,
    unitAmountCents: 999,
  },
  {
    id: 'pack-1500',
    name: 'Creator pack',
    credits: 1500,
    bonusCredits: 100,
    priceUsd: 24.99,
    unitAmountCents: 2499,
  },
  {
    id: 'pack-5000',
    name: 'Pro pack',
    credits: 5000,
    bonusCredits: 500,
    priceUsd: 74.99,
    unitAmountCents: 7499,
  },
  {
    id: 'pack-15000',
    name: 'Studio pack',
    credits: 15000,
    bonusCredits: 2000,
    priceUsd: 199.99,
    unitAmountCents: 19999,
  },
] as const

export const WALLET_CUSTOM_TOPUP = {
  minUsd: 5,
  maxUsd: 500,
  /** Starter pack ratio: $9.99 → 500 credits */
  creditsPerUsd: 500 / 9.99,
} as const

export function getWalletCreditPack(packageId: string): WalletCreditPack | undefined {
  return WALLET_CREDIT_PACKS.find((pack) => pack.id === packageId)
}

export function totalCreditsForPack(pack: WalletCreditPack): number {
  return pack.credits + pack.bonusCredits
}

/**
 * Flexible top-up: convert USD → credits at Starter pack retail rate (binding).
 */
export function creditsForCustomUsd(usd: number): number {
  const clamped = Math.min(
    WALLET_CUSTOM_TOPUP.maxUsd,
    Math.max(WALLET_CUSTOM_TOPUP.minUsd, usd),
  )
  return Math.max(1, Math.floor(clamped * WALLET_CUSTOM_TOPUP.creditsPerUsd))
}

export function parseCustomUsdAmount(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(n)) return null
  if (n < WALLET_CUSTOM_TOPUP.minUsd || n > WALLET_CUSTOM_TOPUP.maxUsd) return null
  return Math.round(n * 100) / 100
}
