/**
 * H.1+ / RTv1-c — Treasury audit probe for `hubCheckoutAudited`.
 * Fail-closed: Hub Buy / Coins marketing unlocks only when every checklist item PASSes.
 * Technical probes require real modules/config; human items require durable certificate.
 * Never honor FORCE_HUB_CHECKOUT env or production query theater.
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  REVENUE_LANE_PLATFORM_TAKE,
  RevenueLane,
} from '@/lib/marketplace/payouts-lanes'
import { createComponentLogger } from '@/lib/observability/logger'
import { probeAethelCoinLedgerReady } from '@/lib/treasury/aethel-coin-ledger'
import { probeChargebackHandlerReady } from '@/lib/treasury/chargeback-handler'
import { probeItemCustodyEscrowReady } from '@/lib/treasury/item-custody-escrow'
import {
  detectForbiddenHubCheckoutForceEnv,
  isHumanChecklistSigned,
  readHubCheckoutAuditCertificateSync,
  TREASURY_HUMAN_CHECKLIST_IDS,
  type TreasuryAuditEvidenceCertificate,
  type TreasuryHumanChecklistId,
} from '@/lib/treasury/treasury-audit-authority'
import { probeTreasurySpendRouterReady } from '@/lib/treasury/treasury-spend-router'

const log = createComponentLogger('treasury-audit-capability')

export type TreasuryAuditItemStatus = 'PASS' | 'FAIL' | 'HELD'

export type TreasuryAuditItemKind = 'technical' | 'human'

export interface TreasuryAuditChecklistItem {
  id: string
  kind: TreasuryAuditItemKind
  title: string
  status: TreasuryAuditItemStatus
  /** Short EN reason for status surfaces (no checkout CTA). */
  reason: string
  heldReason?: string
  evidenceRef?: string
}

export interface TreasuryAuditReport {
  generatedAt: string
  wave: 'RTv1-c'
  /** True only when every checklist item is PASS. */
  hubCheckoutAudited: boolean
  marketingHubCheckoutAllowed: boolean
  marketingCoinsAllowed: boolean
  checklist: TreasuryAuditChecklistItem[]
  heldItems: TreasuryAuditChecklistItem[]
  certificatePresent: boolean
  certificateAuditor: string | null
  certificateAuditedAt: string | null
  forbiddenForceEnvPresent: boolean
  forbiddenForceEnvKeys: string[]
  claim: string
  productCopy: string
}

export interface TreasuryAuditProbeInput {
  cwd?: string
  /** Stripe Connect / marketplace checkout ready (from billing runtime). */
  stripeCheckoutConfigured?: boolean
  /** Inject certificate for tests — production probe reads disk. */
  certificate?: TreasuryAuditEvidenceCertificate | null
  /**
   * Override module file presence (tests).
   * PASS still requires behavioral semantics unless moduleSemantics overrides.
   */
  modulePresence?: Partial<Record<TreasuryTechnicalModuleId, boolean>>
  /**
   * Override behavioral semantics probe (tests).
   * Production: each module's probe*Ready() must return true.
   */
  moduleSemantics?: Partial<Record<TreasuryTechnicalModuleId, boolean>>
  /** Override schema probe (tests). */
  coinLedgerSchemaPresent?: boolean
  /** Override H.0 lane math probe (tests). */
  h0RevenueLanesReady?: boolean
}

export type TreasuryTechnicalModuleId =
  | 'aethel_coin_ledger'
  | 'treasury_spend_router'
  | 'item_custody_escrow'
  | 'chargeback_handler'

const TECHNICAL_MODULE_RELATIVE: Record<TreasuryTechnicalModuleId, string[]> = {
  aethel_coin_ledger: ['lib', 'treasury', 'aethel-coin-ledger.ts'],
  treasury_spend_router: ['lib', 'treasury', 'treasury-spend-router.ts'],
  item_custody_escrow: ['lib', 'treasury', 'item-custody-escrow.ts'],
  chargeback_handler: ['lib', 'treasury', 'chargeback-handler.ts'],
}

