/**
 * Letter cn — Aethel Cosmos Vitest (planetary / space scale).
 */

import { describe, expect, it } from 'vitest'
import {
  proveLwcPrecision,
  proveGravityVolumes,
  proveNestedPhysicsGrid,
  buildDualSpaceBvh,
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
  resolveCosmosCapabilityBudget,
  proveCosmosRenderWire,
  proveCosmosSimWire,
  proveCosmosPlaytestSoak,
  proveCosmosScaleReady,
  probeCosmosHonesty,
  COSMOS_LETTER,
  COSMOS_PLAYTEST_WIRE_LETTER,
  evaluateInterestFleetGate,
  evaluateActorPersistenceCloudGate,
} from '@/lib/cosmos'

describe('aethel cosmos (cn)', () => {
  it('Part1: LWC f64 survives where f32 collapses', () => {
    const r = proveLwcPrecision()
    expect(r.passed).toBe(true)
    expect(r.f32Collapsed).toBe(true)
    expect(r.f64Preserved).toBe(true)
  })

  it('Part1: spherical gravity + Zero-G volumes', () => {
    const r = proveGravityVolumes()
    expect(r.passed).toBe(true)
    expect(r.planetPullsInward).toBe(true)
    expect(r.zeroGNull).toBe(true)
  })

  it('Part1: volumetric 3D streaming CapScore degrade', async () => {
    const r = await proveVolumetricStreamingAsync()
    expect(r.passed).toBe(true)
    expect(r.gt730Tighter).toBe(true)
  })

  it('Part1: planetary SDF LOD coarsens with distance', () => {
    const r = provePlanetarySdf()
    expect(r.passed).toBe(true)
    expect(r.lodCoarsensWithDistance).toBe(true)
  })

  it('#1 nested physics grids isolate island from hull Mach', () => {
    const r = proveNestedPhysicsGrid()
    expect(r.passed).toBe(true)
    expect(r.islandIsolatedFromHull).toBe(true)
    expect(r.exteriorInheritsHull).toBe(true)
  })

  it('#2 dual-space BVH solar coarse + 1km fine', () => {
    const r = proveDualSpaceBvh()
    expect(r.passed).toBe(true)
    const pair = buildDualSpaceBvh({
      solarBodies: [{ id: 's', x: 0, y: 0, z: 0, radiusM: 1e8 }],
      localMeshes: [{ id: 'a', x: 10, y: 0, z: 0, halfExtentM: 2 }],
      playerX: 0,
      playerY: 0,
      playerZ: 0,
    })
    expect(pair.coarse.leafCount).toBe(1)
    expect(pair.fine.leafCount).toBe(1)
  })

  it('#3 reversed-Z infinite projection', () => {
    const r = proveReversedZ()
    expect(r.passed).toBe(true)
    expect(r.farMapsLow).toBe(true)
  })

  it('#4 CCD sweep catches hypervelocity tunnel', () => {
    const r = proveCcdSweep()
    expect(r.passed).toBe(true)
    expect(r.tunnelingCaught).toBe(true)
    expect(r.discreteWouldMiss).toBe(true)
  })

  it('#5 interest management culls 5k; Agones fleet HELD', () => {
    const r = proveInterestManagement()
    expect(r.passed).toBe(true)
    expect(r.fleetHeld).toBe(true)
    expect(evaluateInterestFleetGate({}).dedicatedFleetReplicationAllowed).toBe(false)
  })

  it('#6 acoustic vacuum silent; hull structure-borne', () => {
    const r = proveAcousticAtmosphere()
    expect(r.passed).toBe(true)
    expect(r.vacuumSilent).toBe(true)
    expect(r.noSpaceExplosion).toBe(true)
  })

  it('#7 PBR sky Rayleigh/Mie — no painted skybox', () => {
    const r = provePbrSkyAtmosphere()
    expect(r.passed).toBe(true)
    expect(r.noPaintedSkybox).toBe(true)
  })

  it('#8 floating origin rebases camera-relative', () => {
    const r = proveFloatingOrigin()
    expect(r.passed).toBe(true)
    expect(r.cameraAtOriginAfter).toBe(true)
  })

  it('#9 actor persistence round-trip; cloud marketing HELD', async () => {
    const r = await proveActorPersistence()
    expect(r.passed).toBe(true)
    expect(r.cloudHeld).toBe(true)
    expect(
      evaluateActorPersistenceCloudGate({}).cloudImmortalUniverseMarketingAllowed,
    ).toBe(false)
  })

  it('CapScore GT730 degrades interest/CCD vs enthusiast', () => {
    const low = resolveCosmosCapabilityBudget(12)
    const high = resolveCosmosCapabilityBudget(80)
    expect(low.tier).toBe('gt730')
    expect(low.maxInterestActors).toBeLessThan(high.maxInterestActors)
    expect(low.ccdBodiesMax).toBeLessThan(high.ccdBodiesMax)
    expect(low.fineBvhRadiusM).toBeLessThan(high.fineBvhRadiusM)
    expect(low.reversedZAllowed).toBe(true)
    expect(low.floatingOriginAllowed).toBe(true)
  })

  it('render + sim wires prove', () => {
    expect(proveCosmosRenderWire(38).passed).toBe(true)
    expect(proveCosmosSimWire(38).passed).toBe(true)
  })

  it('soak + honesty cosmosScaleReady; MMO/StarCitizen HELD', async () => {
    const soak = await proveCosmosPlaytestSoak(38)
    expect(soak.letter).toBe(COSMOS_PLAYTEST_WIRE_LETTER)
    expect(soak.passed).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(14)

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
