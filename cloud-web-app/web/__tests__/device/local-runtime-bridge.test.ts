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
