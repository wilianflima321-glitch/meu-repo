import { describe, expect, it } from 'vitest'

import {
  buildLumaPhotogrammetryProviderCapability,
  buildMediaPipeBridgeCapability,
  buildPhysicsAiOnDevicePhotogrammetryMatrix,
  buildRapierPhysicsDriverCapability,
} from '@/lib/ai-ondevice'

const completeReceipts = [
  'manual consent receipt',
  'navmesh bake report',
  'physics replay',
  'performance trace',
  'human gameplay review',
  'user consent receipt',
  'device capability probe',
  'privacy retention policy receipt',
  'model/version receipt',
  'capture replay receipt',
  'human review receipt',
  'source capture consent receipt',
  'license/provenance receipt',
  'provider job receipt',
  'cost cap receipt',
  'artifact teardown receipt',
  'retopology or curated mesh receipt',
]

describe('physics, on-device AI, and photogrammetry spine', () => {
  it('keeps Rapier provider_unavailable until runtime capability exists', () => {
    const capability = buildRapierPhysicsDriverCapability({
      rapierAvailable: false,
      runtimeTarget: 'studio-local',
      evidenceRefs: completeReceipts,
      humanApproved: true,
    })

    expect(capability.state).toBe('provider_unavailable')
    expect(capability.canSimulate).toBe(false)
    expect(capability.prohibitedClaims).toContain('production ready')
  })

  it('blocks capture when data is not local-only', () => {
    const capability = buildMediaPipeBridgeCapability({
      task: 'face-mesh',
      enabled: true,
      runsOnDevice: false,
      evidenceRefs: completeReceipts,
      humanApproved: true,
    })

    expect(capability.state).toBe('blocked')
    expect(capability.blockers).toContain('Capture data must stay local-only until explicit privacy approval exists.')
  })

  it('blocks photogrammetry when provider cost exceeds cap or teardown is missing', () => {
    const provider = buildLumaPhotogrammetryProviderCapability({
      apiConfigured: true,
      outputKind: 'retopo-source',
      evidenceRefs: completeReceipts,
      estimatedCostUsd: 45,
      costCapUsd: 10,
      teardownConfigured: false,
      humanApproved: true,
    })

    expect(provider.state).toBe('blocked')
    expect(provider.canCreateJob).toBe(false)
    expect(provider.blockers).toContain('Estimated photogrammetry cost exceeds cost cap.')
    expect(provider.blockers).toContain('Photogrammetry artifacts need teardown/retention policy before job creation.')
  })

  it('keeps advanced lanes in human review even when receipts are complete', () => {
    const matrix = buildPhysicsAiOnDevicePhotogrammetryMatrix({
      rapierAvailable: true,
      mediaPipeEnabled: true,
      mediaPipeRunsOnDevice: true,
      lumaConfigured: true,
      teardownConfigured: true,
      evidenceRefs: completeReceipts,
      estimatedPhotogrammetryCostUsd: 8,
      costCapUsd: 12,
      humanApproved: true,
    })

    expect(matrix.state).toBe('needs-review')
    expect(matrix.missingReceipts).toEqual([])
    expect(matrix.prohibitedClaims).toContain('Unreal-grade')
    expect(matrix.prohibitedClaims).toContain('final asset')
  })
})