function probeModuleExists(
  cwd: string,
  id: TreasuryTechnicalModuleId,
  overrides?: Partial<Record<TreasuryTechnicalModuleId, boolean>>,
): boolean {
  if (typeof overrides?.[id] === 'boolean') return overrides[id]!
  const rel = TECHNICAL_MODULE_RELATIVE[id]
  const candidates = [
    path.join(cwd, ...rel),
    path.join(cwd, 'cloud-web-app', 'web', ...rel),
  ]
  return candidates.some((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
}

const MODULE_SEMANTICS_PROBES: Record<TreasuryTechnicalModuleId, () => boolean> = {
  aethel_coin_ledger: probeAethelCoinLedgerReady,
  treasury_spend_router: probeTreasurySpendRouterReady,
  item_custody_escrow: probeItemCustodyEscrowReady,
  chargeback_handler: probeChargebackHandlerReady,
}

/**
 * Technical module PASS = file present AND custody semantics probe green.
 * Empty theater files / broken probes stay HELD.
 */
function probeModuleReady(
  cwd: string,
  id: TreasuryTechnicalModuleId,
  presenceOverrides?: Partial<Record<TreasuryTechnicalModuleId, boolean>>,
  semanticsOverrides?: Partial<Record<TreasuryTechnicalModuleId, boolean>>,
): { ready: boolean; filePresent: boolean; semanticsOk: boolean } {
  const filePresent = probeModuleExists(cwd, id, presenceOverrides)
  if (!filePresent) {
    return { ready: false, filePresent: false, semanticsOk: false }
  }
  let semanticsOk = false
  if (typeof semanticsOverrides?.[id] === 'boolean') {
    semanticsOk = semanticsOverrides[id]!
  } else {
    try {
      semanticsOk = MODULE_SEMANTICS_PROBES[id]() === true
    } catch (err) {
      log.warn('treasury_module_semantics_probe_threw', {
        id,
        error: err instanceof Error ? err.message : String(err),
      })
      semanticsOk = false
    }
  }
  return { ready: filePresent && semanticsOk, filePresent, semanticsOk }
}

function probeCoinLedgerSchema(cwd: string, override?: boolean): boolean {
  if (typeof override === 'boolean') return override
  const candidates = [
    path.join(cwd, 'prisma', 'schema.prisma'),
    path.join(cwd, 'cloud-web-app', 'web', 'prisma', 'schema.prisma'),
  ]
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue
      const text = fs.readFileSync(filePath, 'utf8')
      if (text.includes('model AethelCoinLedgerEntry')) return true
    } catch {
      /* try next */
    }
  }
  return false
}

function probeH0RevenueLanes(override?: boolean): boolean {
  if (typeof override === 'boolean') return override
  return (
    REVENUE_LANE_PLATFORM_TAKE[RevenueLane.UNIVERSAL_STORE] === 0.3 &&
    REVENUE_LANE_PLATFORM_TAKE[RevenueLane.IN_GAME_IAP] === 0.12
  )
}

function humanItem(
  id: TreasuryHumanChecklistId,
  title: string,
  certificate: TreasuryAuditEvidenceCertificate | null,
): TreasuryAuditChecklistItem {
  const signed = isHumanChecklistSigned(certificate, id)
  if (signed && certificate) {
    return {
      id,
      kind: 'human',
      title,
      status: 'PASS',
      reason: `Signed by ${certificate.auditor} at ${certificate.auditedAt}`,
      evidenceRef: certificate.evidenceRefs[0],
    }
  }
  return {
    id,
    kind: 'human',
    title,
    status: 'HELD',
    reason:
      'Requires durable Founder/legal certificate under .aethel/treasury/audit/hub-checkout-certificate.json',
    heldReason: 'human_audit_certificate_held',
  }
}

/**
 * Evaluate full H.1+ Treasury audit checklist. Defaults fail-closed.
 */
