import { describe, expect, it } from 'vitest'
import {
  applyBrushStroke,
  createFlatHeightfield,
  decodeHeightsBase64,
  encodeHeightsBase64,
  heightfieldHonestyReport,
} from '@/lib/production/terrain-heightfield-math'
import {
  landscapeBrushToTerrainStroke,
  worldPointToHeightfieldUv,
} from '@/lib/production/landscape-heightfield-stroke'

describe('LandscapeEditor → heightfield deepen', () => {
  const extents = { widthMeters: 200, depthMeters: 200, resolution: 129 }

  it('maps world center to UV 0.5 / 0.5', () => {
    const uv = worldPointToHeightfieldUv({ x: 0, z: 0 }, extents)
    expect(uv.u).toBeCloseTo(0.5, 5)
    expect(uv.v).toBeCloseTo(0.5, 5)
  })

  it('maps raise/lower/smooth/flatten to durable strokes', () => {
    const raise = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.5, falloff: 1.5, mode: 'sculpt', operation: 'raise' },
      extents,
    )
    expect('stroke' in raise).toBe(true)
    if ('stroke' in raise) {
      expect(raise.stroke.mode).toBe('sculpt')
      expect(raise.stroke.strength).toBeGreaterThan(0)
      expect(raise.stroke.radius).toBeCloseTo(0.1, 5)
    }

    const lower = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.5, falloff: 1.5, mode: 'sculpt', operation: 'lower' },
      extents,
    )
    expect('stroke' in lower && lower.stroke.strength < 0).toBe(true)

    const smooth = landscapeBrushToTerrainStroke(
      { x: 10, z: -10 },
      { size: 15, strength: 0.8, falloff: 2, mode: 'smooth' },
      extents,
    )
    expect('stroke' in smooth && smooth.stroke.mode === 'smooth').toBe(true)

    const flatten = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 12, strength: 0.6, falloff: 2, mode: 'flatten' },
      extents,
    )
    expect('stroke' in flatten && flatten.stroke.mode === 'flatten').toBe(true)
  })

  it('maps noise durable (bh); erosion maps durable; foliage redirects to bf; paint redirects to splatmap', () => {
    const foliage = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'foliage' },
      extents,
    )
    expect('held' in foliage).toBe(true)
    if ('held' in foliage) expect(foliage.held).toContain('bf')

    const erosion = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
    )
    expect('stroke' in erosion).toBe(true)
    if ('stroke' in erosion) {
      expect(erosion.stroke.mode).toBe('erosion')
      expect(erosion.stroke.erosionType).toBe('hydraulic')
    }

    const paint = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'paint' },
      extents,
    )
    expect('held' in paint).toBe(true)
    if ('held' in paint) expect(paint.held).toContain('splatmap')
    const noise = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'sculpt', operation: 'noise', seed: 7 },
      extents,
    )
    expect('stroke' in noise).toBe(true)
    if ('stroke' in noise) expect(noise.stroke.mode).toBe('noise')
  })

  it('authority round-trip: stroke math + base64 encode/decode matches', () => {
    let doc = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64, maxHeight: 20 })
    expect(heightfieldHonestyReport(doc).status).toBe('empty')

    const mapped = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 16, strength: 0.8, falloff: 2, mode: 'sculpt', operation: 'raise' },
      { widthMeters: 64, depthMeters: 64, resolution: 33 },
    )
    expect('stroke' in mapped).toBe(true)
    if (!('stroke' in mapped)) return

    doc = applyBrushStroke(doc, mapped.stroke)
    expect(heightfieldHonestyReport(doc).status).toBe('live')
    expect(doc.meta.strokeCount).toBe(1)
    expect(doc.heights.some((h) => h > 0)).toBe(true)

    const b64 = encodeHeightsBase64(doc.heights)
    const roundTrip = decodeHeightsBase64(b64, 33 * 33)
    expect(roundTrip.length).toBe(doc.heights.length)
    expect(Array.from(roundTrip.slice(0, 8))).toEqual(Array.from(doc.heights.slice(0, 8)))
    expect(heightfieldHonestyReport(doc).mock).toBe(false)
  })
})
