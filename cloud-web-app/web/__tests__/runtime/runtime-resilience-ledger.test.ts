import { describe, expect, it } from 'vitest'

import {
  buildRuntimeResilienceLedger,
  validateRuntimeResilienceLedger,
} from '@/lib/runtime/runtime-resilience-ledger'

describe('runtime resilience ledger', () => {
  it('records critical recovery events with blocked market claims', () => {
    const ledger = buildRuntimeResilienceLedger({
      runId: 'run-1',
      events: [
        {
          surfaceId: 'research-browser',
          kind: 'takeover-requested',
          recoveryMode: 'takeover-control',
          message: 'Operator requested human takeover after navigation risk.',
          evidenceRefs: ['browser replay receipt'],
        },
      ],
    })

    expect(validateRuntimeResilienceLedger(ledger)).toEqual([])
    expect(ledger.summary.eventCount).toBe(1)
    expect(ledger.summary.criticalCount).toBe(1)
    expect(ledger.summary.readyForStrongerClaims).toBe(false)
    expect(ledger.summary.blockedClaims).toContain('research verified')
  })

  it('allows stronger claims only when every receipt is present and no critical event remains', () => {
    const ledger = buildRuntimeResilienceLedger({
      runId: 'run-2',
      events: [
        {
          surfaceId: 'ide-shell',
          kind: 'fallback-activated',
          recoveryMode: 'fallback-preview',
          message: 'Preview recovered through the shell fallback path.',
          evidenceRefs: ['error boundary receipt', 'performance trace receipt'],
        },
      ],
    })

    expect(validateRuntimeResilienceLedger(ledger)).toEqual([])
    expect(ledger.summary.missingEvidenceCount).toBe(0)
    expect(ledger.summary.criticalCount).toBe(0)
    expect(ledger.summary.readyForStrongerClaims).toBe(true)
  })

  it('keeps cloud render governed by teardown and cost-cap evidence', () => {
    const ledger = buildRuntimeResilienceLedger({
      runId: 'run-3',
      events: [
        {
          surfaceId: 'cloud-render',
          kind: 'teardown-completed',
          recoveryMode: 'hold-for-human-review',
          message: 'Cloud render session closed after review.',
          evidenceRefs: ['teardown receipt'],
        },
      ],
    })

    expect(validateRuntimeResilienceLedger(ledger)).toEqual([])
    expect(ledger.summary.missingEvidenceCount).toBe(1)
    expect(ledger.summary.blockedClaims).toContain('cloud render available')
  })
})
