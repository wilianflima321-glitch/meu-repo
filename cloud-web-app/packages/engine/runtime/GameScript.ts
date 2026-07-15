/**
 * `@aethel/engine` runtime script base.
 *
 * This is the ONLY module the Logic Transpiler is allowed to import into
 * generated game code (see `VisualScriptCompiler.compileToTypeScript` in
 * `@aethel/visual-scripting/VisualScriptRuntime.ts`). It has zero
 * dependencies — no React, no `@xyflow/react`, no Yjs, no `@aethel/ide-ui` —
 * so a compiled game's script bundle stays exactly as clean as the rest of
 * `runtime-main.ts`. Cook & Build Pipeline Stage 3 (Tree Shaking) asserts
 * this file never grows an import that would violate that contract.
 */

export interface Vector3 {
  x: number
  y: number
  z: number
}

export function vec3(x = 0, y = 0, z = 0): Vector3 {
  return { x, y, z }
}

export function addVec3(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function scaleVec3(v: Vector3, scalar: number): Vector3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar }
}

export interface GameObjectHandle {
  name: string
  position: Vector3
  rotation: Vector3
  scale: Vector3
  [key: string]: unknown
}

export interface RaycastHit {
  hit: boolean
  point: Vector3
  normal: Vector3
  object: unknown
  distance: number
}

/**
 * The live services a running `GameScript` can reach — bound by
 * `runtime-main.ts` at boot from whichever real subsystem backs each one
 * (WebGPU/R3F scene graph, input poller, Rapier physics world, audio mixer).
 * Generated scripts only ever see this narrow surface, never the subsystems
 * themselves.
 */
export interface GameScriptServices {
  variables: Map<string, unknown>
  input: {
    getKey(key: string): boolean
    getKeyDown(key: string): boolean
    getKeyUp(key: string): boolean
    getAxis(axis: string): number
    mousePosition: Vector3
    mouseDelta: Vector3
    mouseButton(button: number): boolean
  }
  physics: {
    raycast(origin: Vector3, direction: Vector3, distance: number): RaycastHit | null
    addForce(target: unknown, force: Vector3, impulse?: boolean): void
  }
  audio: {
    playSound(sound: string, volume?: number, loop?: boolean): void
    stopSound(sound: string): void
  }
  objects: {
    spawn(prefab: string, position: Vector3): unknown
    destroy(target: unknown, delay?: number): void
    find(name: string): unknown
  }
  log(message: string): void
}

/**
 * Base class every transpiled `.aethelgraph` node graph extends. One
 * instance is bound to one `GameObjectHandle`; `runtime-main.ts` calls
 * `start()` once and `update()` every simulated frame, mirroring the
 * `event_start` / `event_update` node semantics from the editor-side
 * `VisualScriptRuntime` interpreter this class replaces at runtime.
 */
export abstract class GameScript {
  protected readonly gameObject: GameObjectHandle
  protected readonly services: GameScriptServices
  protected deltaTime = 0

  constructor(gameObject: GameObjectHandle, services: GameScriptServices) {
    this.gameObject = gameObject
    this.services = services
  }

  start(): void {}

  update(deltaTime: number): void {
    this.deltaTime = deltaTime
  }

  onCollision(_other: GameObjectHandle, _point: Vector3): void {}

  onTriggerEnter(_other: GameObjectHandle): void {}

  onTriggerExit(_other: GameObjectHandle): void {}
}

export type GameScriptConstructor = new (
  gameObject: GameObjectHandle,
  services: GameScriptServices
) => GameScript
