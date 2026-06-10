// @aethel-heavy-async-boundary Studio/viewport camera runtime helpers.
import { THREE } from '../three/static'
import type {
  CameraConfig,
  CameraPath,
  EasingType,
  FollowSettings,
  OrbitSettings,
} from './camera-system.contracts'

export function createDefaultCameraConfig(config: Partial<CameraConfig> = {}): CameraConfig {
  const aspect = typeof window === 'undefined' ? 16 / 9 : window.innerWidth / window.innerHeight

  return {
    fov: 60,
    near: 0.1,
    far: 1000,
    aspect,
    ...config,
  }
}

export function createDefaultFollowSettings(): FollowSettings {
  return {
    target: null,
    offset: new THREE.Vector3(0, 5, 10),
    lookAtOffset: new THREE.Vector3(0, 1, 0),
    smoothing: 0.1,
    lookAhead: 0,
  }
}

export function createDefaultOrbitSettings(): OrbitSettings {
  return {
    target: new THREE.Vector3(0, 0, 0),
    distance: 10,
    minDistance: 2,
    maxDistance: 50,
    azimuthAngle: 0,
    polarAngle: Math.PI / 4,
    minPolarAngle: 0.1,
    maxPolarAngle: Math.PI - 0.1,
    rotationSpeed: 0.005,
    zoomSpeed: 0.1,
    enableDamping: true,
    dampingFactor: 0.05,
  }
}

export class CameraPathBuilder {
  private path: Partial<CameraPath> = {
    points: [],
    loop: false,
    easing: 'easeInOutQuad',
  }

  static create(id: string): CameraPathBuilder {
    return new CameraPathBuilder().id(id)
  }

  id(id: string): this {
    this.path.id = id
    return this
  }

  duration(seconds: number): this {
    this.path.duration = seconds
    return this
  }

  loop(loop = true): this {
    this.path.loop = loop
    return this
  }

  easing(easing: EasingType): this {
    this.path.easing = easing
    return this
  }

  point(position: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number }, time: number, fov?: number): this {
    this.path.points!.push({
      position: new THREE.Vector3(position.x, position.y, position.z),
      lookAt: new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z),
      time,
      fov,
    })
    return this
  }

  build(): CameraPath {
    if (!this.path.id) throw new Error('Path ID is required')
    if (!this.path.duration) throw new Error('Duration is required')
    if (this.path.points!.length < 2) throw new Error('At least 2 points required')

    this.path.points!.sort((a, b) => a.time - b.time)
    return this.path as CameraPath
  }
}

export function updateFollowCamera({
  camera,
  settings,
  targetVelocity,
  lastTargetPosition,
}: {
  camera: THREE.PerspectiveCamera
  settings: FollowSettings
  targetVelocity: THREE.Vector3
  lastTargetPosition: THREE.Vector3
}): void {
  const { target, offset, lookAtOffset, smoothing, lookAhead } = settings
  if (!target) return

  if (lookAhead && lookAhead > 0) {
    targetVelocity.copy(target.position).sub(lastTargetPosition)
    lastTargetPosition.copy(target.position)
  }

  const desiredPosition = new THREE.Vector3()
  const worldOffset = offset.clone()
  worldOffset.applyQuaternion(target.quaternion)
  desiredPosition.copy(target.position).add(worldOffset)

  if (lookAhead && lookAhead > 0) {
    desiredPosition.add(targetVelocity.clone().multiplyScalar(lookAhead))
  }

  camera.position.lerp(desiredPosition, smoothing)
  camera.lookAt(target.position.clone().add(lookAtOffset))
}

export function updateOrbitCamera(camera: THREE.PerspectiveCamera, settings: OrbitSettings): void {
  const { target, distance, azimuthAngle, polarAngle, enableDamping, dampingFactor } = settings
  const x = target.x + distance * Math.sin(polarAngle) * Math.cos(azimuthAngle)
  const y = target.y + distance * Math.cos(polarAngle)
  const z = target.z + distance * Math.sin(polarAngle) * Math.sin(azimuthAngle)
  const desiredPosition = new THREE.Vector3(x, y, z)

  if (enableDamping) camera.position.lerp(desiredPosition, dampingFactor)
  else camera.position.copy(desiredPosition)

  camera.lookAt(target)
}

export function updateFirstPersonCamera(camera: THREE.PerspectiveCamera, settings: FollowSettings): void {
  const { target, lookAtOffset } = settings
  if (!target) return

  camera.position.copy(target.position).add(lookAtOffset)
  camera.quaternion.copy(target.quaternion)
}

export function updateThirdPersonCamera(camera: THREE.PerspectiveCamera, follow: FollowSettings, orbit: OrbitSettings): void {
  const { target, smoothing } = follow
  if (!target) return

  const { distance, azimuthAngle, polarAngle } = orbit
  const x = target.position.x + distance * Math.sin(polarAngle) * Math.cos(azimuthAngle)
  const y = target.position.y + distance * Math.cos(polarAngle)
  const z = target.position.z + distance * Math.sin(polarAngle) * Math.sin(azimuthAngle)

  camera.position.lerp(new THREE.Vector3(x, y, z), smoothing)
  camera.lookAt(target.position)
}

export function updateTopDownCamera(camera: THREE.PerspectiveCamera, settings: FollowSettings): void {
  const { target, offset, smoothing } = settings
  if (!target) return

  const desiredPosition = new THREE.Vector3(target.position.x, target.position.y + offset.y, target.position.z)
  camera.position.lerp(desiredPosition, smoothing)
  camera.lookAt(target.position)
}

