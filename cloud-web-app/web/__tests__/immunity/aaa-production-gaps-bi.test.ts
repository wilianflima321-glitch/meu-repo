/**
 * Letter bi — 7 Critical AAA Production Gaps scaffolds (Zero-MVP honesty).
 */

import { describe, expect, it } from 'vitest'
import {
  createEmptyAethelPackManifest,
  validateAethelPackManifest,
} from '@/lib/immunity/aethel-pack-manifest'
import { runAethelPackCookPublishStage } from '@/lib/immunity/cook-publish-stage'
import {
  createPs5GnmHalHeld,
  createWgpuPortableHalScaffold,
  evaluateConsoleHalHonesty,
} from '@/lib/immunity/console-hal'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'
import {
  assertPublishedBundleStripsEditor,
  evaluateEditorRuntimeBoundary,
  isEditorSurface,
} from '@/lib/runtime/editor-runtime-boundary'
import {
  describeSharedTransformLayout,
  probeSabTransformHonesty,
  publishTransformEpoch,
  sharedTransformAtomicsProtocol,
  tryCreateSharedTransformBuffer,
  writeTransformSlot,
  TRANSFORM_HEADER_BYTES,
  TRANSFORM_STRIDE_BYTES,
} from '@/lib/runtime/shared-transform-buffer'
import { ObjectPool } from '@/lib/runtime/object-pool'
import { FrameArena, GAMEPLAY_HOT_PATH_RULES } from '@/lib/runtime/frame-arena'
import {
  fixedAdd,
  fixedDeterminismHash,
  fixedMul,
  evaluateFixedPointNetcodeHonesty,
  toFixed,
} from '@/lib/netcode/fixed-point'
import { RollbackFrameBuffer } from '@/lib/netcode/rollback-frame-buffer'
import {
  AETHEL_WASM_ABI_VERSION,
  createAbiHeader,
  evaluateWasmSandboxLoad,
  negotiateWasmAbi,
} from '@/lib/plugins/aethel-wasm-abi'

describe('Gap1 AethelPack manifest + cook stage', () => {
  it('rejects empty pack — cookPackReady false', () => {
    const empty = createEmptyAethelPackManifest({ buildId: 'b1', projectId: 'p1' })
    const v = validateAethelPackManifest(empty)
    expect(v.ok).toBe(false)
    expect(v.cookPackReady).toBe(false)
    expect(v.errors.some((e) => /zero texture/i.test(e))).toBe(true)
  })

  it('fail-closed cook stage without native baker', () => {
    const result = runAethelPackCookPublishStage({
      projectId: 'p1',
      buildId: 'b1',
      nativeBakerToolchainReady: false,
    })
    expect(result.success).toBe(false)
    expect(result.cookPackReady).toBe(false)
    expect(result.status).toBe('held')
  })

  it('manifest-only without pack bytes stays fail-closed (bn honesty)', () => {
    const result = runAethelPackCookPublishStage({
      projectId: 'p1',
      buildId: 'b1',
      nativeBakerToolchainReady: true,
      manifest: {
        magic: 'AETH',
        version: 1,
        buildId: 'b1',
        projectId: 'p1',
        compression: 'deflate',
        textures: [
          {
            assetId: 'albedo',
            codec: 'rgba8-fallback',
            width: 64,
            height: 64,
            mipCount: 1,
            casHash: 'hash-tex',
            byteOffset: 0,
            byteLength: 128,
          },
        ],
        meshes: [
          {
            assetId: 'hero',
            codec: 'meshopt',
            lodCount: 2,
            casHash: 'hash-mesh',
            byteOffset: 128,
            byteLength: 256,
          },
        ],
        psoVault: [],
        wasmModules: [],
        bakerArtifactsPresent: true,
        virtualTexturingReady: false,
      },
    })
    expect(result.success).toBe(false)
    expect(result.cookPackReady).toBe(false)
    expect(result.packByteLength).toBe(0)
  })

  it('passes with real cook assets → non-empty .aethelpack', () => {
    const result = runAethelPackCookPublishStage({
      projectId: 'p1',
      buildId: 'b1',
      cookAssets: {
        textures: [
          {
            assetId: 'albedo',
            codec: 'rgba8-fallback',
            width: 2,
            height: 2,
            bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
          },
        ],
        meshes: [
          {
            assetId: 'hero',
            codec: 'raw-gltf',
            bytes: new Uint8Array([9, 10, 11, 12]),
          },
        ],
      },
    })
    expect(result.success).toBe(true)
    expect(result.cookPackReady).toBe(true)
    expect(result.packByteLength).toBeGreaterThan(0)
    expect(result.bc7AstcHeld).toBe(true)
  })
})

