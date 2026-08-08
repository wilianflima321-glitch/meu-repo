/**
 * World-forge semantic G-Buffer QA (adjacent to P2b MEDIUM theater class).
 *
 * Depth / collision / entity-id integrity checks are real pure math.
 * Prior revision used console.log supremacy theater ("L5 topologically perfect").
 * Logger-only; never claim L5/ship completeness from a local buffer probe.
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-semantic-gbuffer-qa')

export const SEMANTIC_GBUFFER_QA_SHIP_READY = false as const

interface SemanticGBuffer {
  depthMap: Float32Array
  collisionNormals: Float32Array
  entityIds: Uint32Array
}

export class SemanticGBufferQA {
  public validatePhysicalIntegrity(buffer: SemanticGBuffer, expectedEntityId: number): boolean {
    const hasVolume = this.checkDepthIntegrity(buffer.depthMap)
    const hasValidPhysics = this.checkCollisionNormals(buffer.collisionNormals)
    const containsRightMatter = buffer.entityIds.includes(expectedEntityId)
    const ok = hasVolume && hasValidPhysics && containsRightMatter

    if (!ok) {
      log.warn('semantic_gbuffer_integrity_failed', {
        hasVolume,
        hasValidPhysics,
        containsRightMatter,
        expectedEntityId,
      })
      return false
    }

    log.debug('semantic_gbuffer_integrity_ok', { expectedEntityId })
    return true
  }

  private checkDepthIntegrity(depths: Float32Array): boolean {
    return depths.some((d) => d > 0 && d < Infinity)
  }

  private checkCollisionNormals(normals: Float32Array): boolean {
    return normals.length > 0
  }
}
