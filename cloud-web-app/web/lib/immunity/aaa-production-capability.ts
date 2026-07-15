/**
 * Founder dossier — 7 Critical AAA Production Gaps honesty capability probe.
 * Zero-MVP: scaffolds may be CLOSED; ship claims stay HELD without evidence.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { evaluateConsoleHalHonesty } from './console-hal'
import {
  proveCookPackReadyFromJsWriter,
  runAethelPackCookPublishStage,
} from './cook-publish-stage'
import { probeAethelPackRustCookWorker } from './aethel-pack-rust-probe'
import { probeZstdEncoder } from './aethel-pack-compress'
import { evaluateEditorRuntimeBoundary } from '@/lib/runtime/editor-runtime-boundary'
import { probeEditorRuntimeHonesty } from '@/lib/runtime/editor-runtime-honesty'
import { probeSabTransformHonesty } from '@/lib/runtime/shared-transform-buffer'
import { probeSharedTransformBridgeHonesty } from '@/lib/runtime/shared-transform-physics-bridge'
import { evaluateCoopCoepHeadersHonesty } from '@/lib/runtime/coop-coep-headers'
import { evaluateFixedPointNetcodeHonesty } from '@/lib/netcode/fixed-point'
import { probeFixedPointPhysicsWired } from '@/lib/netcode/fixed-point-physics-adapter'
import { probeCompetitiveRollbackHonesty } from '@/lib/netcode/competitive-rollback-honesty'
import { probePhysicsWorkerHonesty, probePhysicsWorkerWired } from '@/lib/runtime/physics-worker-honesty'
import { probeObjectPoolHonesty } from '@/lib/runtime/object-pool-honesty'
import {
  handlePhysicsWorkerRequest,
  PhysicsWorkerSimState,
  PHYSICS_WORKER_PROTOCOL_VERSION,
} from '@/lib/runtime/physics-worker-protocol'
import { createSharedTransformPhysicsBridge } from '@/lib/runtime/shared-transform-physics-bridge'
import { probeWasmPluginAbiHonesty } from '@/lib/plugins/aethel-wasm-abi-honesty'

const log = createComponentLogger('aaa-production-capability')

export interface AaaProductionCapabilitySnapshot {
  /**
   * Validated non-empty `.aethelpack` bytes (JS Zstd/deflate writer or native).
   * Does not claim BC7/ASTC/VT — those stay HELD separately.
   */
  cookPackReady: boolean
  /**
   * Real Zstd WASM encode/decode proven (letter bo). Independent of BC7/ASTC.
   */
  zstdEncoderReady: boolean
  /** Rust cook toolchain + BC7/ASTC — always false until encoders proven. */
  nativeGpuEncodeReady: false
  sabTransformsReady: boolean
  /** COOP/COEP proven in middleware + next.config (letter bk). */
  coopCoepHeadersConfigured: boolean
  /** Shared transform physics bridge wired into SimulationTick (letter bk). */
  sabPhysicsBridgeWired: boolean
  /**
   * Physics worker path wired + shared-transform step proven (letter bm).
   * Does not claim zero-stutter marketing.
   */
  physicsWorkerReady: boolean
  /**
   * True only after soak proves zero alloc growth in gameplay tick (letter bp).
   * Does not claim zero-stutter marketing.
   */
  objectPoolEnforced: boolean
  /** Always false until Founder M.1 soak — pool alone is insufficient. */
  zeroStutterMarketingAllowed: false
  fixedPointNetcodeReady: boolean
  /**
   * Letter ce — dual-peer competitive rollback soak proven (GameLoop authority wire).
   * Does NOT claim GGPO-live / desync-free marketing.
   */
  competitiveRollbackSoakReady: boolean
  /**
   * True when ABI negotiate + sandboxed WebAssembly instantiate proven (letter br).
   * Does not claim plugin marketplace / store UI.
   */
  wasmPluginAbiReady: boolean
  /**
   * True when documented desktop HAL backends (WebGPU/Vulkan/DX12 via wgpu) negotiate (letter bs).
   * Does not claim live present/submit soak or PS5 GNM.
   */
  consoleHalReady: boolean
  /** Editor≠runtime strip contracts exist; V8 host HELD. */
  editorRuntimeBoundaryReady: boolean
  /**
   * True when deny-list + assertRuntimeExportClean gate proves no IDE/Next leaks (letter bq).
   * Does not claim V8+winit desktop host.
   */
  editorRuntimeIsolated: boolean
  /** Always false until desktop V8 isolate + winit host ships. */
  v8WinitHostReady: false
  ps5GnmReady: false
  ggpoLive: false
  marketingAaaProductionAllowed: false
}

