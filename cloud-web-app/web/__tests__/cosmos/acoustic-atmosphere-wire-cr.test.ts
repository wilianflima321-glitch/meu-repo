/**
 * Letter cr â€” Volumetric acoustic atmosphere â†’ playtest/audio bus Vitest.
 * (Letter cq reserved â€” Ocean Mesh Bind + Explicit Buoyancy; do not reuse.)
 */

import { describe, expect, it } from 'vitest'
import {
  COSMOS_ACOUSTIC_ATMOSPHERE_LETTER,
  COSMOS_LETTER,
  COSMOS_LIVE_SOAK_LETTER,
  COSMOS_PBR_SKY_VIEWPORT_LETTER,
  applyAcousticToBus,
  bindAcousticAudioBus,
  buildAtmosphereAcousticSamples,
  buildHullAcousticSamples,
  buildVacuumAcousticSamples,
  createAcousticMockBus,
  proveAcousticAtmosphere,
  proveAcousticAtmosphereReady,
  proveAcousticAtmosphereSoak,
  proveAcousticCapScoreStepContrast,
  probeCosmosHonesty,
  resolveCosmosCapabilityBudget,
  tickAcousticAtmosphere,
  wrapWebAudioGainForAcoustic,
} from '@/lib/cosmos'

describe('acoustic atmosphere audio bus wire (cr)', () => {
  it('vacuum/hull/atmosphere land on mock bus; Zero-UI when unbound / opt-out / cosmos off', () => {
    const unbound = applyAcousticToBus({
      capabilityScore: 38,
      samples: buildVacuumAcousticSamples(),
      sourceInHull: false,
      listenerInHull: false,
      target: null,
    })
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.applied).toBe(false)
    expect(unbound.vacuumExplosionForbidden).toBe(true)
    expect(unbound.hrtfAaaForbidden).toBe(true)

    const mock = createAcousticMockBus()
    bindAcousticAudioBus(mock.target)

    const vacuum = tickAcousticAtmosphere({
      capabilityScore: 38,
      userEnabled: true,
      cosmosEnabled: true,
      samples: buildVacuumAcousticSamples(),
      sourceInHull: false,
      listenerInHull: false,
      target: mock.target,
    })
    expect(vacuum.applied).toBe(true)
    expect(vacuum.medium).toBe('vacuum')
    expect(vacuum.transmission).toBe(0)
    expect(vacuum.wetGain).toBe(0)
    expect(mock.getGain()).toBe(0)
    expect(mock.getWet()).toBe(0)

    const hull = tickAcousticAtmosphere({
      capabilityScore: 38,
      userEnabled: true,
      cosmosEnabled: true,
      samples: buildHullAcousticSamples(),
      sourceInHull: true,
      listenerInHull: true,
      target: mock.target,
    })
    expect(hull.applied).toBe(true)
    expect(hull.structureBorne).toBe(true)
    expect(hull.transmission).toBeGreaterThan(0.3)
    expect(mock.getGain()).toBeGreaterThan(0.3)

    const air = tickAcousticAtmosphere({
      capabilityScore: 38,
      userEnabled: true,
      cosmosEnabled: true,
      samples: buildAtmosphereAcousticSamples(1),
      sourceInHull: false,
      listenerInHull: false,
      target: mock.target,
    })
    expect(air.applied).toBe(true)
    expect(air.medium).toBe('atmosphere')
    expect(air.transmission).toBeGreaterThan(0.5)
    expect(air.structureBorne).toBe(false)
    expect(air.wetGain).toBeGreaterThan(0)
    expect(mock.getWet()).toBeGreaterThan(0)

    bindAcousticAudioBus(null)

    const off = tickAcousticAtmosphere({
      capabilityScore: 38,
      userEnabled: false,
      cosmosEnabled: true,
      samples: buildAtmosphereAcousticSamples(1),
      sourceInHull: false,
      listenerInHull: false,
      target: mock.target,
    })
    expect(off.zeroUiUnavailable).toBe(true)
    expect(off.applied).toBe(false)

    const cosmosOff = tickAcousticAtmosphere({
      capabilityScore: 38,
      userEnabled: true,
      cosmosEnabled: false,
      samples: buildAtmosphereAcousticSamples(1),
      sourceInHull: false,
      listenerInHull: false,
      target: mock.target,
    })
    expect(cosmosOff.zeroUiUnavailable).toBe(true)
    expect(cosmosOff.applied).toBe(false)
  })

  it('CapScore degrades acousticRaySteps GT730 vs enthusiast; GainNode wrap works', () => {
    const low = resolveCosmosCapabilityBudget(12)
    const high = resolveCosmosCapabilityBudget(80)
    expect(low.tier).toBe('gt730')
    expect(low.acousticRaySteps).toBe(4)
    expect(high.acousticRaySteps).toBeGreaterThan(low.acousticRaySteps)

    const contrast = proveAcousticCapScoreStepContrast()
    expect(contrast.passed).toBe(true)

    const lowTick = tickAcousticAtmosphere({
      capabilityScore: 12,
      userEnabled: true,
      cosmosEnabled: true,
      samples: buildAtmosphereAcousticSamples(1),
      sourceInHull: false,
      listenerInHull: false,
      target: createAcousticMockBus().target,
    })
    const highTick = tickAcousticAtmosphere({
      capabilityScore: 80,
      userEnabled: true,
      cosmosEnabled: true,
      samples: buildAtmosphereAcousticSamples(1),
      sourceInHull: false,
      listenerInHull: false,
      target: createAcousticMockBus().target,
    })
    expect(lowTick.raySteps).toBe(4)
    expect(highTick.raySteps).toBeGreaterThan(lowTick.raySteps)
    expect(lowTick.applied).toBe(true)
    expect(highTick.applied).toBe(true)

    const gain = { value: 1 }
    const wrapped = wrapWebAudioGainForAcoustic(gain)
    applyAcousticToBus({
      capabilityScore: 38,
      samples: buildVacuumAcousticSamples(),
      sourceInHull: false,
      listenerInHull: false,
      target: wrapped,
    })
    expect(gain.value).toBe(0)
  })

  it('soak + honesty acousticAtmosphereReady; HRTF AAA + Coins/Agones/Nanite HELD', async () => {
    expect(proveAcousticAtmosphere().passed).toBe(true)
    expect(proveAcousticAtmosphere().noSpaceExplosion).toBe(true)

    const soak = proveAcousticAtmosphereSoak(38)
    expect(soak.letter).toBe(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER)
    expect(soak.letter).toBe('cr')
    expect(soak.letter).not.toBe('cq')
    expect(soak.passed).toBe(true)
    expect(soak.vacuumSilentOnBus).toBe(true)
    expect(soak.hullCarriesOnBus).toBe(true)
    expect(soak.atmosphereWetOnBus).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.noSpaceExplosion).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(4)

    expect(proveAcousticAtmosphereReady()).toBe(true)

    const honesty = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: true,
      pbrSkyViewportSoakPassed: true,
      acousticAtmosphereSoakPassed: true,
    })
    expect(honesty.letter).toBe('cr')
    expect(honesty.acousticAtmosphereReady).toBe(true)
    expect(honesty.pbrSkyViewportReady).toBe(true)
    expect(honesty.cosmosScaleReady).toBe(true)
    expect(honesty.cosmosPlaytestSoakReady).toBe(true)
    expect(honesty.hrtfAaaAllowed).toBe(false)
    expect(honesty.paintedSkyboxClaimAllowed).toBe(false)
    expect(honesty.ueAtmosphereMaturityAllowed).toBe(false)
    expect(honesty.starCitizenSolvedClaimAllowed).toBe(false)
    expect(honesty.mmoSpaceShippedClaimAllowed).toBe(false)
    expect(honesty.agonesFleetLiveAllowed).toBe(false)
    expect(honesty.naniteLiveAllowed).toBe(false)
    expect(honesty.coinsMarketingAllowed).toBe(false)

    const pending = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: true,
      pbrSkyViewportSoakPassed: true,
      acousticAtmosphereSoakPassed: false,
    })
    expect(pending.acousticAtmosphereReady).toBe(false)
    expect(pending.letter).toBe(COSMOS_PBR_SKY_VIEWPORT_LETTER)

    // Flags remain distinct across cn / co / cp / cr â€” cq never claimed.
    expect(COSMOS_LETTER).toBe('cn')
    expect(COSMOS_LIVE_SOAK_LETTER).toBe('co')
    expect(COSMOS_PBR_SKY_VIEWPORT_LETTER).toBe('cp')
    expect(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER).toBe('cr')
    expect(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER).not.toBe('cq')
    expect(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER).not.toBe(COSMOS_LETTER)
    expect(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER).not.toBe(COSMOS_LIVE_SOAK_LETTER)
    expect(COSMOS_ACOUSTIC_ATMOSPHERE_LETTER).not.toBe(COSMOS_PBR_SKY_VIEWPORT_LETTER)
  })
})
