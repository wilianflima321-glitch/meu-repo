/**
 * Law III — Euphoria / active ragdoll evidence (fail-closed AAA).
 */

import { describe, expect, it } from 'vitest'

import {
  EUPHORIA_AAA_READY,
  EUPHORIA_PARITY_MARKETING_ALLOWED,
  NATURALMOTION_PARITY_READY,
  claimEuphoriaAaa,
  claimNaturalMotionParity,
  probeEuphoriaRagdollEvidenceReadiness,
  runEuphoriaRagdollEvidenceSoak,
} from '@/lib/physics/euphoria-ragdoll-evidence'
import { evaluateActiveRagdollHonesty } from '@/lib/physics/active-ragdoll-apply'

describe('Euphoria ragdoll evidence', () => {
  it('seals muscle/balance soak without flipping Euphoria AAA', () => {
    const soak = runEuphoriaRagdollEvidenceSoak({ capabilityScore: 60 })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.applied).toBe(true)
    expect(soak.value.torqueMagnitudeSum).toBeGreaterThan(0)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.euphoriaAaaReady).toBe(false)
    expect(soak.value.canClaimEuphoriaParity).toBe(false)
    expect(soak.value.marketingAllowed).toBe(false)
  })

  it('scales GT730 muscle budget and refuses AAA claims', () => {
    const mid = runEuphoriaRagdollEvidenceSoak({ capabilityScore: 55 })
    const low = runEuphoriaRagdollEvidenceSoak({ capabilityScore: 10 })
    expect(mid.ok && low.ok).toBe(true)
    if (!mid.ok || !low.ok) return
    expect(low.value.muscleBudgetScale).toBeLessThan(mid.value.muscleBudgetScale)

    expect(runEuphoriaRagdollEvidenceSoak({ applyEnabled: false }).ok).toBe(false)
    expect(claimEuphoriaAaa().ok).toBe(false)
    expect(claimNaturalMotionParity().ok).toBe(false)
    expect(EUPHORIA_AAA_READY).toBe(false)
    expect(EUPHORIA_PARITY_MARKETING_ALLOWED).toBe(false)
    expect(NATURALMOTION_PARITY_READY).toBe(false)
  })

  it('probe stays PARTIAL with honesty Euphoria false', () => {
    const probe = probeEuphoriaRagdollEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    const honesty = evaluateActiveRagdollHonesty({
      rapierSubstrateReady: true,
      applyPathEnabled: true,
      capabilityScore: 55,
    })
    expect(honesty.canClaimEuphoriaParity).toBe(false)
    expect(honesty.euphoriaParityStatus).toBe('HELD')
  })
})
