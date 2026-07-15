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
  coerceAgenticProductionStatePatch,
  mergeAgenticProductionState,
  PRODUCTION_STATE_SETTINGS_KEY,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'

const logger = createComponentLogger('api.projects.production-state')

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForProductionState(projectId: string, userId: string) {
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

function canWriteProductionState(project: Awaited<ReturnType<typeof loadProjectForProductionState>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForProductionState(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const persistedState = readAgenticProductionStateFromSettings(project.settings)
    const state =
      persistedState ??
      buildDefaultAgenticProductionState({
        projectName: project.name,
        projectType: project.template,
      })

    return NextResponse.json({
      state,
      readiness: buildProductionReadinessSummary(state),
      persisted: Boolean(persistedState),
      settingsKey: PRODUCTION_STATE_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('production_state.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForProductionState(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProductionState(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as unknown
    const patch = coerceAgenticProductionStatePatch(body)
    const current =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({
        projectName: project.name,
        projectType: project.template,
      })
    const state = mergeAgenticProductionState(current, patch)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('production_state.updated', {
      userId: user.userId,
      projectId: project.id,
      graphCoverage: buildProductionReadinessSummary(state).graphCoverage,
    })

    return NextResponse.json({
      state,
      readiness: buildProductionReadinessSummary(state),
      persisted: true,
      settingsKey: PRODUCTION_STATE_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('production_state.patch_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
