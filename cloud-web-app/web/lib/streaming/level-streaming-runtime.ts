// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three'

import type {
  LevelDefinition,
  StreamingConfig,
  StreamingPriority,
} from './level-streaming-types'

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  maxConcurrentLoads: 2,
  streamingDistance: 100,
  unloadDistance: 150,
  preloadDistance: 200,
  memoryBudgetMB: 1024,
  checkInterval: 500,
  minLoadTimeMs: 500,
}

export const STREAMING_PRIORITY_ORDER: Record<StreamingPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
  background: 0,
}

export function calculateStreamingPriority(config: StreamingConfig, distance: number): StreamingPriority {
  if (distance <= config.streamingDistance * 0.5) return 'critical'
  if (distance <= config.streamingDistance) return 'high'
  if (distance <= config.preloadDistance * 0.75) return 'normal'
  return 'low'
}

export function sortStreamingLoadQueue(queue: { levelId: string; priority: StreamingPriority }[]): void {
  queue.sort((a, b) => STREAMING_PRIORITY_ORDER[b.priority] - STREAMING_PRIORITY_ORDER[a.priority])
}

export function getDistanceToLevelDefinition(definition: LevelDefinition, playerPosition: THREE.Vector3): number {
  if (!definition.bounds) return Infinity

  const bounds = definition.bounds
  const center = new THREE.Vector3(
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2,
  )

  return playerPosition.distanceTo(center)
}

export function disposeStreamingObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose()

      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          disposeStreamingMaterial(material)
        }
      } else if (child.material) {
        disposeStreamingMaterial(child.material)
      }
    }
  })
}

export function disposeStreamingMaterial(material: THREE.Material): void {
  material.dispose()

  const mat = material as THREE.MeshStandardMaterial
  mat.map?.dispose()
  mat.normalMap?.dispose()
  mat.roughnessMap?.dispose()
  mat.metalnessMap?.dispose()
  mat.aoMap?.dispose()
  mat.emissiveMap?.dispose()
}
