import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY, buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  createStudioLocalCookDispatchSignature,
  type StudioLocalDispatchApproval,
} from '@/lib/production/studio-local-cook-dispatch'
import type { StudioLocalCookJobRequest } from '@/lib/production/studio-local-cook-queue'
import { RUNTIME_JOB_RECEIPTS_SETTINGS_KEY } from '@/lib/production/runtime-job-receipts'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { POST } from '@/app/api/projects/[id]/production-state/studio-local-cook-dispatch/route'

const SECRET = 'test-dispatch-secret-123'
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

const originalSecret = process.env.STUDIO_LOCAL_DISPATCH_SECRET

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
  const now = new Date()
  const approvalWithoutSignature = {
    version: 1 as const,
    nonce: 'dispatch-nonce-123456',
    signedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
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

function buildRequest(body: unknown) {
  return new NextRequest(`http://localhost:3000/api/projects/${PROJECT_ID}/production-state/studio-local-cook-dispatch`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('api/projects/[id]/production-state/studio-local-cook-dispatch route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STUDIO_LOCAL_DISPATCH_SECRET = SECRET
    authMocks.requireAuth.mockReturnValue({ userId: USER_ID, email: 'producer@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: PROJECT_ID,
      name: 'Cook dispatch test',
      template: 'unreal',
      userId: USER_ID,
      settings: {
        [PRODUCTION_STATE_SETTINGS_KEY]: buildDefaultAgenticProductionState({
          projectName: 'Cook dispatch test',
          projectType: 'unreal',
        }),
      },
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: PROJECT_ID })
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STUDIO_LOCAL_DISPATCH_SECRET
    else process.env.STUDIO_LOCAL_DISPATCH_SECRET = originalSecret
  })

  it('persists a signed Studio Local cook dispatch while keeping release human-gated', async () => {
    const cookRequest = baseCookRequest()
    const response = await POST(buildRequest({ cookRequest, approval: signedApproval(cookRequest) }), { params: { id: PROJECT_ID } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.dispatchAllowed).toBe(true)
    expect(payload.executionAllowed).toBe(true)
    expect(payload.decision.dispatch).toBe('studio-local-cook-dispatch')
    expect(payload.job).toMatchObject({
      kind: 'asset-import',
      state: 'queued',
      runtimeTarget: 'local-native',
      executionAllowed: true,
      humanReviewRequired: true,
    })
    expect(payload.state.graphs.releaseGraph).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('runtime-job-receipts'),
        blockers: expect.arrayContaining(['Do not release runtime output without human approval.']),
      }),
      expect.objectContaining({
        blockers: expect.arrayContaining([
          'Do not auto-publish governed runtime output.',
          'Human review required before final/public claims.',
        ]),
      }),
    ]))
    expect(payload.receiptState.summary.totalReceipts).toBeGreaterThanOrEqual(4)
    expect(payload.receiptState.receipts.map((receipt: { kind: string }) => receipt.kind)).toEqual(expect.arrayContaining([
      'dispatch',
      'capability-probe',
      'cost-meter',
      'rollback',
    ]))
    expect(payload.state.graphs.evidenceGraph).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('runtime-job-receipts'),
      }),
      expect.objectContaining({
        blockers: expect.arrayContaining(['Required evidence: signed Studio Local daemon dispatch']),
      }),
    ]))
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROJECT_ID },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              runtimePolicy: expect.objectContaining({ requiresHumanApproval: true }),
            }),
            [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: expect.objectContaining({
              releasePolicy: 'human-review-required',
            }),
          }),
        }),
      }),
    )
  })

  it('rejects invalid signatures without mutating project settings', async () => {
    const cookRequest = baseCookRequest()
    const response = await POST(
      buildRequest({ cookRequest, approval: { ...signedApproval(cookRequest), signature: 'a'.repeat(64) } }),
      { params: { id: PROJECT_ID } },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('Studio Local cook dispatch blocked')
    expect(payload.decision.dispatchAllowed).toBe(false)
    expect(payload.decision.blockers).toContain('Studio Local dispatch signature is invalid.')
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects viewer collaborators before dispatch persistence', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: PROJECT_ID,
      name: 'Cook dispatch test',
      template: 'unreal',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })
    const cookRequest = baseCookRequest()
    const response = await POST(buildRequest({ cookRequest, approval: signedApproval(cookRequest) }), { params: { id: PROJECT_ID } })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('returns a configuration error when dispatch signing is unavailable', async () => {
    delete process.env.STUDIO_LOCAL_DISPATCH_SECRET
    const cookRequest = baseCookRequest()
    const response = await POST(buildRequest({ cookRequest, approval: signedApproval(cookRequest) }), { params: { id: PROJECT_ID } })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toEqual({ error: 'Studio Local dispatch signing is not configured' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
