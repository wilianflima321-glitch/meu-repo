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
  coerceViewportRenderOutputEvidence,
  mergeViewportRenderOutputEvidenceIntoProductionState,
} from '@/lib/production/render-output-evidence'

const logger = createComponentLogger('api.projects.production-state.render-job.evidence')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForRenderEvidence(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForRenderEvidence>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForRenderEvidence>>>) {
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

    const project = await loadProjectForRenderEvidence(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteProject(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const evidence = coerceViewportRenderOutputEvidence(await request.json())
    if (!evidence) {
      return NextResponse.json({ error: 'Invalid viewport render output evidence' }, { status: 400 })
    }

    const currentState = readStateForProject(project)
    const state = mergeViewportRenderOutputEvidenceIntoProductionState(currentState, {
      ...evidence,
      projectId: project.id,
    })
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('render_output_evidence.persisted', {
      userId: user.userId,
      projectId: project.id,
      contractId: evidence.contractId,
      quality: evidence.quality,
      artifactCount: evidence.artifacts.length,
      playbackOk: evidence.validation.playbackOk,
      performanceOk: evidence.validation.performanceOk,
      licenseOk: evidence.validation.licenseOk,
      continuityOk: evidence.validation.continuityOk,
    })

    return NextResponse.json({
      evidence: {
        ...evidence,
        projectId: project.id,
      },
      state,
      readiness,
      persisted: true,
      releaseReady: false,
      releaseNote: 'Render output evidence was attached. Human approval is still required before final release.',
    })
  } catch (error) {
    logger.error('render_output_evidence.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