export interface AaaProductionHonestyInput {
  /** Force BC7/ASTC native path probe (still does not invent encode). */
  nativeBakerToolchainReady?: boolean
  /**
   * @deprecated Prefer auto JS pack proof. When true without pack bytes, cook stays fail-closed (bn).
   */
  cookManifestArtifactsPresent?: boolean
  /** Force JS cook pack proof off (default: auto-prove via round-trip). */
  cookPackProven?: boolean
  crossOriginIsolated?: boolean
  sharedArrayBufferAvailable?: boolean
  objectPoolSoakPassed?: boolean
  fixedPointPhysicsWired?: boolean
  /** Force competitive rollback soak prove; false disables auto-proof (letter ce). */
  competitiveRollbackSoakPassed?: boolean
  /** Force physics-worker probe; false disables auto-proof. */
  physicsWorkerProven?: boolean
  ggpoSessionProven?: boolean
  /**
   * Force WASM ABI+sandbox prove; false disables auto-proof (letter br).
   * When true, treats negotiate+instantiate as proven without re-running fixture.
   */
  wasmAbiNegotiateOk?: boolean
  dx12VulkanBackendLive?: boolean
  /**
   * Force Console HAL desktop prove; false disables auto-proof (letter bs).
   * When true, treats documented desktop negotiate as proven (never PS5).
   */
  consoleHalProven?: boolean
  publishedBundleStripped?: boolean
  /** Force editor≠runtime isolation prove; false disables auto-proof (letter bq). */
  editorRuntimeIsolatedProven?: boolean
}

export interface AaaProductionHonestyReport {
  generatedAt: string
  capability: AaaProductionCapabilitySnapshot
  gaps: Array<{
    id: 1 | 2 | 3 | 4 | 5 | 6 | 7
    name: string
    wave: string
    scaffoldStatus: 'CLOSED' | 'HELD'
    shipStatus: 'CLOSED' | 'HELD'
    notes: string[]
  }>
  claim: string
  productCopy: string
  placeboForbidden: true
}

/**
 * Probe all 7 gaps. Defaults fail-closed for ship claims.
 */
