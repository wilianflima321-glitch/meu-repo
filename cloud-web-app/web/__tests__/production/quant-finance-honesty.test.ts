/**
 * Onda N — Quantitative Finance honesty probe tests.
 */

import { describe, expect, it } from 'vitest'
import {
  QUANT_FINANCE_HONESTY_LETTER,
  QUANT_FINANCE_INVESTMENT_GRADE,
  QUANT_FINANCE_MARKETING_ALLOWED,
  VANGUARD_QUANT_READY,
  describeQuantFinanceHonestySync,
  probeQuantFinanceHonesty,
} from '@/lib/production/quant-finance-honesty'

describe('quant finance honesty probe', () => {
  it('never claims Vanguard Quant or investment-grade ready', () => {
    expect(VANGUARD_QUANT_READY).toBe(false)
    expect(QUANT_FINANCE_INVESTMENT_GRADE).toBe(false)
    expect(QUANT_FINANCE_MARKETING_ALLOWED).toBe(false)
    expect(QUANT_FINANCE_HONESTY_LETTER).toBe('nf')

    const report = probeQuantFinanceHonesty()
    expect(report.vanguardQuantReady).toBe(false)
    expect(report.investmentGrade).toBe(false)
    expect(report.marketingAllowed).toBe(false)
    expect(report.stamp).toBe('HELD')
    expect(report.heldReason).toBe('onda_n_p0_cores_partial_no_investment_grade')
  })

  it('reports N1–N5 cores as PARTIAL after backend ship', () => {
    const report = probeQuantFinanceHonesty()
    expect(report.ondaNCores).toHaveLength(5)
    for (const core of report.ondaNCores) {
      expect(core.status).toBe('PARTIAL')
      expect(core.ready).toBe(true)
    }
    expect(report.substrateSf1.status).toBe('PARTIAL')
    expect(report.substrateSf1.ready).toBe(true)
    expect(report.substrateSf2.status).toBe('PARTIAL')
    expect(report.substrateSf2.ready).toBe(true)
    expect(report.substrateSf3.status).toBe('PARTIAL')
    expect(report.substrateSf3.ready).toBe(true)
    const byId = Object.fromEntries(report.capabilities.map((c) => [c.id, c]))
    expect(byId['domain-isolation-l14']?.status).toBe('PARTIAL')
    expect(byId['paper-trading-quarantine']?.status).toBe('PARTIAL')
    expect(byId['regulatory-audit-trail']?.status).toBe('PARTIAL')
    expect(byId['market-data-feed']?.status).toBe('PARTIAL')
    expect(byId['risk-limits-kernel']?.status).toBe('PARTIAL')
  })

  it('marks non-ship execution paths NOT_IMPLEMENTED or HELD', () => {
    const report = describeQuantFinanceHonestySync()
    const byId = Object.fromEntries(report.capabilities.map((c) => [c.id, c]))

    expect(byId['order-execution-kernel']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['fix-protocol-bridge']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['gpu-priority-mux']?.status).toBe('HELD')
    expect(byId['non-custodial-invariants']?.status).toBe('PARTIAL')
    expect(byId['eula-risk-acceptance']?.status).toBe('PARTIAL')
    expect(byId['shadow-audit-consent']?.status).toBe('PARTIAL')
  })

  it('reports §23 section probes without claiming invulnerability or 50ms mux', () => {
    const report = probeQuantFinanceHonesty()
    expect(report.section23.gpuPriorityMux.hotSwapReady).toBe(false)
    expect(report.section23.gpuPriorityMux.claimed50msEvictionProven).toBe(false)
    expect(report.section23.shadowAuditTelemetry.defaultConsentOn).toBe(false)
    expect(report.section23.nonCustodial.ready).toBe(true)
    expect(report.section23.eulaAcceptance.ready).toBe(true)
    expect(report.section23.acceptanceAttestation.ready).toBe(true)
    expect(report.wedgeConflict.some((line) => line.includes('GDPR'))).toBe(true)
    expect(report.wedgeConflict.some((line) => line.includes('untouchable'))).toBe(true)
  })

  it('reports Dual-Mode Execution PARTIAL without investmentGrade or live adapters', () => {
    const report = probeQuantFinanceHonesty()
    expect(report.dualModeExecution.investmentGrade).toBe(false)
    expect(report.dualModeExecution.vanguardHftApi.liveBrokerReady).toBe(false)
    expect(report.dualModeExecution.manusRpaBrowser.liveOrtRpaReady).toBe(false)
    expect(report.dualModeExecution.maestroGuardWired).toBe(true)
    expect(report.wedgeConflict.some((line) => line.includes('home-WiFi') || line.includes('colocation'))).toBe(
      true,
    )
    expect(report.wedgeConflict.some((line) => line.includes('RPA'))).toBe(true)
  })

  it('flags wedge conflicts and dead legacy trading code', () => {
    const report = probeQuantFinanceHonesty()
    expect(report.wedgeConflict.length).toBeGreaterThanOrEqual(3)
    expect(report.wedgeConflict.some((line) => line.includes('CostGuard'))).toBe(true)
    expect(report.deadCodeWarnings.some((w) => w.includes('aethel-cli-legacy'))).toBe(true)
  })

  it('documents reusable infra as PARTIAL or CONFLICT — not ship-ready', () => {
    const report = probeQuantFinanceHonesty()
    for (const row of report.reusableInfra) {
      expect(['PARTIAL', 'CONFLICT', 'HELD']).toContain(row.status)
    }
    const firewall = report.reusableInfra.find((r) => r.id === 'high-risk-firewall')
    expect(firewall?.status).toBe('CONFLICT')
  })
})
