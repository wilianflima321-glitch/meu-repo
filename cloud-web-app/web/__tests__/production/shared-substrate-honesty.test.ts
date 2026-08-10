import { describe, expect, it } from 'vitest'

import { probeSharedSubstrateHonesty } from '@/lib/production/shared-substrate-honesty'
import {
  appendChainedTaskEvidence,
  appendTaskEvidence,
  createTaskEvidenceLedger,
  fingerprintEvidenceLedger,
  verifyEvidenceAuditChain,
} from '@/lib/production/task-evidence-ledger'

describe('shared substrate honesty', () => {
  it('passes dual-use determinism + competitive soak + audit chain', () => {
    const report = probeSharedSubstrateHonesty()

    expect(report.deterministicWebReplayReady).toBe(true)
    expect(report.competitiveRollbackSoakReady).toBe(true)
    expect(report.evidenceAuditChainReady).toBe(true)
    expect(report.sf1SessionTapeReady).toBe(true)
    expect(report.sf1Status).toBe('PARTIAL')
    expect(report.sf2SignedWormReady).toBe(true)
    expect(report.sf2Status).toBe('PARTIAL')
    expect(report.sf3MonotonicTimebaseReady).toBe(true)
    expect(report.sf3Status).toBe('PARTIAL')
    expect(report.sf4QuantVaultPackReady).toBe(true)
    expect(report.sf4Status).toBe('PARTIAL')
    expect(report.sf5HeadlessRuntimeReady).toBe(true)
    expect(report.sf5Status).toBe('PARTIAL')
    expect(report.monotonicTimebaseReady).toBe(true)
    expect(report.sharedSubstrateReady).toBe(true)
    expect(report.vanguardQuantFinanceReady).toBe(false)
    expect(report.fixProtocolReady).toBe(false)
    expect(report.hftMarketingAllowed).toBe(false)
    expect(report.webReplayBaselineHash).toBe(report.webReplayReplayHash)
    expect(report.evidenceLedgerFingerprint.length).toBeGreaterThan(0)
    expect(report.sessionTapeFingerprint.length).toBeGreaterThan(0)
    expect(report.sessionTapeEntryCount).toBeGreaterThanOrEqual(2)
    expect(report.wormFingerprint.length).toBeGreaterThan(0)
    expect(report.wormEntryCount).toBeGreaterThanOrEqual(2)
  })

  it('detects broken audit chain links', () => {
    const base = createTaskEvidenceLedger({
      taskId: 'broken-chain',
      projectId: 'p1',
      mission: 'Probe broken chain',
      ownerAgent: 'test',
      now: '2026-08-10T12:00:00.000Z',
    })
    const tampered = appendTaskEvidence(base, {
      kind: 'audit-chain',
      title: 'Tampered',
      summary: 'Bad prev',
      refs: ['chain:prev=deadbeef'],
      actor: 'test',
      createdAt: '2026-08-10T12:00:01.000Z',
    })

    const check = verifyEvidenceAuditChain(tampered)
    expect(check.valid).toBe(false)
    expect(fingerprintEvidenceLedger(tampered)).toMatch(/^[0-9a-f]{8}$/)
  })
})
