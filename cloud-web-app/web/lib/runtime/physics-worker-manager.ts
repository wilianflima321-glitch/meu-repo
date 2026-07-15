/**
 * Law I — Physics Worker manager (letter bm).
 *
 * Spawns module worker, binds bk SharedTransformPhysicsBridge buffer,
 * posts step commands. When Worker / COI unavailable: silent inactive
 * (Zero-UI) — caller keeps main-thread Rapier.
 */

import type { SharedTransformPhysicsBridge } from './shared-transform-physics-bridge'
import {
  PHYSICS_WORKER_PROTOCOL_VERSION,
  handlePhysicsWorkerRequest,
  PhysicsWorkerSimState,
  type PhysicsWorkerBodySeed,
  type PhysicsWorkerRequest,
  type PhysicsWorkerResponse,
} from './physics-worker-protocol'
import { PHYSICS_WORKER_PATH_WIRED } from './physics-worker-honesty'

export type PhysicsWorkerManagerMode = 'worker' | 'in-process-fallback' | 'inactive'

export interface PhysicsWorkerStepResult {
  writeEpoch: number
  count: number
  sharedTransformsWritten: boolean
  mode: PhysicsWorkerManagerMode
}

export interface PhysicsWorkerManagerOptions {
  /**
   * Prefer real Worker when constructible. When false, use in-process
   * protocol handler (tests / Node) against the same shared buffer.
   */
  preferWorker?: boolean
  /**
   * When Worker spawn fails, run protocol in-process against the bridge
   * buffer (still off the render tick if caller awaits off-RAF). Default true.
   */
  allowInProcessFallback?: boolean
}

/**
 * Owns Worker lifecycle + request/response correlation.
 */
export class PhysicsWorkerManager {
  readonly pathWired = PHYSICS_WORKER_PATH_WIRED

  private worker: Worker | null = null
  private mode: PhysicsWorkerManagerMode = 'inactive'
  private pending = new Map<
    string,
    {
      resolve: (r: PhysicsWorkerResponse) => void
      reject: (e: Error) => void
    }
  >()
  private seq = 0
  private ready = false
  private readyPromise: Promise<void>
  private readyResolve!: () => void
  private inProcess: PhysicsWorkerSimState | null = null
  private bridge: SharedTransformPhysicsBridge | null = null
  private readonly preferWorker: boolean
  private readonly allowInProcessFallback: boolean

