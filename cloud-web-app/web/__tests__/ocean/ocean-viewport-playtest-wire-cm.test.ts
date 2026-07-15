/**
 * Letter cm — Ocean viewport / playtest wire Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  applyOceanHeightsToMesh,
  bindOceanViewportMesh,
  createOceanViewportMockMesh,
  generateOceanHeightField,
  planOceanViewportOptIn,
  proveOceanFft,
  proveOceanViewportSoak,
  proveOceanViewportReady,
  probeOceanHonesty,
  resolveOceanCapabilityBudget,
  tickOceanBuoyancy,
  tickOceanFromSimulation,
  tickOceanViewportDisplacement,
  OCEAN_PLAYTEST_WIRE_LETTER,
  OCEAN_VIEWPORT_WIRE_LETTER,
} from '@/lib/ocean'

describe('ocean viewport / playtest wire (cm)', () => {
  it('FFT displace moves mesh vertices; Zero-UI when unbound', () => {
    const unbound = applyOceanHeightsToMesh(
      generateOceanHeightField({
        resolution: 8,
        windSpeed: 8,
        windAngle: 0,
        amplitude: 1,
        seed: 3,
      }),
      8,
      null,
    )
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.applied).toBe(false)

    const mock = createOceanViewportMockMesh(4)
    bindOceanViewportMesh(mock.target)
    const heights = generateOceanHeightField({
      resolution: 8,
      windSpeed: 10,
      windAngle: 0.2,
      amplitude: 0.8,
      seed: 11,
    })
    const r = applyOceanHeightsToMesh(heights, 8)
    expect(r.letter).toBe(OCEAN_VIEWPORT_WIRE_LETTER)
    expect(r.applied).toBe(true)
    expect(r.verticesDisplaced).toBeGreaterThan(0)
    expect(r.peakAbs).toBeGreaterThan(0)
    let moved = false
    for (let i = 2; i < mock.positions.length; i += 3) {
      if (mock.positions[i] !== 0) moved = true
    }
    expect(moved).toBe(true)
    bindOceanViewportMesh(null)
  })

  it('buoyancy applyForce + CapScore FFT degrade', () => {
    const heights = generateOceanHeightField({
      resolution: 16,
      windSpeed: 12,
      windAngle: 0,
      amplitude: 0.5,
      seed: 7,
    })
    const applied: Array<{ id: string; y: number }> = []
    const tick = tickOceanBuoyancy({
      heights,
      resolution: 16,
      bodies: [
        {
          id: 'boat',
          position: { x: 0, y: -50, z: 0 },
          volume: 2,
          mass: 400,
          explicitVolume: {
            type: 'oceanBuoyancyVolume',
            entityId: 'boat',
            volumeM3: 2,
            densityKgPerM3: 200,
          },
        },
      ],
      applyForce: (id, force) => {
        applied.push({ id, y: force.y })
        return true
      },
    })
    expect(tick.letter).toBe(OCEAN_PLAYTEST_WIRE_LETTER)
    expect(tick.applied).toBe(true)
    expect(tick.floatingCount).toBeGreaterThan(0)
    expect(applied.length).toBeGreaterThan(0)

    const low = resolveOceanCapabilityBudget(12)
    const high = resolveOceanCapabilityBudget(80)
    expect(low.fftResolution).toBeLessThan(high.fftResolution)

    const lowDisp = tickOceanViewportDisplacement({
      capabilityScore: 12,
      userEnabled: true,
      target: createOceanViewportMockMesh(2).target,
    })
    const highDisp = tickOceanViewportDisplacement({
      capabilityScore: 80,
      userEnabled: true,
      target: createOceanViewportMockMesh(2).target,
    })
    expect(lowDisp.fftResolution).toBe(16)
    expect(highDisp.fftResolution).toBe(128)
    expect(lowDisp.fftResolution).toBeLessThan(highDisp.fftResolution)
  })

  it('tickOceanFromSimulation Zero-UI when userEnabled false', () => {
    const mock = createOceanViewportMockMesh(2)
    const off = tickOceanFromSimulation({
      capabilityScore: 40,
      userEnabled: false,
      bodies: [
        {
          id: 'x',
          position: { x: 0, y: -10, z: 0 },
          volume: 1,
          mass: 100,
        },
      ],
      mesh: mock.target,
      applyForce: () => true,
    })
    expect(off.displace.zeroUiUnavailable).toBe(true)
    expect(off.buoyancy.applied).toBe(false)
    expect(planOceanViewportOptIn({ capabilityScore: 40, userEnabled: false }).enabled).toBe(
      false,
    )
  })

  it('soak + honesty oceanViewportReady; Unreal Water HELD', () => {
    expect(proveOceanFft().passed).toBe(true)
    const soak = proveOceanViewportSoak(38)
    expect(soak.passed).toBe(true)
    expect(soak.meshDisplaced).toBe(true)
    expect(soak.buoyancyApplied).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(4)

    expect(proveOceanViewportReady()).toBe(true)
    const honesty = probeOceanHonesty({
      viewportSoakPassed: true,
      meshBindSoakPassed: false,
    })
    expect(honesty.letter).toBe('cm')
    expect(honesty.fftDisplacementReady).toBe(true)
    expect(honesty.buoyancyHelpersReady).toBe(true)
    expect(honesty.viewportOptInReady).toBe(true)
    expect(honesty.oceanViewportReady).toBe(true)
    expect(honesty.unrealWaterParityAllowed).toBe(false)
  })
})
