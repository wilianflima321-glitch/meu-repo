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
import { coerceGovernedRuntimeJob } from '@/lib/production/governed-runtime-jobs'
import {
  buildRuntimeExecutionEvidencePackage,
  RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY,
  verifyRuntimeExecutionEvidencePackage,
} from '@/lib/production/runtime-execution-evidence-package'
import { readRuntimeJobReceiptStateFromSettings } from '@/lib/production/runtime-job-receipts'

const logger = createComponentLogger('api.projects.production-state.runtime-execution-evidence-package')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForRuntimeExecutionPackage(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      template: true,
      userId: true,
      settings: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForRuntimeExecutionPackage>>>) {
  return (
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForRuntimeExecutionPackage(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const body = (await request.json()) as unknown
    const job = coerceGovernedRuntimeJob(isRecord(body) && 'job' in body ? body.job : body)
    if (!job) {
      return NextResponse.json({ error: 'Governed runtime job is required' }, { status: 400 })
    }

    const state = readStateForProject(project)
    const receiptState = readRuntimeJobReceiptStateFromSettings(project.settings)
    const evidencePackage = buildRuntimeExecutionEvidencePackage({
      projectId: project.id,
      projectName: project.name,
      state,
      job: {
        ...job,
        projectId: project.id,
        humanReviewRequired: true,
      },
      receiptState,
      generatedBy: user.email ?? user.userId,
    })
    const verification = verifyRuntimeExecutionEvidencePackage(evidencePackage)

    logger.info('runtime_execution_evidence_package.generated', {
      userId: user.userId,
      projectId: project.id,
      jobId: job.id,
      jobKind: job.kind,
      packageStatus: evidencePackage.status,
      valid: verification.valid,
      blockers: evidencePackage.blockers.length,
    })

    return NextResponse.json({
      evidencePackage,
      verification,
      capability: RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY,
      capabilityStatus: evidencePackage.status,
      releaseReady: false,
      manualPublishRequired: true,
      releaseNote: 'Runtime execution evidence was packaged for review. A separate human approval and manual publish action are still required.',
    }, {
      headers: {
        'x-aethel-capability': RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY,
        'x-aethel-capability-status': evidencePackage.status,
        'x-aethel-release-ready': 'false',
      },
    })
  } catch (error) {
    logger.error('runtime_execution_evidence_package.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
