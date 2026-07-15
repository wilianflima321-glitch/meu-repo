import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger';
import {
  buildDefaultAgenticProductionState,
  buildProductionReadinessSummary,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'
import { mergeViewportRenderJobIntoProductionState } from '@/lib/production/render-job-production-state'
import { QUEUE_NAMES, queueManager } from '@/lib/queue-system'
import { coerceViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  coerceViewportRenderRuntimeRoute,
  shouldHoldViewportRenderRuntimeRoute,
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
  type ViewportRenderQueueResult,
} from '@/lib/viewport/viewport-render-queue'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    const enqueueRequested = isRecord(body) && body.enqueue === true
    const runtimeRoute = coerceViewportRenderRuntimeRoute(isRecord(body) ? body.runtimeRoute : null, contract)

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

    let queue: ViewportRenderQueueResult = {
      status: 'not-requested',
      queued: false,
      runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
      message: 'Render contract captured; queue execution was not requested.',
    }

    if (enqueueRequested) {
      if (shouldHoldViewportRenderRuntimeRoute(runtimeRoute)) {
        queue = {
          status: 'held',
          queued: false,
          runtimeRoute,
          message: runtimeRoute.reason,
        }
      } else if (!(await queueManager.isAvailable())) {
        queue = {
          status: 'unavailable',
          queued: false,
          runtimeRoute,
          message: 'Render contract captured, but the queue backend is unavailable.',
        }
      } else {
        // Cria o registro persistente de RenderJob na base
        const renderJob = await prisma.renderJob.create({
          data: {
            id: contract.id, // O job da queue e do prisma tem o mesmo ID
            projectId: project.id,
            requestedBy: user.userId,
            status: 'queued',
            progress: 0,
            provider: 'internal-render-farm',
            costUsd: contract.estimatedCostUsd ?? 0.0,
          }
        });

        const queued = await queueManager.addJob(
          QUEUE_NAMES.EXPORT,
          VIEWPORT_RENDER_QUEUE_JOB_TYPE,
          buildViewportRenderQueuePayload({
            contract,
            projectId: project.id,
            projectName: project.name,
            runtimeRoute,
            requestedBy: user.userId,
          }),
          {
            priority: contract.quality === 'final' ? 7 : contract.quality === 'review' ? 6 : 4,
            jobId: renderJob.id,
          }
        )
        queue = queued
          ? {
              status: 'queued',
              queued: true,
              jobId: String(queued.id),
              runtimeRoute,
              message: 'Render job queued. Output media evidence is still required before release approval.',
            }
          : {
              status: 'unavailable',
              queued: false,
              runtimeRoute,
              message: 'Render contract captured, but the queue backend refused the job.',
            }
      }
    }

    return NextResponse.json({
      contract: {
        ...contract,
        projectId: project.id,
      },
      state,
      readiness,
      persisted: true,
      queued: queue.queued,
      queue,
      queueNote: queue.message,
    }, { status: queue.queued ? 202 : 200 })
  } catch (error) {
    logger.error('render_job.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
