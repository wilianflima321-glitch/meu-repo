'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type ViewportCameraPreset = 'perspective' | 'top' | 'front' | 'side'

export const VIEWPORT_CAMERA_PRESETS: ReadonlyArray<{
  id: ViewportCameraPreset
  label: string
}> = [
  { id: 'perspective', label: 'Persp' },
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
]

export function CameraPresetApplier({ preset }: { preset: ViewportCameraPreset }) {
  const { camera, invalidate } = useThree()

  useEffect(() => {
    const target = new THREE.Vector3(0, 0.65, 0)
    const positions: Record<ViewportCameraPreset, [number, number, number]> = {
      perspective: [3.8, 2.4, 4.8],
      top: [0, 8.5, 0.001],
      front: [0, 1.6, 7.2],
      side: [7.2, 1.6, 0],
    }
    camera.position.set(...positions[preset])
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, invalidate, preset])

  return null
}