export function probeAaaProductionCapability(
  input: AaaProductionHonestyInput = {},
): AaaProductionCapabilitySnapshot {
  // Letter bn: cookPackReady only when real pack bytes proven (JS round-trip or explicit cook).
  let cookPackReady = false
  if (input.cookPackProven === false) {
    cookPackReady = false
  } else if (input.cookPackProven === true) {
    cookPackReady = proveCookPackReadyFromJsWriter().cookPackReady
  } else {
    // Auto-prove JS pack writer path (deflate + checksums). BC7/ASTC still HELD.
    cookPackReady = proveCookPackReadyFromJsWriter().cookPackReady
  }

  // Legacy query flags: manifest-without-bytes must NOT flip ready (bn).
  if (input.cookManifestArtifactsPresent === true && input.nativeBakerToolchainReady === true) {
    const legacy = runAethelPackCookPublishStage({
      projectId: 'probe',
      buildId: 'probe',
      nativeBakerToolchainReady: true,
      manifest: {
        magic: 'AETH',
        version: 1,
        buildId: 'probe',
        projectId: 'probe',
        compression: 'deflate',
        textures: [
          {
            assetId: 't0',
            codec: 'rgba8-fallback',
            width: 4,
            height: 4,
            mipCount: 1,
            casHash: 'abc',
            byteOffset: 0,
            byteLength: 16,
          },
        ],
        meshes: [
          {
            assetId: 'm0',
            codec: 'meshopt',
            lodCount: 1,
            casHash: 'def',
            byteOffset: 0,
            byteLength: 32,
          },
        ],
        psoVault: [],
        wasmModules: [],
        bakerArtifactsPresent: true,
        virtualTexturingReady: false,
      },
    })
    // Manifest-only remains fail-closed; do not override JS proof.
    if (!legacy.cookPackReady && input.cookPackProven === false) {
      cookPackReady = false
    }
  }

  void probeAethelPackRustCookWorker()
  const zstd = probeZstdEncoder()

  const sab = probeSabTransformHonesty({
    crossOriginIsolated: input.crossOriginIsolated,
    forceSabAvailable: input.sharedArrayBufferAvailable,
  })
  const bridge = probeSharedTransformBridgeHonesty({
    crossOriginIsolated: input.crossOriginIsolated,
    sharedArrayBufferAvailable: input.sharedArrayBufferAvailable,
  })
  const headers = evaluateCoopCoepHeadersHonesty()

  // Ready only when headers + bridge + allocation proven AND COI + SAB (Zero-MVP).
  const sabTransformsReady =
    sab.sabTransformsReady &&
    bridge.sabTransformsReady &&
    headers.coopCoepHeadersConfigured &&
    bridge.sabPhysicsBridgeWired

  // Path real when adapter module is wired (letter bl). Query can force false.
  const fpWired =
    input.fixedPointPhysicsWired === false
      ? false
      : input.fixedPointPhysicsWired === true || probeFixedPointPhysicsWired()

  // Letter ce — dual-peer soak auto-prove; query can force.
  let competitiveRollbackSoakReady = false
  if (input.competitiveRollbackSoakPassed === false) {
    competitiveRollbackSoakReady = false
  } else if (input.competitiveRollbackSoakPassed === true) {
    competitiveRollbackSoakReady = probeCompetitiveRollbackHonesty({
      soakPassed: true,
    }).competitiveRollbackSoakReady
  } else if (fpWired) {
    competitiveRollbackSoakReady = probeCompetitiveRollbackHonesty()
      .competitiveRollbackSoakReady
  }

  const fp = evaluateFixedPointNetcodeHonesty({
    fixedPointPhysicsWired: fpWired,
    competitiveSoakProven: competitiveRollbackSoakReady,
    ggpoSessionProven: input.ggpoSessionProven,
  })

  // Physics worker (bm): auto-prove bind+shared step when path wired; query can force.
  let physicsWorkerReady = false
  if (input.physicsWorkerProven === false) {
    physicsWorkerReady = false
  } else if (input.physicsWorkerProven === true) {
    physicsWorkerReady = probePhysicsWorkerHonesty({
      sharedBufferBindProven: true,
      stepSharedWriteProven: true,
      workerConstructible: true,
    }).physicsWorkerReady
  } else if (probePhysicsWorkerWired()) {
    physicsWorkerReady = provePhysicsWorkerSharedStep()
  }

  // Object pool / frame arena (bp): auto-prove soak when path wired; query can force.
  let objectPoolEnforced = false
  if (input.objectPoolSoakPassed === false) {
    objectPoolEnforced = false
  } else if (input.objectPoolSoakPassed === true) {
    objectPoolEnforced = probeObjectPoolHonesty({ soakPassed: true }).objectPoolEnforced
  } else {
    objectPoolEnforced = probeObjectPoolHonesty().objectPoolEnforced
  }

  // WASM Plugin ABI + sandbox (br): auto-prove negotiate + fixture instantiate; query can force.
  let wasmPluginAbiReady = false
  if (input.wasmAbiNegotiateOk === false) {
    wasmPluginAbiReady = false
  } else if (input.wasmAbiNegotiateOk === true) {
    wasmPluginAbiReady = probeWasmPluginAbiHonesty({
      negotiateOk: true,
      sandboxInstantiateProven: true,
      forceProve: false,
    }).wasmPluginAbiReady
  } else {
    wasmPluginAbiReady = probeWasmPluginAbiHonesty().wasmPluginAbiReady
  }

  // Console HAL (bs): auto-prove documented desktop backends via negotiate; never PS5.
  const hal = evaluateConsoleHalHonesty({
    dx12VulkanBackendLive: input.dx12VulkanBackendLive,
    consoleHalProven: input.consoleHalProven,
  })

  const boundary = evaluateEditorRuntimeBoundary({
    surface: 'published-game',
    bundledSourceText:
      input.publishedBundleStripped === false
        ? `import x from '@aethel/ide-ui'\n`
        : `import { something } from '@aethel/engine/runtime'\n`,
  })

  // Editor≠runtime isolation (bq): auto-prove deny-list + assertRuntimeExportClean; query can force.
  let editorRuntimeIsolated = false
  if (input.editorRuntimeIsolatedProven === false || input.publishedBundleStripped === false) {
    editorRuntimeIsolated = false
  } else if (input.editorRuntimeIsolatedProven === true || input.publishedBundleStripped === true) {
    editorRuntimeIsolated = probeEditorRuntimeHonesty({ exportGateClean: true }).editorRuntimeIsolated
  } else {
    editorRuntimeIsolated = probeEditorRuntimeHonesty().editorRuntimeIsolated
  }

  return {
    cookPackReady,
    zstdEncoderReady: zstd.zstdEncoderReady === true,
    nativeGpuEncodeReady: false,
    sabTransformsReady,
    coopCoepHeadersConfigured: headers.coopCoepHeadersConfigured,
    sabPhysicsBridgeWired: bridge.sabPhysicsBridgeWired,
    physicsWorkerReady,
    objectPoolEnforced,
    zeroStutterMarketingAllowed: false,
    fixedPointNetcodeReady: fp.fixedPointNetcodeReady,
    competitiveRollbackSoakReady,
    wasmPluginAbiReady,
    consoleHalReady: hal.consoleHalReady,
    editorRuntimeBoundaryReady: boundary.ok && editorRuntimeIsolated,
    editorRuntimeIsolated,
    v8WinitHostReady: false,
    ps5GnmReady: false,
    ggpoLive: false,
    marketingAaaProductionAllowed: false,
  }
}

