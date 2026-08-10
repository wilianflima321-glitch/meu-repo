/**
 * The Cook & Build Pipeline orchestrator — the brain behind "One-Click
 * Deploy". Turns a Publish request into an ordered, partially-parallel
 * stage plan and — the one non-negotiable part of this file — the isolation
 * contract that keeps the editor (`@aethel/ide-ui`, React Flow, Monaco,
 * editor Zustand/docking, Yjs-Monaco bindings) out of the shipped game.
 *
 * Stage responsibilities (see `docs/architecture/implementation_plan.md`
 * One-Click Deploy section for the full narrative):
 *
 *   1. asset-cook          — geometry/texture/audio compression. Delegates
 *                            the actual native-tool dispatch to the existing
 *                            governed `studio-local-cook-queue.ts` planning
 *                            model; this stage only decides WHAT needs
 *                            cooking for a Publish and in which parallel
 *                            groups.
 *   2. logic-transpile     — `.aethelgraph` / ability graphs → real
 *                            TypeScript, via `visual-script-transpile-stage.ts`.
 *   3. tree-shake          — scans every generated source file this pipeline
 *                            is about to bundle for `FORBIDDEN_RUNTIME_PACKAGES`
 *                            and fails the job closed if it finds one.
 *   4. netcode-inject      — wires `@aethel/engine/network/replication-client`
 *                            into the generated manifest when the project has
 *                            `[Replicated]` entities.
 *   5. monetization-inject — wires `@aethel/engine/billing/runtime-billing-client`
 *                            when a Stripe publishable key was supplied.
 *   6. package             — zips/writes the final web-static or native-tauri
 *                            artifact.
 *
 * This module is pure (no fs/network/queue calls) so it can be unit tested
 * in isolation — see `__tests__/production/cook-and-tree-shake.test.ts`.
 */

import type { GameAssetQualityTier } from './game-asset-quality-pipeline'
import { runAethelPackCookPublishStage } from '@/lib/immunity/cook-publish-stage'
import type {
  AethelPackMeshInput,
  AethelPackTextureInput,
} from '@/lib/immunity/aethel-pack-writer'

export type PublishTarget = 'web-static' | 'native-tauri'

export type PublishPipelineStageId =
  | 'asset-cook'
  | 'logic-transpile'
  | 'tree-shake'
  | 'baked-lighting'
  | 'netcode-inject'
  | 'monetization-inject'
  | 'package'
  | 'demo-web-slice'

export interface PublishPipelineStageMeta {
  id: PublishPipelineStageId
  label: string
  description: string
  /** Stages sharing a group number have no data dependency on each other and may run on separate Background Workers. */
  parallelGroup: number
}

export const PUBLISH_PIPELINE_STAGES: readonly PublishPipelineStageMeta[] = [
  {
    id: 'asset-cook',
    label: 'Asset Cooker',
    description: 'Compress geometry (Draco/Meshopt), textures (KTX2/WebP), and audio (OGG/AAC) for runtime.',
    parallelGroup: 0,
  },
  {
    id: 'logic-transpile',
    label: 'Logic Transpiler',
    description: 'Compile Visual Scripting graphs and GAS ability graphs to plain TypeScript/generator source.',
    parallelGroup: 0,
  },
  {
    id: 'tree-shake',
    label: 'Tree Shaking & Target Generation',
    description: 'Verify the generated bundle carries zero editor-only imports before it is allowed to package.',
    parallelGroup: 1,
  },
  {
    id: 'baked-lighting',
    label: 'Baked Lighting (Law XV)',
    description: 'Fail-closed lightmap/bake receipt gate — publish without bake evidence is rejected for web-static.',
    parallelGroup: 1,
  },
  {
    id: 'netcode-inject',
    label: 'Zero-Config Multiplayer',
    description: 'Wire the WebRTC/WebSocket replication client into the manifest for [Replicated] entities.',
    parallelGroup: 2,
  },
  {
    id: 'monetization-inject',
    label: 'Monetization Injection',
    description: 'Wire the Stripe runtime billing client into the manifest when a publishable key is present.',
    parallelGroup: 2,
  },
  {
    id: 'package',
    label: 'Target Packaging',
    description: 'Produce the web-static artifact or invoke `tauri build` for native-tauri.',
    parallelGroup: 3,
  },
  {
    id: 'demo-web-slice',
    label: 'Instant Play Demo Web Slice (XIV.3)',
    description:
      'Hosted HTML Instant Play slice for Hub iframe — fail-closed / HELD when only a cook zip exists (no placeholder.html theater).',
    parallelGroup: 4,
  },
] as const

