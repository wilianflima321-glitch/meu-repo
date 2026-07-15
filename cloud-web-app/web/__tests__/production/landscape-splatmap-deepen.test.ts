import { describe, expect, it } from 'vitest'
import {
  applySplatStroke,
  createFlatSplatmap,
  decodeWeightsBase64,
  encodeWeightsBase64,
  sampleSplatColor,
  splatmapHonestyReport,
} from '@/lib/production/terrain-splatmap-math'
import { landscapeBrushToSplatStroke } from '@/lib/production/landscape-splatmap-stroke'
import { landscapeBrushToTerrainStroke } from '@/lib/production/landscape-heightfield-stroke'

describe('LandscapeEditor → splat paint deepen (letter be)', () => {
  const extents = { widthMeters: 200, depthMeters: 200, resolution: 33 }
  const layers = [
    { id: '1', name: 'Grass' },
    { id: '2', name: 'Rock' },
    { id: '3', name: 'Snow' },
  ]

  it('maps paint brush + selected layer to durable splat stroke', () => {
    const mapped = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.7, falloff: 1.5, mode: 'paint', selectedLayerId: '2' },
      extents,
      layers,
    )
    expect('stroke' in mapped).toBe(true)
    if ('stroke' in mapped) {
      expect(mapped.stroke.layerIndex).toBe(1)
      expect(mapped.stroke.u).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.v).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.radius).toBeCloseTo(0.1, 5)
      expect(mapped.stroke.strength).toBeGreaterThan(0)
    }
  })

  it('honestly HELDs foliage; erosion redirects to heightfield bg; paint is not heightfield-held as the only path', () => {
    const foliage = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'foliage' },
      extents,
      layers,
    )
    expect('held' in foliage).toBe(true)
    if ('held' in foliage) expect(foliage.held).toContain('bf')

    const erosionSplat = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
      layers,
    )
    expect('held' in erosionSplat).toBe(true)
    if ('held' in erosionSplat) expect(erosionSplat.held).toContain('bg')

    const erosionHeight = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
    )
    expect('stroke' in erosionHeight).toBe(true)
    if ('stroke' in erosionHeight) expect(erosionHeight.stroke.mode).toBe('erosion')

    const foliageHeight = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'foliage' },
      extents,
    )
    expect('held' in foliageHeight).toBe(true)
    if ('held' in foliageHeight) expect(foliageHeight.held).toContain('bf')

    const paintOnHeight = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'paint' },
      extents,
    )
    expect('held' in paintOnHeight).toBe(true)
    if ('held' in paintOnHeight) {
      expect(paintOnHeight.held).toContain('splatmap')
    }
  })

  it('applySplatStroke raises target layer weight and keeps honesty live', () => {
    let doc = createFlatSplatmap({
      resolution: 33,
      layers: [
        { id: '1', name: 'Grass', color: 'rgb(74, 124, 79)' },
        { id: '2', name: 'Rock', color: 'rgb(107, 107, 107)' },
        { id: '3', name: 'Snow', color: 'rgb(232, 232, 232)' },
      ],
    })
    expect(splatmapHonestyReport(doc).status).toBe('empty')
    expect(splatmapHonestyReport(doc).mock).toBe(false)

    const mapped = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 40, strength: 1, falloff: 1, mode: 'paint', selectedLayerId: '2' },
      { widthMeters: 64, depthMeters: 64, resolution: 33 },
      layers,
    )
    expect('stroke' in mapped).toBe(true)
    if (!('stroke' in mapped)) return

    doc = applySplatStroke(doc, mapped.stroke)
    expect(splatmapHonestyReport(doc).status).toBe('live')
    expect(doc.meta.strokeCount).toBe(1)

    const center = Math.floor(33 / 2) * 33 + Math.floor(33 / 2)
    const rock = doc.weights[center * 3 + 1]!
    const grass = doc.weights[center * 3 + 0]!
    expect(rock).toBeGreaterThan(grass)
    expect(rock + grass + doc.weights[center * 3 + 2]!).toBeCloseTo(1, 4)

    const sample = sampleSplatColor(doc, center)
    expect(sample.r).toBeGreaterThan(0)
    expect(sample.g).toBeGreaterThan(0)
  })

  it('authority round-trip: weights base64 encode/decode matches', () => {
    let doc = createFlatSplatmap({ resolution: 17 })
    doc = applySplatStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.2,
      strength: 0.9,
      falloff: 2,
      layerIndex: 1,
    })
    const b64 = encodeWeightsBase64(doc.weights)
    const expected = 17 * 17 * doc.meta.layerCount
    const roundTrip = decodeWeightsBase64(b64, expected)
    expect(roundTrip.length).toBe(doc.weights.length)
    expect(Array.from(roundTrip.slice(0, 12))).toEqual(Array.from(doc.weights.slice(0, 12)))
  })
})