export function evaluateTreasuryAudit(
  input: TreasuryAuditProbeInput = {},
): TreasuryAuditReport {
  const cwd = input.cwd ?? process.cwd()
  const force = detectForbiddenHubCheckoutForceEnv()

  const certificate =
    input.certificate !== undefined
      ? input.certificate
      : readHubCheckoutAuditCertificateSync(cwd)

  const stripeReady = input.stripeCheckoutConfigured === true
  const h0Ready = probeH0RevenueLanes(input.h0RevenueLanesReady)
  const schemaReady = probeCoinLedgerSchema(cwd, input.coinLedgerSchemaPresent)
  const mintApi = probeModuleReady(
    cwd,
    'aethel_coin_ledger',
    input.modulePresence,
    input.moduleSemantics,
  )
  const spendRouter = probeModuleReady(
    cwd,
    'treasury_spend_router',
    input.modulePresence,
    input.moduleSemantics,
  )
  const backpack = probeModuleReady(
    cwd,
    'item_custody_escrow',
    input.modulePresence,
    input.moduleSemantics,
  )
  const chargeback = probeModuleReady(
    cwd,
    'chargeback_handler',
    input.modulePresence,
    input.moduleSemantics,
  )

  const checklist: TreasuryAuditChecklistItem[] = [
    h0Ready
      ? {
          id: 'h0_revenue_lanes',
          kind: 'technical',
          title: 'H.0 RevenueLane split (30/70 store vs 12% IAP)',
          status: 'PASS',
          reason: 'UNIVERSAL_STORE 0.30 and IN_GAME_IAP 0.12 live in payouts-lanes',
          evidenceRef: 'lib/marketplace/payouts-lanes.ts',
        }
      : {
          id: 'h0_revenue_lanes',
          kind: 'technical',
          title: 'H.0 RevenueLane split (30/70 store vs 12% IAP)',
          status: 'FAIL',
          reason: 'RevenueLane platform takes do not match Law XII',
          heldReason: 'h0_revenue_lanes_fail',
        },
    stripeReady
      ? {
          id: 'stripe_connect_fiat',
          kind: 'technical',
          title: 'Stripe Connect fiat checkout configured',
          status: 'PASS',
          reason: 'Billing runtime reports checkoutReady',
        }
      : {
          id: 'stripe_connect_fiat',
          kind: 'technical',
          title: 'Stripe Connect fiat checkout configured',
          status: 'HELD',
          reason: 'Stripe / billing runtime not checkout-ready',
          heldReason: 'billing_runtime_not_ready',
        },
    schemaReady
      ? {
          id: 'coin_ledger_schema',
          kind: 'technical',
          title: 'AethelCoinLedgerEntry Prisma schema',
          status: 'PASS',
          reason: 'Schema model present (separate from CreditLedger)',
          evidenceRef: 'prisma/schema.prisma',
        }
      : {
          id: 'coin_ledger_schema',
          kind: 'technical',
          title: 'AethelCoinLedgerEntry Prisma schema',
          status: 'HELD',
          reason: 'AethelCoinLedgerEntry model missing from schema',
          heldReason: 'coin_ledger_schema_held',
        },
    mintApi.ready
      ? {
          id: 'coin_mint_burn_api',
          kind: 'technical',
          title: 'Aethel Coins mint/burn API module',
          status: 'PASS',
          reason: 'Append-only mint/burn ledger semantics verified',
          evidenceRef: 'lib/treasury/aethel-coin-ledger.ts',
        }
      : {
          id: 'coin_mint_burn_api',
          kind: 'technical',
          title: 'Aethel Coins mint/burn API module',
          status: 'HELD',
          reason: mintApi.filePresent
            ? 'Coins mint/burn module present but custody semantics probe failed'
            : 'Coins mint/burn module not shipped — schema stub only',
          heldReason: mintApi.filePresent ? 'coins_mint_semantics_held' : 'coins_mint_held',
        },
    spendRouter.ready
      ? {
          id: 'treasury_spend_router',
          kind: 'technical',
          title: 'TreasurySpendRouter',
          status: 'PASS',
          reason: 'Reserve/settle spend router semantics verified',
          evidenceRef: 'lib/treasury/treasury-spend-router.ts',
        }
      : {
          id: 'treasury_spend_router',
          kind: 'technical',
          title: 'TreasurySpendRouter',
          status: 'HELD',
          reason: spendRouter.filePresent
            ? 'TreasurySpendRouter present but reserve/settle probe failed'
            : 'TreasurySpendRouter not shipped',
          heldReason: spendRouter.filePresent
            ? 'treasury_spend_router_semantics_held'
            : 'treasury_spend_router_held',
        },
    backpack.ready
      ? {
          id: 'backpack_custody_escrow',
          kind: 'technical',
          title: 'Backpack / item custody escrow',
          status: 'PASS',
          reason: '48h custodial → owned / revoke semantics verified',
          evidenceRef: 'lib/treasury/item-custody-escrow.ts',
        }
      : {
          id: 'backpack_custody_escrow',
          kind: 'technical',
          title: 'Backpack / item custody escrow',
          status: 'HELD',
          reason: backpack.filePresent
            ? 'Custody escrow present but 48h / revoke probe failed'
            : 'PlayerOwnedItem custody escrow module not shipped',
          heldReason: backpack.filePresent
            ? 'backpack_custody_semantics_held'
            : 'backpack_custody_held',
        },
    chargeback.ready
      ? {
          id: 'chargeback_handler',
          kind: 'technical',
          title: 'Chargeback / dispute handler',
          status: 'PASS',
          reason: 'Chargeback reverse path (items + coins) semantics verified',
          evidenceRef: 'lib/treasury/chargeback-handler.ts',
        }
      : {
          id: 'chargeback_handler',
          kind: 'technical',
          title: 'Chargeback / dispute handler',
          status: 'HELD',
          reason: chargeback.filePresent
            ? 'Chargeback handler present but reverse-path probe failed'
            : 'Treasury chargeback handler not shipped',
          heldReason: chargeback.filePresent
            ? 'chargeback_handler_semantics_held'
            : 'chargeback_handler_held',
        },
    humanItem('founder_treasury_signoff', 'Founder Treasury sign-off', certificate),
    humanItem('legal_kyc_tax_review', 'Legal KYC / tax (W-8/W-9 Connect) review', certificate),
    humanItem('coins_economy_policy', 'Coins economy / AML policy review', certificate),
  ]

  // Certificate must sign all human ids when present — partial sign-off stays HELD.
  for (const humanId of TREASURY_HUMAN_CHECKLIST_IDS) {
    const item = checklist.find((c) => c.id === humanId)
    if (item && certificate && !isHumanChecklistSigned(certificate, humanId)) {
      item.status = 'HELD'
      item.reason = `Certificate present but did not sign ${humanId}`
      item.heldReason = 'human_checklist_partial'
    }
  }

  const heldItems = checklist.filter((c) => c.status !== 'PASS')
  // FORCE_HUB_CHECKOUT / AETHEL_FORCE_HUB_CHECKOUT never grant PASS — logged only.
  const hubCheckoutAudited = heldItems.length === 0

  const report: TreasuryAuditReport = {
    generatedAt: new Date().toISOString(),
    wave: 'RTv1-c',
    hubCheckoutAudited,
    marketingHubCheckoutAllowed: hubCheckoutAudited,
    marketingCoinsAllowed: hubCheckoutAudited,
    checklist,
    heldItems,
    certificatePresent: certificate !== null,
    certificateAuditor: certificate?.auditor ?? null,
    certificateAuditedAt: certificate?.auditedAt ?? null,
    forbiddenForceEnvPresent: force.present,
    forbiddenForceEnvKeys: force.keys,
    claim: hubCheckoutAudited
      ? 'Hub checkout / Aethel Coins audited — Treasury H.1+ live'
      : `Hub checkout / Aethel Coins [HELD] — ${heldItems.length} audit item(s) open`,
    productCopy: hubCheckoutAudited
      ? 'Hub Buy and Aethel Coins are live under audited Treasury controls.'
      : 'Hub Buy, earnings strip, and Aethel Coins stay fail-closed until every H.1+ Treasury audit checklist item PASSes (technical modules + Founder/legal certificate). No mock unlock.',
  }

  log.info('treasury_audit_evaluated', {
    hubCheckoutAudited: report.hubCheckoutAudited,
    heldCount: heldItems.length,
    certificatePresent: report.certificatePresent,
    forbiddenForce: force.present,
  })

  return report
}

/**
 * Async probe wrapper — loads billing readiness when not injected.
 */
export async function probeTreasuryAuditHonesty(input: {
  cwd?: string
  stripeCheckoutConfigured?: boolean
  getStripeCheckoutConfigured?: () => Promise<boolean>
} = {}): Promise<TreasuryAuditReport> {
  let stripe = input.stripeCheckoutConfigured
  if (typeof stripe !== 'boolean' && input.getStripeCheckoutConfigured) {
    stripe = await input.getStripeCheckoutConfigured()
  }
  return evaluateTreasuryAudit({
    cwd: input.cwd,
    stripeCheckoutConfigured: stripe === true,
  })
}

/**
 * Gate helper — Hub commerce CTA. Uses audit probe when audited flag omitted.
 */
export function resolveHubCheckoutAuditedFromProbe(
  input: TreasuryAuditProbeInput = {},
): boolean {
  return evaluateTreasuryAudit(input).hubCheckoutAudited
}
