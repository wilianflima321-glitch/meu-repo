'use client'

// @aethel-heavy-async-boundary: loaded only inside the dynamic viewport scene canvas.

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
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
    const [targetX, targetY, targetZ] =
      focusTarget && focusNonce > 0
        ? focusTarget
        : [0, 0.65, 0]
    const positions: Record<ViewportCameraPreset, [number, number, number]> = {
      perspective: [3.8, 2.4, 4.8],
      top: [0, 8.5, 0.001],
      front: [0, 1.6, 7.2],
      side: [7.2, 1.6, 0],
    }
    const position = positions[preset]
    camera.position.set(
      targetX + position[0],
      targetY + position[1],
      targetZ + position[2],
    )
    camera.lookAt(targetX, targetY, targetZ)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, focusNonce, focusTarget, invalidate, preset])

  return null
}

export function CameraBookmarkApplier() {
  const { camera, invalidate } = useThree()

  useEffect(() => {
    // Dynamic import safety for Zustand subscriber inside R3F fiber canvas
    const { useViewportSceneStore } = require('@/lib/stores/viewport-scene-store')
    const unsubscribe = useViewportSceneStore.subscribe(
      (state: any) => state.cameraJumpRequest,
      (jumpReq: any) => {
        if (!jumpReq) return
        const state = useViewportSceneStore.getState()
        const bookmark = state.cameraBookmarks?.[jumpReq.slot]
        if (!bookmark) return

        camera.position.set(bookmark.position[0], bookmark.position[1], bookmark.position[2])
        camera.lookAt(bookmark.target[0], bookmark.target[1], bookmark.target[2])
        if (bookmark.fov && 'fov' in camera) {
          ;(camera as PerspectiveCamera).fov = bookmark.fov
        }
        camera.updateProjectionMatrix()
        invalidate()
      }
    )

    return () => unsubscribe()
  }, [camera, invalidate])

  return null
}

