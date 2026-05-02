import { describe, expect, it } from 'vitest'

import { buildDeviceRuntimePolicy } from '@/lib/device/device-capability-profile'

describe('device capability profile', () => {
  it('allows local acceleration only when WebNN, WebGPU, CPU, RAM and storage are strong enough', () => {
    const policy = buildDeviceRuntimePolicy({
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
      storageQuotaGb: 12,
      storageUsageGb: 2,
      webgpuAvailable: true,
      webnnAvailable: true,
      saveData: false,
      prefersReducedMotion: false,
    })

    expect(policy.mode).toBe('local-accelerated')
    expect(policy.maxParallelAgents).toBe(4)
    expect(policy.localModelPolicy).toBe('allow-small-models')
    expect(policy.memoryPolicy).toBe('persistent-index-ok')
  })

  it('falls back to safe mode when memory or network pressure could freeze the device', () => {
    const policy = buildDeviceRuntimePolicy({
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
      webgpuAvailable: true,
      webnnAvailable: false,
      saveData: true,
      prefersReducedMotion: false,
    })

    expect(policy.mode).toBe('safe-mode')
    expect(policy.maxParallelAgents).toBe(1)
    expect(policy.localModelPolicy).toBe('cloud-only')
    expect(policy.browserOperatorPolicy).toBe('manual-confirmation')
  })

  it('uses a hybrid policy when GPU compute is available but NPU access is not browser-visible', () => {
    const policy = buildDeviceRuntimePolicy({
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
      storageQuotaGb: 8,
      storageUsageGb: 1,
      webgpuAvailable: true,
      webnnAvailable: false,
      saveData: false,
      prefersReducedMotion: false,
    })

    expect(policy.mode).toBe('hybrid-balanced')
    expect(policy.npuSignal).toBe('native-required')
    expect(policy.localModelPolicy).toBe('prefer-cloud-heavy-models')
  })
})
