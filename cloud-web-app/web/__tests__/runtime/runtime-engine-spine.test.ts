import { describe, expect, it } from 'vitest'

import {
  RUNTIME_ENGINE_TOOLCHAIN_REGISTRY,
  buildAssetPipelineContract,
  buildGameRuntimeToolchainPlan,
  buildRenderBackendContract,
  evaluateRuntimeBudgetGate,
  validateRuntimeEngineToolchainRegistry,
} from '@/lib/runtime/runtime-engine-spine'
import type { LocalRuntimeCapabilityReport } from '@/lib/device/local-runtime-bridge'
import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

const baseContract: ViewportRenderJobContract = {
  id: 'render-runtime-spine-1',
  projectId: 'project-runtime-spine',
  mode: 'film',
  renderMode: 'cinematic',
  quality: 'final',
  requestedAt: '2026-05-14T03:00:00.000Z',
  selectedObjectId: null,
  selectedObjectName: null,
  scene: {
    objectCount: 60,
    assetCount: 18,
    selectedObjectId: null,
    selectedObjectName: null,
    visualScriptNodes: 12,
    visualScriptEdges: 8,
    vfxNodes: 8,
    vfxConnections: 5,
    assetFormats: ['glb', 'usd'],
  },
  timeline: { currentTime: 0, duration: 12, isPlaying: false },
  profile: {
    quality: 'final',
    target: 'local-native',
    label: 'Native final render',
    resolution: '1920x1080',
    fps: 24,
    requiresProxy: false,
    expectedOutputs: ['mp4', 'validation-report'],
    requiresHumanApproval: true,
    maxDurationSeconds: 600,
  },
  evidenceRefs: ['viewport-render:runtime-spine'],
  estimatedCostUsd: 1.5,
  acceptance: ['playback evidence', 'performance report', 'license check', 'human approval'],
}

const nativeRuntime: LocalRuntimeCapabilityReport = {
  version: 1,
  hostKind: 'native-daemon',
  transport: 'api-sync',
  os: 'windows',
  receivedAt: '2026-05-14T03:00:00.000Z',
  cpuCores: 12,
  memoryGb: 32,
  freeStorageGb: 100,
  gpuComputeAvailable: true,
  nativeGraphicsBackends: ['vulkan', 'directx12'],
  rendererBackends: ['wgpu-native'],
  assetTools: ['gltf-transform', 'meshoptimizer', 'ktx-software', 'openusd'],
  mediaTools: ['ffmpeg', 'ffprobe'],
  shaderTools: ['naga', 'shaderc'],
  toolVersions: { 'gltf-transform': '4.0.0', ffmpeg: '6.1' },
  toolDigests: { 'gltf-transform': 'sha256:abc', ffmpeg: 'sha256:def' },
  maxVramMb: 12288,
  maxTextureSize: 16384,
  supportsOffscreenRender: true,
  preferredExecutor: 'local-native',
  recommendedViewportQuality: 'ultra',
  thermalState: 'nominal',
}

describe('runtime engine spine', () => {
  it('holds final renders when no native or cloud renderer can produce real playback evidence', () => {
    const contract = buildRenderBackendContract({ contract: baseContract })

    expect(contract.status).toBe('held')
    expect(contract.target).toBe('held')
    expect(contract.backendKind).toBe('none')
    expect(contract.neverMainThread).toBe(true)
    expect(contract.blockers.join(' ')).toContain('real renderer backend')
  })

  it('routes final renders to native wgpu only when the sidecar is healthy and offscreen capable', () => {
    const contract = buildRenderBackendContract({ contract: baseContract, localRuntime: nativeRuntime })

    expect(contract.target).toBe('local-native')
    expect(contract.backendKind).toBe('wgpu-native')
    expect(contract.requiredEvidence).toEqual(expect.arrayContaining(['runtime budget', 'performance report', 'validation report']))
  })

  it('keeps weak devices away from browser preview for heavy work', () => {
    const decision = evaluateRuntimeBudgetGate({
      lane: 'viewport-render',
      requestedTarget: 'browser-preview',
      estimatedMemoryMb: 5120,
      estimatedVramMb: 4096,
      localRuntime: { ...nativeRuntime, memoryGb: 4, maxVramMb: 1024, thermalState: 'critical', preferredExecutor: 'held' },
    })

    expect(decision.canStart).toBe(false)
    expect(decision.target).toBe('held')
    expect(decision.blockers.join(' ')).toContain('browser main thread')
    expect(decision.blockers.join(' ')).toContain('Weak-device')
  })

  it('requires metadata-first asset preflight for large DCC files before originals are downloaded', () => {
    const contract = buildAssetPipelineContract({
      assetId: 'asset-arena-usd',
      fileName: 'Arena.usd',
      sizeBytes: 180 * 1024 * 1024,
      hasUserConsentForOriginalDownload: false,
    })

    expect(contract.status).toBe('held')
    expect(contract.mayDownloadOriginal).toBe(false)
    expect(contract.requiredStages).toEqual(expect.arrayContaining(['metadata', 'license', 'thumbnail', 'proxy', 'lod', 'compression', 'budget', 'read-receipt']))
    expect(contract.requiredTools).toEqual(expect.arrayContaining(['openusd-tools', 'meshoptimizer', 'ktx-software-basisu']))
  })

  it('keeps curated optional tools license, probe, checksum, and consent governed', () => {
    expect(validateRuntimeEngineToolchainRegistry()).toEqual([])
    expect(RUNTIME_ENGINE_TOOLCHAIN_REGISTRY.map((tool) => tool.id)).toEqual(
      expect.arrayContaining([
        'gltf-transform',
        'meshoptimizer',
        'ktx-software-basisu',
        'ffmpeg',
        'openusd-tools',
        'blender-headless',
        'recast-detour',
        'rapier-physics',
        'zig-toolchain',
        'zig-c-compiler',
        'ozz-animation',
        'unreal-export-bridge',
        'unity-export-bridge',
        'godot-export-bridge',
      ])
    )
    for (const tool of RUNTIME_ENGINE_TOOLCHAIN_REGISTRY) {
      expect(tool.downloadPolicy).toBe('manual-consent-only')
      expect(tool.checksumPolicy).toBe('sha256-required-before-execution')
      expect(tool.licenseUrl).toMatch(/^https:\/\//)
      expect(tool.probe.command.length).toBeGreaterThan(0)
    }
  })

  it('plans optional game runtime toolchains for navmesh, physics, animation, and engine export bridges', () => {
    const held = buildGameRuntimeToolchainPlan({
      requiresNavmesh: true,
      requiresPhysics: true,
      requiresAnimationRuntime: true,
      exportTargets: ['unreal', 'unity', 'godot'],
      hasUserConsentForExternalEngineBridge: false,
    })

    expect(held.requiredTools).toEqual(
      expect.arrayContaining([
        'recast-detour',
        'rapier-physics',
        'ozz-animation',
        'zig-toolchain',
        'zig-c-compiler',
        'unreal-export-bridge',
        'unity-export-bridge',
        'godot-export-bridge',
      ])
    )
    expect(held.requiredEvidence).toEqual(
      expect.arrayContaining(['manual consent receipt', 'navmesh bake report', 'physics replay', 'skeleton retarget report'])
    )
    expect(held.blockers.join(' ')).toContain('External engine export bridges require explicit user consent')

    const approved = buildGameRuntimeToolchainPlan({
      requiresNavmesh: true,
      exportTargets: ['godot'],
      hasUserConsentForExternalEngineBridge: true,
    })
    expect(approved.blockers).toEqual([])
  })
})
