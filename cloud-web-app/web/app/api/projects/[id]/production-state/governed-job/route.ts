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
  coerceGovernedRuntimeJob,
  mergeGovernedRuntimeJobIntoProductionState,
} from '@/lib/production/governed-runtime-jobs'

const logger = createComponentLogger('api.projects.production-state.governed-job')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForGovernedJob(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForGovernedJob>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForGovernedJob>>>) {
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

    const project = await loadProjectForGovernedJob(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const job = coerceGovernedRuntimeJob(body)
    if (!job) {
      return NextResponse.json({ error: 'Invalid governed runtime job' }, { status: 400 })
    }

    const currentState = readStateForProject(project)
    const state = mergeGovernedRuntimeJobIntoProductionState(currentState, {
      ...job,
      projectId: project.id,
      executionAllowed: false,
      humanReviewRequired: true,
    })
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('governed_job.persisted', {
      userId: user.userId,
      projectId: project.id,
      jobId: job.id,
      kind: job.kind,
      state: job.state,
      runtimeTarget: job.runtimeTarget,
      executionAllowed: false,
    })

    return NextResponse.json({
      job: {
        ...job,
        projectId: project.id,
        executionAllowed: false,
        humanReviewRequired: true,
      },
      state,
      readiness,
      persisted: true,
      executionAllowed: false,
      queueNote: 'Governed job captured only. Heavy execution requires a separate approved queue action.',
    })
  } catch (error) {
    logger.error('governed_job.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
