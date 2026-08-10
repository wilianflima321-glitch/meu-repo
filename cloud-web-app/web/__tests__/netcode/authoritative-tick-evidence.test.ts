/**
 * SF1 deepen — authoritative fixed-point tick evidence on unified session tape.
 */

import { describe, expect, it } from 'vitest'

import {
  DESYNC_FREE_MARKETING_ALLOWED,
  GGPO_LIVE_FROM_TICK_EVIDENCE,
  probeAuthoritativeTickEvidenceReadiness,
  runAuthoritativeTickEvidence,
} from '@/lib/netcode/authoritative-tick-evidence'
import { probeSharedSubstrateHonesty } from '@/lib/production/shared-substrate-honesty'

describe('authoritative tick evidence', () => {
  it('records fixed-point ticks on session tape and survives late correction', () => {
    const evidence = runAuthoritativeTickEvidence({ frames: 24 })
    expect(evidence.passed).toBe(true)
    expect(evidence.chainValid).toBe(true)
    expect(evidence.frames).toBe(24)
    expect(evidence.baselineTapeFingerprint.length).toBeGreaterThan(0)
    expect(evidence.afterCorrectionTapeFingerprint.length).toBeGreaterThan(0)
    expect(evidence.afterCorrectionTapeFingerprint).not.toBe(evidence.baselineTapeFingerprint)
    expect(evidence.finalStateHash.length).toBeGreaterThan(0)
    expect(evidence.ggpoLive).toBe(false)
    expect(evidence.desyncFreeMarketingAllowed).toBe(false)
  })

  it('keeps GGPO / desync-free marketing false', () => {
    expect(GGPO_LIVE_FROM_TICK_EVIDENCE).toBe(false)
    expect(DESYNC_FREE_MARKETING_ALLOWED).toBe(false)
    const probe = probeAuthoritativeTickEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.ggpoLive).toBe(false)
  })

  it('wires into shared-substrate honesty without flipping fixProtocolReady', () => {
    const report = probeSharedSubstrateHonesty()
    expect(report.sf1AuthoritativeTickEvidenceReady).toBe(true)
    expect(report.sf1SessionTapeReady).toBe(true)
    expect(report.fixProtocolReady).toBe(false)
    expect(report.vanguardQuantFinanceReady).toBe(false)
    expect(report.hftMarketingAllowed).toBe(false)
  })
})
