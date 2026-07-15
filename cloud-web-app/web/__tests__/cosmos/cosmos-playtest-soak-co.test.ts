/**
 * Letter co — Aethel Cosmos multi-frame live playtest soak deepen.
 * cn left interface gears as cosmosScaleReady; co proves live soak evidence.
 */

import { describe, expect, it } from 'vitest'
import {
  COSMOS_LETTER,
  COSMOS_LIVE_SOAK_LETTER,
  COSMOS_PLAYTEST_WIRE_LETTER,
  buildCosmosFloatingOriginWalk,
  proveCosmosLivePlaytestSoak,
  proveCosmosPlaytestSoak,
  proveCosmosPlaytestSoakReady,
  proveCosmosScaleReady,
  proveCosmosSimWire,
  probeCosmosHonesty,
  resolveCosmosCapabilityBudget,
} from '@/lib/cosmos'

describe('Aethel Cosmos live playtest soak (co)', () => {
  it('CapScore GT730 degrades interest/CCD/fine-BVH vs enthusiast', () => {
    const low = resolveCosmosCapabilityBudget(12)
    const high = resolveCosmosCapabilityBudget(80)
    expect(low.tier).toBe('gt730')
    expect(low.maxInterestActors).toBeLessThan(high.maxInterestActors)
    expect(low.ccdBodiesMax).toBeLessThan(high.ccdBodiesMax)
    expect(low.fineBvhRadiusM).toBeLessThan(high.fineBvhRadiusM)
  })

  it('sim wire dual BVH + nested island evidence (co deepen)', () => {
    const r = proveCosmosSimWire(38)
    expect(r.passed).toBe(true)
    expect(r.dualBvh).toBe(true)
    expect(r.nested).toBe(true)
    expect(r.ccd).toBe(true)
  })

  it('floating-origin walk crosses rebase threshold', () => {
    const walk = buildCosmosFloatingOriginWalk(100)
    expect(walk.length).toBeGreaterThanOrEqual(5)
    expect(walk.some((p) => Math.hypot(p.x, p.y, p.z) > 100)).toBe(true)
  })

  it('multi-frame live soak: rebase + nested + CCD + dual BVH', () => {
    const soak = proveCosmosLivePlaytestSoak(38)
    expect(soak.letter).toBe(COSMOS_LIVE_SOAK_LETTER)
    expect(soak.letter).toBe('co')
    expect(soak.passed).toBe(true)
    expect(soak.floatingOriginRebased).toBe(true)
    expect(soak.nestedIslandIsolated).toBe(true)
    expect(soak.ccdSweepHit).toBe(true)
    expect(soak.dualBvhQuerySmoke).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(16)
  })

  it('GT730 live soak still passes with tighter fine BVH', () => {
    const soak = proveCosmosLivePlaytestSoak(12)
    expect(soak.passed).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.dualBvhQuerySmoke).toBe(true)
  })

  it('honesty: cosmosPlaytestSoakReady distinct from cosmosScaleReady', async () => {
    expect(await proveCosmosScaleReady()).toBe(true)
    expect(proveCosmosPlaytestSoakReady()).toBe(true)

    const interfaceSoak = await proveCosmosPlaytestSoak(38)
    expect(interfaceSoak.letter).toBe(COSMOS_PLAYTEST_WIRE_LETTER)
    expect(interfaceSoak.letter).toBe('cn')
    expect(interfaceSoak.passed).toBe(true)

    const honesty = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: true,
      // Keep co letter visible — cp/cr are sibling deepens (tested in cp/cr suites).
      pbrSkyViewportSoakPassed: false,
      acousticAtmosphereSoakPassed: false,
    })
    expect(honesty.cosmosScaleReady).toBe(true)
    expect(honesty.cosmosPlaytestSoakReady).toBe(true)
    expect(honesty.pbrSkyViewportReady).toBe(false)
    expect(honesty.letter).toBe(COSMOS_LIVE_SOAK_LETTER)
    expect(honesty.starCitizenSolvedClaimAllowed).toBe(false)
    expect(honesty.mmoSpaceShippedClaimAllowed).toBe(false)
    expect(honesty.agonesFleetLiveAllowed).toBe(false)
    expect(honesty.naniteLiveAllowed).toBe(false)
    expect(honesty.coinsMarketingAllowed).toBe(false)
    expect(honesty.cloudImmortalUniverseMarketingAllowed).toBe(false)

    // Scale interfaces remain cn; live soak does not collapse the distinction.
    expect(COSMOS_LETTER).toBe('cn')
    expect(COSMOS_LIVE_SOAK_LETTER).not.toBe(COSMOS_LETTER)
  })

  it('honesty pending live soak keeps cosmosScaleReady when interfaces pass', async () => {
    const honesty = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: false,
      pbrSkyViewportSoakPassed: false,
      acousticAtmosphereSoakPassed: false,
    })
    expect(honesty.cosmosScaleReady).toBe(true)
    expect(honesty.cosmosPlaytestSoakReady).toBe(false)
    expect(honesty.pbrSkyViewportReady).toBe(false)
    expect(honesty.letter).toBe(COSMOS_LETTER)
  })
})
