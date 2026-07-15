import { describe, expect, it } from 'vitest'

import {
  buildStudioLocalCookDispatchDecision,
  createStudioLocalCookDispatchSignature,
  type StudioLocalDispatchApproval,
} from '@/lib/production/studio-local-cook-dispatch'
import type { StudioLocalCookJobRequest } from '@/lib/production/studio-local-cook-queue'

const SECRET = 'test-dispatch-secret-123'
const NOW = '2026-05-25T16:00:00.000Z'
const PROJECT_ID = 'project-1'
const USER_ID = 'user-1'

const ALL_TOOLS = [
  'gltf-transform',
  'blender-headless',
  'meshoptimizer',
  'ktx-software-basisu',
  'recast-detour',
  'rapier-physics',
  'ffmpeg',
]

const ALL_EVIDENCE = [
  'source asset manifest',
  'download hash',
  'source sha256',
  'license/provenance receipt',
  'creator/source URL',
  'usage rights',
  'normalized glb manifest',
  'unit scale report',
  'axis/origin report',
  'retopology or curated mesh receipt',
  'LOD0/LOD1/LOD2/LOD3 manifest',
  'mesh density report',
  'UV/material validation',
  'PBR texture compression report',
  'KTX2/Basis output',
  'collision/navmesh proxy report',
  'walkable surface report',
  'physics collider validation',
  'final preview frame capture',
  'thumbnail render',
  'viewport performance trace',
  'human art-direction approval',
  'runtime execution evidence',
  'rollback plan',
]

function baseCookRequest(overrides: Partial<StudioLocalCookJobRequest> = {}): StudioLocalCookJobRequest {
  return {
    assetId: 'hero-boss-01',
    assetName: 'Hero Boss',
    goal: 'Dispatch a signed Studio Local cook job.',
    sourceAssetUri: 's3://assets/hero-boss/source.glb',
    sourceSha256: 'sha256:hero-boss-source',
    sourceFormat: 'glb',
    currentTier: 'curated-marketplace',
    targetTier: 'studio-local-optimized',
    availableTools: ALL_TOOLS,
    evidenceRefs: ALL_EVIDENCE,
    estimatedCostUsd: 4,
    estimatedMinutes: 18,
    requestedByAgent: 'Asset Pipeline Agent',
    ...overrides,
  }
}

function signedApproval(cookRequest: StudioLocalCookJobRequest, overrides: Partial<StudioLocalDispatchApproval> = {}): StudioLocalDispatchApproval {
  const approvalWithoutSignature = {
    version: 1 as const,
    nonce: 'dispatch-nonce-123456',
    signedAt: NOW,
    expiresAt: '2026-05-25T16:30:00.000Z',
    signedByUserId: USER_ID,
    ...overrides,
  }
  return {
    ...approvalWithoutSignature,
    signature: createStudioLocalCookDispatchSignature(
      {
        projectId: PROJECT_ID,
        userId: USER_ID,
        cookRequest,
        approval: approvalWithoutSignature,
      },
      SECRET,
    ),
  }
}

describe('Studio Local cook dispatch approval', () => {
  it('queues a governed native cook dispatch when the queue plan and signature are valid', () => {
    const cookRequest = baseCookRequest()
    const approval = signedApproval(cookRequest)
    const decision = buildStudioLocalCookDispatchDecision({
      request: { cookRequest, approval },
      projectId: PROJECT_ID,
      userId: USER_ID,
      secret: SECRET,
      now: NOW,
    })

    expect(decision.dispatch).toBe('studio-local-cook-dispatch')
    expect(decision.state).toBe('queued')
    expect(decision.dispatchAllowed).toBe(true)
    expect(decision.executionAllowed).toBe(true)
    expect(decision.blockers).toEqual([])
    expect(decision.approvalEvidenceRefs).toContain('studio-local-dispatch:dispatch-nonce-123456')
    expect(decision.approvalEvidenceRefs).toContain('human approval:user-1')
    expect(decision.governedJob).toMatchObject({
      kind: 'asset-import',
      state: 'queued',
      runtimeTarget: 'local-native',
      runtimeCapabilityStatus: 'available',
      executionAllowed: true,
      humanReviewRequired: true,
    })
    expect(decision.governedJob.requiredEvidence).toContain('signed Studio Local daemon dispatch')
    expect(decision.governedJob.requiredEvidence).toContain('fresh Studio Local capability probe')
  })

  it('blocks dispatch when the signature does not match the canonical payload', () => {
    const cookRequest = baseCookRequest()
    const approval = { ...signedApproval(cookRequest), signature: 'a'.repeat(64) }
    const decision = buildStudioLocalCookDispatchDecision({
      request: { cookRequest, approval },
      projectId: PROJECT_ID,
      userId: USER_ID,
      secret: SECRET,
      now: NOW,
    })

    expect(decision.state).toBe('blocked')
    expect(decision.dispatchAllowed).toBe(false)
    expect(decision.executionAllowed).toBe(false)
    expect(decision.blockers).toContain('Studio Local dispatch signature is invalid.')
    expect(decision.governedJob.executionAllowed).toBe(false)
  })

  it('holds dispatch when Studio Local cook evidence or tools are missing', () => {
    const cookRequest = baseCookRequest({
      availableTools: ['gltf-transform'],
      evidenceRefs: ['source asset manifest', 'download hash', 'source sha256'],
    })
    const approval = signedApproval(cookRequest)
    const decision = buildStudioLocalCookDispatchDecision({
      request: { cookRequest, approval },
      projectId: PROJECT_ID,
      userId: USER_ID,
      secret: SECRET,
      now: NOW,
    })

    expect(decision.state).toBe('held')
    expect(decision.dispatchAllowed).toBe(false)
    expect(decision.executionAllowed).toBe(false)
    expect(decision.blockers).toContain('Missing Studio Local cook tool: blender-headless')
    expect(decision.blockers).toContain('Missing cook evidence: license/provenance receipt')
  })
})
