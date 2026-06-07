import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildDefaultAgenticProductionState,
  buildProductionReadinessSummary,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'
import {
  buildRuntimeJobReceiptState,
  evaluateRuntimeJobReceiptCoverage,
  mergeRuntimeJobReceiptsIntoProductionState,
  readRuntimeJobReceiptStateFromSettings,
  RUNTIME_JOB_RECEIPTS_SETTINGS_KEY,
  writeRuntimeJobReceiptStateToSettings,
  type RuntimeJobReceiptInput,
} from '@/lib/production/runtime-job-receipts'
import { coerceGovernedRuntimeJob } from '@/lib/production/governed-runtime-jobs'
import {
  buildRuntimeExecutionEvidencePackage,
  verifyRuntimeExecutionEvidencePackage,
} from '@/lib/production/runtime-execution-evidence-package'
import { readRuntimeFailureSmokeBrowserRunnerStateFromSettings } from '@/lib/production/runtime-failure-smoke-browser-runner-state'
import { readRuntimeFailureSmokePackStateFromSettings } from '@/lib/production/runtime-failure-smoke-pack-state'
import { readV29SidecarInstallManifestFromSettings } from '@/lib/runtime/v29-sidecar-install-manifest'
import { readV29SidecarLifecycleReportFromSettings } from '@/lib/runtime/v29-sidecar-lifecycle'

const logger = createComponentLogger('api.projects.production-state.runtime-job-receipts')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForRuntimeReceipts(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForRuntimeReceipts>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForRuntimeReceipts>>>) {
  return (
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
  )
}

function coerceReceiptInputs(input: unknown): RuntimeJobReceiptInput[] {
  const candidate = isRecord(input) && Array.isArray(input.receipts) ? input.receipts : Array.isArray(input) ? input : []
  return candidate.filter((receipt): receipt is RuntimeJobReceiptInput => isRecord(receipt))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForRuntimeReceipts(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const receiptState = readRuntimeJobReceiptStateFromSettings(project.settings)
    const job = request.nextUrl.searchParams.get('job')
    const coverage = job && receiptState
      ? {
          jobId: job,
          receipts: receiptState.receipts.filter((receipt) => receipt.jobId === job),
        }
      : null

    return NextResponse.json({
      receiptState,
      hasReceiptState: Boolean(receiptState),
      coverage,
      settingsKey: RUNTIME_JOB_RECEIPTS_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('runtime_job_receipts.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForRuntimeReceipts(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteProject(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await request.json()) as unknown
    const receipts = coerceReceiptInputs(body)
    if (receipts.length === 0) return NextResponse.json({ error: 'Runtime job receipts are required' }, { status: 400 })

    const previous = readRuntimeJobReceiptStateFromSettings(project.settings)
    const receiptState = buildRuntimeJobReceiptState({
      projectId: project.id,
      previous,
      receipts,
    })
    const maybeJob = isRecord(body) ? coerceGovernedRuntimeJob(body.job) : null
    const job = maybeJob && maybeJob.kind !== 'quality-upgrade' ? maybeJob : null
    const currentState = readStateForProject(project)
    const productionState = mergeRuntimeJobReceiptsIntoProductionState(currentState, receiptState, job)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, productionState)
    const settings = writeRuntimeJobReceiptStateToSettings(settingsWithState, receiptState)
    const readiness = buildProductionReadinessSummary(productionState)
    const coverage = job ? evaluateRuntimeJobReceiptCoverage({ job, receiptState }) : null
    const evidencePackage = job
      ? buildRuntimeExecutionEvidencePackage({
          projectId: project.id,
          projectName: project.name,
          state: productionState,
          job,
          receiptState,
          failureSmokePackState: readRuntimeFailureSmokePackStateFromSettings(project.settings),
          failureSmokeBrowserRunnerState: readRuntimeFailureSmokeBrowserRunnerStateFromSettings(project.settings),
          sidecarLifecycleReport: readV29SidecarLifecycleReportFromSettings(project.settings),
          sidecarInstallManifest: readV29SidecarInstallManifestFromSettings(project.settings),
          generatedBy: user.email,
        })
      : null
    const evidencePackageVerification = evidencePackage ? verifyRuntimeExecutionEvidencePackage(evidencePackage) : null

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('runtime_job_receipts.persisted', {
      userId: user.userId,
      projectId: project.id,
      receiptCount: receiptState.summary.totalReceipts,
      jobCount: receiptState.summary.jobCount,
      failedReceipts: receiptState.summary.failedReceipts,
      evidencePackageStatus: evidencePackage?.status,
      evidencePackageValid: evidencePackageVerification?.valid,
    })

    return NextResponse.json({
      receiptState,
      productionState,
      readiness,
      coverage,
      evidencePackage,
      evidencePackageVerification,
      runtimeExecutionEvidencePackageGenerated: Boolean(evidencePackage),
      persisted: true,
      settingsKey: RUNTIME_JOB_RECEIPTS_SETTINGS_KEY,
      releaseReady: false,
      releaseNote: 'Runtime job receipts were attached. Human approval is still required before final/public claims.',
    })
  } catch (error) {
    logger.error('runtime_job_receipts.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
