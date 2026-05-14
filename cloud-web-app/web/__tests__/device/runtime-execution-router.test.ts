import { describe, expect, it } from 'vitest'

import { buildDeviceCapabilityProfile } from '@/lib/device/device-capability-profile'
import { buildLocalRuntimeBridgeState, sanitizeLocalRuntimeCapabilityReport } from '@/lib/device/local-runtime-bridge'
import { resolveRuntimeExecutionRoute } from '@/lib/device/runtime-execution-router'
import type { RuntimeLaneDecision } from '@/lib/device/runtime-lane-scheduler'

const strongProfile = buildDeviceCapabilityProfile({
  hardwareConcurrency: 12,
  deviceMemoryGb: 16,
  storageQuotaGb: 20,
  storageUsageGb: 4,
  webgpuAvailable: true,
  webnnAvailable: true,
  saveData: false,
  prefersReducedMotion: false,
})

function decision(overrides: Partial<RuntimeLaneDecision> = {}): RuntimeLaneDecision {
  return {
    lane: 'ai-agents',
    canStart: true,
    placement: 'local-native',
    reason: 'AI agents can start in local native.',
    requiresConfirmation: false,
    ...overrides,
  }
}

describe('runtime execution router', () => {
  it('routes healthy native work to Studio Local', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'custom-event',
      os: 'windows',
      preferredExecutor: 'local-native',
      npuAvailable: true,
    })

    const route = resolveRuntimeExecutionRoute({
      profile: strongProfile,
      decision: decision(),
      localBridge: buildLocalRuntimeBridgeState(report, Date.parse('2026-05-02T16:01:00.000Z')),
    })

    expect(route.canStart).toBe(true)
    expect(route.target).toBe('local-native')
    expect(route.safety).toBe('ready')
  })

  it('falls back to cloud when native placement is preferred but the probe is stale', () => {
    const report = sanitizeLocalRuntimeCapabilityReport({
      receivedAt: '2026-05-02T16:00:00.000Z',
      hostKind: 'desktop-app',
      transport: 'storage-sync',
      os: 'windows',
      preferredExecutor: 'local-native',
      npuAvailable: true,
    })

    const route = resolveRuntimeExecutionRoute({
      profile: strongProfile,
      decision: decision(),
      localBridge: buildLocalRuntimeBridgeState(report, Date.parse('2026-05-02T16:08:00.000Z')),
    })

    expect(route.canStart).toBe(true)
    expect(route.target).toBe('cloud-sandbox')
    expect(route.safety).toBe('fallback')
    expect(route.reason).toContain('stale')
  })

  it('returns a held route when the lane cannot start', () => {
    const route = resolveRuntimeExecutionRoute({
      profile: strongProfile,
      decision: decision({
        canStart: false,
        placement: 'cloud-sandbox',
        reason: 'AI agents is at its concurrency limit.',
      }),
    })

    expect(route.canStart).toBe(false)
    expect(route.target).toBe('held')
    expect(route.safety).toBe('held')
  })

  it('reroutes heavy lanes away from local-main-safe placement', () => {
    const route = resolveRuntimeExecutionRoute({
      profile: strongProfile,
      decision: decision({
        lane: 'viewport-render',
        placement: 'local-main-safe',
        reason: 'Legacy route attempted to run viewport render on the main thread.',
      }),
    })

    expect(route.canStart).toBe(true)
    expect(route.target).toBe('cloud-sandbox')
    expect(route.safety).toBe('fallback')
    expect(route.reason).toContain('cannot run on the browser main thread')
  })
})
