/**
 * N3 — Trade audit ledger tests.
 */

import { describe, expect, it } from 'vitest'

import {
  appendTradeAuditEntry,
  createTradeAuditLedger,
  fingerprintTradeAuditLedger,
  recordTradeLifecycle,
  verifyTradeAuditChain,
} from '@/lib/server/quant/trade-audit-ledger'

const sampleIntent = {
  symbol: 'MSFT',
  side: 'sell' as const,
  quantity: 5,
  limitPrice: 400,
  strategyId: 'strat-delta',
}

describe('trade audit ledger (N3)', () => {
  it('maintains append-only hash chain integrity', () => {
    let ledger = createTradeAuditLedger({ projectId: 'proj-audit-1' })
    const first = appendTradeAuditEntry(ledger, {
      phase: 'intent',
      strategyId: 'strat-delta',
      orderIntent: sampleIntent,
      executionMode: 'none',
      clockDriftMs: 2,
      note: 'intent',
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    ledger = first.value

    const second = appendTradeAuditEntry(ledger, {
      phase: 'risk_check',
      strategyId: 'strat-delta',
      orderIntent: sampleIntent,
      riskVerdict: 'pass',
      executionMode: 'none',
      clockDriftMs: 3,
      note: 'risk pass',
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    ledger = second.value

    const verification = verifyTradeAuditChain(ledger)
    expect(verification.valid).toBe(true)
    expect(fingerprintTradeAuditLedger(ledger)).toBe(verification.fingerprint)
  })

  it('records intent → risk → paper lifecycle with clock drift', () => {
    const ledger = createTradeAuditLedger({ projectId: 'proj-audit-2' })
    const recorded = recordTradeLifecycle({
      ledger,
      strategyId: 'strat-delta',
      orderIntent: sampleIntent,
      riskVerdict: 'pass',
      executionMode: 'paper',
      clockDriftMs: 12,
    })
    expect(recorded.ok).toBe(true)
    if (!recorded.ok) return

    expect(recorded.value.entries).toHaveLength(3)
    expect(recorded.value.entries[0]?.phase).toBe('intent')
    expect(recorded.value.entries[1]?.phase).toBe('risk_check')
    expect(recorded.value.entries[2]?.phase).toBe('paper_submit')
    expect(recorded.value.entries[2]?.clockDriftMs).toBe(12)
    expect(verifyTradeAuditChain(recorded.value).valid).toBe(true)
  })

  it('records reject path when risk fails', () => {
    const ledger = createTradeAuditLedger({ projectId: 'proj-audit-3' })
    const recorded = recordTradeLifecycle({
      ledger,
      strategyId: 'strat-delta',
      orderIntent: sampleIntent,
      riskVerdict: 'fail',
      executionMode: 'none',
      clockDriftMs: 0,
    })
    expect(recorded.ok).toBe(true)
    if (!recorded.ok) return

    expect(recorded.value.entries.at(-1)?.phase).toBe('reject')
    expect(verifyTradeAuditChain(recorded.value).valid).toBe(true)
  })
})
