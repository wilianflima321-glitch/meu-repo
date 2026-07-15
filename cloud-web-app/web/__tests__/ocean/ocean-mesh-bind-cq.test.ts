/**
 * Letter cq — Ocean Mesh Bind + Explicit Buoyancy Vitest (rigorous).
 */

import { describe, expect, it } from 'vitest'
import {
  OCEAN_RENDER_PASS_LETTER,
  bindOceanViewportMesh,
  computeBuoyancyForces,
  coupleOceanMaterialToSky,
  createOceanBuoyancyVolume,
  createOceanMaterialMock,
  createOceanRenderPass,
  createOceanViewportMockMesh,
  generateOceanHeightField,
  probeOceanHonesty,
  proveBuoyancyHelpers,
  proveExplicitBuoyancyContrast,
  proveExplicitBuoyancyVolumeContrast,
  proveOceanMeshBindReady,
  proveOceanMeshBindSoak,
  proveOceanViewportReady,
  resolveOceanBuoyancyVolume,
  tickOceanRenderPass,
  OCEAN_BUOYANCY_VOLUME_TYPE,
} from '@/lib/ocean'

describe('ocean mesh bind + explicit buoyancy (cq)', () => {
  it('OceanRenderPass displaces FFT mesh and couples material to PBR sky sun', () => {
    const pass = createOceanRenderPass(38, {
      fftOceanEnabled: true,
      capabilityScore: 38,
      waveScale: 1.4,
      shallowColor: 'rgb(34, 211, 238)',
      deepColor: 'rgb(8, 145, 178)',
      reflectionEnabled: true,
      reflectionIntensity: 0.9,
    })
    const mock = createOceanViewportMockMesh(8)
    const mat = createOceanMaterialMock()
    pass.bind({
      mesh: mock.target,
      material: mat,
      waterParams: {
        fftOceanEnabled: true,
        capabilityScore: 38,
        waveScale: 1.4,
        reflectionIntensity: 0.9,
      },
      capabilityScore: 38,
      userEnabled: true,
    })
    pass.setSunAndClouds({
      sunDir: { x: 0.2, y: 0.9, z: 0.1 },
      cloudCoverage: 0.1,
    })
    const r = pass.tick(7)
    expect(r.letter).toBe(OCEAN_RENDER_PASS_LETTER)
    expect(r.mockVisualOnlyForbidden).toBe(true)
    expect(r.fakeVisualOnlyForbidden).toBe(true)
    expect(r.applied).toBe(true)
    expect(r.meshDisplaced).toBe(true)
    expect(r.peakAbs).toBeGreaterThan(0)
    expect(r.sunReacted).toBe(true)
    expect(r.skyCoupled || r.lightCoupled).toBe(true)
    expect(r.materialTint).not.toBeNull()
    expect(mat.getColor()).toBeTruthy()
    expect(mat.getEnv() ?? 0).toBeGreaterThan(0)

    let moved = false
    for (let i = 2; i < mock.positions.length; i += 3) {
      if (mock.positions[i] !== 0) {
        moved = true
        break
      }
    }
    expect(moved).toBe(true)
    pass.dispose()
    bindOceanViewportMesh(null)
  })

  it('cloud coverage dims specular vs clear sky (real light coupling)', () => {
    const mat = createOceanMaterialMock()
    const water = {
      fftOceanEnabled: true,
      reflectionIntensity: 1,
      capabilityScore: 38,
    }
    coupleOceanMaterialToSky(
      water,
      { sunDir: { x: 0, y: 1, z: 0 }, cloudOcclusion: 0 },
      mat,
    )
    const clearEnv = mat.getEnv() ?? 0
    coupleOceanMaterialToSky(
      water,
      { sunDir: { x: 0, y: 1, z: 0 }, cloudOcclusion: 0.9 },
      mat,
    )
    expect(clearEnv).toBeGreaterThan(mat.getEnv() ?? 0)
  })

  it('Zero-UI when OceanRenderPass opt-out or unbound mesh', () => {
    const mock = createOceanViewportMockMesh(4)
    const off = tickOceanRenderPass({
      capabilityScore: 38,
      userEnabled: false,
      waterParams: { fftOceanEnabled: true, capabilityScore: 38 },
      mesh: mock.target,
    })
    expect(off.zeroUiUnavailable).toBe(true)
    expect(off.applied).toBe(false)

    const unbound = tickOceanRenderPass({
      capabilityScore: 38,
      userEnabled: true,
      waterParams: { fftOceanEnabled: true, capabilityScore: 38 },
      mesh: null,
    })
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.meshDisplaced).toBe(false)
  })

  it('OceanBuoyancyVolume explicit — surfboard ≠ crate forces', () => {
    const contrast = proveExplicitBuoyancyContrast()
    expect(contrast.passed).toBe(true)
    expect(contrast.surfboardForceY).not.toBe(contrast.crateForceY)

    const volContrast = proveExplicitBuoyancyVolumeContrast()
    expect(volContrast.passed).toBe(true)
    expect(volContrast.surfboardVolume).toBeLessThan(volContrast.crateVolume)
  })

  it('fail-closed: missing OceanBuoyancyVolume → no force under requireExplicitVolume', () => {
    const heights = generateOceanHeightField({
      resolution: 16,
      windSpeed: 10,
      windAngle: 0,
      amplitude: 0.5,
      seed: 3,
    })
    const missing = resolveOceanBuoyancyVolume({
      explicit: null,
      aabbVolumeM3: 2,
      allowAabbHeuristic: true,
    })
    expect(missing.closedPathAllowed).toBe(false)
    expect(missing.source).toBe('aabbHeuristicHeld')

    const forces = computeBuoyancyForces({
      heights,
      resolution: 16,
      bodies: [
        {
          id: 'orphan',
          position: { x: 0, y: -40, z: 0 },
          volume: 2,
          mass: 100,
        },
      ],
      solver: { requireExplicitVolume: true },
    })
    expect(forces).toHaveLength(1)
    expect(forces[0]!.explicitVolumeClosed).toBe(false)
    expect(forces[0]!.force.y).toBe(0)
    expect(forces[0]!.floating).toBe(false)
  })

  it('explicit volume path floats; AABB-only never claims closed', () => {
    const heights = generateOceanHeightField({
      resolution: 16,
      windSpeed: 12,
      windAngle: 0.1,
      amplitude: 0.6,
      seed: 11,
    })
    const vol = createOceanBuoyancyVolume('board', 0.2, { densityKgPerM3: 160 })
    expect(vol.type).toBe(OCEAN_BUOYANCY_VOLUME_TYPE)
    const forces = computeBuoyancyForces({
      heights,
      resolution: 16,
      bodies: [
        {
          id: 'board',
          position: { x: 0, y: -30, z: 0 },
          volume: 99,
          mass: 40,
          explicitVolume: vol,
        },
      ],
    })
    expect(forces[0]!.explicitVolumeClosed).toBe(true)
    expect(forces[0]!.volumeSource).toBe('explicit')
    expect(forces[0]!.floating).toBe(true)
    expect(forces[0]!.force.y).not.toBe(0)

    const helpers = proveBuoyancyHelpers()
    expect(helpers.passed).toBe(true)
  })

  it('oceanMeshBindReady soak gates honesty; Coins/Agones/Nanite/DLSS HELD', () => {
    const soak = proveOceanMeshBindSoak(38)
    expect(soak.passed).toBe(true)
    expect(soak.meshDisplaced).toBe(true)
    expect(soak.lightCoupled).toBe(true)
    expect(soak.sunCloudContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(3)
    expect(proveOceanMeshBindReady()).toBe(true)

    expect(proveOceanViewportReady()).toBe(true)

    const honesty = probeOceanHonesty()
    expect(honesty.letter).toBe(OCEAN_RENDER_PASS_LETTER)
    expect(honesty.oceanMeshBindReady).toBe(true)
    expect(honesty.explicitBuoyancyReady).toBe(true)
    expect(honesty.unrealWaterParityAllowed).toBe(false)
    expect(honesty.gpuFftAllowed).toBe(false)
    expect(honesty.coinsMarketingAllowed).toBe(false)
    expect(honesty.agonesMarketingAllowed).toBe(false)
    expect(honesty.naniteMarketingAllowed).toBe(false)
    expect(honesty.dlssMarketingAllowed).toBe(false)
  })
})
