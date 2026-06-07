import { describe, expect, it } from 'vitest'

import {
  V29_REQUIRED_SIDECARS,
  buildV29SidecarLifecycleEntry,
  buildV29SidecarLifecycleReport,
  validateV29SidecarLifecycleReport,
} from '@/lib/runtime/v29-sidecar-lifecycle'

function completeSidecar(id: (typeof V29_REQUIRED_SIDECARS)[number]) {
  return buildV29SidecarLifecycleEntry({
    id,
    state: 'available',
    requiredFor: ['studio-local', 'heavy-runtime-lane'],
    stages: [
      'discovered',
      'acquired',
      'checksum-verified',
      'installed',
      'health-checked',
      'crash-recoverable',
      'update-channel-bound',
      'human-reviewed',
    ],
    version: '1.0.0',
    checksum: `sha256:${id}`,
    signatureRef: `signature:${id}`,
    lastProbeRef: `probe:${id}`,
    crashStateRef: `crash:${id}:none`,
    updateRef: `update:${id}:beta`,
    evidenceRefs: [`sidecar:${id}`, `sidecar-checksum:${id}`, `sidecar-health:${id}`],
  })
}

describe('v29 sidecar lifecycle', () => {
  it('accepts a complete sidecar lifecycle manifest while keeping release held', () => {
    const report = buildV29SidecarLifecycleReport({
      generatedAt: '2026-06-07T00:00:00.000Z',
      sidecars: V29_REQUIRED_SIDECARS.map(completeSidecar),
    })

    expect(validateV29SidecarLifecycleReport(report)).toEqual([])
    expect(report.summary.total).toBe(V29_REQUIRED_SIDECARS.length)
    expect(report.summary.checksumVerified).toBe(V29_REQUIRED_SIDECARS.length)
    expect(report.summary.healthChecked).toBe(V29_REQUIRED_SIDECARS.length)
    expect(report.summary.releaseReady).toBe(false)
    expect(report.claimPolicy.prohibitedClaims).toContain('native renderer ready')
    expect(report.claimPolicy.prohibitedClaims).toContain('signed installer')
  })

  it('turns missing receipts into blockers instead of fake desktop readiness', () => {
    const report = buildV29SidecarLifecycleReport({
      sidecars: [
        ...V29_REQUIRED_SIDECARS.slice(0, -1).map(completeSidecar),
        buildV29SidecarLifecycleEntry({
          id: 'rapier-physics',
          state: 'held',
          requiredFor: ['playtest', 'viewport-render'],
          stages: ['discovered'],
          evidenceRefs: ['sidecar:rapier-physics'],
        }),
      ],
    })

    expect(validateV29SidecarLifecycleReport(report)).toEqual([])
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'rapier-physics: sidecar is held for human review',
        'rapier-physics: artifact checksum is missing',
        'rapier-physics: health probe receipt is missing',
        'rapier-physics: crash state receipt is missing',
        'rapier-physics: update channel receipt is missing',
        'rapier-physics: human review stage is missing',
      ]),
    )
    expect(report.summary.releaseReady).toBe(false)
  })

  it('rejects manifests missing required sidecars', () => {
    const report = buildV29SidecarLifecycleReport({
      sidecars: [completeSidecar('ffmpeg')],
    })

    expect(validateV29SidecarLifecycleReport(report)).toContain(
      'missing required sidecar lifecycle entry: wgpu-renderer',
    )
  })
})