export function evaluateAaaProductionHonesty(
  input: AaaProductionHonestyInput = {},
): AaaProductionHonestyReport {
  const capability = probeAaaProductionCapability(input)
  const halReport = evaluateConsoleHalHonesty({
    dx12VulkanBackendLive: input.dx12VulkanBackendLive,
    consoleHalProven: input.consoleHalProven,
  })

  const gaps: AaaProductionHonestyReport['gaps'] = [
    {
      id: 1,
      name: 'Asset Cooking (.aethelpack)',
      wave: 'M / Law VI',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.cookPackReady ? 'CLOSED' : 'HELD',
      notes: [
        'JS AethelPack writer (Zstd WASM prefer + deflate fallback + SHA-256) + publish cook (bn/bo)',
        'cookPackReady only when non-empty .aethelpack bytes round-trip',
        'BC7/ASTC native encode HELD — no fake GPU formats',
        capability.zstdEncoderReady
          ? 'Zstd WASM encoder CLOSED — @bokuweb/zstd-wasm encode/decode proven'
          : 'Zstd WASM encoder not yet proven — pako deflate fallback (call ensureZstdEncoder)',
        'Virtual texturing cook HELD',
        'Rust cook worker HELD when rustc/cargo absent',
        capability.cookPackReady
          ? 'JS pack round-trip proven'
          : 'Pack bytes not proven',
      ],
    },
    {
      id: 2,
      name: 'Console HAL',
      wave: 'K / G.4',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.consoleHalReady ? 'CLOSED' : 'HELD',
      notes: [
        'Desktop WebGPU/Vulkan/DX12 via wgpu negotiate (bs)',
        'consoleHalReady only for documented desktop backends in code',
        'PS5 GNM commercial HELD — ps5GnmReady always false',
        'Live present/submit soak + certification still HELD',
        capability.consoleHalReady
          ? 'consoleHalReady=true — desktop HAL negotiate proven'
          : 'consoleHalReady HELD — desktop negotiate not proven',
        ...halReport.notes,
      ],
    },
    {
      id: 3,
      name: 'Editor ≠ Runtime',
      wave: 'L',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.editorRuntimeIsolated ? 'CLOSED' : 'HELD',
      notes: [
        'Deny-list + assertRuntimeExportClean on publish/export cook (bq)',
        'Runtime pack must not include Next/IDE entrypoints — fail-closed on leak',
        'Full V8 isolate / winit host HELD',
        capability.editorRuntimeIsolated
          ? 'editorRuntimeIsolated=true — strip gate proven'
          : 'Published bundle still contains editor/Next imports',
        'v8WinitHostReady=false until desktop runtime host ships',
      ],
    },
    {
      id: 4,
      name: 'SAB zero-copy transforms',
      wave: 'M / Law I',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.sabTransformsReady ? 'CLOSED' : 'HELD',
      notes: [
        'SAB ring layout + Atomics protocol + playtest physics bridge (bk)',
        'Physics worker posts step → shared transforms (bm); main-thread Rapier default when not opted-in',
        'COOP/COEP on ide/studio/play/runtime via middleware + next.config',
        'Requires crossOriginIsolated + SharedArrayBuffer; fallback-copy Zero-UI without COI',
        capability.coopCoepHeadersConfigured
          ? 'COOP/COEP headers configured in product'
          : 'COOP/COEP headers missing',
        capability.sabPhysicsBridgeWired
          ? 'SharedTransformPhysicsBridge wired into SimulationTick'
          : 'Physics bridge not wired',
        capability.physicsWorkerReady
          ? 'Physics worker shared-transform step proven'
          : 'Physics worker shared step not proven',
        'No zero-stutter marketing from headers/worker alone',
      ],
    },
    {
      id: 5,
      name: 'GC / Object Pool / Frame Arena',
      wave: 'M',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.objectPoolEnforced ? 'CLOSED' : 'HELD',
      notes: [
        'Pool + FrameArena + GameplayPoolBus wired into SimulationTick (bp)',
        'assertNoHotPathAlloc soak — no factory growth for pooled types',
        'objectPoolEnforced only after soak (Zero-MVP)',
        capability.objectPoolEnforced
          ? 'Soak proven — objectPoolEnforced=true'
          : 'Soak not proven — objectPoolEnforced HELD',
        'zeroStutterMarketingAllowed=false until Founder M.1 soak',
      ],
    },
    {
      id: 6,
      name: 'Fixed-point + GGPO rollback',
      wave: 'Netcode / competitive',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.fixedPointNetcodeReady ? 'CLOSED' : 'HELD',
      notes: [
        'Q16.16 + FixedPointPhysicsAdapter + RollbackFrameBuffer snapshot/restore (bl)',
        'Rapier float remains default; competitive mode flag explicit',
        'letter ce: GameLoop ticks FixedPointRollbackSession + skipRapierPhysics when competitive',
        capability.competitiveRollbackSoakReady
          ? 'competitiveRollbackSoakReady=true — dual-peer soak proven'
          : 'competitiveRollbackSoakReady HELD — soak not proven',
        'GGPO-live / desync-free marketing HELD until Founder unlock',
        capability.ggpoLive ? 'GGPO live' : 'ggpoLive=false fail-closed',
      ],
    },
    {
      id: 7,
      name: 'WASM Plugin ABI + sandbox',
      wave: 'L / M WASM Shield',
      scaffoldStatus: 'CLOSED',
      shipStatus: capability.wasmPluginAbiReady ? 'CLOSED' : 'HELD',
      notes: [
        'ABI negotiate + sandboxed WebAssembly.Module/Instance injector + AgentShell (br)',
        'wasmPluginAbiReady only when negotiate + fixture instantiate proven',
        'AgentShellPolicy #48 — sandbox-only; no host PTY',
        capability.wasmPluginAbiReady
          ? 'wasmPluginAbiReady=true — negotiate + sandbox instantiate proven'
          : 'wasmPluginAbiReady HELD — negotiate/instantiate not proven',
        'Plugin marketplace / store injection UI HELD',
      ],
    },
  ]

  const claim =
    'AAA production cores = interface scaffolds CLOSED; JS AethelPack cook path proven when pack bytes real; Zstd WASM when ensure+round-trip; objectPoolEnforced when soak stable; editorRuntimeIsolated when export strip gate clean; wasmPluginAbiReady when negotiate+sandbox instantiate proven; consoleHalReady when documented desktop WebGPU/Vulkan/DX12 via wgpu negotiate; competitiveRollbackSoakReady when dual-peer fixed-point soak proven (ce); BC7/ASTC/VT/PS5/V8+winit/GGPO-live/zero-stutter/plugin-marketplace marketing fail-closed'

  const productCopy =
    'AethelPack JS cook (Zstd WASM prefer + pako deflate fallback + checksums), SAB transforms (COOP/COEP + playtest bridge + physics-worker shared step), object pools + frame arena (GameplayPoolBus on SimulationTick; soak-gated objectPoolEnforced), fixed-point competitive physics path (Rapier float default; GameLoop authority wire + dual-peer soak ce), WASM plugin ABI + sandboxed instantiate (wasmPluginAbiReady when fixture proven; marketplace HELD), Console HAL desktop WebGPU/Vulkan/DX12 via wgpu (consoleHalReady when negotiate proven; PS5 GNM HELD), and editor≠runtime isolation (deny-list + assertRuntimeExportClean; editorRuntimeIsolated when clean) are probed. Native BC7/ASTC/VT baker, PS5 GNM, live HAL present/submit soak, V8+winit host, GGPO-live / desync-free marketing, plugin marketplace, and zero-stutter marketing remain [HELD].'

  log.info('aaa_production_honesty_evaluated', {
    cookPackReady: capability.cookPackReady,
    zstdEncoderReady: capability.zstdEncoderReady,
    sabTransformsReady: capability.sabTransformsReady,
    coopCoepHeadersConfigured: capability.coopCoepHeadersConfigured,
    sabPhysicsBridgeWired: capability.sabPhysicsBridgeWired,
    physicsWorkerReady: capability.physicsWorkerReady,
    objectPoolEnforced: capability.objectPoolEnforced,
    editorRuntimeIsolated: capability.editorRuntimeIsolated,
    v8WinitHostReady: capability.v8WinitHostReady,
    zeroStutterMarketingAllowed: capability.zeroStutterMarketingAllowed,
    fixedPointNetcodeReady: capability.fixedPointNetcodeReady,
    competitiveRollbackSoakReady: capability.competitiveRollbackSoakReady,
    wasmPluginAbiReady: capability.wasmPluginAbiReady,
    consoleHalReady: capability.consoleHalReady,
  })

  return {
    generatedAt: new Date().toISOString(),
    capability,
    gaps,
    claim,
    productCopy,
    placeboForbidden: true,
  }
}

