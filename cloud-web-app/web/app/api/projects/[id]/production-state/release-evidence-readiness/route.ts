import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildProductionReadinessSummary,
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'
import { buildEvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'
import {
  buildReleaseEvidenceReadinessSnapshot,
  mergeReleaseEvidenceReviewRequestIntoProductionState,
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
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

type ReleaseEvidenceProject = NonNullable<Awaited<ReturnType<typeof loadProjectForReleaseEvidenceReadiness>>>

function canWriteReleaseEvidenceReadiness(project: ReleaseEvidenceProject, userId: string): boolean {
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'admin' || member.role === 'editor')
}

function buildReadinessPayload(project: ReleaseEvidenceProject) {
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

  return {
    state,
    evidenceCoverage,
    runtimeReceiptState,
    snapshot,
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReleaseEvidenceReadiness(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { snapshot } = buildReadinessPayload(project)

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

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReleaseEvidenceReadiness(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteReleaseEvidenceReadiness(project, user.userId)) {
      return NextResponse.json({ error: 'Editor access is required to request release evidence review.' }, { status: 403 })
    }

    const { state, runtimeReceiptState, snapshot } = buildReadinessPayload(project)
    const result = mergeReleaseEvidenceReviewRequestIntoProductionState({
      state,
      snapshot,
      requestedBy: user.email ?? user.userId,
    })

    if (!result.accepted) {
      return NextResponse.json({
        error: 'Release evidence review cannot be requested yet.',
        blockers: result.blockers,
        nextAction: result.nextAction,
        snapshot,
        releaseReady: false,
      }, { status: 409 })
    }

    const settings = writeAgenticProductionStateToSettings(project.settings, result.state)
    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })
    const updatedCoverage = buildEvidenceRefCoverageReport({ state: result.state, settings })
    const updatedSnapshot = buildReleaseEvidenceReadinessSnapshot({
      state: result.state,
      evidenceCoverage: updatedCoverage,
      runtimeReceiptState,
    })

    return NextResponse.json({
      snapshot: updatedSnapshot,
      readiness: buildProductionReadinessSummary(result.state),
      productionState: result.state,
      reviewRequestId: result.reviewRequestId,
      persisted: true,
      releaseReady: false,
      releaseNote: 'Release review request was persisted. Manual owner approval is still required before final/public claims.',
    })
  } catch (error) {
    logger.error('release_evidence_readiness.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
