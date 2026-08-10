/**
 * RTv1-c / H.1+ — Treasury audit fail-closed proofs.
 * hubCheckoutAudited must not flip without technical modules + human certificate.
 * FORCE_HUB_CHECKOUT and production query overrides must never unlock.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  detectForbiddenHubCheckoutForceEnv,
  isHubCheckoutProductionRuntime,
  TREASURY_AUDIT_CERTIFICATE_KIND,
  TREASURY_AUDIT_SCHEMA_VERSION,
  TREASURY_HUMAN_CHECKLIST_IDS,
  buildHubCheckoutCertificateTemplate,
  describeHubCheckoutCertificatePath,
  isHubCheckoutCertificateTemplate,
  validateTreasuryAuditCertificate,
  type TreasuryAuditEvidenceCertificate,
} from '@/lib/treasury/treasury-audit-authority'
import { evaluateTreasuryAudit } from '@/lib/treasury/treasury-audit-capability'
import { evaluateTreasuryHonesty } from '@/lib/treasury/treasury-capability'
import {
  evaluateHubCheckoutGate,
  evaluateHubHonesty,
} from '@/lib/hub/hub-honesty-capability'

function makeCertificate(
  overrides: Partial<TreasuryAuditEvidenceCertificate> = {},
): TreasuryAuditEvidenceCertificate {
  return {
    schemaVersion: TREASURY_AUDIT_SCHEMA_VERSION,
    kind: TREASURY_AUDIT_CERTIFICATE_KIND,
    auditor: 'Founder Treasury',
    auditedAt: '2026-08-08T12:00:00.000Z',
    signedChecklistIds: [...TREASURY_HUMAN_CHECKLIST_IDS],
    evidenceRefs: ['https://internal.example/treasury-audit-2026-08'],
    ...overrides,
  }
}

describe('H.1+ Treasury audit certificate validation', () => {
  it('rejects empty / malformed certificates', () => {
    expect(validateTreasuryAuditCertificate(null).ok).toBe(false)
    expect(validateTreasuryAuditCertificate({}).ok).toBe(false)
    expect(
      validateTreasuryAuditCertificate({
        schemaVersion: 1,
        kind: TREASURY_AUDIT_CERTIFICATE_KIND,
        auditor: '',
        auditedAt: '2026-08-08T12:00:00.000Z',
        signedChecklistIds: ['founder_treasury_signoff'],
        evidenceRefs: ['ref'],
      }).ok,
    ).toBe(false)
    expect(
      validateTreasuryAuditCertificate({
        schemaVersion: 1,
        kind: TREASURY_AUDIT_CERTIFICATE_KIND,
        auditor: 'Legal',
        auditedAt: 'not-a-date',
        signedChecklistIds: ['founder_treasury_signoff'],
        evidenceRefs: ['ref'],
      }).ok,
    ).toBe(false)
    expect(
      validateTreasuryAuditCertificate({
        schemaVersion: 1,
        kind: TREASURY_AUDIT_CERTIFICATE_KIND,
        auditor: 'Legal',
        auditedAt: '2026-08-08T12:00:00.000Z',
        signedChecklistIds: [],
        evidenceRefs: ['ref'],
      }).ok,
    ).toBe(false)
  })

  it('accepts a complete certificate', () => {
    const result = validateTreasuryAuditCertificate(makeCertificate())
    expect(result.ok).toBe(true)
  })

  it('rejects unsigned template placeholders (never fake-unlock)', () => {
    const template = buildHubCheckoutCertificateTemplate()
    expect(isHubCheckoutCertificateTemplate(template)).toBe(true)
    expect(validateTreasuryAuditCertificate(template).ok).toBe(false)
    expect(describeHubCheckoutCertificatePath().requiredHumanIds).toEqual([
      ...TREASURY_HUMAN_CHECKLIST_IDS,
    ])
    expect(describeHubCheckoutCertificatePath().instructions.length).toBeGreaterThan(0)
  })
})

describe('H.1+ Treasury audit probe fail-closed', () => {
  const prevForce = process.env.FORCE_HUB_CHECKOUT
  const prevAethelForce = process.env.AETHEL_FORCE_HUB_CHECKOUT

  afterEach(() => {
    if (prevForce === undefined) delete process.env.FORCE_HUB_CHECKOUT
    else process.env.FORCE_HUB_CHECKOUT = prevForce
    if (prevAethelForce === undefined) delete process.env.AETHEL_FORCE_HUB_CHECKOUT
    else process.env.AETHEL_FORCE_HUB_CHECKOUT = prevAethelForce
  })

  it('stays HELD with default repo state (no mint modules, no certificate)', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: null,
      modulePresence: {
        aethel_coin_ledger: false,
        treasury_spend_router: false,
        item_custody_escrow: false,
        chargeback_handler: false,
      },
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.marketingCoinsAllowed).toBe(false)
    expect(report.marketingHubCheckoutAllowed).toBe(false)
    expect(report.heldItems.length).toBeGreaterThan(0)
    expect(report.heldItems.some((i) => i.id === 'coin_mint_burn_api')).toBe(true)
    expect(report.heldItems.some((i) => i.id === 'founder_treasury_signoff')).toBe(true)
    expect(report.productCopy).toMatch(/fail-closed/i)
  })

  it('does not unlock when FORCE_HUB_CHECKOUT=1 is set', () => {
    process.env.FORCE_HUB_CHECKOUT = '1'
    const force = detectForbiddenHubCheckoutForceEnv()
    expect(force.present).toBe(true)
    expect(force.keys).toContain('FORCE_HUB_CHECKOUT')

    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: null,
      modulePresence: {
        aethel_coin_ledger: false,
        treasury_spend_router: false,
        item_custody_escrow: false,
        chargeback_handler: false,
      },
    })
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.forbiddenForceEnvPresent).toBe(true)
  })

  it('does not unlock with certificate alone (technical modules still HELD)', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: makeCertificate(),
      modulePresence: {
        aethel_coin_ledger: false,
        treasury_spend_router: false,
        item_custody_escrow: false,
        chargeback_handler: false,
      },
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.certificatePresent).toBe(true)
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.heldItems.some((i) => i.kind === 'technical')).toBe(true)
    expect(report.heldItems.some((i) => i.id === 'founder_treasury_signoff')).toBe(false)
  })

  const allModulesReady = {
    modulePresence: {
      aethel_coin_ledger: true,
      treasury_spend_router: true,
      item_custody_escrow: true,
      chargeback_handler: true,
    },
    moduleSemantics: {
      aethel_coin_ledger: true,
      treasury_spend_router: true,
      item_custody_escrow: true,
      chargeback_handler: true,
    },
  } as const

  it('does not unlock with modules alone (human certificate still HELD)', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: null,
      ...allModulesReady,
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.heldItems.every((i) => i.kind === 'human')).toBe(true)
  })

  it('file presence without semantics stays HELD', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: makeCertificate(),
      modulePresence: {
        aethel_coin_ledger: true,
        treasury_spend_router: true,
        item_custody_escrow: true,
        chargeback_handler: true,
      },
      moduleSemantics: {
        aethel_coin_ledger: false,
        treasury_spend_router: false,
        item_custody_escrow: false,
        chargeback_handler: false,
      },
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.heldItems.some((i) => i.id === 'coin_mint_burn_api')).toBe(true)
    expect(report.heldItems.some((i) => i.heldReason === 'coins_mint_semantics_held')).toBe(
      true,
    )
  })

  it('flips hubCheckoutAudited only when all technical + human items PASS', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: makeCertificate(),
      ...allModulesReady,
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.heldItems).toEqual([])
    expect(report.hubCheckoutAudited).toBe(true)
    expect(report.marketingCoinsAllowed).toBe(true)
  })

  it('partial human sign-off stays HELD', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: makeCertificate({
        signedChecklistIds: ['founder_treasury_signoff'],
      }),
      ...allModulesReady,
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
    })
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.heldItems.some((i) => i.id === 'legal_kyc_tax_review')).toBe(true)
  })

  it('reads durable certificate from disk when present', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aethel-treasury-audit-'))
    const auditDir = path.join(root, 'audit')
    fs.mkdirSync(auditDir, { recursive: true })
    fs.writeFileSync(
      path.join(auditDir, 'hub-checkout-certificate.json'),
      JSON.stringify(makeCertificate()),
      'utf8',
    )
    const prevRoot = process.env.AETHEL_TREASURY_AUDIT_ROOT
    process.env.AETHEL_TREASURY_AUDIT_ROOT = auditDir
    try {
      const report = evaluateTreasuryAudit({
        stripeCheckoutConfigured: true,
        ...allModulesReady,
        coinLedgerSchemaPresent: true,
        h0RevenueLanesReady: true,
      })
      expect(report.certificatePresent).toBe(true)
      expect(report.hubCheckoutAudited).toBe(true)
    } finally {
      if (prevRoot === undefined) delete process.env.AETHEL_TREASURY_AUDIT_ROOT
      else process.env.AETHEL_TREASURY_AUDIT_ROOT = prevRoot
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('live shipped modules PASS technical probes but hubCheckoutAudited stays false without certificate', () => {
    const report = evaluateTreasuryAudit({
      stripeCheckoutConfigured: true,
      certificate: null,
      coinLedgerSchemaPresent: true,
      h0RevenueLanesReady: true,
      // No modulePresence/moduleSemantics overrides — real files + real probes.
    })
    expect(report.checklist.find((i) => i.id === 'coin_mint_burn_api')?.status).toBe('PASS')
    expect(report.checklist.find((i) => i.id === 'treasury_spend_router')?.status).toBe('PASS')
    expect(report.checklist.find((i) => i.id === 'backpack_custody_escrow')?.status).toBe(
      'PASS',
    )
    expect(report.checklist.find((i) => i.id === 'chargeback_handler')?.status).toBe('PASS')
    expect(report.heldItems.every((i) => i.kind === 'human')).toBe(true)
    expect(report.hubCheckoutAudited).toBe(false)
    expect(report.marketingCoinsAllowed).toBe(false)
  })
})

describe('H.1+ Hub honesty + Treasury honesty wiring', () => {
  it('evaluateHubCheckoutGate stays fail-closed by default', () => {
    expect(evaluateHubCheckoutGate().allowed).toBe(false)
    expect(evaluateHubCheckoutGate().code).toBe('HUB_CHECKOUT_HELD')
  })

  it('evaluateTreasuryHonesty exposes audit held items and keeps marketing false', () => {
    const honesty = evaluateTreasuryHonesty({
      stripeCheckoutConfigured: true,
      auditReport: evaluateTreasuryAudit({
        stripeCheckoutConfigured: true,
        certificate: null,
        modulePresence: {
          aethel_coin_ledger: false,
          treasury_spend_router: false,
          item_custody_escrow: false,
          chargeback_handler: false,
        },
      }),
    })
    expect(honesty.hubCheckoutAudited).toBe(false)
    expect(honesty.marketingCoinsAllowed).toBe(false)
    expect(honesty.marketingHubCheckoutAllowed).toBe(false)
    expect(honesty.treasuryAudit.heldItems.length).toBeGreaterThan(0)
    expect(honesty.aethelCoins.status).toBe('HELD')
  })

  it('hub honesty marketing checkout stays false without audited flag', () => {
    const report = evaluateHubHonesty({
      arcadeCatalogAvailable: true,
      hasPublishedGames: true,
      hubCheckoutAudited: false,
    })
    expect(report.hubCheckout.status).toBe('HELD')
    expect(report.marketingHubCheckoutAllowed).toBe(false)
    expect(report.marketingCoinsAllowed).toBe(false)
  })
})

describe('H.1+ production runtime override policy', () => {
  const prevNode = process.env.NODE_ENV
  const prevVercel = process.env.VERCEL_ENV

  beforeEach(() => {
    delete process.env.FORCE_HUB_CHECKOUT
    delete process.env.AETHEL_FORCE_HUB_CHECKOUT
  })

  afterEach(() => {
    process.env.NODE_ENV = prevNode
    if (prevVercel === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = prevVercel
  })

  it('treats NODE_ENV=production as production runtime (no checkout query unlock)', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.VERCEL_ENV
    expect(isHubCheckoutProductionRuntime()).toBe(true)
  })

  it('treats VERCEL_ENV=production as production runtime', () => {
    process.env.NODE_ENV = 'test'
    process.env.VERCEL_ENV = 'production'
    expect(isHubCheckoutProductionRuntime()).toBe(true)
  })
})
