/**
 * Letter cn — Aethel Cosmos Vitest (Part1 + travas 1–9 + CapScore).
 */

import { describe, expect, it } from 'vitest'
import {
  proveLwcPrecision,
  proveGravityVolumes,
  proveNestedPhysicsGrid,
  proveDualSpaceBvh,
  proveReversedZ,
  proveCcdSweep,
  proveInterestManagement,
  proveAcousticAtmosphere,
  proveFloatingOrigin,
  proveActorPersistence,
  provePbrSkyAtmosphere,
  proveVolumetricStreamingAsync,
  provePlanetarySdf,
  proveCosmosRenderWire,
  proveCosmosSimWire,
  proveCosmosPlaytestSoak,
  proveCosmosScaleReady,
  probeCosmosHonesty,
  resolveCosmosCapabilityBudget,
  buildInterestSet,
  buildDualSpaceBvh,
  sampleGravityAt,
  registerGravityVolume,
  clearGravityVolumes,
  COSMOS_LETTER,
  COSMOS_PLAYTEST_WIRE_LETTER,
} from '@/lib/cosmos'

describe('Aethel Cosmos (cn)', () => {
  it('Part1 LWC f64 survives where f32 collapses', () => {
    const r = proveLwcPrecision()
    expect(r.passed).toBe(true)
    expect(r.f32Collapsed).toBe(true)
    expect(r.f64Preserved).toBe(true)
  })

  it('Part1 gravity volumes — spherical + Zero-G', () => {
    expect(proveGravityVolumes().passed).toBe(true)
    clearGravityVolumes()
    registerGravityVolume({
      id: 'p',
      kind: 'spherical-planet',
      center: { x: 0, y: 0, z: 0 },
      radiusM: 1e8,
      surfaceGravity: 9.81,
      planetRadiusM: 6e6,
    })
    const g = sampleGravityAt({ x: 6e6, y: 0, z: 0 })
    expect(g.ax).toBeLessThan(0)
    clearGravityVolumes()
  })

  it('trava 1 nested grids isolate island from hull Mach', () => {
    expect(proveNestedPhysicsGrid().passed).toBe(true)
  })

  it('trava 2 dual-space BVH coarse+fine', () => {
    expect(proveDualSpaceBvh().passed).toBe(true)
    const pair = buildDualSpaceBvh({
      solarBodies: [{ id: 'sun', x: 0, y: 0, z: 0, radiusM: 1e8 }],
      localMeshes: [{ id: 'near', x: 10, y: 0, z: 0, halfExtentM: 2 }],
      playerX: 0,
      playerY: 0,
      playerZ: 0,
      fineRadiusM: 1000,
    })
    expect(pair.coarse.leafCount).toBe(1)
    expect(pair.fine.leafCount).toBe(1)
  })

  it('trava 3 reversed-Z infinite projection', () => {
    expect(proveReversedZ().passed).toBe(true)
  })

  it('trava 4 CCD catches hypervelocity tunnel', () => {
    expect(proveCcdSweep().passed).toBe(true)
  })

  it('trava 5 interest management culls 5k; fleet HELD', () => {
    const r = proveInterestManagement()
    expect(r.passed).toBe(true)
    expect(r.fleetHeld).toBe(true)
    const set = buildInterestSet(
      Array.from({ length: 100 }, (_, i) => ({
        id: `a${i}`,
        x: i * 100,
        y: 0,
        z: 0,
        priority: 1,
      })),
      { observerX: 0, observerY: 0, observerZ: 0, radiusM: 500, maxActors: 8 },
    )
    expect(set.actorIds.length).toBeLessThanOrEqual(8)
    expect(set.liveFleetReady).toBe(false)
  })

  it('trava 6 vacuum silent / hull structure-borne', () => {
    expect(proveAcousticAtmosphere().passed).toBe(true)
  })

  it('trava 7 PBR sky Rayleigh/Mie — no painted skybox', () => {
    const r = provePbrSkyAtmosphere()
    expect(r.passed).toBe(true)
    expect(r.noPaintedSkybox).toBe(true)
  })

  it('trava 8 floating origin rebases GPU camera-relative', () => {
    expect(proveFloatingOrigin().passed).toBe(true)
  })

  it('trava 9 actor persistence round-trip; cloud marketing HELD', async () => {
    const r = await proveActorPersistence()
    expect(r.passed).toBe(true)
    expect(r.cloudHeld).toBe(true)
  })

  it('Part1 volumetric 3D streaming CapScore degrade', async () => {
    const r = await proveVolumetricStreamingAsync()
    expect(r.passed).toBe(true)
    expect(r.gt730Tighter).toBe(true)
  })

  it('Part1 planetary SDF LOD coarsens with distance', () => {
    expect(provePlanetarySdf().passed).toBe(true)
  })

  it('CapScore GT730 tightens interest/CCD vs enthusiast', () => {
    const low = resolveCosmosCapabilityBudget(12)
    const high = resolveCosmosCapabilityBudget(80)
    expect(low.tier).toBe('gt730')
    expect(low.maxInterestActors).toBeLessThan(high.maxInterestActors)
    expect(low.ccdBodiesMax).toBeLessThan(high.ccdBodiesMax)
    expect(low.fineBvhRadiusM).toBeLessThan(high.fineBvhRadiusM)
  })

  it('render + sim wires prove reverse-Z / gravity / CCD / nested', () => {
    expect(proveCosmosRenderWire(38).passed).toBe(true)
    expect(proveCosmosSimWire(38).passed).toBe(true)
  })

  it('soak + honesty cosmosScaleReady; Star Citizen / MMO / Agones HELD', async () => {
    const soak = await proveCosmosPlaytestSoak(38)
    expect(soak.letter).toBe(COSMOS_PLAYTEST_WIRE_LETTER)
    expect(soak.letter).toBe('cn')
    expect(soak.passed).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(15)

    expect(await proveCosmosScaleReady()).toBe(true)

    const honesty = await probeCosmosHonesty({
      soakPassed: true,
      liveSoakPassed: false,
      pbrSkyViewportSoakPassed: false,
      acousticAtmosphereSoakPassed: false,
    })
    expect(honesty.letter).toBe(COSMOS_LETTER)
    expect(honesty.cosmosScaleReady).toBe(true)
    expect(honesty.cosmosPlaytestSoakReady).toBe(false)
    expect(honesty.pbrSkyViewportReady).toBe(false)
    expect(honesty.wired).toBe(true)
    expect(honesty.starCitizenSolvedClaimAllowed).toBe(false)
    expect(honesty.mmoSpaceShippedClaimAllowed).toBe(false)
    expect(honesty.agonesFleetLiveAllowed).toBe(false)
    expect(honesty.naniteLiveAllowed).toBe(false)
    expect(honesty.coinsMarketingAllowed).toBe(false)
    expect(honesty.cloudImmortalUniverseMarketingAllowed).toBe(false)
    expect(
      honesty.gears
        .filter(
          (g) =>
            g.id !== 'co-live-playtest-soak' &&
            g.id !== 'cp-pbr-sky-viewport' &&
            g.id !== 'cr-acoustic-atmosphere-wire',
        )
        .every((g) => g.closed),
    ).toBe(true)
  })
})