/** Server probe helper for API routes. */
export function probeAaaProductionHonesty(
  input: AaaProductionHonestyInput = {},
): AaaProductionHonestyReport {
  return evaluateAaaProductionHonesty(input)
}

/**
 * In-process proof: bind bk bridge buffer + step writes shared transforms.
 * Used by honesty aggregate — never claims zero-stutter.
 */
function provePhysicsWorkerSharedStep(): boolean {
  try {
    const bridge = createSharedTransformPhysicsBridge(4)
    const underlying = bridge.sharedBuffer ?? bridge.underlyingArrayBuffer
    if (!underlying) return false
    const state = new PhysicsWorkerSimState()
    const init = handlePhysicsWorkerRequest(state, {
      type: 'init',
      id: 'probe_init',
      protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
    })
    if (!init.success) return false
    const bind = handlePhysicsWorkerRequest(state, {
      type: 'bindSharedTransforms',
      id: 'probe_bind',
      data: {
        sharedBuffer: underlying,
        mode: bridge.mode,
        capacity: bridge.capacity,
      },
    })
    if (!bind.success) return false
    const reg = handlePhysicsWorkerRequest(state, {
      type: 'registerBodies',
      id: 'probe_reg',
      data: {
        bodies: [
          {
            id: 'probe',
            slot: 0,
            px: 0,
            py: 10,
            pz: 0,
            kind: 'dynamic',
          },
        ],
      },
    })
    if (!reg.success) return false
    const stepped = handlePhysicsWorkerRequest(state, {
      type: 'step',
      id: 'probe_step',
      data: { deltaTime: 1 / 60 },
    })
    state.destroy()
    return (
      stepped.success === true &&
      stepped.data?.sharedTransformsWritten === true &&
      (stepped.data.writeEpoch ?? 0) > 0
    )
  } catch {
    return false
  }
}
