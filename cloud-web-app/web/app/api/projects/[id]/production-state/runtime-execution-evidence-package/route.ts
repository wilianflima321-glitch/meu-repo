import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

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
import {
  buildRuntimeFailureSmokePackState,
  readRuntimeFailureSmokePackStateFromSettings,
  validateRuntimeFailureSmokePackState,
  writeRuntimeFailureSmokePackStateToSettings,
} from '@/lib/production/runtime-failure-smoke-pack-state'
import {
  buildRuntimeFailureSmokeBrowserRunnerStateFromReport,
  readRuntimeFailureSmokeBrowserRunnerStateFromSettings,
  validateRuntimeFailureSmokeBrowserRunnerState,
  writeRuntimeFailureSmokeBrowserRunnerStateToSettings,
} from '@/lib/production/runtime-failure-smoke-browser-runner-state'
import {
  buildRuntimeFailureSmokePackReport,
  validateRuntimeFailureSmokePackReport,
  type RuntimeFailureSmokePackInput,
} from '@/lib/runtime/runtime-failure-smoke-pack'
import {
  validateRuntimeFailureSmokeBrowserRunnerReport,
  type RuntimeFailureSmokeBrowserRunnerReport,
} from '@/lib/runtime/runtime-failure-smoke-runner-report'
import {
  readV29SidecarInstallManifestFromSettings,
  validateV29SidecarInstallManifest,
  writeV29SidecarInstallManifestToSettings,
  type V29SidecarInstallManifest,
} from '@/lib/runtime/v29-sidecar-install-manifest'
import {
  readV29SidecarLifecycleReportFromSettings,
  validateV29SidecarLifecycleReport,
  writeV29SidecarLifecycleReportToSettings,
  type V29SidecarLifecycleReport,
} from '@/lib/runtime/v29-sidecar-lifecycle'

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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  if (/^(1|true|yes|on)$/i.test(value)) return true
  if (/^(0|false|no|off)$/i.test(value)) return false
  return undefined
}