/**
 * Anything a compiled game must NEVER import, at any depth. Checked against
 * raw generated/bundled source text by `verifyRuntimeBundleIsolation` —
 * cheap, dependency-free, and works before a real bundler is even wired in.
 * Extend this list before adding any new editor-only package, not after.
 */
export const FORBIDDEN_RUNTIME_PACKAGES: readonly string[] = [
  '@aethel/ide-ui',
  '@aethel/visual-scripting',
  '@aethel/agents',
  '@aethel/gameplay',
  '@xyflow/react',
  'reactflow',
  'monaco-editor',
  '@monaco-editor/react',
  'y-monaco',
  'y-protocols',
  'y-indexeddb',
  'zustand',
  'framer-motion',
] as const

/** The only package prefix a compiled game's entrypoint chain may import from besides Node/browser builtins and its own generated files. */
export const ALLOWED_RUNTIME_PACKAGE_PREFIXES: readonly string[] = ['@aethel/engine', 'three', '@react-three/fiber', '@react-three/drei', 'yjs'] as const

export const RUNTIME_ENTRYPOINT_PATH = 'packages/engine/runtime-main.ts' as const

export interface PublishMultiplayerRequest {
  enabled: boolean
  relayUrl?: string
}

export interface PublishMonetizationRequest {
  enabled: boolean
  stripePublishableKey?: string
  checkoutEndpoint?: string
}

export interface PublishPipelineRequest {
  projectId: string
  target: PublishTarget
  quality: GameAssetQualityTier
  requestedByUserId: string
  multiplayer: PublishMultiplayerRequest
  monetization: PublishMonetizationRequest
}

export interface PublishPipelinePlan {
  version: 1
  pipeline: 'aethel-publish-pipeline'
  target: PublishTarget
  request: PublishPipelineRequest
  stages: readonly PublishPipelineStageMeta[]
  forbiddenRuntimePackages: readonly string[]
  allowedRuntimePackagePrefixes: readonly string[]
  entrypoint: string
  nativeBuildCommand: string | null
}

function nativeBuildCommandFor(target: PublishTarget): string | null {
  if (target !== 'native-tauri') return null
  // Shelled out by `export-format-worker.ts` from `apps/studio-local/` — see
  // `runPublishPipeline`'s `package` stage. Kept as a plain string here (not
  // executed by this pure module) so the command is reviewable in the plan
  // before anything runs.
  return 'npm run tauri build -- --config tauri.publish.conf.json'
}

export function buildPublishPipelinePlan(request: PublishPipelineRequest): PublishPipelinePlan {
  return {
    version: 1,
    pipeline: 'aethel-publish-pipeline',
    target: request.target,
    request,
    stages: PUBLISH_PIPELINE_STAGES,
    forbiddenRuntimePackages: FORBIDDEN_RUNTIME_PACKAGES,
    allowedRuntimePackagePrefixes: ALLOWED_RUNTIME_PACKAGE_PREFIXES,
    entrypoint: RUNTIME_ENTRYPOINT_PATH,
    nativeBuildCommand: nativeBuildCommandFor(request.target),
  }
}

/**
 * Law VI / Law XVI — asset-cook stage gate for publish.
 * Never returns success with empty `.aethelpack` bytes.
 * Delegates to `runAethelPackCookPublishStage` (letter bn).
 */