describe('Gap2 Console HAL', () => {
  it('wgpu scaffold never accepts console submit; PS5 always held', () => {
    const wgpu = createWgpuPortableHalScaffold()
    expect(wgpu.submit({ frameId: 1, commandBufferCasHash: 'x', present: true }).accepted).toBe(
      false,
    )
    const ps5 = createPs5GnmHalHeld()
    expect(ps5.status).toBe('held')
    expect(ps5.probeCaps().proprietarySdkPresent).toBe(false)
    const honesty = evaluateConsoleHalHonesty()
    // Letter bs: desktop negotiate may flip consoleHalReady; PS5 never.
    expect(honesty.ps5GnmReady).toBe(false)
    expect(evaluateConsoleHalHonesty({ preferredBackend: 'ps5-gnm-held' }).consoleHalReady).toBe(
      false,
    )
  })
})

describe('Gap3 Editor ≠ Runtime', () => {
  it('flags editor surface and strips IDE imports from published bundle', () => {
    expect(isEditorSurface('editor')).toBe(true)
    expect(isEditorSurface('published-game')).toBe(false)
    const bad = assertPublishedBundleStripsEditor(`import { Dock } from '@aethel/ide-ui'\n`)
    expect(bad.ok).toBe(false)
    expect(bad.forbiddenPackagesHit.length).toBeGreaterThan(0)
    const good = evaluateEditorRuntimeBoundary({
      surface: 'published-game',
      bundledSourceText: `import { tick } from '@aethel/engine/runtime'\n`,
    })
    expect(good.ok).toBe(true)
    expect(good.v8IsolateHostReady).toBe(false)
    expect(good.v8WinitHostReady).toBe(false)
  })
})

describe('Gap4 SAB shared transform layout', () => {
  it('layout math + atomics protocol; honesty requires COI + headers + allocation', () => {
    const layout = describeSharedTransformLayout(64)
    expect(layout.totalBytes).toBe(TRANSFORM_HEADER_BYTES + 64 * TRANSFORM_STRIDE_BYTES)
    expect(sharedTransformAtomicsProtocol().protocol).toBe('release-write-epoch-acquire-read')

    const held = probeSabTransformHonesty({
      crossOriginIsolated: false,
      forceSabAvailable: true,
      forceAllocationOk: true,
    })
    expect(held.sabTransformsReady).toBe(false)
    expect(held.coopCoepRequired).toBe(true)

    const ready = probeSabTransformHonesty({
      crossOriginIsolated: true,
      forceSabAvailable: true,
      forceAllocationOk: true,
      coopCoepHeadersConfigured: true,
    })
    expect(ready.sabTransformsReady).toBe(true)
    expect(ready.bufferAllocationProven).toBe(true)

    // Node may or may not expose SAB; if present, exercise write path.
    const created = tryCreateSharedTransformBuffer(4)
    if (created) {
      writeTransformSlot(created.f32, 0, {
        px: 1,
        py: 2,
        pz: 3,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        sx: 1,
        sy: 1,
        sz: 1,
      })
      const epoch = publishTransformEpoch(created.i32, 1)
      expect(epoch).toBeGreaterThan(0)
    }
  })
})

describe('Gap5 Object pool + frame arena', () => {
  it('prewarmed pool shows no alloc growth on hot path', () => {
    const pool = new ObjectPool({
      factory: () => ({ x: 0, y: 0 }),
      reset: (o) => {
        o.x = 0
        o.y = 0
      },
      initialSize: 32,
      maxSize: 64,
    })
    const growth = pool.measureAllocGrowth(32)
    expect(growth.grew).toBe(false)
    expect(growth.createdAfter).toBe(growth.createdBefore)
    expect(GAMEPLAY_HOT_PATH_RULES.length).toBeGreaterThan(0)

    const arena = new FrameArena(4096)
    const a = arena.allocFloat32(16)
    expect(a.length).toBe(16)
    arena.reset()
    expect(arena.stats().usedBytes).toBe(0)
  })
})

