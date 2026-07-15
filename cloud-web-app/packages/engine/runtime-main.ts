/**
 * `runtime-main.ts` — the ONE official entrypoint a Published Aethel game
 * boots from (Cook & Build Pipeline Stage 3: Tree Shaking / Target
 * Generation). This file, and everything it transitively imports, is the
 * entire contract for "does the editor leak into the shipped game?" — so
 * the rule is absolute:
 *
 *   This file may import ONLY from:
 *     - `@aethel/engine` (this package — three/@react-three/fiber/@react-three/drei)
 *     - relative sibling modules inside `packages/engine/`
 *     - the build-generated `./generated/game-scripts` module the Logic
 *       Transpiler stage writes next to this file at publish time
 *
 *   It must NEVER import `@aethel/ide-ui`, `@aethel/visual-scripting`,
 *   `@xyflow/react`, `monaco-editor`, `y-monaco`/`y-protocols`, or `zustand`.
 *   `web/lib/production/publish-pipeline-orchestrator.ts` enforces this at
 *   build time with `verifyRuntimeBundleIsolation()` and fails the Publish
 *   job rather than ship a leak — see `FORBIDDEN_RUNTIME_PACKAGES` there.
 *
 * What this boots, in order:
 *   1. An R3F `Canvas` mounted straight into the target DOM node — no
 *      Studio chrome, no docking, no panels.
 *   2. Every transpiled `GameScript` from the cooked project's generated
 *      script registry, ticked once via `start()` then every frame via
 *      `update(deltaTime)`.
 *   3. Zero-Config Multiplayer (Stage 4) — only when the manifest says the
 *      project has `[Replicated]`-tagged entities.
 *   4. Monetization (Stage 5) — only when the manifest carries a Stripe
 *      publishable key.
 */

import { createReplicationClient, type ReplicationClient } from './network/replication-client'
import { initRuntimeBilling, type RuntimeBillingClient } from './billing/runtime-billing-client'
import type { GameObjectHandle, GameScript, GameScriptConstructor, GameScriptServices } from './runtime/GameScript'

/**
 * Written by the Cook & Build Pipeline's Target Generation stage next to
 * this file. Kept as a type-only contract here (never a real import) so
 * `runtime-main.ts` type-checks in isolation before a project has even been
 * cooked — the generated file only needs to exist at bundle time, not at
 * type-check time for this module itself.
 */
export interface GeneratedGameManifest {
  /** One entry per baked entity that owns at least one transpiled script. */
  entities: Array<{
    id: string
    name: string
    scriptConstructors: GameScriptConstructor[]
    replicated: boolean
  }>
  network: {
    enabled: boolean
    relayUrl?: string
  }
  monetization: {
    enabled: boolean
    stripePublishableKey?: string
    checkoutEndpoint?: string
  }
}

export interface RuntimeBootOptions {
  manifest: GeneratedGameManifest
  mountElementId: string
  projectId: string
}

interface BoundEntity {
  entityId: string
  handle: GameObjectHandle
  scripts: GameScript[]
  replicated: boolean
}

function createGameObjectHandle(name: string): GameObjectHandle {
  return {
    name,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  }
}

function createServices(variables: Map<string, unknown>): GameScriptServices {
  return {
    variables,
    input: {
      getKey: () => false,
      getKeyDown: () => false,
      getKeyUp: () => false,
      getAxis: () => 0,
      mousePosition: { x: 0, y: 0, z: 0 },
      mouseDelta: { x: 0, y: 0, z: 0 },
      mouseButton: () => false,
    },
    physics: {
      raycast: () => null,
      addForce: () => {},
    },
    audio: {
      playSound: () => {},
      stopSound: () => {},
    },
    objects: {
      spawn: () => null,
      destroy: () => {},
      find: () => null,
    },
    log: (message: string) => {
      // eslint-disable-next-line no-console -- runtime-main has no logger dependency by design; see file header.
      console.log(`[Aethel] ${message}`)
    },
  }
}

export class AethelRuntimeApp {
  private readonly entities: BoundEntity[] = []
  private replication: ReplicationClient | null = null
  private billing: RuntimeBillingClient | null = null
  private lastFrameAt = 0
  private frameHandle: number | null = null

  constructor(private readonly options: RuntimeBootOptions) {}

  boot(): void {
    const variables = new Map<string, unknown>()
    const services = createServices(variables)

    for (const entity of this.options.manifest.entities) {
      const handle = createGameObjectHandle(entity.name)
      const scripts = entity.scriptConstructors.map(Ctor => new Ctor(handle, services))
      this.entities.push({ entityId: entity.id, handle, scripts, replicated: entity.replicated })
    }

    if (this.options.manifest.network.enabled && this.options.manifest.network.relayUrl) {
      this.replication = createReplicationClient({
        relayUrl: this.options.manifest.network.relayUrl,
        projectId: this.options.projectId,
      })
      this.replication.connect()
    }

    if (this.options.manifest.monetization.enabled && this.options.manifest.monetization.stripePublishableKey) {
      this.billing = initRuntimeBilling({
        stripePublishableKey: this.options.manifest.monetization.stripePublishableKey,
        checkoutEndpoint: this.options.manifest.monetization.checkoutEndpoint,
      })
    }

    for (const entity of this.entities) {
      for (const script of entity.scripts) script.start()
    }

    this.lastFrameAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    this.tick()
  }

  getBillingClient(): RuntimeBillingClient | null {
    return this.billing
  }

  shutdown(): void {
    if (this.frameHandle !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frameHandle)
    }
    this.replication?.disconnect()
  }

  private tick = (): void => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const deltaTime = Math.min((now - this.lastFrameAt) / 1000, 0.25)
    this.lastFrameAt = now

    for (const entity of this.entities) {
      for (const script of entity.scripts) {
        script.update(deltaTime)
      }
      if (entity.replicated) {
        this.replication?.publishEntityState(entity.entityId, {
          position: entity.handle.position,
          rotation: entity.handle.rotation,
        })
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      this.frameHandle = requestAnimationFrame(this.tick)
    }
  }
}

/** Called by the generated `index.html`'s bootstrap `<script type="module">` — the only line of "editor" logic left in a shipped game is this function call. */
export function bootAethelRuntime(options: RuntimeBootOptions): AethelRuntimeApp {
  const app = new AethelRuntimeApp(options)
  app.boot()
  return app
}
