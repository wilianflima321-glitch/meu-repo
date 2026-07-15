/**
 * Letter cm — Ocean viewport / playtest wire Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  bindOceanViewportMesh,
  createOceanViewportMockMesh,
  applyOceanHeightsToMesh,
  tickOceanViewportDisplacement,
  tickOceanBuoyancy,
  tickOceanFromSimulation,
  proveOceanViewportSoak,
  proveOceanViewportReady,
  probeOceanHonesty,
  planOceanViewportOptIn,
  resolveOceanCapabilityBudget,
  generateOceanHeightField,
  proveOceanFft,
  proveBuoyancyHelpers,
  OCEAN_PLAYTEST_WIRE_LETTER,
  OCEAN_VIEWPORT_WIRE_LETTER,
} from '@/lib/ocean'

describe('ocean viewport / playtest wire (cm)', () => {
  it('FFT heights displace mock mesh vertices; Zero-UI when unbound', () => {
    const unbound = applyOceanHeightsToMesh(
      generateOceanHeightField({
        resolution: 8,
        windSpeed: 10,
        windAngle: 0,
        amplitude: 0.5,
        seed: 3,
      }),
      8,
      null,
    )
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.applied).toBe(false)

    const mock = createOceanViewportMockMesh(8)
    bindOceanViewportMesh(mock.target)
    const r = tickOceanViewportDisplacement({
      capabilityScore: 38,
      userEnabled: true,
      seed: 7,
      target: mock.target,
    })
    expect(r.applied).toBe(true)
    expect(r.verticesDisplaced).toBeGreaterThan(0)
    expect(r.peakAbs).toBeGreaterThan(0)
    let moved = false
    for (let i = 2; i < mock.positions.length; i += 3) {
      if (mock.positions[i] !== 0) {
        moved = true
        break
      }
    }
    expect(moved).toBe(true)
    bindOceanViewportMesh(null)

    const off = tickOceanViewportDisplacement({
      capabilityScore: 38,
      userEnabled: false,
      target: mock.target,
    })
    expect(off.zeroUiUnavailable).toBe(true)
  })

  it('buoyancy tick applies forces via duck-typed addForce', () => {
    const heights = generateOceanHeightField({
      resolution: 16,
      windSpeed: 12,
      windAngle: 0.2,
      amplitude: 0.6,
      seed: 11,
    })
    const applied: Array<{ id: string; y: number }> = []
    const r = tickOceanBuoyancy({
      heights,
      resolution: 16,
      bodies: [
        {
          id: 'crate',
          position: { x: 0, y: -50, z: 0 },
          volume: 1,
          mass: 200,
          explicitVolume: {
            type: 'oceanBuoyancyVolume',
            entityId: 'crate',
            volumeM3: 1,
            densityKgPerM3: 200,
          },
        },
      ],
      applyForce: (id, force) => {
        applied.push({ id, y: force.y })
        return true
      },
    })
    expect(r.applied).toBe(true)
    expect(r.floatingCount).toBeGreaterThan(0)
    expect(applied.length).toBeGreaterThan(0)
    expect(applied[0]!.id).toBe('crate')

    const noApplicator = tickOceanBuoyancy({
      heights,
      resolution: 16,
      bodies: [
        {
          id: 'crate',
          position: { x: 0, y: -50, z: 0 },
          volume: 1,
          mass: 200,
          explicitVolume: {
            type: 'oceanBuoyancyVolume',
            entityId: 'crate',
            volumeM3: 1,
          },
        },
      ],
    })
    expect(noApplicator.zeroUiUnavailable).toBe(true)
  })

  it('CapScore degrades FFT resolution GT730 vs discrete', () => {
    const low = resolveOceanCapabilityBudget(12)
    const high = resolveOceanCapabilityBudget(80)
    expect(low.fftResolution).toBe(16)
    expect(high.fftResolution).toBeGreaterThan(low.fftResolution)

    const lowTick = tickOceanFromSimulation({
      capabilityScore: 12,
      userEnabled: true,
      bodies: [],
      mesh: createOceanViewportMockMesh(4).target,
    })
    const highTick = tickOceanFromSimulation({
      capabilityScore: 80,
      userEnabled: true,
      bodies: [],
      mesh: createOceanViewportMockMesh(4).target,
    })
    expect(lowTick.fftResolution).toBe(16)
    expect(highTick.fftResolution).toBeGreaterThan(lowTick.fftResolution)
    expect(lowTick.displace.applied).toBe(true)
    expect(highTick.displace.applied).toBe(true)
  })

  it('soak + honesty oceanViewportReady; Unreal Water HELD', () => {
    expect(proveOceanFft().passed).toBe(true)
    expect(proveBuoyancyHelpers().passed).toBe(true)

    const soak = proveOceanViewportSoak(38)
    expect(soak.letter).toBe(OCEAN_PLAYTEST_WIRE_LETTER)
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
    expect(honesty.oceanViewportReady).toBe(true)
    expect(honesty.fftDisplacementReady).toBe(true)
    expect(honesty.buoyancyHelpersReady).toBe(true)
    expect(honesty.viewportOptInReady).toBe(true)
    expect(honesty.unrealWaterParityAllowed).toBe(false)

    const pending = probeOceanHonesty({
      viewportSoakPassed: false,
      meshBindSoakPassed: false,
    })
    expect(pending.oceanViewportReady).toBe(false)
    expect(pending.letter).toBe('cg')

    expect(OCEAN_VIEWPORT_WIRE_LETTER).toBe('cm')
    expect(
      planOceanViewportOptIn({ capabilityScore: 40, userEnabled: false }).enabled,
    ).toBe(false)
  })
})
