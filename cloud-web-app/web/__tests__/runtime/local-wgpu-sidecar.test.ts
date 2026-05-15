import { describe, expect, it } from 'vitest'

import {
  buildLocalWgpuSidecarProbeRequest,
  buildLocalWgpuSidecarRenderRequest,
  coerceLocalWgpuSidecarCapabilityReport,
} from '@/lib/runtime/local-wgpu-sidecar'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
} from '@/lib/viewport/viewport-render-queue'

function renderPayload() {
  const contract = buildViewportRenderJobContract({
    id: 'local-wgpu-sidecar-render',
    projectId: 'project-local-wgpu',
    mode: 'game',
    renderMode: 'cinematic',
    quality: 'final',
    requestedAt: '2026-05-14T13:00:00.000Z',
    timeline: { currentTime: 0, duration: 24, isPlaying: false },
    scene: {
      objectCount: 48,
      assetCount: 18,
      selectedObjectId: 'camera-a',
      selectedObjectName: 'Camera A',
      assetFormats: ['glb', 'ktx2'],
      visualScriptNodes: 10,
      visualScriptEdges: 9,
      vfxNodes: 8,
      vfxConnections: 6,
    },
  })

  return buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-local-wgpu',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-local-wgpu',
    requestedAt: '2026-05-14T13:01:00.000Z',
  })
}

describe('local wgpu sidecar contract', () => {
  it('builds a bounded no-download probe request', () => {
    const request = buildLocalWgpuSidecarProbeRequest('2026-05-14T13:00:00.000Z')

    expect(request).toMatchObject({
      schemaVersion: 1,
      kind: 'aethel.wgpu.probe',
      timeoutMs: 5_000,
      benchmark: {
        enabled: true,
        maxDurationMs: 750,
        maxFrames: 30,
      },
      policy: {
        noDownloads: true,
        noMainThread: true,
        manualConsentOnly: true,
      },
    })
  })

  it('coerces a healthy wgpu probe into a local native capability report', () => {
    const report = coerceLocalWgpuSidecarCapabilityReport({
      schemaVersion: 1,
      sidecarVersion: '0.1.0',
      os: 'windows',
      cpuCores: 16,
      memoryGb: 32,
      freeStorageGb: 512,
      nativeGraphicsBackends: ['vulkan', 'directx12'],
      rendererBackends: ['wgpu-native'],
      assetTools: ['gltf-transform', 'meshoptimizer', 'ktx-software', 'openusd', 'recast-detour', 'ozz-animation', 'godot-export-bridge'],
      mediaTools: ['ffmpeg', 'ffprobe'],
      shaderTools: ['naga', 'dxc'],
      localToolchain: ['ffmpeg', 'ffprobe', 'meshoptimizer', 'ktx-software', 'openusd', 'wgpu-native', 'recast-detour', 'ozz-animation', 'godot-export-bridge'],
      toolVersions: { ffmpeg: '6.1', 'gltf-transform': '4.0.0' },
      toolDigests: { ffmpeg: 'sha256-ffmpeg' },
      maxVramMb: 8192,
      maxTextureSize: 16384,
      supportsOffscreenRender: true,
      thermalState: 'nominal',
    }, '2026-05-14T13:02:00.000Z')

    expect(report).toMatchObject({
      hostKind: 'native-daemon',
      transport: 'api-sync',
      preferredExecutor: 'local-native',
      gpuComputeAvailable: true,
      rendererBackends: ['wgpu-native'],
      assetTools: ['gltf-transform', 'meshoptimizer', 'ktx-software', 'openusd', 'recast-detour', 'ozz-animation', 'godot-export-bridge'],
      supportsOffscreenRender: true,
      maxVramMb: 8192,
    })
  })

  it('holds native execution when offscreen render is unavailable', () => {
    const report = coerceLocalWgpuSidecarCapabilityReport({
      schemaVersion: 1,
      sidecarVersion: '0.1.0',
      os: 'linux',
      rendererBackends: ['wgpu-native'],
      supportsOffscreenRender: false,
      thermalState: 'nominal',
    })

    expect(report?.preferredExecutor).toBe('held')
    expect(report?.gpuComputeAvailable).toBe(false)
  })

  it('builds render requests with runtime renderer evidence policy embedded', () => {
    const request = buildLocalWgpuSidecarRenderRequest(renderPayload())

    expect(request).toMatchObject({
      schemaVersion: 1,
      kind: 'aethel.wgpu.render',
      policy: {
        noDownloads: true,
        noMainThread: true,
        requireOffscreenRender: true,
        requirePerformanceReport: true,
        requireValidationReport: true,
      },
      rendererRequest: {
        runtimeEngine: {
          contract: 'hybrid-wgpu-v1',
          browserRole: 'preview-only',
          neverMainThread: true,
        },
      },
    })
    expect(request.policy.maxRenderTimeMs).toBeGreaterThanOrEqual(30_000)
  })
})
