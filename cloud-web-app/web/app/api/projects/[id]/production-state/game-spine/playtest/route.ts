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
  coerceGamePlaytestEvidence,
  mergeGamePlaytestEvidenceIntoProductionState,
  type GamePlaytestEvidence,
} from '@/lib/production/game-playtest-evidence'

const logger = createComponentLogger('api.projects.production-state.game-spine.playtest')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForGamePlaytest(projectId: string, userId: string) {
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

function canWritePlaytest(project: Awaited<ReturnType<typeof loadProjectForGamePlaytest>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function readStateForProject(project: NonNullable<Awaited<ReturnType<typeof loadProjectForGamePlaytest>>>) {
  return (
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })
  )
}

function validateArtifactUrl(input: {
  evidence: GamePlaytestEvidence
  projectId: string
}): NextResponse | null {
  for (const artifact of input.evidence.artifacts) {
    if (!artifact.url.startsWith('aethel-artifact://playtest/')) continue

    let url: URL
    try {
      url = new URL(artifact.url)
    } catch {
      return NextResponse.json({ error: 'INVALID_PLAYTEST_ARTIFACT_URL' }, { status: 400 })
    }

    const [artifactProjectId, sessionId, ...rest] = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))

    if (url.hostname !== 'playtest' || !artifactProjectId || !sessionId || rest.length === 0) {
      return NextResponse.json({ error: 'INVALID_PLAYTEST_ARTIFACT_URL' }, { status: 400 })
    }
    if (artifactProjectId !== input.projectId) {
      return NextResponse.json({ error: 'Playtest artifact does not belong to this project' }, { status: 403 })
    }
    if (sessionId !== input.evidence.sessionId) {
      return NextResponse.json({ error: 'Playtest artifact session does not match evidence session' }, { status: 400 })
    }
    if (rest.some((segment) => segment === '..' || segment.includes('\\') || segment.includes('/'))) {
      return NextResponse.json({ error: 'INVALID_PLAYTEST_ARTIFACT_URL' }, { status: 400 })
    }
  }

  return null
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForGamePlaytest(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWritePlaytest(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const evidence = coerceGamePlaytestEvidence(await request.json())
    if (!evidence) return NextResponse.json({ error: 'Invalid game playtest evidence' }, { status: 400 })

    const artifactError = validateArtifactUrl({ evidence, projectId: project.id })
    if (artifactError) return artifactError

    const projectEvidence = {
      ...evidence,
      projectId: project.id,
    }
    const currentState = readStateForProject(project)
    const state = mergeGamePlaytestEvidenceIntoProductionState(currentState, projectEvidence)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)
    const readiness = buildProductionReadinessSummary(state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('game_playtest_evidence.persisted', {
      userId: user.userId,
      projectId: project.id,
      sessionId: evidence.sessionId,
      buildId: evidence.buildId,
      artifactCount: evidence.artifacts.length,
      crashCount: evidence.metrics.crashCount,
      blockerBugCount: evidence.metrics.blockerBugCount,
    })

    return NextResponse.json({
      evidence: projectEvidence,
      state,
      readiness,
      persisted: true,
      releaseReady: false,
      releaseNote: 'Playtest evidence was attached. Human release approval is still required before publishing.',
    })
  } catch (error) {
    logger.error('game_playtest_evidence.persist_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
