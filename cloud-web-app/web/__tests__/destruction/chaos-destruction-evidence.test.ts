/**
 * Chaos destruction physics evidence — fail-closed AAA claims.
 */

import { describe, expect, it } from 'vitest'

import {
  CHAOS_DESTRUCTION_AAA_READY,
  CHAOS_DESTRUCTION_MARKETING_ALLOWED,
  UNREAL_CHAOS_PARITY_READY,
  claimChaosDestructionAaa,
  claimUnrealChaosParity,
  probeChaosDestructionEvidenceReadiness,
  runChaosDestructionEvidenceSoak,
} from '@/lib/destruction/chaos-destruction-evidence'
import { probeDestructionHonesty } from '@/lib/destruction/destruction-honesty'

describe('Chaos destruction evidence', () => {
  it('seals strain→break evidence without flipping AAA flags', () => {
    const soak = runChaosDestructionEvidenceSoak()
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.brokenEdgeCount).toBeGreaterThan(0)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.peakStrain).toBeGreaterThan(1)
    expect(soak.value.chaosDestructionAaaReady).toBe(false)
    expect(soak.value.unrealChaosParityReady).toBe(false)
    expect(soak.value.marketingAllowed).toBe(false)
  })

  it('refuses weak impacts and AAA/parity marketing claims', () => {
    const weak = runChaosDestructionEvidenceSoak({
      impact: { force: 1, radius: 0.01, point: [99, 99, 99] },
    })
    expect(weak.ok).toBe(false)
    expect(claimChaosDestructionAaa().ok).toBe(false)
    expect(claimUnrealChaosParity().ok).toBe(false)
    expect(CHAOS_DESTRUCTION_AAA_READY).toBe(false)
    expect(UNREAL_CHAOS_PARITY_READY).toBe(false)
    expect(CHAOS_DESTRUCTION_MARKETING_ALLOWED).toBe(false)
  })

  it('wires honesty probe with evidence ready and AAA false', () => {
    const probe = probeChaosDestructionEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    const honesty = probeDestructionHonesty()
    expect(honesty.chaosDestructionEvidenceReady).toBe(true)
    expect(honesty.chaosDestructionAaaReady).toBe(false)
    expect(honesty.chaosParityMarketingAllowed).toBe(false)
  })
})
