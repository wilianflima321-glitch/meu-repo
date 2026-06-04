'use client'

// @aethel-heavy-async-boundary: loaded only inside the dynamic viewport scene canvas.

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'

export { VIEWPORT_CAMERA_PRESETS } from '@/components/viewport/viewport-camera-presets'
export type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'

export function CameraPresetApplier({
  preset,
  focusTarget,
  focusNonce = 0,
}: {
  preset: ViewportCameraPreset
  focusTarget?: [number, number, number] | null
  focusNonce?: number
}) {
  const { camera, invalidate } = useThree()

  useEffect(() => {
    const target =
      focusTarget && focusNonce > 0
        ? new THREE.Vector3(focusTarget[0], focusTarget[1], focusTarget[2])
        : new THREE.Vector3(0, 0.65, 0)
    const positions: Record<ViewportCameraPreset, [number, number, number]> = {
      perspective: [3.8, 2.4, 4.8],
      top: [0, 8.5, 0.001],
      front: [0, 1.6, 7.2],
      side: [7.2, 1.6, 0],
    }
    const position = positions[preset]
    camera.position.set(
      target.x + position[0],
      target.y + position[1],
      target.z + position[2],
    )
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, focusNonce, focusTarget, invalidate, preset])

  return null
}
