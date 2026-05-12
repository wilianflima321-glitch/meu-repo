import { describe, expect, it } from 'vitest'

import { buildDeviceCapabilityProfile } from '@/lib/device/device-capability-profile'
import {
  buildLocalRuntimeBridgeState,
  mergeDeviceCapabilityProfileWithLocalRuntime,
  pickPreferredLocalRuntimeReport,
  sanitizeLocalRuntimeCapabilityReport,
} from '@/lib/device/local-runtime-bridge'

describe('local runtime bridge', () => {
  const browserOnlyProfile = buildDeviceCapabilityProfile({
    hardwareConcurrency: 4,
    deviceMemoryGb: 4,
    webgpuAvailable: false,
    webnnAvailable: false,
    saveData: false,
    prefersReducedMotion: false,
  })

  it('sanitizes a native runtime capability report', () => {
    expect(
      sanitizeLocalRuntimeCapabilityReport({
        receivedAt: '2026-05-02T16:00:00.000Z',
        hostKind: 'desktop-app',
        transport: 'custom-event',
        os: 'windows',
        npuAvailable: true,
        preferredExecutor: 'local-native',
      })
    ).toMatchObject({
      hostKind: 'desktop-app',
      transport: 'custom-event',
      os: 'windows',
      npuAvailable: true,
      preferredExecutor: 'local-native',
    })
  })

  it('normalizes Studio Local Runtime Kernel probe contracts', () => {
    expect(
      sanitizeLocalRuntimeCapabilityReport({
        version: 1,
        generatedAt: '2026-05-05T14:00:00.000Z',
        deviceId: 'studio-local-device',
        os: 'Windows_NT',
        arch: 'x64',
        cpuLogicalCores: 12,
        totalMemoryMb: 32768,
        availableMemoryMb: 24576,
        storageFreeMb: 262144,
        gpuAvailable: true,
        gpuName: 'RTX Studio GPU',
        webGpuAvailable: true,
        webNnAvailable: false,
        npuAvailable: true,
        windowsMlAvailable: true,
        directMlAvailable: true,
        onnxRuntimeAvailable: true,
        ffmpegAvailable: true,
        rapierAvailable: true,
        browserAutomationAvailable: true,
        nativeGraphicsBackends: ['directx12', 'vulkan'],
        aiExecutionProviders: ['directml', 'cpu'],
        localToolchain: ['ffmpeg', 'ffprobe', 'rapier', 'browser-automation'],
        thermalState: 'nominal',
        storagePressure: 'ok',
        preferredExecutor: 'local-native',
        signature: 'probe-signature',
      })
    ).toMatchObject({
      hostKind: 'native-daemon',
      transport: 'api-sync',
      os: 'windows',
      receivedAt: '2026-05-05T14:00:00.000Z',
      cpuCores: 12,
      memoryGb: 32,
      freeStorageGb: 256,
      gpuComputeAvailable: true,
      npuAvailable: true,
      preferredExecutor: 'local-native',
      maxLocalAgents: 4,
      recommendedViewportQuality: 'ultra',
      localModelPolicy: 'allow-small-models',
      supportsPersistentMemory: true,
      nativeGraphicsBackends: ['directx12', 'vulkan'],
      aiExecutionProviders: ['directml', 'cpu'],
      localToolchain: ['ffmpeg', 'ffprobe', 'rapier', 'browser-automation'],
    })
  })

  it('holds Studio Local probes when thermal or storage safety is degraded', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      version: 1,
      generatedAt: '2026-05-05T14:00:00.000Z',
      os: 'linux',
      arch: 'x64',
      cpuLogicalCores: 8,
      totalMemoryMb: 16384,
      availableMemoryMb: 8192,
      storageFreeMb: 512,
      gpuAvailable: true,
      webGpuAvailable: true,
      webNnAvailable: false,
      npuAvailable: false,
      windowsMlAvailable: false,
      directMlAvailable: false,
      onnxRuntimeAvailable: false,
      ffmpegAvailable: true,
      rapierAvailable: true,
      browserAutomationAvailable: false,
      thermalState: 'critical',
      storagePressure: 'critical',
      preferredExecutor: 'local-native',
      signature: 'probe-signature',
    })

    const bridge = buildLocalRuntimeBridgeState(report, Date.parse('2026-05-05T14:01:00.000Z'))
    const merged = mergeDeviceCapabilityProfileWithLocalRuntime(browserOnlyProfile, report, Date.parse('2026-05-05T14:01:00.000Z'))

    expect(report).toMatchObject({
      preferredExecutor: 'held',
      thermalState: 'critical',
      maxLocalAgents: 0,
      recommendedViewportQuality: 'low',
    })
    expect(bridge.canUseNativeAcceleration).toBe(false)
    expect(merged.policy.mode).toBe('cloud-isolated')
  })

  it('elevates the runtime policy when the native bridge is healthy', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'custom-event',
      os: 'windows',
      npuAvailable: true,
      npuName: 'Intel AI Boost',
      gpuComputeAvailable: true,
      maxLocalAgents: 4,
      preferredExecutor: 'local-native',
      supportsPersistentMemory: true,
      recommendedViewportQuality: 'high',
    })

    const merged = mergeDeviceCapabilityProfileWithLocalRuntime(
      browserOnlyProfile,
      report,
      Date.parse('2026-05-02T16:03:00.000Z')
    )

    expect(merged.policy.mode).toBe('local-accelerated')
    expect(merged.policy.npuSignal).toBe('native-runtime-available')
    expect(merged.policy.maxParallelAgents).toBe(4)
    expect(merged.policy.memoryPolicy).toBe('persistent-index-ok')
  })

  it('marks old probes as stale and ignores them for scheduling', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'storage-sync',
      os: 'windows',
      gpuComputeAvailable: true,
      preferredExecutor: 'local-worker',
    })

    const bridge = buildLocalRuntimeBridgeState(
      report,
      Date.parse('2026-05-02T16:07:00.000Z')
    )
    const merged = mergeDeviceCapabilityProfileWithLocalRuntime(
      browserOnlyProfile,
      report,
      Date.parse('2026-05-02T16:07:00.000Z')
    )

    expect(bridge.connection).toBe('stale')
    expect(merged.policy.mode).toBe(browserOnlyProfile.policy.mode)
  })

  it('falls back toward cloud safety when the native runtime is thermally critical', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'custom-event',
      os: 'windows',
      npuAvailable: true,
      preferredExecutor: 'local-native',
      thermalState: 'critical',
    })

    const merged = mergeDeviceCapabilityProfileWithLocalRuntime(
      buildDeviceCapabilityProfile({
        hardwareConcurrency: 12,
        deviceMemoryGb: 16,
        storageQuotaGb: 12,
        storageUsageGb: 2,
        webgpuAvailable: true,
        webnnAvailable: true,
        saveData: false,
        prefersReducedMotion: false,
      }),
      report,
      Date.parse('2026-05-02T16:01:00.000Z')
    )

    expect(merged.policy.mode).toBe('cloud-isolated')
    expect(merged.policy.localModelPolicy).toBe('cloud-only')
  })

  it('prefers the fresher report when reconciling browser cache and cloud snapshots', () => {
    const cached = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'storage-sync',
      os: 'windows',
      preferredExecutor: 'local-worker',
    })
    const cloud = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:05:00.000Z',
      hostKind: 'desktop-app',
      transport: 'custom-event',
      os: 'windows',
      preferredExecutor: 'local-native',
      gpuComputeAvailable: true,
    })

    expect(pickPreferredLocalRuntimeReport(cached, cloud)).toBe(cloud)
  })
})