describe('Gap6 Fixed-point + rollback frame store', () => {
  it('deterministic fixed mul/add hash', () => {
    const a = toFixed(1.5)
    const b = toFixed(2)
    const c = fixedMul(a, b)
    const d = fixedAdd(c, toFixed(0.25))
    const h1 = fixedDeterminismHash([a, b, c, d])
    const h2 = fixedDeterminismHash([
      toFixed(1.5),
      toFixed(2),
      fixedMul(toFixed(1.5), toFixed(2)),
      fixedAdd(fixedMul(toFixed(1.5), toFixed(2)), toFixed(0.25)),
    ])
    expect(h1).toBe(h2)

    // Without wired flag, evaluate stays fail-closed; aggregate probe uses path probe (bl).
    const honesty = evaluateFixedPointNetcodeHonesty()
    expect(honesty.fixedPointNetcodeReady).toBe(false)
    expect(honesty.ggpoLive).toBe(false)
    expect(honesty.rapierFloatDefault).toBe(true)
  })

  it('rollback ring stores and retrieves by tick', () => {
    const buf = new RollbackFrameBuffer({ capacity: 8 })
    buf.push({
      tick: 10,
      inputs: [],
      stateBlob: null,
      checksum: 'a',
    })
    buf.push({
      tick: 11,
      inputs: [],
      stateBlob: new Uint8Array([1]),
      checksum: 'b',
    })
    expect(buf.getByTick(10)?.checksum).toBe('a')
    expect(buf.sliceFrom(10)).toHaveLength(2)
  })
})

describe('Gap7 WASM Plugin ABI', () => {
  it('negotiates compatible ABI and denies incompatible', () => {
    const ok = negotiateWasmAbi({ guestAbiVersion: AETHEL_WASM_ABI_VERSION })
    expect(ok.ok).toBe(true)
    expect(ok.wasmPluginAbiReady).toBe(true)
    const bad = negotiateWasmAbi({ guestAbiVersion: 99, hostAbiVersion: 1 })
    expect(bad.ok).toBe(false)

    const header = createAbiHeader({
      abiVersion: AETHEL_WASM_ABI_VERSION,
      moduleId: 'mod',
      casHash: 'cas',
      fuelLimit: 1_000_000,
      epochDeadlineMs: 100,
      allowedSyscalls: ['log_trace'],
    })
    const load = evaluateWasmSandboxLoad({
      header,
      callerKind: 'agent',
      sandboxAvailable: true,
    })
    expect(load.allowed).toBe(true)
    expect(load.policy.marketplaceDistribution).toBe(false)
    expect(load.policy.allowHostFs).toBe(false)

    const denied = evaluateWasmSandboxLoad({
      header,
      callerKind: 'agent',
      sandboxAvailable: false,
    })
    expect(denied.allowed).toBe(false)
  })
})

describe('AAA production honesty aggregate', () => {
  it('defaults fail-closed marketing; scaffolds report CLOSED vs HELD honestly', () => {
    const report = evaluateAaaProductionHonesty()
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    // Letter bs: desktop HAL negotiate auto-proves consoleHalReady; PS5 always HELD.
    expect(report.capability.consoleHalReady).toBe(true)
    expect(report.capability.ps5GnmReady).toBe(false)
    expect(report.capability.ggpoLive).toBe(false)
    // Letter bn/bo: JS AethelPack round-trip auto-proves cookPackReady; BC7/ASTC still HELD.
    expect(report.capability.cookPackReady).toBe(true)
    expect(report.capability.nativeGpuEncodeReady).toBe(false)
    // Letter bl: fixed-point physics path wired → ready; GGPO marketing still HELD.
    expect(report.capability.fixedPointNetcodeReady).toBe(true)
    // Letter bp: object pool soak auto-proves enforced; zero-stutter marketing still HELD.
    expect(report.capability.objectPoolEnforced).toBe(true)
    expect(report.capability.zeroStutterMarketingAllowed).toBe(false)
    expect(report.gaps).toHaveLength(7)
    expect(report.gaps.every((g) => g.scaffoldStatus === 'CLOSED')).toBe(true)
    const gap1 = report.gaps.find((g) => g.id === 1)!
    expect(gap1.shipStatus).toBe('CLOSED')
    expect(gap1.notes.some((n) => /BC7\/ASTC/i.test(n))).toBe(true)
    const gap2 = report.gaps.find((g) => g.id === 2)!
    expect(gap2.shipStatus).toBe('CLOSED')
    const gap5 = report.gaps.find((g) => g.id === 5)!
    expect(gap5.shipStatus).toBe('CLOSED')
    const gap6 = report.gaps.find((g) => g.id === 6)!
    expect(gap6.shipStatus).toBe('CLOSED')

    const cap = probeAaaProductionCapability({
      crossOriginIsolated: true,
      sharedArrayBufferAvailable: true,
      objectPoolSoakPassed: true,
      wasmAbiNegotiateOk: true,
      publishedBundleStripped: true,
    })
    expect(cap.sabTransformsReady).toBe(true)
    expect(cap.objectPoolEnforced).toBe(true)
    expect(cap.zeroStutterMarketingAllowed).toBe(false)
    expect(cap.wasmPluginAbiReady).toBe(true)
    expect(cap.consoleHalReady).toBe(true)
    expect(cap.ps5GnmReady).toBe(false)
    expect(cap.fixedPointNetcodeReady).toBe(true)
    expect(cap.ggpoLive).toBe(false)
  })
})
