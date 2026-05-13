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
import { mergeGizmoTransformOperationIntoProductionState } from '@/lib/production/gizmo-production-state'
import {
  buildGizmoTransformReviewPackets,
  buildGizmoTransformReviewSummary,
} from '@/lib/production/gizmo-review-packets'
import { coerceGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

const logger = createComponentLogger('api.projects.production-state.gizmo-transform')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForGizmoTransform(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForGizmoTransform>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForGizmoTransform>>>) {
  return (
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })
  )
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForGizmoTransform(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const state = readStateForProject(project)
    const packets = buildGizmoTransformReviewPackets(state)

    logger.info('gizmo_transform.review_loaded', {
      userId: user.userId,
      projectId: project.id,
      packets: packets.length,
    })

    return NextResponse.json({
      packets,
      summary: buildGizmoTransformReviewSummary(packets),
      readiness: buildProductionReadinessSummary(state),
    })
  } catch (error) {
    logger.error('gizmo_transform.review_load_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForGizmoTransform(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const operation = coerceGizmoTransformOperation(body)
    if (!operation) {
      return NextResponse.json({ error: 'Invalid gizmo transform operation' }, { status: 400 })
    }

    const currentState = readStateForProject(project)
    const state = mergeGizmoTransformOperationIntoProductionState(currentState, operation)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const packets = buildGizmoTransformReviewPackets(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('gizmo_transform.persisted', {
      userId: user.userId,
      projectId: project.id,
      operationId: operation.id,
      source: operation.source,
      valid: operation.validation.ok,
      blockers: operation.validation.blockers.length,
      warnings: operation.validation.warnings.length,
    })

    return NextResponse.json({
      operation,
      state,
      review: {
        latest: packets[0] ?? null,
        summary: buildGizmoTransformReviewSummary(packets),
      },
      readiness: buildProductionReadinessSummary(state),
      persisted: true,
    })
  } catch (error) {
    logger.error('gizmo_transform.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
