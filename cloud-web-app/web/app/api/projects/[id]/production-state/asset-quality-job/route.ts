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
  buildAssetQualityJobRun,
  coerceAssetQualityJobRequest,
} from '@/lib/production/asset-quality-job-runner'
import { mergeGovernedRuntimeJobIntoProductionState } from '@/lib/production/governed-runtime-jobs'

const logger = createComponentLogger('api.projects.production-state.asset-quality-job')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForAssetQualityJob(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForAssetQualityJob>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForAssetQualityJob>>>) {
  return (
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })
  )
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAssetQualityJob(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const assetRequest = coerceAssetQualityJobRequest(body)
    if (!assetRequest) {
      return NextResponse.json({ error: 'Invalid asset quality job request' }, { status: 400 })
    }

    const run = buildAssetQualityJobRun({ request: assetRequest, projectId: project.id })
    const currentState = readStateForProject(project)
    const state = mergeGovernedRuntimeJobIntoProductionState(currentState, run.job)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('asset_quality_job.persisted', {
      userId: user.userId,
      projectId: project.id,
      assetId: assetRequest.assetId,
      jobId: run.job.id,
      targetTier: assetRequest.targetTier,
      state: run.job.state,
      executionAllowed: false,
    })

    return NextResponse.json({
      run,
      job: run.job,
      plan: run.job.plan,
      state,
      readiness,
      persisted: true,
      executionAllowed: false,
      queueNote: run.queueNote,
    })
  } catch (error) {
    logger.error('asset_quality_job.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
