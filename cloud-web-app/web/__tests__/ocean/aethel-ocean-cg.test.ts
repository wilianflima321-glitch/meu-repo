/**
 * Letter cg — Aethel Ocean Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  generateOceanHeightField,
  fft1d,
  proveOceanFft,
  proveBuoyancyHelpers,
  computeBuoyancyForces,
  resolveOceanCapabilityBudget,
  planOceanViewportOptIn,
  probeOceanHonesty,
} from '@/lib/ocean'

describe('aethel ocean (cg)', () => {
  it('FFT height field deterministic + CapScore resolution', () => {
    const proved = proveOceanFft()
    expect(proved.passed).toBe(true)
    expect(proved.peakAbs).toBeGreaterThan(0)

    const a = generateOceanHeightField({
      resolution: 8,
      windSpeed: 8,
      windAngle: 0,
      amplitude: 1,
      seed: 99,
    })
    const b = generateOceanHeightField({
      resolution: 8,
      windSpeed: 8,
      windAngle: 0,
      amplitude: 1,
      seed: 99,
    })
    expect([...a]).toEqual([...b])

    const budget = resolveOceanCapabilityBudget(12)
    expect(budget.fftResolution).toBe(16)
  })

  it('fft1d inverse round-trip sanity', () => {
    const buf = [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ]
    fft1d(buf, false)
    fft1d(buf, true)
    expect(buf[0]!.re).toBeCloseTo(1, 5)
  })

  it('buoyancy helpers produce float force for submerged body', () => {
    const proved = proveBuoyancyHelpers()
    expect(proved.passed).toBe(true)
    expect(proved.floating).toBe(true)

    const heights = generateOceanHeightField({
      resolution: 8,
      windSpeed: 5,
      windAngle: 0,
      amplitude: 0.2,
      seed: 1,
    })
    const forces = computeBuoyancyForces({
      heights,
      resolution: 8,
      bodies: [
        {
          id: 'boat',
          position: { x: 0, y: -20, z: 0 },
          volume: 2,
          mass: 500,
          explicitVolume: {
            type: 'oceanBuoyancyVolume',
            entityId: 'boat',
            volumeM3: 2,
            densityKgPerM3: 250,
          },
        },
      ],
    })
    expect(forces[0]!.submerged).toBeGreaterThan(0)
    expect(forces[0]!.explicitVolumeClosed).toBe(true)
    expect(forces[0]!.explicitClosed).toBe(true)
  })

  it('viewport opt-in + honesty; Unreal Water parity HELD', () => {
    const opt = planOceanViewportOptIn({
      capabilityScore: 40,
      userEnabled: true,
      applyBuoyancy: true,
    })
    expect(opt.enabled).toBe(true)
    const off = planOceanViewportOptIn({
      capabilityScore: 40,
      userEnabled: false,
    })
    expect(off.enabled).toBe(false)

    // cg suite — plan-only honesty (cm soak gates oceanViewportReady separately).
    const honesty = probeOceanHonesty({
      viewportSoakPassed: false,
      meshBindSoakPassed: false,
    })
    expect(honesty.letter).toBe('cg')
    expect(honesty.fftDisplacementReady).toBe(true)
    expect(honesty.buoyancyHelpersReady).toBe(true)
    expect(honesty.oceanMeshBindReady).toBe(false)
    expect(honesty.oceanViewportReady).toBe(false)
    expect(honesty.unrealWaterParityAllowed).toBe(false)
  })
})
