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
    expect(report.heldReason).toBe('onda_n_zero_production_modules')
  })

  it('marks core execution paths NOT_IMPLEMENTED', () => {
    const report = describeQuantFinanceHonestySync()
    const byId = Object.fromEntries(report.capabilities.map((c) => [c.id, c]))

    expect(byId['market-data-feed']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['order-execution-kernel']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['fix-protocol-bridge']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['paper-trading-quarantine']?.status).toBe('NOT_IMPLEMENTED')
    expect(byId['regulatory-audit-trail']?.status).toBe('NOT_IMPLEMENTED')
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
