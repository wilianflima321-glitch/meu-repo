import { describe, expect, it } from 'vitest'
import {
  applyFoliageStroke,
  createEmptyFoliage,
  decodeFoliageInstancesJson,
  encodeFoliageInstancesJson,
  foliageHonestyReport,
} from '@/lib/production/terrain-foliage-math'
import { landscapeBrushToFoliageStroke } from '@/lib/production/landscape-foliage-stroke'
import { landscapeBrushToSplatStroke } from '@/lib/production/landscape-splatmap-stroke'
import { landscapeBrushToTerrainStroke } from '@/lib/production/landscape-heightfield-stroke'

describe('LandscapeEditor → foliage brush deepen (letter bf)', () => {
  const extents = { widthMeters: 200, depthMeters: 200, resolution: 33 }
  const types = [
    { id: 'tree-1', name: 'Pine' },
    { id: 'bush-1', name: 'Bush' },
    { id: 'grass-1', name: 'Grass' },
  ]

  it('maps foliage brush + selected type to durable foliage stroke', () => {
    const mapped = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      { size: 20, strength: 0.7, falloff: 1.5, mode: 'foliage', selectedFoliageTypeId: 'bush-1' },
      extents,
      types,
    )
    expect('stroke' in mapped).toBe(true)
    if ('stroke' in mapped) {
      expect(mapped.stroke.typeId).toBe('bush-1')
      expect(mapped.stroke.operation).toBe('paint')
      expect(mapped.stroke.u).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.v).toBeCloseTo(0.5, 5)
      expect(mapped.stroke.radius).toBeCloseTo(0.1, 5)
      expect(mapped.stroke.strength).toBeGreaterThan(0)
      expect(mapped.stroke.widthMeters).toBe(200)
    }

    const erase = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      {
        size: 20,
        strength: 0.7,
        falloff: 1.5,
        mode: 'foliage',
        operation: 'lower',
        selectedFoliageTypeId: 'tree-1',
      },
      extents,
      types,
    )
    expect('stroke' in erase && erase.stroke.operation === 'erase').toBe(true)
  })

  it('redirects erosion to heightfield bg; foliage redirects off heightfield/splat mappers', () => {
    const erosionFoliage = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
      types,
    )
    expect('held' in erosionFoliage).toBe(true)
    if ('held' in erosionFoliage) expect(erosionFoliage.held).toContain('bg')

    const foliageOnSplat = landscapeBrushToSplatStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'foliage' },
      extents,
      types,
    )
    expect('held' in foliageOnSplat).toBe(true)
    if ('held' in foliageOnSplat) expect(foliageOnSplat.held).toContain('bf')

    const foliageOnHeight = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'foliage' },
      extents,
    )
    expect('held' in foliageOnHeight).toBe(true)
    if ('held' in foliageOnHeight) expect(foliageOnHeight.held).toContain('bf')

    const erosion = landscapeBrushToTerrainStroke(
      { x: 0, z: 0 },
      { size: 10, strength: 0.5, falloff: 1, mode: 'erosion' },
      extents,
    )
    expect('stroke' in erosion).toBe(true)
    if ('stroke' in erosion) expect(erosion.stroke.mode).toBe('erosion')
  })

  it('applyFoliageStroke appends instances and keeps honesty live (empty-honest when none)', () => {
    let doc = createEmptyFoliage()
    expect(foliageHonestyReport(doc).status).toBe('empty')
    expect(foliageHonestyReport(doc).mock).toBe(false)
    expect(foliageHonestyReport(null).status).toBe('missing')

    const mapped = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      { size: 40, strength: 1, falloff: 1, mode: 'foliage', selectedFoliageTypeId: 'tree-1' },
      { widthMeters: 64, depthMeters: 64, resolution: 33 },
      types,
    )
    expect('stroke' in mapped).toBe(true)
    if (!('stroke' in mapped)) return

    const heights = new Float32Array(33 * 33)
    heights.fill(0.25)
    doc = applyFoliageStroke(doc, mapped.stroke, {
      resolution: 33,
      widthMeters: 64,
      depthMeters: 64,
      maxHeight: 32,
      heights,
    })
    expect(foliageHonestyReport(doc).status).toBe('live')
    expect(doc.meta.strokeCount).toBe(1)
    expect(doc.instances.length).toBeGreaterThan(0)
    expect(doc.instances.every((i) => i.typeId === 'tree-1')).toBe(true)
    expect(doc.instances[0]!.y).toBeCloseTo(8, 0)

    // Erase clears instances in brush
    const eraseMapped = landscapeBrushToFoliageStroke(
      { x: 0, z: 0 },
      {
        size: 80,
        strength: 1,
        falloff: 1,
        mode: 'foliage',
        operation: 'lower',
        selectedFoliageTypeId: 'tree-1',
      },
      { widthMeters: 64, depthMeters: 64, resolution: 33 },
      types,
    )
    if ('stroke' in eraseMapped) {
      doc = applyFoliageStroke(doc, eraseMapped.stroke)
      expect(doc.instances.length).toBe(0)
      expect(doc.meta.strokeCount).toBe(2)
    }
  })

  it('authority round-trip: instances JSON encode/decode matches', () => {
    let doc = createEmptyFoliage()
    doc = applyFoliageStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.15,
      strength: 0.9,
      falloff: 2,
      typeId: 'grass-1',
      operation: 'paint',
      widthMeters: 100,
      depthMeters: 100,
    })
    const raw = encodeFoliageInstancesJson(doc.instances)
    const roundTrip = decodeFoliageInstancesJson(raw)
    expect(roundTrip.length).toBe(doc.instances.length)
    expect(roundTrip[0]).toEqual(doc.instances[0])
  })
})
