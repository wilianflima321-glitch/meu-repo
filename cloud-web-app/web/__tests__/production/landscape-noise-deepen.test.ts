import { describe, expect, it } from 'vitest'
import {
  applyBrushStroke,
  createFlatHeightfield,
  encodeHeightsBase64,
  decodeHeightsBase64,
  heightfieldHonestyReport,
} from '@/lib/production/terrain-heightfield-math'
import {
  applyNoiseStroke,
  noiseHash01,
  noiseSample2,
} from '@/lib/production/terrain-heightfield-noise-math'
import { landscapeBrushToTerrainStroke } from '@/lib/production/landscape-heightfield-stroke'
import { landscapeBrushToSplatStroke } from '@/lib/production/landscape-splatmap-stroke'
import { landscapeBrushToFoliageStroke } from '@/lib/production/landscape-foliage-stroke'

describe('LandscapeEditor → seeded sculpt-noise deepen (letter bh)', () => {
  const extents = { widthMeters: 64, depthMeters: 64, resolution: 33 }
  const layers = [
    { id: '1', name: 'Grass' },
    { id: '2', name: 'Rock' },
  ]
  const foliageTypes = [{ id: 'tree-1' }, { id: 'bush-1' }]

  it('maps sculpt/noise to durable heightfield noise stroke', () => {
    const mapped = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 16, strength: 0.7, falloff: 1.5, mode: 'sculpt', operation: 'noise', seed: 42 },
      extents,
    )
    expect('stroke' in mapped).toBe(true)
    if ('stroke' in mapped) {
      expect(mapped.stroke.mode).toBe('noise')
      expect(mapped.stroke.seed).toBe(42)
      expect(mapped.stroke.u).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.v).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.radius).toBeCloseTo(0.25, 5)
      expect(mapped.stroke.strength).toBeGreaterThan(0)
    }
  })

  it('noiseHash01 / noiseSample2 are deterministic (no Math.random)', () => {
    expect(noiseHash01(42)).toBe(noiseHash01(42))
    expect(noiseHash01(1)).not.toBe(noiseHash01(2))
    expect(noiseSample2(7, 1.5, 2.25)).toBe(noiseSample2(7, 1.5, 2.25))
  })

  it('same seed → identical heights; different seed diverges', () => {
    const stroke = {
      u: 0.5,
      v: 0.5,
      radius: 0.22,
      strength: 0.35,
      falloff: 2,
      mode: 'noise' as const,
      seed: 9001,
    }
    const a = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    const b = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    const c = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })

    applyNoiseStroke(a, stroke)
    applyNoiseStroke(b, { ...stroke })
    applyNoiseStroke(c, { ...stroke, seed: 9002 })

    expect(Array.from(a.heights)).toEqual(Array.from(b.heights))
    expect(Array.from(a.heights)).not.toEqual(Array.from(c.heights))
    expect(a.meta.strokeCount).toBe(1)
    expect(heightfieldHonestyReport(a).status).toBe('live')
    expect(heightfieldHonestyReport(a).mock).toBe(false)
  })

  it('applyBrushStroke dispatches noise; mutates under brush disk only', () => {
    const doc = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    const beforeCorner = doc.heights[0]!
    applyBrushStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.2,
      strength: 0.4,
      falloff: 1.5,
      mode: 'noise',
      seed: 3,
    })
    expect(doc.meta.strokeCount).toBe(1)
    expect(doc.heights[0]).toBeCloseTo(beforeCorner, 5)

    let changed = false
    const mid = Math.floor(33 / 2)
    const center = doc.heights[mid * 33 + mid]!
    if (Math.abs(center - 0) > 1e-8) changed = true
    // Noise can leave center near zero by chance — check any cell changed
    if (!changed) {
      for (let i = 0; i < doc.heights.length; i++) {
        if (Math.abs(doc.heights[i]!) > 1e-8) {
          changed = true
          break
        }
      }
    }
    expect(changed).toBe(true)
  })

  it('authority round-trip: noise stroke + base64 encode/decode', () => {
    let doc = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    const mapped = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.9, falloff: 2, mode: 'sculpt', operation: 'noise', seed: 4242 },
      extents,
    )
    expect('stroke' in mapped).toBe(true)
    if (!('stroke' in mapped)) return

    doc = applyBrushStroke(doc, mapped.stroke)
    expect(heightfieldHonestyReport(doc).status).toBe('live')

    const twin = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    applyBrushStroke(twin, mapped.stroke)
    expect(Array.from(doc.heights)).toEqual(Array.from(twin.heights))

    const b64 = encodeHeightsBase64(doc.heights)
    const roundTrip = decodeHeightsBase64(b64, 33 * 33)
    expect(Array.from(roundTrip.slice(0, 16))).toEqual(Array.from(doc.heights.slice(0, 16)))
  })

  it('splat/foliage mappers still redirect sculpt away; erosion stays heightfield', () => {
    const splat = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'sculpt', operation: 'noise' },
      extents,
      layers,
    )
    expect('held' in splat).toBe(true)

    const foliage = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'sculpt', operation: 'noise' },
      extents,
      foliageTypes,
    )
    expect('held' in foliage).toBe(true)

    const erosion = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
    )
    expect('stroke' in erosion && erosion.stroke.mode === 'erosion').toBe(true)
  })
})
