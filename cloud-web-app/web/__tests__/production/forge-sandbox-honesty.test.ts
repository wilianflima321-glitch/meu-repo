/**
 * L.1 — Forge sandbox + Firecracker microVM honesty probe tests.
 */

import { describe, expect, it } from 'vitest'
import {
  FIRECRACKER_MICROVM_READY,
  RUNTIME_PROVISION_FIRECRACKER_SUPPORTED,
  describeForgeSandboxHonestySync,
  probeForgeSandboxHonesty,
} from '@/lib/production/forge-sandbox-honesty'
import { resolveForgeSandboxAvailability } from '@/lib/production/forge-sandbox-executor'

describe('forge sandbox honesty probe', () => {
  it('never claims Firecracker microVM ready without host binary', async () => {
    expect(FIRECRACKER_MICROVM_READY).toBe(false)
    expect(RUNTIME_PROVISION_FIRECRACKER_SUPPORTED).toBe(false)

    const sync = describeForgeSandboxHonestySync()
    expect(sync.firecrackerMicroVmReady).toBe(false)
    expect(sync.marketingAllowed).toBe(false)
    expect(sync.localIsolatedReady).toBe(true)

    const report = await probeForgeSandboxHonesty()
    expect(report.firecrackerMicroVmReady).toBe(false)
    expect(report.runtimeProvisionFirecrackerSupported).toBe(false)
    expect(report.marketingAllowed).toBe(false)
    expect(report.providers.find((p) => p.provider === 'firecracker')?.available).toBe(false)
    expect(report.providers.find((p) => p.provider === 'firecracker')?.reason).toBe(
      'firecracker_not_implemented',
    )
  })

  it('matches resolveForgeSandboxAvailability for firecracker', async () => {
    const availability = await resolveForgeSandboxAvailability('firecracker')
    const report = await probeForgeSandboxHonesty()
    const fc = report.providers.find((p) => p.provider === 'firecracker')!

    expect(fc.available).toBe(availability.available)
    expect(fc.reason).toBe(availability.reason)
    expect(fc.kernelLevelIsolation).toBe(true)
  })

  it('reports local-isolated as real and auto-selected without E2B key', async () => {
    const report = await probeForgeSandboxHonesty()
    expect(report.localIsolatedReady).toBe(true)
    expect(report.providers.find((p) => p.provider === 'local-isolated')?.available).toBe(true)

    if (!process.env.E2B_API_KEY) {
      expect(report.autoSelectedProvider).toBe('local-isolated')
    }
  })
})
