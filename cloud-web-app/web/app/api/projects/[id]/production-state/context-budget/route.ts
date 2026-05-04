import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildRepositoryContextBudgetExecutionState,
  mergeRepositoryContextBudgetExecutionPatch,
  readRepositoryContextBudgetExecutionStateFromSettings,
  REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
  writeRepositoryContextBudgetExecutionStateToSettings,
  type RepositoryContextBudgetBatchStatus,
} from '@/lib/production/repository-context-budget-execution'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'

const logger = createComponentLogger('api.projects.production-state.context-budget')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

const statuses: RepositoryContextBudgetBatchStatus[] = ['pending', 'running', 'complete', 'blocked']

async function loadProjectForContextBudget(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      userId: true,
      settings: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

function canWriteContextBudget(project: Awaited<ReturnType<typeof loadProjectForContextBudget>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parsePatch(value: unknown) {
  if (!isRecord(value)) return {}
  const status =
    typeof value.status === 'string' && statuses.includes(value.status as RepositoryContextBudgetBatchStatus)
      ? (value.status as RepositoryContextBudgetBatchStatus)
      : undefined

  return {
    batchId: typeof value.batchId === 'string' ? value.batchId : undefined,
    status,
    completedSurfaceCount: typeof value.completedSurfaceCount === 'number' ? value.completedSurfaceCount : undefined,
    evidenceRefs: Array.isArray(value.evidenceRefs)
      ? value.evidenceRefs.filter((item): item is string => typeof item === 'string')
      : undefined,
    blocker: typeof value.blocker === 'string' || value.blocker === null ? value.blocker : undefined,
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForContextBudget(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    if (!manifest) {
      return NextResponse.json({
        execution: null,
        hasManifest: false,
        settingsKey: REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
      })
    }

    const execution =
      readRepositoryContextBudgetExecutionStateFromSettings(project.settings) ??
      buildRepositoryContextBudgetExecutionState({
        projectId: project.id,
        manifest,
      })

    return NextResponse.json({
      execution,
      hasManifest: true,
      settingsKey: REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('context_budget.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForContextBudget(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteContextBudget(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    if (!manifest) {
      return NextResponse.json({ error: 'Repository Cartography manifest required' }, { status: 409 })
    }

    const current =
      readRepositoryContextBudgetExecutionStateFromSettings(project.settings) ??
      buildRepositoryContextBudgetExecutionState({
        projectId: project.id,
        manifest,
      })
    const execution = mergeRepositoryContextBudgetExecutionPatch(current, parsePatch(await request.json().catch(() => ({}))))
    const settings = writeRepositoryContextBudgetExecutionStateToSettings(project.settings, execution)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('context_budget.updated', {
      userId: user.userId,
      projectId: project.id,
      manifestId: manifest.id,
      batchCount: execution.batches.length,
    })

    return NextResponse.json({
      execution,
      hasManifest: true,
      settingsKey: REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('context_budget.patch_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
