/**
 * Onda A.1 — physics substrate from durable heightfield authority.
 * Builds Rapier-compatible heightfield collider params + sample queries.
 * Zero-MVP: derived from real Float32 heights, not sin-wave placeholders.
 */

import type { HeightfieldDocument } from '@/lib/production/terrain-heightfield-authority'
import { sampleHeightfieldWorldY } from '@/lib/production/heightfield-viewport-bridge'

export type HeightfieldRapierColliderParams = {
  /** Rapier nrows = resolution - 1 */
  nrows: number
  /** Rapier ncols = resolution - 1 */
  ncols: number
  /** World-space heights for ColliderDesc.heightfield (row-major) */
  heights: Float32Array
  scale: { x: number; y: number; z: number }
  mock: false
  source: 'heightfield-authority'
  claim: 'Rapier heightfield collider params from durable authority — wire into World.createCollider'
}

/**
 * Convert normalized 0..1 heightfield into Rapier heightfield collider inputs.
 * Rapier expects (nrows, ncols) cells → (nrows+1)*(ncols+1) height samples.
 */
export function buildRapierHeightfieldColliderParams(
  doc: Pick<HeightfieldDocument, 'meta' | 'heights'>,
): HeightfieldRapierColliderParams {
  const res = doc.meta.resolution
  const expected = res * res
  if (doc.heights.length !== expected) {
    throw new Error(`HEIGHTFIELD_PHYSICS_SIZE_MISMATCH: expected ${expected}, got ${doc.heights.length}`)
  }
  if (res < 2) {
    throw new Error('HEIGHTFIELD_PHYSICS_TOO_SMALL')
  }

  const worldHeights = new Float32Array(expected)
  for (let i = 0; i < expected; i++) {
    worldHeights[i] = (doc.heights[i] ?? 0) * doc.meta.maxHeight
  }

  return {
    nrows: res - 1,
    ncols: res - 1,
    heights: worldHeights,
    scale: {
      x: doc.meta.widthMeters,
      y: 1,
      z: doc.meta.depthMeters,
    },
    mock: false,
    source: 'heightfield-authority',
    claim: 'Rapier heightfield collider params from durable authority — wire into World.createCollider',
  }
}

/** Place an object on the heightfield surface (playtest / foliage / drop). */
export function snapWorldYToHeightfield(
  doc: Pick<HeightfieldDocument, 'meta' | 'heights'>,
  worldX: number,
  worldZ: number,
  clearance = 0,
): number {
  return sampleHeightfieldWorldY(doc, worldX, worldZ) + clearance
}

export function heightfieldPhysicsHonesty(doc: HeightfieldDocument | null): {
  live: boolean
  mock: false
  status: 'empty' | 'ready'
  claim: string
} {
  if (!doc || doc.heights.length === 0) {
    return {
      live: false,
      mock: false,
      status: 'empty',
      claim: 'No heightfield — physics substrate not live until first durable save',
    }
  }
  return {
    live: true,
    mock: false,
    status: 'ready',
    claim: 'Durable heightfield ready for Rapier collider + sampleHeightfieldWorldY',
  }
}
