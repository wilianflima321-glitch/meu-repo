import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
} from '@/lib/production/agentic-production-state'
import { buildEvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'
import {
  buildReleaseEvidenceReadinessSnapshot,
  RELEASE_EVIDENCE_READINESS_CAPABILITY,
} from '@/lib/production/release-evidence-readiness'
import { readRuntimeJobReceiptStateFromSettings } from '@/lib/production/runtime-job-receipts'

const logger = createComponentLogger('api.projects.production-state.release-evidence-readiness')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForReleaseEvidenceReadiness(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      template: true,
      settings: true,
    },
  })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReleaseEvidenceReadiness(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const state =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const evidenceCoverage = buildEvidenceRefCoverageReport({ state, settings: project.settings })
    const runtimeReceiptState = readRuntimeJobReceiptStateFromSettings(project.settings)
    const snapshot = buildReleaseEvidenceReadinessSnapshot({
      state,
      evidenceCoverage,
      runtimeReceiptState,
    })

    return NextResponse.json({
      snapshot,
      capability: RELEASE_EVIDENCE_READINESS_CAPABILITY,
      capabilityStatus: snapshot.capabilityStatus,
      releaseReady: false,
      releaseNote: 'Release evidence readiness is a review package. A manual owner action is still required before final/public claims.',
    })
  } catch (error) {
    logger.error('release_evidence_readiness.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}