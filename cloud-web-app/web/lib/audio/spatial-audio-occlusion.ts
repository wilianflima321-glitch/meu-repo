// @aethel-heavy-async-boundary
import * as THREE from 'three'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ReverbPreset } from '@/lib/audio/spatial-audio-contracts'
import { SpatialAudioManagerCore } from './spatial-audio-manager-core'
import type { ActiveSound } from './spatial-audio-contracts'

const log = createComponentLogger('spatial-audio-occlusion')

/**
 * Map measured mean wall distance (metres) → ConvolverNode reverb preset.
 * Thresholds match the former TODO contract (small / large / outdoor).
 */
export function classifyRoomReverbFromAverageDistance(averageDistanceM: number): ReverbPreset {
  if (!Number.isFinite(averageDistanceM) || averageDistanceM < 0) return 'none'
  if (averageDistanceM < 5) return 'small_room'
  if (averageDistanceM < 20) return 'medium_room'
  if (averageDistanceM < 50) return 'large_hall'
  return 'outdoor'
}

export interface RoomAcousticsProbe {
  averageDistanceM: number
  hitCount: number
  preset: ReverbPreset
  applied: boolean
}

export class SpatialAudioAdvancedSystem {
  private raycaster: THREE.Raycaster

  // Static scene meshes that block sound (walls, rocks, etc.)
  private occlusionMeshes: THREE.Mesh[] = []

  constructor(
    private audioManager: SpatialAudioManagerCore,
    private scene: THREE.Scene,
  ) {
    this.raycaster = new THREE.Raycaster()
    void this.scene
  }

  public registerOcclusionMesh(mesh: THREE.Mesh): void {
    this.occlusionMeshes.push(mesh)
  }

  /**
   * Called from the engine main loop (ideally every ~100ms, not every frame).
   */
  public updateOcclusion(listenerPosition: THREE.Vector3): void {
    const activeSounds = (this.audioManager as unknown as { activeSounds: Map<string, ActiveSound> })
      .activeSounds
    const context = (this.audioManager as unknown as { context: AudioContext | null }).context

    if (!context) return

    for (const [, sound] of activeSounds) {
      if (!sound.settings.spatial || !sound.position) continue

      const direction = new THREE.Vector3().subVectors(sound.position, listenerPosition)
      const distance = direction.length()

      if (distance > sound.settings.maxDistance!) continue

      direction.normalize()
      this.raycaster.set(listenerPosition, direction)
      this.raycaster.far = distance

      const hits = this.raycaster.intersectObjects(this.occlusionMeshes, false)

      let occlusionFactor = 0.0
      if (hits.length > 0) {
        occlusionFactor = Math.min(1.0, hits.length * 0.4)
      }

      if (!sound.filterNode && occlusionFactor > 0) {
        sound.filterNode = context.createBiquadFilter()
        sound.filterNode.type = 'lowpass'

        sound.source.disconnect(sound.pannerNode!)
        sound.source.connect(sound.filterNode)
        sound.filterNode.connect(sound.pannerNode!)
      }

      if (sound.filterNode) {
        const targetFreq = 22000 - occlusionFactor * 21200
        sound.filterNode.frequency.setTargetAtTime(targetFreq, context.currentTime, 0.1)
      }
    }
  }

  /**
   * Probe room scale with 6 axis rays and swap the manager ConvolverNode IR
   * via `setReverbPreset` (AUDIO-001 synthetic IR path — no empty TODO).
   */
  public updateRoomAcoustics(listenerPosition: THREE.Vector3): RoomAcousticsProbe {
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ]

    let totalDistance = 0
    let hitCount = 0

    for (const dir of directions) {
      this.raycaster.set(listenerPosition, dir)
      this.raycaster.far = 100
      const hits = this.raycaster.intersectObjects(this.occlusionMeshes, false)
      if (hits.length > 0) {
        totalDistance += hits[0].distance
        hitCount++
      } else {
        totalDistance += 100
      }
    }

    const averageDistanceM = totalDistance / 6
    const preset = classifyRoomReverbFromAverageDistance(averageDistanceM)

    let applied = false
    if (typeof this.audioManager.setReverbPreset === 'function') {
      this.audioManager.setReverbPreset(preset)
      applied = this.audioManager.getReverbPreset() === preset
    } else {
      log.warn('room_acoustics_reverb_unavailable', { averageDistanceM, preset })
    }

    return { averageDistanceM, hitCount, preset, applied }
  }
}