  constructor(options: PhysicsWorkerManagerOptions = {}) {
    this.preferWorker = options.preferWorker !== false
    this.allowInProcessFallback = options.allowInProcessFallback !== false
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  getMode(): PhysicsWorkerManagerMode {
    return this.mode
  }

  isActive(): boolean {
    return this.mode === 'worker' || this.mode === 'in-process-fallback'
  }

  /**
   * Attempt to activate against a bk bridge. Never throws — returns false
   * and stays inactive (Zero-UI) when Worker/SAB unavailable and fallback off.
   */
  async activate(bridge: SharedTransformPhysicsBridge): Promise<boolean> {
    this.bridge = bridge

    if (this.preferWorker && typeof Worker !== 'undefined') {
      try {
        await this.spawnWorker()
        await this.bindBridge(bridge)
        this.mode = 'worker'
        this.ready = true
        this.readyResolve()
        return true
      } catch {
        this.teardownWorker()
        // Fall through to in-process if allowed.
      }
    }

    if (this.allowInProcessFallback) {
      this.inProcess = new PhysicsWorkerSimState()
      const initRes = handlePhysicsWorkerRequest(this.inProcess, {
        type: 'init',
        id: this.nextId(),
        protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
        data: { gravity: { x: 0, y: -9.81, z: 0 } },
      })
      if (!initRes.success) {
        this.mode = 'inactive'
        return false
      }
      await this.bindBridgeInProcess(bridge)
      this.mode = 'in-process-fallback'
      this.ready = true
      this.readyResolve()
      return true
    }

    this.mode = 'inactive'
    return false
  }

  async waitForReady(): Promise<void> {
    if (this.ready) return
    return this.readyPromise
  }

  async registerBodies(bodies: readonly PhysicsWorkerBodySeed[]): Promise<number> {
    if (!this.isActive()) return 0
    const res = await this.request({
      type: 'registerBodies',
      id: this.nextId(),
      protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
      data: { bodies: [...bodies] },
    })
    return res.data?.registered ?? 0
  }

  /**
   * Post a physics step. Updates shared transforms; main thread should
   * acquireEpoch on the bridge afterward. Never blocks with Atomics.wait.
   */
  async step(deltaTime: number, substeps = 1): Promise<PhysicsWorkerStepResult | null> {
    if (!this.isActive()) return null
    const res = await this.request({
      type: 'step',
      id: this.nextId(),
      protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
      data: { deltaTime, substeps },
    })
    if (!res.success || res.data?.writeEpoch == null) return null

    if (this.bridge && res.data.writeEpoch > 0) {
      this.bridge.acquireEpoch(res.data.writeEpoch - 1)
    }

    return {
      writeEpoch: res.data.writeEpoch,
      count: res.data.count ?? 0,
      sharedTransformsWritten: res.data.sharedTransformsWritten === true,
      mode: this.mode,
    }
  }

  destroy(): void {
    if (this.mode === 'worker' && this.worker) {
      void this.request({
        type: 'destroy',
        id: this.nextId(),
        protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
      }).catch(() => undefined)
      this.teardownWorker()
    }
    if (this.inProcess) {
      this.inProcess.destroy()
      this.inProcess = null
    }
    this.bridge = null
    this.mode = 'inactive'
    this.ready = false
    for (const [, p] of this.pending) {
      p.reject(new Error('PhysicsWorkerManager destroyed'))
    }
    this.pending.clear()
  }

  private nextId(): string {
    return `pw_${++this.seq}`
  }

  private async spawnWorker(): Promise<void> {
    const workerUrl = new URL('../../workers/physics-sim.worker.ts', import.meta.url)
    this.worker = new Worker(workerUrl, { type: 'module' })

    await new Promise<void>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker missing'))
        return
      }
      const onMessage = (event: MessageEvent<PhysicsWorkerResponse>) => {
        const msg = event.data
        if (msg?.type === 'ready') {
          this.worker?.removeEventListener('message', onMessage)
          this.worker?.removeEventListener('error', onError)
          this.attachWorkerHandlers()
          resolve()
          return
        }
      }
      const onError = (err: ErrorEvent) => {
        this.worker?.removeEventListener('message', onMessage)
        this.worker?.removeEventListener('error', onError)
        reject(new Error(err.message || 'Physics worker spawn failed'))
      }
      this.worker.addEventListener('message', onMessage)
      this.worker.addEventListener('error', onError)
    })

    const init = await this.request({
      type: 'init',
      id: this.nextId(),
      protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
      data: { gravity: { x: 0, y: -9.81, z: 0 } },
    })
    if (!init.success) {
      throw new Error(init.error ?? 'Physics worker init failed')
    }
  }

  private attachWorkerHandlers(): void {
    if (!this.worker) return
    this.worker.onmessage = (event: MessageEvent<PhysicsWorkerResponse>) => {
      const msg = event.data
      if (!msg || typeof msg.id !== 'string') return
      if (msg.type === 'ready') return
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      pending.resolve(msg)
    }
    this.worker.onerror = (error) => {
      for (const [, p] of this.pending) {
        p.reject(new Error(error.message || 'Physics worker error'))
      }
      this.pending.clear()
    }
  }

  private teardownWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }

  private async bindBridge(bridge: SharedTransformPhysicsBridge): Promise<void> {
    const sab = bridge.sharedBuffer
    const mode = bridge.mode
    const buffer: SharedArrayBuffer | ArrayBuffer | null =
      sab ??
      // Fallback-copy: share the underlying ArrayBuffer via a fresh view's buffer.
      // Bridge keeps ownership; worker gets the same bytes only when SAB.
      null

    if (mode === 'sab-atomics' && sab) {
      const res = await this.request({
        type: 'bindSharedTransforms',
        id: this.nextId(),
        protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
        data: {
          sharedBuffer: sab,
          mode: 'sab-atomics',
          capacity: bridge.capacity,
        },
      })
      if (!res.success) throw new Error(res.error ?? 'bind SAB failed')
      return
    }

    // No SAB to share across realms — use in-process fallback against bridge buffer.
    if (this.allowInProcessFallback) {
      this.teardownWorker()
      this.inProcess = new PhysicsWorkerSimState()
      handlePhysicsWorkerRequest(this.inProcess, {
        type: 'init',
        id: this.nextId(),
        data: { gravity: { x: 0, y: -9.81, z: 0 } },
      })
      await this.bindBridgeInProcess(bridge)
      this.mode = 'in-process-fallback'
      return
    }

    void buffer
    throw new Error('SharedArrayBuffer unavailable — cannot bind worker')
  }

  private async bindBridgeInProcess(bridge: SharedTransformPhysicsBridge): Promise<void> {
    if (!this.inProcess) {
      this.inProcess = new PhysicsWorkerSimState()
    }
    // Re-wrap bridge storage: create a matching buffer the in-process sim writes,
    // then publish by writing through views on the bridge's shared/fallback buffer.
    const snap = bridge.snapshot()
    // Prefer real SAB when present; else allocate ArrayBuffer of same layout and
    // re-bind by constructing views on bridge via publishPoses after step — for
    // in-process we bind directly to a cloned ArrayBuffer that mirrors layout,
    // then copy epoch/poses back via bridge.publishPoses after step.
    // Simpler: expose bind to the same buffer object the bridge owns.
    const underlying = getBridgeUnderlyingBuffer(bridge)
    if (!underlying) {
      throw new Error('Bridge buffer unavailable')
    }
    const res = handlePhysicsWorkerRequest(this.inProcess, {
      type: 'bindSharedTransforms',
      id: this.nextId(),
      data: {
        sharedBuffer: underlying,
        mode: bridge.mode,
        capacity: snap.capacity,
      },
    })
    if (!res.success) throw new Error(res.error ?? 'in-process bind failed')
  }

  private request(req: PhysicsWorkerRequest): Promise<PhysicsWorkerResponse> {
    if (this.mode === 'in-process-fallback' || this.inProcess) {
      if (!this.inProcess) {
        return Promise.resolve({
          type: 'error',
          id: req.id,
          success: false,
          error: 'In-process state missing',
        })
      }
      return Promise.resolve(handlePhysicsWorkerRequest(this.inProcess, req))
    }

    if (!this.worker) {
      return Promise.resolve({
        type: 'error',
        id: req.id,
        success: false,
        error: 'Worker inactive',
      })
    }

    return new Promise((resolve, reject) => {
      this.pending.set(req.id, { resolve, reject })
      try {
        // SAB is transferable by reference (shared), not Transferable detach.
        this.worker!.postMessage(req)
      } catch (err) {
        this.pending.delete(req.id)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }
}

/**
 * Access underlying buffer for in-process bind. Uses sharedBuffer when SAB;
 * for fallback-copy, reconstructs via a one-slot publish round-trip is wrong —
 * we need the bridge to expose ArrayBuffer. Use snapshot capacity + create
 * ArrayBuffer sibling only when SAB null: write through publishPoses after step.
 *
 * For bm: SharedTransformPhysicsBridge gains `underlyingBuffer` getter.
 */
export function getBridgeUnderlyingBuffer(
  bridge: SharedTransformPhysicsBridge,
): SharedArrayBuffer | ArrayBuffer | null {
  if (bridge.sharedBuffer) return bridge.sharedBuffer
  return bridge.underlyingArrayBuffer ?? null
}

export function createPhysicsWorkerManager(
  options?: PhysicsWorkerManagerOptions,
): PhysicsWorkerManager {
  return new PhysicsWorkerManager(options)
}
