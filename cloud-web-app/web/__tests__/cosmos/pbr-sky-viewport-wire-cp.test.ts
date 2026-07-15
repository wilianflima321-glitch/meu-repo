/**
 * Letter cp — PBR Sky Atmosphere viewport wire Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  COSMOS_LETTER,
  COSMOS_LIVE_SOAK_LETTER,
  COSMOS_PBR_SKY_VIEWPORT_LETTER,
  applyPbrSkyToScene,
  bindPbrSkyScene,
  createPbrSkyMockScene,
  provePbrSkyAtmosphere,
  provePbrSkyCapScoreSampleContrast,
  provePbrSkyViewportReady,
  provePbrSkyViewportSoak,
  probeCosmosHonesty,
  resolveCosmosCapabilityBudget,
  tickPbrSkyViewport,
} from '@/lib/cosmos'

describe('PBR sky atmosphere viewport wire (cp)', () => {
  it('Rayleigh/Mie RGB lands on mock scene; Zero-UI when unbound / opt-out', () => {
    const unbound = applyPbrSkyToScene(
      { x: 0, y: 1, z: 0 },
      { capabilityScore: 38, target: null },
    )
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.applied).toBe(false)
    expect(unbound.paintedSkyboxForbidden).toBe(true)

    const mock = createPbrSkyMockScene()
    bindPbrSkyScene(mock.target)
    const r = tickPbrSkyViewport({
      capabilityScore: 38,
      userEnabled: true,
      viewDir: { x: 0, y: 1, z: 0 },
      target: mock.target,
    })
    expect(r.applied).toBe(true)
    expect(r.skySampled).toBe(true)
    expect(r.rgb).not.toBeNull()
    expect(r.opticalDepth).toBeGreaterThan(0)
    expect(r.paintedSkyboxForbidden).toBe(true)
    const rgb = mock.getRgb()
    expect(rgb).not.toBeNull()
    expect(rgb!.b).toBeGreaterThanOrEqual(rgb!.r * 0.85)

    bindPbrSkyScene(null)

    const off = tickPbrSkyViewport({
      capabilityScore: 38,
      userEnabled: false,
      viewDir: { x: 0, y: 1, z: 0 },
      target: mock.target,
    })
    expect(off.zeroUiUnavailable).toBe(true)
    expect(off.applied).toBe(false)
  })

  it('CapScore degrades skyAtmosphereSamples GT730 vs enthusiast', () => {
    const low = resolveCosmosCapabilityBudget(12)
    const high = resolveCosmosCapabilityBudget(80)
    expect(low.tier).toBe('gt730')
    expect(low.skyAtmosphereSamples).toBe(4)
    expect(high.skyAtmosphereSamples).toBeGreaterThan(low.skyAtmosphereSamples)

    const contrast = provePbrSkyCapScoreSampleContrast()
    expect(contrast.passed).toBe(true)

    const lowTick = tickPbrSkyViewport({
      capabilityScore: 12,
      userEnabled: true,
      viewDir: { x: 0, y: 1, z: 0 },
      target: createPbrSkyMockScene().target,
    })
    const highTick = tickPbrSkyViewport({
      capabilityScore: 80,
      userEnabled: true,
      viewDir: { x: 0, y: 1, z: 0 },
      target: createPbrSkyMockScene().target,
    })
    expect(lowTick.sampleCount).toBe(4)
    expect(highTick.sampleCount).toBeGreaterThan(lowTick.sampleCount)
    expect(lowTick.applied).toBe(true)
    expect(highTick.applied).toBe(true)
  })

  it('soak + honesty pbrSkyViewportReady; painted skybox + UE atmosphere HELD', async () => {
    expect(provePbrSkyAtmosphere().passed).toBe(true)
    expect(provePbrSkyAtmosphere().noPaintedSkybox).toBe(true)

    const soak = provePbrSkyViewportSoak(38)
    expect(soak.letter).toBe(COSMOS_PBR_SKY_VIEWPORT_LETTER)
    expect(soak.letter).toBe('cp')
    expect(soak.passed).toBe(true)
    expect(soak.skyApplied).toBe(true)
    expect(soak.visibleFrameRgb).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.noPaintedSkybox).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(4)

    expect(provePbrSkyViewportReady()).toBe(true)

    const honesty = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: true,
      pbrSkyViewportSoakPassed: true,
      // Keep cp letter visible — cr acoustic bus is a sibling deepen (tested in cr suite).
      acousticAtmosphereSoakPassed: false,
    })
    expect(honesty.letter).toBe('cp')
    expect(honesty.pbrSkyViewportReady).toBe(true)
    expect(honesty.cosmosScaleReady).toBe(true)
    expect(honesty.cosmosPlaytestSoakReady).toBe(true)
    expect(honesty.acousticAtmosphereReady).toBe(false)
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
      pbrSkyViewportSoakPassed: false,
      acousticAtmosphereSoakPassed: false,
    })
    expect(pending.pbrSkyViewportReady).toBe(false)
    expect(pending.letter).toBe(COSMOS_LIVE_SOAK_LETTER)

    // Flags remain distinct across cn / co / cp.
    expect(COSMOS_LETTER).toBe('cn')
    expect(COSMOS_LIVE_SOAK_LETTER).toBe('co')
    expect(COSMOS_PBR_SKY_VIEWPORT_LETTER).toBe('cp')
    expect(COSMOS_PBR_SKY_VIEWPORT_LETTER).not.toBe(COSMOS_LETTER)
    expect(COSMOS_PBR_SKY_VIEWPORT_LETTER).not.toBe(COSMOS_LIVE_SOAK_LETTER)
  })
})
