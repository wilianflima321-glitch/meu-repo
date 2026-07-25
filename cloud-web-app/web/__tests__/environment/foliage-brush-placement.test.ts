import { describe, expect, it } from 'vitest'

import {
  instancesPerStroke,
  sampleBrushStrokeOffset,
} from '@/lib/environment/foliage-brush-placement'

describe('foliage-brush-placement (CW5)', () => {
  it('density scales instances per stroke', () => {
    expect(instancesPerStroke(0)).toBe(0)
    expect(instancesPerStroke(0.5)).toBe(5)
    expect(instancesPerStroke(1)).toBe(10)
  })

  it('falloff=0 accepts edge samples; falloff=1 rejects far edge', () => {
    // Force edge sample: first random → angle fraction, second → dist^2 ≈ 1 (edge).
    let call = 0
    const edgeRng = () => {
      call += 1
      if (call === 1) return 0 // angle
      if (call === 2) return 0.999 // dist ~ radius
      return 0.99 // keep roll — fails when keepChance is near 0
    }
    const withFalloff = sampleBrushStrokeOffset({
      radius: 4,
      falloff: 1,
      random: edgeRng,
    })
    expect(withFalloff.accepted).toBe(false)

    call = 0
    const noFalloff = sampleBrushStrokeOffset({
      radius: 4,
      falloff: 0,
      random: edgeRng,
    })
    expect(noFalloff.accepted).toBe(true)
  })

  it('offsets stay inside radius', () => {
    for (let i = 0; i < 40; i++) {
      const sample = sampleBrushStrokeOffset({ radius: 3, falloff: 0.2 })
      const dist = Math.hypot(sample.offsetX, sample.offsetZ)
      expect(dist).toBeLessThanOrEqual(3 + 1e-9)
    }
  })
})
