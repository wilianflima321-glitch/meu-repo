import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import { buildAgentHandoffPacket } from '@/lib/production/agent-handoff-packet'
import {
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
} from '@/lib/production/agentic-production-state'
import { readRepositoryContextBudgetExecutionStateFromSettings } from '@/lib/production/repository-context-budget-execution'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'

const logger = createComponentLogger('api.projects.production-state.agent-handoff')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForAgentHandoff(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      template: true,
      settings: true,
    },
  })
}

function resolveAgent(request: NextRequest): string {
  const agent = new URL(request.url).searchParams.get('agent')?.trim()
  return agent || 'Producer Agent'
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentHandoff(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const state =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({
        projectName: project.name,
        projectType: project.template,
      })
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    const agent = resolveAgent(request)
    const packet = buildAgentHandoffPacket({
      projectId: project.id,
      agent,
      state,
      manifest,
    })
    const contextBudgetExecution = readRepositoryContextBudgetExecutionStateFromSettings(project.settings)

    logger.info('agent_handoff.generated', {
      userId: user.userId,
      projectId: project.id,
      agent,
      status: packet.status,
      surfaces: packet.cartography.ownedSurfaces.length,
    })

    return NextResponse.json({
      packet,
      contextBudgetExecution,
      hasManifest: Boolean(manifest),
      settingsKeys: {
        productionState: 'aethelProductionState',
        cartographyManifest: 'aethelRepositoryCartographyManifest',
      },
    })
  } catch (error) {
    logger.error('agent_handoff.failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
