/**
 * Block 4 World CORE — foliage surgical erase, terrain smooth, asset hierarchy, clouds HELD.
 */

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { FoliageClusterManager, InstancedFoliageMesh } from '@/lib/foliage-system'
import type { FoliageType } from '@/lib/foliage-system.types'
import {
  buildViewportImportedObject,
  buildViewportImportedObjects,
} from '@/lib/viewport/viewport-asset-import'
import {
  createVolumetricCloudAdapterSummary,
} from '@/lib/production/engine-module-adapters'
import { VOLUMETRIC_CLOUDS_SHIP_STATUS } from '@/lib/volumetric-clouds'
import {
  applyBrushStroke,
  createFlatHeightfield,
} from '@/lib/production/terrain-heightfield-authority'

function makeFoliageType(id: string): FoliageType {
  return {
    id,
    name: id,
    mesh: new THREE.BoxGeometry(0.2, 0.5, 0.2),
    material: new THREE.MeshBasicMaterial(),
    density: 1,
    minScale: 1,
    maxScale: 1,
    minHeight: -100,
    maxHeight: 100,
    minSlope: 0,
    maxSlope: 90,
    alignToNormal: false,
    randomRotation: false,
    windStrength: 0.2,
    lodDistances: [20, 60, 120],
    lodMeshes: [],
    castShadow: false,
    receiveShadow: false,
  }
}

describe('Block 4 World CORE — FOLIAGE-001 surgical erase', () => {
  it('removeCluster erases only that cluster — siblings of the same type stay', () => {
    const scene = new THREE.Scene()
    const manager = new FoliageClusterManager(scene)
    manager.registerFoliageType(makeFoliageType('pine'))

    const mk = (x: number) => ({
      position: new THREE.Vector3(x, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      typeId: 'pine',
    })

    const a = manager.addInstances('pine', [mk(0), mk(1)])
    const b = manager.addInstances('pine', [mk(10), mk(11), mk(12)])

    expect(manager.getInstanceCount()).toBe(5)

    manager.removeCluster(a)
    expect(manager.getInstanceCount()).toBe(3)
    expect(manager.getClusters().get(b)?.instances).toHaveLength(3)

    manager.removeCluster(b)
    expect(manager.getInstanceCount()).toBe(0)
  })

  it('InstancedFoliageMesh.removeInstance returns swapped-from index for remapping', () => {
    const mesh = new InstancedFoliageMesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
      8,
    )
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3(1, 1, 1)
    expect(mesh.addInstance(new THREE.Vector3(0, 0, 0), q, s)).toBe(0)
    expect(mesh.addInstance(new THREE.Vector3(1, 0, 0), q, s)).toBe(1)
    expect(mesh.addInstance(new THREE.Vector3(2, 0, 0), q, s)).toBe(2)

    const swapped = mesh.removeInstance(0)
    expect(swapped).toBe(2)
    expect(mesh.getInstanceCount()).toBe(2)
  })

  it('setInstanceVisible zero-scales without deleting the slot', () => {
    const mesh = new InstancedFoliageMesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
      4,
    )
    mesh.addInstance(new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector3(2, 2, 2))
    mesh.setInstanceVisible(0, false)
    expect(mesh.getInstanceCount()).toBe(1)
    const m = new THREE.Matrix4()
    mesh.mesh.getMatrixAt(0, m)
    const scale = new THREE.Vector3()
    m.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale)
    expect(scale.x).toBe(0)
    mesh.setInstanceVisible(0, true)
    mesh.mesh.getMatrixAt(0, m)
    m.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale)
    expect(scale.x).toBe(2)
  })
})

describe('Block 4 World CORE — TERRAIN-001 smooth kernel', () => {
  it('3×3 neighborhood mean moves a spike toward neighbors', () => {
    const doc = createFlatHeightfield({ resolution: 17 })
    const res = doc.meta.resolution
    const mid = Math.floor(res / 2)
    const idx = mid * res + mid
    doc.heights[idx] = 1
    const before = doc.heights[idx]
    applyBrushStroke(doc, {
      u: 0.5,
      v: 0.5,
      radius: 0.35,
      strength: 1,
      falloff: 1,
      mode: 'smooth',
    })
    expect(doc.heights[idx]).toBeLessThan(before)
    expect(doc.heights[idx]).toBeGreaterThan(0)
  })
})

describe('Block 4 World CORE — ASSET-001 hierarchy metadata', () => {
  it('marks USDA/USD as HELD; USDZ+meshUrl and GLB as live hierarchy-preserving', () => {
    const usd = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-07-11T12:00:00.000Z',
      index: 0,
      file: { fileName: 'Level.usd', sizeBytes: 100 },
    })
    expect(usd?.asset?.viewerStatus).toBe('held')
    expect(usd?.meshUrl).toBeUndefined()

    const usdz = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-07-11T12:00:00.000Z',
      index: 1,
      file: {
        fileName: 'Prop.usdz',
        sizeBytes: 512,
        meshUrl: 'blob:prop-usdz',
        hierarchyPreserved: true,
        viewerStatus: 'live',
      },
    })
    expect(usdz?.asset?.viewerStatus).toBe('live')
    expect(usdz?.meshUrl).toBe('blob:prop-usdz')
    expect(usdz?.asset?.qualityGate).toBe('preview-ready')

    const objects = buildViewportImportedObjects({
      existingCount: 0,
      importedAt: '2026-07-11T12:00:00.000Z',
      files: [{ fileName: 'Hero.glb', sizeBytes: 2048, meshUrl: 'blob:hero', hierarchyPreserved: true, boneCount: 42 }],
    })
    expect(objects[0].meshUrl).toBe('blob:hero')
    expect(objects[0].asset?.hierarchyPreserved).toBe(true)
    expect(objects[0].asset?.boneCount).toBe(42)
    expect(objects[0].asset?.viewerStatus).toBe('live')
    expect(objects[0].asset?.qualityGate).toBe('preview-ready')
  })
})

describe('Block 4 World CORE — CLOUD-001 honesty', () => {
  it('exposes CLOSED ship status — depth/god-rays path real; no full AAA marketing', () => {
    expect(VOLUMETRIC_CLOUDS_SHIP_STATUS).toBe('CLOSED')
    const summary = createVolumetricCloudAdapterSummary()
    expect(summary.shipStatus).toBe('CLOSED')
    expect(summary.depthBlend).toBe(true)
    expect(summary.godRaysInRenderPath).toBe(true)
    expect(summary.marketingFullVolumetricAaaAllowed).toBe(false)
  })
})
