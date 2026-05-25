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
  AGENT_RUN_LEDGER_SETTINGS_KEY,
  buildAgentRunLedger,
  filterAgentSnapshotsForProject,
  mergeAgentRunLedgerIntoProductionState,
  readAgentRunLedgerFromSettings,
  writeAgentRunLedgerToSettings,
} from '@/lib/server/agent-run-ledger'
import { listAgentSnapshots } from '@/lib/server/agent-store'

const logger = createComponentLogger('api.projects.production-state.agent-run-ledger')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForAgentRunLedger(projectId: string, userId: string) {
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

function canWriteAgentRunLedger(
  project: Awaited<ReturnType<typeof loadProjectForAgentRunLedger>>,
  userId: string
): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function parseLimit(value: string | null): number {
  const parsed = value ? Number(value) : 50
  if (!Number.isFinite(parsed)) return 50
  return Math.min(100, Math.max(1, Math.trunc(parsed)))
}

async function buildProjectAgentRunLedger(userId: string, projectId: string, limit: number) {
  const snapshots = await listAgentSnapshots(userId)
  return buildAgentRunLedger(filterAgentSnapshotsForProject(snapshots, projectId), limit)
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentRunLedger(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
    const liveLedger = await buildProjectAgentRunLedger(user.userId, project.id, limit)
    const persistedLedger = readAgentRunLedgerFromSettings(project.settings)

    return NextResponse.json({
      liveLedger,
      persistedLedger,
      hasPersistedLedger: Boolean(persistedLedger),
      settingsKey: AGENT_RUN_LEDGER_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('agent_run_ledger.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentRunLedger(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteAgentRunLedger(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
    const runLedger = await buildProjectAgentRunLedger(user.userId, project.id, limit)
    const currentState =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const productionState = mergeAgentRunLedgerIntoProductionState(currentState, runLedger)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, productionState)
    const settings = writeAgentRunLedgerToSettings(settingsWithState, runLedger)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('agent_run_ledger.persisted', {
      userId: user.userId,
      projectId: project.id,
      totalRuns: runLedger.summary.totalRuns,
      blockedRuns: runLedger.summary.blockedRuns,
      runsReadyForHumanReview: runLedger.summary.runsReadyForHumanReview,
    })

    return NextResponse.json({
      runLedger,
      productionState,
      readiness: buildProductionReadinessSummary(productionState),
      persisted: true,
      settingsKey: AGENT_RUN_LEDGER_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('agent_run_ledger.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
