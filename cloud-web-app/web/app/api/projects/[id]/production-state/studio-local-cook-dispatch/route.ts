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
  buildStudioLocalCookDispatchDecision,
  coerceStudioLocalCookDispatchRequest,
} from '@/lib/production/studio-local-cook-dispatch'
import { mergeGovernedRuntimeJobIntoProductionState } from '@/lib/production/governed-runtime-jobs'

const logger = createComponentLogger('api.projects.production-state.studio-local-cook-dispatch')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForCookDispatch(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForCookDispatch>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForCookDispatch>>>) {
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

    const dispatchSecret = process.env.STUDIO_LOCAL_DISPATCH_SECRET?.trim() ?? ''
    if (!dispatchSecret) {
      return NextResponse.json({ error: 'Studio Local dispatch signing is not configured' }, { status: 503 })
    }

    const project = await loadProjectForCookDispatch(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const dispatchRequest = coerceStudioLocalCookDispatchRequest(body)
    if (!dispatchRequest) {
      return NextResponse.json({ error: 'Invalid Studio Local cook dispatch request' }, { status: 400 })
    }

    const decision = buildStudioLocalCookDispatchDecision({
      request: dispatchRequest,
      projectId: project.id,
      userId: user.userId,
      secret: dispatchSecret,
    })

    if (!decision.dispatchAllowed || !decision.executionAllowed) {
      logger.warn('studio_local_cook_dispatch.blocked', {
        userId: user.userId,
        projectId: project.id,
        assetId: dispatchRequest.cookRequest.assetId,
        state: decision.state,
        blockers: decision.blockers.length,
      })

      return NextResponse.json(
        {
          error: 'Studio Local cook dispatch blocked',
          decision,
          dispatchAllowed: false,
          executionAllowed: false,
        },
        { status: 409 },
      )
    }

    const currentState = readStateForProject(project)
    const state = mergeGovernedRuntimeJobIntoProductionState(currentState, decision.governedJob)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('studio_local_cook_dispatch.persisted', {
      userId: user.userId,
      projectId: project.id,
      assetId: dispatchRequest.cookRequest.assetId,
      jobId: decision.governedJob.id,
      state: decision.state,
      dispatchAllowed: true,
      executionAllowed: true,
    })

    return NextResponse.json({
      decision,
      job: decision.governedJob,
      state,
      readiness,
      persisted: true,
      dispatchAllowed: true,
      executionAllowed: true,
      queueNote: decision.queueNote,
    })
  } catch (error) {
    logger.error('studio_local_cook_dispatch.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
