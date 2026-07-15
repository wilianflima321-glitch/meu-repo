import { describe, expect, it } from 'vitest'
import {
  applyBrushStroke,
  createFlatHeightfield,
  encodeHeightsBase64,
  decodeHeightsBase64,
  heightfieldHonestyReport,
} from '@/lib/production/terrain-heightfield-math'
import {
  applyErosionStroke,
  applyHydraulicErosionStroke,
  applyThermalErosionStroke,
  erosionHash01,
} from '@/lib/production/terrain-heightfield-erosion-math'
import { landscapeBrushToTerrainStroke } from '@/lib/production/landscape-heightfield-stroke'
import { landscapeBrushToSplatStroke } from '@/lib/production/landscape-splatmap-stroke'
import { landscapeBrushToFoliageStroke } from '@/lib/production/landscape-foliage-stroke'

describe('LandscapeEditor → erosion deepen (letter bg)', () => {
  const extents = { widthMeters: 64, depthMeters: 64, resolution: 33 }
  const layers = [
    { id: '1', name: 'Grass' },
    { id: '2', name: 'Rock' },
  ]
  const foliageTypes = [{ id: 'tree-1' }, { id: 'bush-1' }]

  function moundDoc() {
    const doc = createFlatHeightfield({
      resolution: 33,
      widthMeters: 64,
      depthMeters: 64,
      maxHeight: 32,
    })
    // Raise a center mound so hydraulic has slope to work with
    applyBrushStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.22,
      strength: 0.55,
      falloff: 1.5,
      mode: 'sculpt',
    })
    return doc
  }

  it('maps erosion brush to durable heightfield stroke (hydraulic default)', () => {
    const mapped = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 16, strength: 0.7, falloff: 1.5, mode: 'erosion' },
      extents,
    )
    expect('stroke' in mapped).toBe(true)
    if ('stroke' in mapped) {
      expect(mapped.stroke.mode).toBe('erosion')
      expect(mapped.stroke.erosionType).toBe('hydraulic')
      expect(mapped.stroke.u).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.v).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.radius).toBeCloseTo(0.25, 5)
      expect(mapped.stroke.strength).toBeGreaterThan(0)
      expect(mapped.stroke.iterations).toBeGreaterThan(0)
    }
  })

  it('maps thermal via operation thermal|level; sculpt/noise maps durable (bh)', () => {
    const thermal = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 12, strength: 0.6, falloff: 2, mode: 'erosion', operation: 'thermal' },
      extents,
    )
    expect('stroke' in thermal && thermal.stroke.erosionType === 'thermal').toBe(true)

    const noise = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'sculpt', operation: 'noise', seed: 11 },
      extents,
    )
    expect('stroke' in noise).toBe(true)
    if ('stroke' in noise) {
      expect(noise.stroke.mode).toBe('noise')
      expect(noise.stroke.seed).toBe(11)
    }
  })

  it('redirects erosion off splat/foliage mappers to heightfield (bg)', () => {
    const splat = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
      layers,
    )
    expect('held' in splat).toBe(true)
    if ('held' in splat) expect(splat.held).toContain('bg')

    const foliage = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
      foliageTypes,
    )
    expect('held' in foliage).toBe(true)
    if ('held' in foliage) expect(foliage.held).toContain('bg')
  })

  it('erosionHash01 is deterministic (no Math.random)', () => {
    expect(erosionHash01(42)).toBe(erosionHash01(42))
    expect(erosionHash01(1)).not.toBe(erosionHash01(2))
  })

  it('hydraulic erosion mutates heights deterministically and keeps honesty live', () => {
    const a = moundDoc()
    const b = moundDoc()
    const stroke = {
      u: 0.5,
      v: 0.5,
      radius: 0.2,
      strength: 0.8,
      falloff: 2,
      mode: 'erosion' as const,
      erosionType: 'hydraulic' as const,
      iterations: 48,
      seed: 9001,
    }

    applyHydraulicErosionStroke(a, stroke)
    applyHydraulicErosionStroke(b, { ...stroke })

    expect(a.meta.strokeCount).toBe(2) // mound + erosion
    expect(heightfieldHonestyReport(a).status).toBe('live')
    expect(heightfieldHonestyReport(a).mock).toBe(false)
    expect(Array.from(a.heights)).toEqual(Array.from(b.heights))

    // Outside brush disk should be untouched (corner cells)
    const flat = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64 })
    expect(a.heights[0]).toBeCloseTo(flat.heights[0]!, 5)
  })

  it('applyBrushStroke dispatches erosion; thermal talus also mutates', () => {
    const doc = moundDoc()
    const before = Float32Array.from(doc.heights)
    applyBrushStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.25,
      strength: 0.9,
      falloff: 1.5,
      mode: 'erosion',
      erosionType: 'thermal',
      iterations: 6,
      seed: 3,
    })
    expect(doc.meta.strokeCount).toBe(2)
    let changed = false
    for (let i = 0; i < before.length; i++) {
      if (Math.abs(before[i]! - doc.heights[i]!) > 1e-8) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)

    const viaDispatch = moundDoc()
    applyErosionStroke(viaDispatch, {
      u: 0.5,
      v: 0.5,
      radius: 0.25,
      strength: 0.9,
      falloff: 1.5,
      mode: 'erosion',
      erosionType: 'thermal',
      iterations: 6,
      seed: 3,
    })
    expect(Array.from(doc.heights)).toEqual(Array.from(viaDispatch.heights))
  })

  it('thermal alone is byte-identical for same seed/params', () => {
    const a = moundDoc()
    const b = moundDoc()
    const stroke = {
      u: 0.5,
      v: 0.5,
      radius: 0.2,
      strength: 0.85,
      falloff: 2,
      mode: 'erosion' as const,
      erosionType: 'thermal' as const,
      iterations: 5,
      seed: 11,
    }
    applyThermalErosionStroke(a, stroke)
    applyThermalErosionStroke(b, { ...stroke })
    expect(Array.from(a.heights)).toEqual(Array.from(b.heights))
  })

  it('authority round-trip: erosion stroke + base64 encode/decode', () => {
    let doc = moundDoc()
    const mapped = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.9, falloff: 2, mode: 'erosion' },
      extents,
    )
    expect('stroke' in mapped).toBe(true)
    if (!('stroke' in mapped)) return

    const stroke = { ...mapped.stroke, seed: 4242 }
    doc = applyBrushStroke(doc, stroke)
    expect(heightfieldHonestyReport(doc).status).toBe('live')

    const b64 = encodeHeightsBase64(doc.heights)
    const roundTrip = decodeHeightsBase64(b64, 33 * 33)
    expect(Array.from(roundTrip.slice(0, 16))).toEqual(Array.from(doc.heights.slice(0, 16)))
  })
})