export function evaluatePublishAssetCookStage(input: {
  projectId: string
  buildId: string
  /** Optional pre-cooked pack; when absent, stage is held/blocked without inventing bytes. */
  packBytes?: Uint8Array
  cookAssets?: {
    textures?: AethelPackTextureInput[]
    meshes?: AethelPackMeshInput[]
  }
}): {
  stageId: 'asset-cook'
  allowed: boolean
  cookPackReady: boolean
  success: boolean
  packByteLength: number
  packSha256: string
  packBytes: Uint8Array | null
  reason: string
  shipStatus: 'IMPLEMENTED' | 'PARTIAL' | 'HELD'
  bc7AstcHeld: true
  placeboForbidden: true
} {
  const cook = runAethelPackCookPublishStage({
    projectId: input.projectId,
    buildId: input.buildId,
    packBytes: input.packBytes,
    cookAssets: input.cookAssets,
  })
  const allowed = cook.success === true && cook.packByteLength > 0 && cook.cookPackReady
  return {
    stageId: 'asset-cook',
    allowed,
    cookPackReady: allowed,
    success: allowed,
    packByteLength: cook.packByteLength,
    packSha256: cook.packSha256,
    packBytes: allowed ? cook.packBytes : null,
    reason: allowed
      ? cook.reason
      : cook.reason || 'asset-cook blocked — empty or missing .aethelpack',
    shipStatus: allowed ? 'PARTIAL' : cook.status === 'held' ? 'HELD' : 'PARTIAL',
    bc7AstcHeld: true,
    placeboForbidden: true,
  }
}

/**
 * Law XV — baked-lighting is mandatory before package for web-static.
 * Hardened implementation lives in baked-lighting-publish-gate.ts (theater receipt refuse).
 */
export {
  evaluateBakedLightingPublishGate,
  refusePackWithoutBakeEvidence,
  isTheaterBakeReceipt,
  probeBakedLightingPublishGateReadiness,
} from '@/lib/production/baked-lighting-publish-gate'
export type {
  BakedLightingPublishGateResult,
  BakedLightingGateRejectCode,
  PublishBakeTarget,
} from '@/lib/production/baked-lighting-publish-gate'

export interface RuntimeIsolationViolation {
  forbiddenPackage: string
  sourceIndex: number
  snippet: string
}

export interface RuntimeIsolationReport {
  clean: boolean
  scannedFiles: number
  violations: RuntimeIsolationViolation[]
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildImportSpecifierPattern(pkg: string): RegExp {
  const escaped = escapeForRegExp(pkg)
  // Matches `from '<pkg>'`, `from "<pkg>/sub/path"`, `require('<pkg>')`, and dynamic `import('<pkg>')` —
  // the handful of shapes a bundler or a hand-inspected generated file can actually contain.
  return new RegExp(`(?:from\\s+|require\\(|import\\()['"]${escaped}(?:['"/]|$)`, 'g')
}

/**
 * Stage 3 (Tree Shaking) enforcement. Pass every generated/bundled source
 * file this Publish job is about to ship — `verifyRuntimeBundleIsolation`
 * scans plain text, so it works equally on pre-bundle generated `.ts`
 * sources and on a post-bundle `.js` artifact.
 */
export function verifyRuntimeBundleIsolation(sources: string | readonly string[]): RuntimeIsolationReport {
  const files = Array.isArray(sources) ? sources : [sources]
  const violations: RuntimeIsolationViolation[] = []

  files.forEach((text, sourceIndex) => {
    for (const forbidden of FORBIDDEN_RUNTIME_PACKAGES) {
      const pattern = buildImportSpecifierPattern(forbidden)
      const match = pattern.exec(text)
      if (match) {
        const start = Math.max(0, match.index - 20)
        violations.push({
          forbiddenPackage: forbidden,
          sourceIndex,
          snippet: text.slice(start, match.index + match[0].length + 20).trim(),
        })
      }
    }
  })

  return { clean: violations.length === 0, scannedFiles: files.length, violations }
}
