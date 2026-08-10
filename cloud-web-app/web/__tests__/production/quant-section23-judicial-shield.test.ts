/**
 * §23 — Judicial shield + GPU mux + consent telemetry fail-closed tests.
 */

import { describe, expect, it } from 'vitest'

import {
  QUANT_FINANCE_INVESTMENT_GRADE,
  probeQuantFinanceHonesty,
} from '@/lib/production/quant-finance-honesty'
import {
  appendEulaAttestation,
  createAcceptanceAttestationStore,
  verifyAttestationChain,
} from '@/lib/server/quant/acceptance-attestation-store'
import {
  QUANT_RISK_ACCEPTANCE_PHRASE,
  recordEulaRiskAcceptance,
} from '@/lib/server/quant/eula-risk-acceptance'
import {
  assertFinanceDomainIsolated,
  assertStrategyCapitalNotHubCoins,
  createFinanceProjectVault,
  createGameProjectScope,
} from '@/lib/server/quant/finance-domain-vault'
import { probeGpuPriorityMux, requestGpuPrioritySwap } from '@/lib/server/quant/gpu-priority-mux'
import {
  assertNoExchangeSecretInPlatformRecord,
  mintLocalExchangeKeyRef,
} from '@/lib/server/quant/non-custodial-invariants'
import {
  attemptEnableLive,
  createPaperTradingSession,
  evaluateWalkForwardQuarantine,
} from '@/lib/server/quant/paper-trading-kernel'
import {
  SHADOW_AUDIT_CLOUD_CONSENT_DEFAULT,
  attemptShadowAuditCloudUpload,
  createShadowAuditConsent,
} from '@/lib/server/quant/shadow-audit-telemetry'

describe('§23 judicial shield + hardware priority (fail-closed)', () => {
  it('rejects platform DB rows that look like exchange secrets', () => {
    const bad = assertNoExchangeSecretInPlatformRecord({
      apiSecret: 'abcdefghijklmnopqrstuvwxyz0123456789ABCD',
    })
    expect(bad.ok).toBe(false)

    const ref = mintLocalExchangeKeyRef('user-local-handle-1')
    expect(ref.ok).toBe(true)
    if (!ref.ok) return
    const good = assertNoExchangeSecretInPlatformRecord({
      accountId: 'acct-1',
      exchangeKeyRef: ref.value,
    })
    expect(good.ok).toBe(true)
  })

  it('blocks EULA unlock when phrase mismatches; records hash on exact phrase', () => {
    const wrong = recordEulaRiskAcceptance({
      accountId: 'acct-1',
      hwid: 'hw-1',
      ipAddress: '203.0.113.10',
      typedPhrase: 'i accept the risks',
    })
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.code).toBe('phrase_mismatch')

    const ok = recordEulaRiskAcceptance({
      accountId: 'acct-1',
      hwid: 'hw-1',
      ipAddress: '203.0.113.10',
      typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
      now: '2026-08-10T16:00:00.000Z',
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.value.liveBrokerUnlocked).toBe(false)
    expect(ok.value.attestationHash).toHaveLength(64)
    expect(ok.value.antiFraudBindingHash).toHaveLength(64)
  })

  it('blocks live unlock without EULA even after quarantine PASS', () => {
    const session = createPaperTradingSession({
      projectId: 'proj-s23',
      strategyId: 'strat-s23',
    })
    const gate = evaluateWalkForwardQuarantine({
      strategyId: 'strat-s23',
      windowCount: 5,
      passRate: 0.9,
    })
    expect(gate.status).toBe('PASS')
    const blocked = attemptEnableLive(session, gate, null)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('eula_not_accepted')
  })

  it('forbids shadow cloud upload without explicit consent (default OFF)', () => {
    expect(SHADOW_AUDIT_CLOUD_CONSENT_DEFAULT).toBe(false)

    const noConsent = attemptShadowAuditCloudUpload(null, {
      kind: 'error_log',
      accountId: 'acct-1',
      encryptedOrHashedBody: 'abc',
      localLedgerEntryId: 'local-1',
    })
    expect(noConsent.ok).toBe(false)

    const falseConsent = attemptShadowAuditCloudUpload(
      createShadowAuditConsent({ accountId: 'acct-1', cloudAuditUploadConsent: false }),
      {
        kind: 'order_log',
        accountId: 'acct-1',
        encryptedOrHashedBody: 'abc',
        localLedgerEntryId: 'local-2',
      },
    )
    expect(falseConsent.ok).toBe(false)
    if (!falseConsent.ok) expect(falseConsent.code).toBe('consent_not_true')
  })

  it('accepts consent-gated upload stub but never claims cloudPersisted durable vault', () => {
    const receipt = attemptShadowAuditCloudUpload(
      createShadowAuditConsent({ accountId: 'acct-1', cloudAuditUploadConsent: true }),
      {
        kind: 'order_log',
        accountId: 'acct-1',
        encryptedOrHashedBody: 'enc-body',
        localLedgerEntryId: 'local-3',
      },
    )
    expect(receipt.ok).toBe(true)
    if (!receipt.ok) return
    expect(receipt.value.cloudPersisted).toBe(false)
    expect(receipt.value.consented).toBe(true)
  })

  it('reports GPU Priority Mux not ready — no 50ms hot-swap claim', () => {
    const mux = probeGpuPriorityMux()
    expect(mux.hotSwapReady).toBe(false)
    expect(mux.claimed50msEvictionProven).toBe(false)
    expect(mux.status).toBe('HELD')

    const swap = requestGpuPrioritySwap({
      from: 'game_mini_ia',
      to: 'quant_mini_ia',
      reason: 'finance peak',
    })
    expect(swap.ok).toBe(false)
  })

  it('appends admin-bound EULA attestation on append-only chain', () => {
    const eula = recordEulaRiskAcceptance({
      accountId: 'acct-att',
      hwid: 'hw-att',
      ipAddress: '198.51.100.7',
      typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
      now: '2026-08-10T16:00:00.000Z',
    })
    expect(eula.ok).toBe(true)
    if (!eula.ok) return

    const store = createAcceptanceAttestationStore({ storeId: 'test-attestation' })
    const appended = appendEulaAttestation(store, eula.value, '2026-08-10T16:00:01.000Z')
    expect(appended.ok).toBe(true)
    if (!appended.ok) return
    expect(verifyAttestationChain(appended.value.store).valid).toBe(true)
  })

  it('keeps capital isolation + investmentGrade false', () => {
    expect(QUANT_FINANCE_INVESTMENT_GRADE).toBe(false)
    const vault = createFinanceProjectVault({ projectId: 'p', strategyCapitalUsd: 100 })
    const game = createGameProjectScope('p')
    expect(assertFinanceDomainIsolated(vault, game).ok).toBe(true)
    expect(assertStrategyCapitalNotHubCoins('hub_coins').ok).toBe(false)

    const report = probeQuantFinanceHonesty()
    expect(report.investmentGrade).toBe(false)
    expect(report.section23.gpuPriorityMux.hotSwapReady).toBe(false)
    expect(report.section23.shadowAuditTelemetry.defaultConsentOn).toBe(false)
    expect(report.section23.nonCustodial.ready).toBe(true)
    expect(report.section23.eulaAcceptance.ready).toBe(true)
  })
})