function readEvidenceOverrides(value: unknown): RuntimeFailureSmokePackInput['evidenceOverrides'] {
  if (!isRecord(value)) return undefined
  const out: NonNullable<RuntimeFailureSmokePackInput['evidenceOverrides']> = {}
  for (const [key, refs] of Object.entries(value)) {
    if (!Array.isArray(refs)) continue
    const normalized = refs.filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0)
    if (normalized.length > 0) out[key as keyof NonNullable<RuntimeFailureSmokePackInput['evidenceOverrides']>] = normalized
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForRuntimeExecutionPackage(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const body = (await request.json()) as unknown

    if (isRecord(body) && body.mode === 'runtime-failure-smoke-pack') {
      const report = buildRuntimeFailureSmokePackReport({
        runPrefix: readString(body.runPrefix) ?? `project:${project.id}:runtime-smoke`,
        generatedAt: readString(body.generatedAt),
        evidenceOverrides: readEvidenceOverrides(body.evidenceOverrides),
        useCanonicalFixtures: readBoolean(body.useCanonicalFixtures) ?? true,
      })
      const reportValidation = validateRuntimeFailureSmokePackReport(report)
      const previous = readRuntimeFailureSmokePackStateFromSettings(project.settings)
      const smokePackState = buildRuntimeFailureSmokePackState({
        projectId: project.id,
        previous,
        report,
      })
      const stateValidation = validateRuntimeFailureSmokePackState(smokePackState)
      const settings = writeRuntimeFailureSmokePackStateToSettings(project.settings, smokePackState)
      await prisma.project.update({
        where: { id: project.id },
        data: { settings: settings as Prisma.InputJsonValue },
      })

      logger.info('runtime_failure_smoke_pack.persisted', {
        userId: user.userId,
        projectId: project.id,
        scenarioCount: report.scenarioCount,
        totalPacks: smokePackState.summary.totalPacks,
        reportErrors: reportValidation.length,
        stateErrors: stateValidation.length,
      })

      return NextResponse.json({
        report,
        smokePackState,
        validation: {
          valid: reportValidation.length === 0 && stateValidation.length === 0,
          errors: [...reportValidation, ...stateValidation],
        },
        capability: report.capability,
        capabilityStatus: reportValidation.length || stateValidation.length ? 'blocked' : 'needs-review',
        marketClaimAllowed: false,
        releaseReady: false,
        manualPublishRequired: true,
      }, {
        headers: {
          'x-aethel-capability': report.capability,
          'x-aethel-capability-status': reportValidation.length || stateValidation.length ? 'blocked' : 'needs-review',
          'x-aethel-release-ready': 'false',
          'x-aethel-market-claim-allowed': 'false',
        },
      })
    }

    if (isRecord(body) && body.mode === 'runtime-failure-smoke-browser-runner-report') {
      const report = isRecord(body.report) ? (body.report as unknown as RuntimeFailureSmokeBrowserRunnerReport) : null
      if (!report) {
        return NextResponse.json({ error: 'Runtime failure smoke browser runner report is required' }, { status: 400 })
      }

      const reportValidation = validateRuntimeFailureSmokeBrowserRunnerReport(report)
      const previous = readRuntimeFailureSmokeBrowserRunnerStateFromSettings(project.settings)
      const { state: browserRunnerState, validationErrors } =
        buildRuntimeFailureSmokeBrowserRunnerStateFromReport({
          projectId: project.id,
          previous,
          report,
        })
      const stateValidation = validateRuntimeFailureSmokeBrowserRunnerState(browserRunnerState)
      const settings = writeRuntimeFailureSmokeBrowserRunnerStateToSettings(project.settings, browserRunnerState)
      await prisma.project.update({
        where: { id: project.id },
        data: { settings: settings as Prisma.InputJsonValue },
      })

      const errors = [...reportValidation, ...validationErrors, ...stateValidation]

      logger.info('runtime_failure_smoke_browser_runner.persisted', {
        userId: user.userId,
        projectId: project.id,
        harnessCount: report.harnessCount,
        totalReports: browserRunnerState.summary.totalReports,
        reportErrors: reportValidation.length,
        stateErrors: stateValidation.length,
      })

      return NextResponse.json({
        report,
        browserRunnerState,
        validation: {
          valid: errors.length === 0,
          errors,
        },
        capability: report.capability,
        capabilityStatus: errors.length ? 'blocked' : 'needs-review',
        marketClaimAllowed: false,
        releaseReady: false,
        manualPublishRequired: true,
      }, {
        headers: {
          'x-aethel-capability': report.capability,
          'x-aethel-capability-status': errors.length ? 'blocked' : 'needs-review',
          'x-aethel-release-ready': 'false',
          'x-aethel-market-claim-allowed': 'false',
        },
      })
    }

    if (isRecord(body) && body.mode === 'v29-sidecar-lifecycle-report') {
      const report = isRecord(body.report) ? (body.report as unknown as V29SidecarLifecycleReport) : null
      if (!report) return NextResponse.json({ error: 'V29 sidecar lifecycle report is required' }, { status: 400 })

      const validationErrors = validateV29SidecarLifecycleReport(report)
      const settings = writeV29SidecarLifecycleReportToSettings(project.settings, report)
      await prisma.project.update({
        where: { id: project.id },
        data: { settings: settings as Prisma.InputJsonValue },
      })

      logger.info('v29_sidecar_lifecycle_report.persisted', {
        userId: user.userId,
        projectId: project.id,
        sidecars: report.summary.total,
        blockers: report.blockers.length,
        validationErrors: validationErrors.length,
      })

      return NextResponse.json({
        report,
        validation: { valid: validationErrors.length === 0, errors: validationErrors },
        capability: report.capability,
        capabilityStatus: validationErrors.length ? 'blocked' : 'needs-review',
        releaseReady: false,
        manualPublishRequired: true,
      }, {
        headers: {
          'x-aethel-capability': report.capability,
          'x-aethel-capability-status': validationErrors.length ? 'blocked' : 'needs-review',
          'x-aethel-release-ready': 'false',
        },
      })
    }

    if (isRecord(body) && body.mode === 'v29-sidecar-install-manifest') {
      const manifest = isRecord(body.manifest) ? (body.manifest as unknown as V29SidecarInstallManifest) : null
      if (!manifest) return NextResponse.json({ error: 'V29 sidecar install manifest is required' }, { status: 400 })

      const validationErrors = validateV29SidecarInstallManifest(manifest)
      const settings = writeV29SidecarInstallManifestToSettings(project.settings, manifest)
      await prisma.project.update({
        where: { id: project.id },
        data: { settings: settings as Prisma.InputJsonValue },
      })

      logger.info('v29_sidecar_install_manifest.persisted', {
        userId: user.userId,
        projectId: project.id,
        osTargets: manifest.summary.osTargets,
        blockers: manifest.blockers.length,
        validationErrors: validationErrors.length,
      })

      return NextResponse.json({
        manifest,
        validation: { valid: validationErrors.length === 0, errors: validationErrors },
        capability: manifest.capability,
        capabilityStatus: validationErrors.length ? 'blocked' : 'needs-review',
        releaseReady: false,
        manualPublishRequired: true,
      }, {
        headers: {
          'x-aethel-capability': manifest.capability,
          'x-aethel-capability-status': validationErrors.length ? 'blocked' : 'needs-review',
          'x-aethel-release-ready': 'false',
        },
      })
    }

    const job = coerceGovernedRuntimeJob(isRecord(body) && 'job' in body ? body.job : body)
    if (!job) {
      return NextResponse.json({ error: 'Governed runtime job is required' }, { status: 400 })
    }

    const state = readStateForProject(project)
    const receiptState = readRuntimeJobReceiptStateFromSettings(project.settings)
    const smokePackStateForPackage = readRuntimeFailureSmokePackStateFromSettings(project.settings)
    const browserRunnerStateForPackage = readRuntimeFailureSmokeBrowserRunnerStateFromSettings(project.settings)
    const sidecarLifecycleReport = readV29SidecarLifecycleReportFromSettings(project.settings)
    const sidecarInstallManifest = readV29SidecarInstallManifestFromSettings(project.settings)
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
      failureSmokePackState: smokePackStateForPackage,
      failureSmokeBrowserRunnerState: browserRunnerStateForPackage,
      sidecarLifecycleReport,
      sidecarInstallManifest,
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
