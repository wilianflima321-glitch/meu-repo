/**
 * Wave H — Treasury / Coins capability honesty surface.
 * Never claim Aethel Coins mint, Universal Store economy, or in-app payouts as live
 * until H.1+ treasury audit checklist PASSes (see treasury-audit-capability).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  evaluateTreasuryAudit,
  type TreasuryAuditReport,
} from '@/lib/treasury/treasury-audit-capability'

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
  /** Aethel Coins mint/burn — HELD until audit + module */
  aethelCoins: TreasurySurfaceReport
  /** Universal Store / Backpack / circular spend — HELD */
  universalEconomy: TreasurySurfaceReport
  /** H.1+ audit checklist (technical + human) */
  treasuryAudit: TreasuryAuditReport
  /** True only when full H.1+ audit PASSes — never FORCE_* env */
  hubCheckoutAudited: boolean
  marketingCoinsAllowed: boolean
  marketingUniversalStoreAllowed: boolean
  marketingHubCheckoutAllowed: boolean
  claim: string
  productCopy: string
}

export function evaluateTreasuryHonesty(input: {
  stripeCheckoutConfigured?: boolean
  /** Injected audit report (tests) — otherwise probe evaluateTreasuryAudit */
  auditReport?: TreasuryAuditReport
  cwd?: string
} = {}): TreasuryHonestyReport {
  const checkoutReady = input.stripeCheckoutConfigured === true
  const audit =
    input.auditReport ??
    evaluateTreasuryAudit({
      cwd: input.cwd,
      stripeCheckoutConfigured: checkoutReady,
    })
  const audited = audit.hubCheckoutAudited === true

  const coinItem = audit.checklist.find((c) => c.id === 'coin_mint_burn_api')
  const backpackItem = audit.checklist.find((c) => c.id === 'backpack_custody_escrow')
  const spendItem = audit.checklist.find((c) => c.id === 'treasury_spend_router')

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
      status: coinItem?.status === 'PASS' && audited ? 'IMPLEMENTED' : 'HELD',
      connectable: coinItem?.status === 'PASS' && audited,
      notes:
        coinItem?.status === 'PASS' && audited
          ? ['Coins mint/burn audited and live']
          : [
              'AethelCoinLedgerEntry schema stub only — no mint/burn API until H.1+ audit',
              coinItem?.reason ?? 'coins_mint_held',
            ],
      heldReason: coinItem?.status === 'PASS' && audited ? undefined : 'coins_mint_held',
    },
    universalEconomy: {
      surface: 'Universal Store / Backpack',
      status:
        backpackItem?.status === 'PASS' && spendItem?.status === 'PASS' && audited
          ? 'IMPLEMENTED'
          : 'HELD',
      connectable:
        backpackItem?.status === 'PASS' && spendItem?.status === 'PASS' && audited,
      notes: [
        backpackItem?.reason ?? 'Backpack custody not shipped',
        spendItem?.reason ?? 'TreasurySpendRouter not shipped',
      ],
      heldReason:
        backpackItem?.status === 'PASS' && spendItem?.status === 'PASS' && audited
          ? undefined
          : 'wave_h_economy_held',
    },
    treasuryAudit: audit,
    hubCheckoutAudited: audited,
    marketingCoinsAllowed: audited,
    marketingUniversalStoreAllowed: audited,
    marketingHubCheckoutAllowed: audited,
    claim: audited
      ? 'IDE marketplace + Hub Coins Treasury audited'
      : 'IDE extension marketplace = fiat Stripe Connect — Aethel Coins / Universal Store / Hub checkout [HELD]',
    productCopy: audited
      ? 'Creators earn fiat via Stripe Connect (70/30 store lane). Hub Coins and Universal Store are audited live.'
      : 'Creators earn fiat via Stripe Connect (70/30 store lane). Aethel Coins mint, in-app Treasury payouts, Universal Store economy, and Hub checkout remain [HELD] until every H.1+ Treasury audit checklist item PASSes.',
  }

  log.info('treasury_honesty_evaluated', {
    checkout: report.marketplaceCheckout.status,
    coins: report.aethelCoins.status,
    hubCheckoutAudited: report.hubCheckoutAudited,
    heldAuditItems: audit.heldItems.length,
  })

  return report
}
