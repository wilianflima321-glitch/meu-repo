/**
 * Lazy gateway for Three.js runtime modules.
 *
 * New runtime consumers should enter through this file so public, dashboard, and
 * admin shells do not pull Three/R3F/Drei into their initial bundles. Existing
 * direct imports are still being migrated by the V30 codemod/gates, so this
 * gateway is a compatibility layer and the canonical path for new work.
 */

export type ThreeNamespace = typeof import('three')
export type ReactThreeFiberNamespace = typeof import('@react-three/fiber')
export type ReactThreeDreiNamespace = typeof import('@react-three/drei')

let threePromise: Promise<ThreeNamespace> | null = null
let reactThreeFiberPromise: Promise<ReactThreeFiberNamespace> | null = null
let reactThreeDreiPromise: Promise<ReactThreeDreiNamespace> | null = null

export function loadThree(): Promise<ThreeNamespace> {
  threePromise ??= import('three')
  return threePromise
}

export function loadReactThreeFiber(): Promise<ReactThreeFiberNamespace> {
  reactThreeFiberPromise ??= import('@react-three/fiber')
  return reactThreeFiberPromise
}

export function loadReactThreeDrei(): Promise<ReactThreeDreiNamespace> {
  reactThreeDreiPromise ??= import('@react-three/drei')
  return reactThreeDreiPromise
}

export function loadThreeExamples<TModule>(loader: () => Promise<TModule>): Promise<TModule> {
  return loader()
}

export async function createScene() {
  const THREE = await loadThree()
  return new THREE.Scene()
}

export async function createDefaultCamera(
  fov = 60,
  aspect = 16 / 9,
  near = 0.1,
  far = 1000,
) {
  const THREE = await loadThree()
  return new THREE.PerspectiveCamera(fov, aspect, near, far)
}

export async function createRenderer(options?: {
  canvas?: HTMLCanvasElement
  antialias?: boolean
  alpha?: boolean
}) {
  const THREE = await loadThree()
  return new THREE.WebGLRenderer({
    antialias: options?.antialias ?? true,
    alpha: options?.alpha ?? false,
    canvas: options?.canvas,
  })
}

export async function disposeRenderer(renderer: {
  dispose: () => void
  forceContextLoss: () => void
}) {
  renderer.forceContextLoss()
  renderer.dispose()
}

export type {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  BufferGeometry,
  Camera,
  Clock,
  Color,
  CubeTexture,
  DirectionalLight,
  Euler,
  Group,
  HemisphereLight,
  Light,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  Sphere,
  SpotLight,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