export function updateSideScrollerCamera(camera: THREE.PerspectiveCamera, settings: FollowSettings): void {
  const { target, offset, smoothing, deadZone } = settings
  if (!target) return

  const desiredPosition = new THREE.Vector3(
    target.position.x + offset.x,
    target.position.y + offset.y,
    target.position.z + offset.z,
  )

  if (deadZone) {
    const deltaX = desiredPosition.x - camera.position.x
    const deltaY = desiredPosition.y - camera.position.y
    if (Math.abs(deltaX) < deadZone.x) desiredPosition.x = camera.position.x
    if (Math.abs(deltaY) < deadZone.y) desiredPosition.y = camera.position.y
  }

  camera.position.lerp(desiredPosition, smoothing)
  camera.lookAt(new THREE.Vector3(target.position.x, target.position.y, target.position.z - 1))
}

export function worldToScreen(camera: THREE.PerspectiveCamera, worldPos: THREE.Vector3, screenWidth: number, screenHeight: number): THREE.Vector2 {
  const projected = worldPos.clone().project(camera)
  return new THREE.Vector2((projected.x + 1) * screenWidth / 2, (-projected.y + 1) * screenHeight / 2)
}

export function screenToWorld(camera: THREE.PerspectiveCamera, screenPos: THREE.Vector2, screenWidth: number, screenHeight: number, depth = 0.5): THREE.Vector3 {
  const ndc = new THREE.Vector3((screenPos.x / screenWidth) * 2 - 1, -(screenPos.y / screenHeight) * 2 + 1, depth)
  return ndc.unproject(camera)
}

export function getCameraRay(camera: THREE.PerspectiveCamera, screenPos: THREE.Vector2, screenWidth: number, screenHeight: number): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2((screenPos.x / screenWidth) * 2 - 1, -(screenPos.y / screenHeight) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  return raycaster
}

export function isObjectInCameraFrustum(camera: THREE.PerspectiveCamera, object: THREE.Object3D): boolean {
  const frustum = new THREE.Frustum()
  const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  frustum.setFromProjectionMatrix(matrix)

  if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
    const sphere = object.geometry.boundingSphere.clone()
    sphere.applyMatrix4(object.matrixWorld)
    return frustum.intersectsSphere(sphere)
  }

  return frustum.containsPoint(object.position)
}


export interface CameraTransitionFrame {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  fov: number
}

export interface CameraFovAnimation {
  start: number
  end: number
  duration: number
  elapsed: number
}

export function updateCameraShakeOffset({
  offset,
  elapsed,
  duration,
  frequency,
  intensity,
  decay,
}: {
  offset: THREE.Vector3
  elapsed: number
  duration: number
  frequency: number
  intensity: number
  decay: boolean
}): void {
  let currentIntensity = intensity
  if (decay) currentIntensity *= 1 - (elapsed / duration)

  const time = elapsed * frequency
  offset.set(
    (Math.sin(time * 1.1) + Math.sin(time * 2.3)) * currentIntensity * 0.5,
    (Math.sin(time * 1.7) + Math.sin(time * 1.9)) * currentIntensity * 0.5,
    (Math.sin(time * 2.1) + Math.sin(time * 1.3)) * currentIntensity * 0.5,
  )
}

export function createCameraTransitionEnd(
  position: THREE.Vector3,
  lookAt: THREE.Vector3,
  fov: number,
): CameraTransitionFrame {
  const endCamera = new THREE.PerspectiveCamera()
  endCamera.position.copy(position)
  endCamera.lookAt(lookAt)

  return {
    position: position.clone(),
    quaternion: endCamera.quaternion.clone(),
    fov,
  }
}

export function applyCameraPathFrame({
  camera,
  path,
  progress,
  easing,
}: {
  camera: THREE.PerspectiveCamera
  path: CameraPath
  progress: number
  easing: (value: number) => number
}): void {
  const t = easing(progress)
  let p1 = null as CameraPath['points'][number] | null
  let p2 = null as CameraPath['points'][number] | null

  for (let i = 0; i < path.points.length - 1; i++) {
    if (t >= path.points[i].time && t <= path.points[i + 1].time) {
      p1 = path.points[i]
      p2 = path.points[i + 1]
      break
    }
  }

  if (!p1 || !p2) return

  const segmentT = (t - p1.time) / (p2.time - p1.time)
  camera.position.lerpVectors(p1.position, p2.position, segmentT)
  camera.lookAt(new THREE.Vector3().lerpVectors(p1.lookAt, p2.lookAt, segmentT))

  if (p1.fov !== undefined && p2.fov !== undefined) {
    camera.fov = p1.fov + (p2.fov - p1.fov) * segmentT
    camera.updateProjectionMatrix()
  }
}

export function applyCameraTransitionFrame({
  camera,
  start,
  end,
  progress,
  easing,
}: {
  camera: THREE.PerspectiveCamera
  start: CameraTransitionFrame
  end: CameraTransitionFrame
  progress: number
  easing: (value: number) => number
}): void {
  const t = easing(progress)
  camera.position.lerpVectors(start.position, end.position, t)
  camera.quaternion.slerpQuaternions(start.quaternion, end.quaternion, t)
  camera.fov = start.fov + (end.fov - start.fov) * t
  camera.updateProjectionMatrix()
}

export function updateCameraFovAnimation({
  camera,
  animation,
  deltaTime,
  easing,
}: {
  camera: THREE.PerspectiveCamera
  animation: CameraFovAnimation
  deltaTime: number
  easing: (value: number) => number
}): CameraFovAnimation | null {
  const elapsed = animation.elapsed + deltaTime
  const t = Math.min(1, elapsed / animation.duration)
  const eased = easing(t)

  camera.fov = animation.start + (animation.end - animation.start) * eased
  camera.updateProjectionMatrix()

  return t >= 1 ? null : { ...animation, elapsed }
}
