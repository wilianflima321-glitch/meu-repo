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
  buildReleaseEvidencePackageManifest,
  buildReleaseEvidenceReadinessSnapshot,
  mergeReleaseEvidenceReviewDecisionIntoProductionState,
  mergeReleaseEvidenceReviewRequestIntoProductionState,
  RELEASE_EVIDENCE_READINESS_CAPABILITY,
  verifyReleaseEvidencePackageManifest,
  type ReleaseEvidenceReviewDecision,
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
  const packageManifest = buildReleaseEvidencePackageManifest({
    state,
    snapshot,
    projectId: project.id,
    projectName: project.name,
    generatedBy: 'release-evidence-readiness-api',
  })
  const packageManifestVerification = verifyReleaseEvidencePackageManifest(packageManifest)

  return {
    state,
    evidenceCoverage,
    runtimeReceiptState,
    snapshot,
    packageManifest,
    packageManifestVerification,
  }
}

function parseReleaseReviewAction(request: NextRequest): Promise<{ action: string; note?: string }> {
  return request.json()
    .then((body) => {
      if (!body || typeof body !== 'object') return { action: 'request-human-review' }
      const record = body as Record<string, unknown>
      return {
        action: typeof record.action === 'string' ? record.action : 'request-human-review',
        note: typeof record.note === 'string' ? record.note.slice(0, 800) : undefined,
      }
    })
    .catch(() => ({ action: 'request-human-review' }))
}

function actionToDecision(action: string): ReleaseEvidenceReviewDecision | null {
  if (action === 'record-human-approval' || action === 'approve-human-review') return 'approved'
  if (action === 'reject-human-review' || action === 'record-human-rejection') return 'rejected'
  return null
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReleaseEvidenceReadiness(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { snapshot, packageManifest, packageManifestVerification } = buildReadinessPayload(project)

    return NextResponse.json({
      snapshot,
      packageManifest,
      packageManifestVerification,
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

    const { action, note } = await parseReleaseReviewAction(request)
    const { state, runtimeReceiptState, snapshot } = buildReadinessPayload(project)
    const decision = actionToDecision(action)
    const result = decision
      ? mergeReleaseEvidenceReviewDecisionIntoProductionState({
          state,
          snapshot,
          decision,
          note,
          decidedBy: user.email ?? user.userId,
        })
      : mergeReleaseEvidenceReviewRequestIntoProductionState({
          state,
          snapshot,
          requestedBy: user.email ?? user.userId,
        })

    if (!result.accepted) {
      return NextResponse.json({
        error: decision
          ? 'Release evidence review decision cannot be recorded yet.'
          : 'Release evidence review cannot be requested yet.',
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
    const packageManifest = buildReleaseEvidencePackageManifest({
      state: result.state,
      snapshot: updatedSnapshot,
      projectId: project.id,
      projectName: project.name,
      generatedBy: 'release-evidence-readiness-api',
    })
    const packageManifestVerification = verifyReleaseEvidencePackageManifest(packageManifest)

    return NextResponse.json({
      snapshot: updatedSnapshot,
      packageManifest,
      packageManifestVerification,
      readiness: buildProductionReadinessSummary(result.state),
      productionState: result.state,
      reviewRequestId: 'reviewRequestId' in result ? result.reviewRequestId : undefined,
      decisionId: 'decisionId' in result ? result.decisionId : undefined,
      decision: 'decision' in result ? result.decision : undefined,
      persisted: true,
      releaseReady: false,
      releaseNote: decision
        ? 'Release review decision was persisted as evidence. A separate manual publish action is still required.'
        : 'Release review request was persisted. Manual owner approval is still required before final/public claims.',
    })
  } catch (error) {
    logger.error('release_evidence_readiness.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
