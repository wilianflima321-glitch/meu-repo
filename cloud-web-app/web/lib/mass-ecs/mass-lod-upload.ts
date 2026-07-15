/**
 * Letter cw — Interest / LOD: CPU upload only for nearby agents (render interest).
 * Far agents stay GPU-resident SoA — no per-entity JS AI tick for render sync.
 */

import type { MassAgentSoaBuffers } from '@/lib/mass-ecs/mass-soa-buffers'

export interface MassLodCamera {
  x: number
  y: number
  z: number
}

export interface MassLodUploadResult {
  uploadedCount: number
  skippedFar: number
  /** Packed xyz for nearby agents only (CPU→render). */
  nearbyPositions: Float32Array
  nearbyIndices: Uint32Array
  notes: string[]
}

/**
 * Upload only agents within radius of camera for render / GAS interest.
 * Does NOT run AI — positions already stepped on GPU/CPU SoA formula.
 */
export function uploadNearbyLodAgents(
  buffers: MassAgentSoaBuffers,
  opts: { camera: MassLodCamera; radius?: number; maxUpload?: number },
): MassLodUploadResult {
  const radius = opts.radius ?? 32
  const r2 = radius * radius
  const maxUpload = opts.maxUpload ?? 2048
  const indices: number[] = []
  const count = buffers.count
  const cx = opts.camera.x
  const cy = opts.camera.y
  const cz = opts.camera.z

  for (let i = 0; i < count; i++) {
    if (buffers.states[i] === 0) continue
    const o = i * 4
    const dx = buffers.positions[o]! - cx
    const dy = buffers.positions[o + 1]! - cy
    const dz = buffers.positions[o + 2]! - cz
    if (dx * dx + dy * dy + dz * dz <= r2) {
      indices.push(i)
      if (indices.length >= maxUpload) break
    }
  }

  const nearbyPositions = new Float32Array(indices.length * 3)
  const nearbyIndices = new Uint32Array(indices.length)
  for (let n = 0; n < indices.length; n++) {
    const i = indices[n]!
    const o = i * 4
    nearbyPositions[n * 3] = buffers.positions[o]!
    nearbyPositions[n * 3 + 1] = buffers.positions[o + 1]!
    nearbyPositions[n * 3 + 2] = buffers.positions[o + 2]!
    nearbyIndices[n] = i
  }

  const skippedFar = Math.max(0, count - indices.length)
  return {
    uploadedCount: indices.length,
    skippedFar,
    nearbyPositions,
    nearbyIndices,
    notes: [
      `Mass LOD upload (letter cw): nearby=${indices.length} skippedFar=${skippedFar} radius=${radius}`,
      'Far agents remain GPU/CPU SoA — no per-NPC JS Update for render sync',
    ],
  }
}
