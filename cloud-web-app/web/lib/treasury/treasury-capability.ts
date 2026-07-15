/**
 * Wave H — Treasury / Coins capability honesty surface.
 * Never claim Aethel Coins mint, Universal Store economy, or in-app payouts as live.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('treasury-capability')

export type TreasuryCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'HELD'

export interface TreasurySurfaceReport {
  surface: string
  status: TreasuryCapabilityStatus
  connectable: boolean
  notes: string[]
  heldReason?: string
}

export interface TreasuryHonestyReport {
  generatedAt: string
  /** H.0 dual RevenueLane math in payouts — real */
  revenueLanes: TreasurySurfaceReport
  /** Fiat Stripe Connect sale ledger — real */
  fiatSaleLedger: TreasurySurfaceReport
  /** IDE marketplace Stripe Checkout API — real when billing runtime ready */
  marketplaceCheckout: TreasurySurfaceReport
  /** In-app Request Payout as Aethel Treasury — HELD */
  inAppPayout: TreasurySurfaceReport
  /** Aethel Coins mint/burn — HELD */
  aethelCoins: TreasurySurfaceReport
  /** Universal Store / Backpack / circular spend — HELD */
  universalEconomy: TreasurySurfaceReport
  marketingCoinsAllowed: false
  marketingUniversalStoreAllowed: false
  claim: string
  productCopy: string
}

export function evaluateTreasuryHonesty(input: {
  stripeCheckoutConfigured?: boolean
} = {}): TreasuryHonestyReport {
  const checkoutReady = input.stripeCheckoutConfigured === true

  const report: TreasuryHonestyReport = {
    generatedAt: new Date().toISOString(),
    revenueLanes: {
      surface: 'RevenueLane H.0',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: ['UNIVERSAL_STORE 30/70 and IN_GAME_IAP 12% are live in payouts math'],
    },
    fiatSaleLedger: {
      surface: 'Marketplace sale ledger',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: ['Stripe Connect destination charges + Transaction escrow rows'],
    },
    marketplaceCheckout: {
      surface: 'IDE marketplace checkout',
      status: checkoutReady ? 'IMPLEMENTED' : 'PARTIAL',
      connectable: checkoutReady,
      notes: checkoutReady
        ? ['POST /api/marketplace/checkout creates real Stripe sessions']
        : ['Checkout API exists; billing runtime must be ready'],
      heldReason: checkoutReady ? undefined : 'billing_runtime_not_ready',
    },
    inAppPayout: {
      surface: 'In-app Request Payout',
      status: 'HELD',
      connectable: false,
      notes: [
        'Creators payout via Stripe Express dashboard — not a fake in-app transfer',
        'Aethel Treasury payout router not shipped',
      ],
      heldReason: 'treasury_payout_held',
    },
    aethelCoins: {
      surface: 'Aethel Coins',
      status: 'HELD',
      connectable: false,
      notes: ['AethelCoinLedgerEntry schema stub only — no mint/burn API'],
      heldReason: 'coins_mint_held',
    },
    universalEconomy: {
      surface: 'Universal Store / Backpack',
      status: 'HELD',
      connectable: false,
      notes: ['Cross-game cosmetics, PlayerOwnedItem, TreasurySpendRouter not shipped'],
      heldReason: 'wave_h_economy_held',
    },
    marketingCoinsAllowed: false,
    marketingUniversalStoreAllowed: false,
    claim: 'IDE extension marketplace = fiat Stripe Connect — Aethel Coins / Universal Store [HELD]',
    productCopy:
      'Creators earn fiat via Stripe Connect (70/30 store lane). Aethel Coins mint, in-app Treasury payouts, and Universal Store economy remain [HELD] until Wave H audit completes.',
  }

  log.info('treasury_honesty_evaluated', {
    checkout: report.marketplaceCheckout.status,
    coins: report.aethelCoins.status,
  })

  return report
}
