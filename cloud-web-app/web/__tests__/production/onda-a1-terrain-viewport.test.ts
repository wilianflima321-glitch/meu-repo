import { describe, expect, it } from 'vitest'
import {
  applyBrushStroke,
  createFlatHeightfield,
} from '@/lib/production/terrain-heightfield-authority'
import {
  buildGeometryFromHeightfield,
  buildHeightfieldPhysicsViz,
  sampleHeightfieldWorldY,
} from '@/lib/production/heightfield-viewport-bridge'
import {
  buildRapierHeightfieldColliderParams,
  heightfieldPhysicsHonesty,
  snapWorldYToHeightfield,
} from '@/lib/production/heightfield-physics-substrate'
import { TerrainEngine } from '@/lib/terrain-engine-runtime'
import * as THREE from 'three'

describe('Onda A.1 heightfield viewport bridge', () => {
  it('builds non-mock geometry from durable heightfield strokes', () => {
    let doc = createFlatHeightfield({ resolution: 33, widthMeters: 64, depthMeters: 64, maxHeight: 20 })
    doc = applyBrushStroke(doc, { u: 0.5, v: 0.5, radius: 0.2, strength: 0.8, mode: 'sculpt' })
    const build = buildGeometryFromHeightfield(doc, { maxSegments: 32 })
    expect(build.mock).toBe(false)
    expect(build.source).toBe('heightfield-authority')
    expect(build.sampleCount).toBe(33 * 33)
    expect(build.geometry.attributes.position.count).toBeGreaterThan(100)

    const centerY = sampleHeightfieldWorldY(doc, 0, 0)
    expect(centerY).toBeGreaterThan(0)

    const viz = buildHeightfieldPhysicsViz(doc, { gridStep: 4 })
    expect(viz.mock).toBe(false)
    expect(viz.segmentCount).toBeGreaterThan(0)
    expect(viz.sampleHeights.some((h) => h > 0)).toBe(true)

    build.geometry.dispose()
  })

  it('TerrainEngine.loadFromHeightfield attaches a live mesh (not procedural-only)', () => {
    const scene = new THREE.Scene()
    const engine = new TerrainEngine(scene, { lodLevels: 1 })
    const doc = createFlatHeightfield({ resolution: 17, maxHeight: 10 })
    applyBrushStroke(doc, { u: 0.25, v: 0.25, radius: 0.15, strength: 1, mode: 'sculpt' })
    engine.loadFromHeightfield({
      heights: doc.heights,
      resolution: doc.meta.resolution,
      widthMeters: doc.meta.widthMeters,
      depthMeters: doc.meta.depthMeters,
      maxHeight: doc.meta.maxHeight,
    })
    expect(scene.children.length).toBe(1)
    expect(engine.getChunksNearPosition(new THREE.Vector3(0, 0, 0), 500).length).toBe(1)
    engine.dispose()
  })

  it('builds Rapier heightfield collider params from durable authority', () => {
    let doc = createFlatHeightfield({ resolution: 17, widthMeters: 32, depthMeters: 32, maxHeight: 8 })
    doc = applyBrushStroke(doc, { u: 0.5, v: 0.5, radius: 0.25, strength: 1, mode: 'sculpt' })
    const params = buildRapierHeightfieldColliderParams(doc)
    expect(params.mock).toBe(false)
    expect(params.nrows).toBe(16)
    expect(params.ncols).toBe(16)
    expect(params.heights.length).toBe(17 * 17)
    expect(params.heights.some((h) => h > 0)).toBe(true)
    expect(params.scale.x).toBe(32)
    expect(heightfieldPhysicsHonesty(doc).live).toBe(true)
    expect(snapWorldYToHeightfield(doc, 0, 0, 0.1)).toBeGreaterThan(0.1)
  })
})
