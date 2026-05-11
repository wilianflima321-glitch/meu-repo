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
import { mergeViewportRenderJobIntoProductionState } from '@/lib/production/render-job-production-state'
import { coerceViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

const logger = createComponentLogger('api.projects.production-state.render-job')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForRenderJob(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForRenderJob>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForRenderJob>>>) {
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

    const project = await loadProjectForRenderJob(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const contract = coerceViewportRenderJobContract(body)
    if (!contract) {
      return NextResponse.json({ error: 'Invalid viewport render job contract' }, { status: 400 })
    }

    const currentState = readStateForProject(project)
    const state = mergeViewportRenderJobIntoProductionState(currentState, {
      ...contract,
      projectId: project.id,
    })
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('render_job.persisted', {
      userId: user.userId,
      projectId: project.id,
      contractId: contract.id,
      mode: contract.mode,
      quality: contract.quality,
      target: contract.profile.target,
      estimatedCostUsd: contract.estimatedCostUsd,
    })

    return NextResponse.json({
      contract: {
        ...contract,
        projectId: project.id,
      },
      state,
      readiness,
      persisted: true,
      queued: false,
      queueNote: 'Render contract captured. Runtime queue execution remains evidence-gated and must attach media output before release.',
    })
  } catch (error) {
    logger.error('render_job.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
