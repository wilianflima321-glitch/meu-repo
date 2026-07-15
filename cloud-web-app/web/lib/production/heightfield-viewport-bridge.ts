/**
 * Onda A.1 — bridge durable heightfield authority → terrain-engine mesh + physics viz.
 * Zero-MVP: geometry is derived from real Float32 heights, not sin-wave placeholders.
 */

import * as THREE from 'three'
import type { HeightfieldDocument, HeightfieldMeta } from '@/lib/production/terrain-heightfield-authority'

export type HeightfieldViewportMeshBuild = {
  geometry: THREE.BufferGeometry
  /** World-space size used for centering the mesh. */
  widthMeters: number
  depthMeters: number
  maxHeight: number
  resolution: number
  sampleCount: number
  mock: false
  source: 'heightfield-authority'
}

export type HeightfieldPhysicsViz = {
  /** Line segments as flat [x,y,z, x,y,z, ...] for wireframe collider grid */
  positions: Float32Array
  segmentCount: number
  /** Sampled height queries for physics substrate honesty */
  sampleHeights: number[]
  mock: false
  source: 'heightfield-collider-viz'
}

/**
 * Build a single TerrainEngine-compatible BufferGeometry from a durable heightfield.
 * Heights are normalized 0..1 in the document; scaled by maxHeight for world Y.
 */
export function buildGeometryFromHeightfield(
  doc: Pick<HeightfieldDocument, 'meta' | 'heights'>,
  options?: { maxSegments?: number },
): HeightfieldViewportMeshBuild {
  const res = doc.meta.resolution
  const expected = res * res
  if (doc.heights.length !== expected) {
    throw new Error(`HEIGHTFIELD_SIZE_MISMATCH: expected ${expected}, got ${doc.heights.length}`)
  }

  const widthMeters = doc.meta.widthMeters
  const depthMeters = doc.meta.depthMeters
  const maxHeight = doc.meta.maxHeight
  // Cap mesh segments for viewport perf while preserving height samples via stride
  const maxSeg = Math.max(8, Math.min(res - 1, options?.maxSegments ?? 128))
  const segments = Math.min(res - 1, maxSeg)
  const geometry = new THREE.PlaneGeometry(widthMeters, depthMeters, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const pos = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const u = (x / widthMeters + 0.5)
    const v = (z / depthMeters + 0.5)
    const hx = Math.min(res - 1, Math.max(0, Math.round(u * (res - 1))))
    const hz = Math.min(res - 1, Math.max(0, Math.round(v * (res - 1))))
    const h = doc.heights[hz * res + hx] ?? 0
    pos.setY(i, h * maxHeight)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return {
    geometry,
    widthMeters,
    depthMeters,
    maxHeight,
    resolution: res,
    sampleCount: doc.heights.length,
    mock: false,
    source: 'heightfield-authority',
  }
}

/** Bilinear sample — physics substrate used by playtest / placement. */
export function sampleHeightfieldWorldY(
  doc: Pick<HeightfieldDocument, 'meta' | 'heights'>,
  worldX: number,
  worldZ: number,
): number {
  const { resolution: res, widthMeters, depthMeters, maxHeight } = doc.meta
  const u = worldX / widthMeters + 0.5
  const v = worldZ / depthMeters + 0.5
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0
  const fx = u * (res - 1)
  const fz = v * (res - 1)
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const x1 = Math.min(res - 1, x0 + 1)
  const z1 = Math.min(res - 1, z0 + 1)
  const tx = fx - x0
  const tz = fz - z0
  const h00 = doc.heights[z0 * res + x0] ?? 0
  const h10 = doc.heights[z0 * res + x1] ?? 0
  const h01 = doc.heights[z1 * res + x0] ?? 0
  const h11 = doc.heights[z1 * res + x1] ?? 0
  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  return (h0 * (1 - tz) + h1 * tz) * maxHeight
}

/**
 * Build a sparse wireframe grid representing the heightfield collider surface.
 * This is visualization of the physics substrate — not a claim of live Rapier heightfield IPC.
 */
export function buildHeightfieldPhysicsViz(
  doc: Pick<HeightfieldDocument, 'meta' | 'heights'>,
  options?: { gridStep?: number },
): HeightfieldPhysicsViz {
  const step = Math.max(2, options?.gridStep ?? Math.max(4, Math.floor(doc.meta.resolution / 16)))
  const res = doc.meta.resolution
  const { widthMeters, depthMeters, maxHeight } = doc.meta
  const lines: number[] = []
  const sampleHeights: number[] = []

  const worldX = (ix: number) => ((ix / (res - 1)) - 0.5) * widthMeters
  const worldZ = (iz: number) => ((iz / (res - 1)) - 0.5) * depthMeters
  const heightAt = (ix: number, iz: number) => (doc.heights[iz * res + ix] ?? 0) * maxHeight

  for (let z = 0; z < res; z += step) {
    for (let x = 0; x < res - step; x += step) {
      const x1 = Math.min(res - 1, x + step)
      lines.push(worldX(x), heightAt(x, z), worldZ(z), worldX(x1), heightAt(x1, z), worldZ(z))
    }
  }
  for (let x = 0; x < res; x += step) {
    for (let z = 0; z < res - step; z += step) {
      const z1 = Math.min(res - 1, z + step)
      lines.push(worldX(x), heightAt(x, z), worldZ(z), worldX(x), heightAt(x, z1), worldZ(z1))
    }
  }

  // Corner + center samples for honesty / tests
  for (const [ix, iz] of [
    [0, 0],
    [res - 1, 0],
    [0, res - 1],
    [res - 1, res - 1],
    [Math.floor((res - 1) / 2), Math.floor((res - 1) / 2)],
  ] as const) {
    sampleHeights.push(heightAt(ix, iz))
  }

  return {
    positions: new Float32Array(lines),
    segmentCount: lines.length / 6,
    sampleHeights,
    mock: false,
    source: 'heightfield-collider-viz',
  }
}

export function heightfieldMetaFingerprint(meta: HeightfieldMeta): string {
  return `${meta.resolution}:${meta.strokeCount}:${meta.updatedAt}:${meta.widthMeters}x${meta.depthMeters}`
}
