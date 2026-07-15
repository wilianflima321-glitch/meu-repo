import { describe, expect, it } from 'vitest'
import { THREE } from '@/lib/three/static'
import {
  CameraPathBuilder,
  applyCameraPathFrame,
  createDefaultCameraConfig,
  createDefaultFollowSettings,
  createDefaultOrbitSettings,
  updateCameraFovAnimation,
  updateOrbitCamera,
  worldToScreen,
} from '@/lib/camera/camera-system-runtime'

describe('camera-system runtime helpers', () => {
  it('creates stable camera defaults for runtime editors', () => {
    expect(createDefaultCameraConfig({ fov: 45 })).toMatchObject({
      fov: 45,
      near: 0.1,
      far: 1000,
    })

    expect(createDefaultFollowSettings().offset.toArray()).toEqual([0, 5, 10])
    expect(createDefaultOrbitSettings().distance).toBe(10)
  })

  it('builds sorted cinematic paths and applies interpolated frames', () => {
    const path = CameraPathBuilder.create('intro')
      .duration(2)
      .point({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1, 80)
      .point({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, 0, 60)
      .build()

    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100)
    applyCameraPathFrame({ camera, path, progress: 0.5, easing: (value) => value })

    expect(path.points.map((point) => point.time)).toEqual([0, 1])
    expect(camera.position.x).toBeCloseTo(5)
    expect(camera.fov).toBeCloseTo(70)
  })

  it('updates orbit camera, screen projection and fov animation deterministically', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    const orbit = createDefaultOrbitSettings()
    orbit.enableDamping = false
    orbit.distance = 10
    orbit.polarAngle = Math.PI / 2
    orbit.azimuthAngle = 0

    updateOrbitCamera(camera, orbit)
    camera.updateMatrixWorld()

    expect(camera.position.x).toBeCloseTo(10)
    expect(camera.position.y).toBeCloseTo(0)

    const screen = worldToScreen(camera, new THREE.Vector3(0, 0, 0), 100, 100)
    expect(screen.x).toBeGreaterThanOrEqual(0)
    expect(screen.x).toBeLessThanOrEqual(100)
    expect(screen.y).toBeGreaterThanOrEqual(0)
    expect(screen.y).toBeLessThanOrEqual(100)

    const next = updateCameraFovAnimation({
      camera,
      animation: { start: 60, end: 90, duration: 1, elapsed: 0 },
      deltaTime: 0.5,
      easing: (value) => value,
    })

    expect(next?.elapsed).toBeCloseTo(0.5)
    expect(camera.fov).toBeCloseTo(75)
  })
})
