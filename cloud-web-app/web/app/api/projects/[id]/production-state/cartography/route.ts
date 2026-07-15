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
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'
import {
  buildRepositoryContextBudgetExecutionState,
  readRepositoryContextBudgetExecutionStateFromSettings,
  writeRepositoryContextBudgetExecutionStateToSettings,
} from '@/lib/production/repository-context-budget-execution'
import { scanWorkspaceForRepositoryArtifacts } from '@/lib/production/repository-cartography-scanner'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'

const logger = createComponentLogger('api.projects.production-state.cartography')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

type CartographyScanBody = {
  workspacePath?: string
  maxFiles?: number
  maxDepth?: number
  maxHashBytes?: number
}

async function loadProjectForCartography(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForCartography>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function readBody(request: NextRequest): Promise<CartographyScanBody> {
  try {
    const body = (await request.json()) as unknown
    if (!isRecord(body)) return {}
    return {
      workspacePath: typeof body.workspacePath === 'string' ? body.workspacePath : undefined,
      maxFiles: typeof body.maxFiles === 'number' ? body.maxFiles : undefined,
      maxDepth: typeof body.maxDepth === 'number' ? body.maxDepth : undefined,
      maxHashBytes: typeof body.maxHashBytes === 'number' ? body.maxHashBytes : undefined,
    }
  } catch {
    return {}
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForCartography(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readBody(request)
    const { absolutePath, root } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId: project.id,
      requestedPath: body.workspacePath,
    })
    const scan = await scanWorkspaceForRepositoryArtifacts(absolutePath, {
      maxFiles: body.maxFiles,
      maxDepth: body.maxDepth,
      maxHashBytes: body.maxHashBytes,
    })
    const currentState =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({
        projectName: project.name,
        projectType: project.template,
      })
    const manifest = buildRepositoryCartographyManifest({
      projectId: project.id,
      artifacts: scan.artifacts,
    })
    const state = mergeRepositoryCartographyIntoProductionState(currentState, manifest)
    const contextBudgetExecution = buildRepositoryContextBudgetExecutionState({
      projectId: project.id,
      manifest,
      previous: readRepositoryContextBudgetExecutionStateFromSettings(project.settings),
    })
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, state)
    const settingsWithManifest = writeRepositoryCartographyManifestToSettings(settingsWithState, manifest)
    const settings = writeRepositoryContextBudgetExecutionStateToSettings(settingsWithManifest, contextBudgetExecution)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('repository_cartography.scanned', {
      userId: user.userId,
      projectId: project.id,
      files: scan.artifacts.length,
      skipped: scan.skipped.length,
      truncated: scan.truncated,
    })

    return NextResponse.json({
      manifest,
      scan: {
        root,
        scannedPath: absolutePath,
        files: scan.artifacts.length,
        skipped: scan.skipped,
        truncated: scan.truncated,
      },
      state,
      contextBudgetExecution,
      readiness: buildProductionReadinessSummary(state),
      persisted: true,
    })
  } catch (error) {
    logger.error('repository_cartography.scan_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
