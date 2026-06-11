import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger';
import {
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
} from '@/lib/production/agentic-production-state'
import {
  AGENT_FLEET_SETTINGS_KEY,
  buildAgentFleetSnapshot,
  buildDefaultAgentFleetPreferences,
  mergeAgentFleetPreferences,
  readAgentFleetPreferencesFromSettings,
  writeAgentFleetPreferencesToSettings,
  type AgentFleetControlAction,
  type AgentFleetMode,
} from '@/lib/production/agent-fleet-session'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { listActiveAgentSurfaceLocks } from '@/lib/production/agent-surface-locks'

const logger = createComponentLogger('api.projects.production-state.agent-fleet')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

const modes: AgentFleetMode[] = ['coordinator-first', 'selected-agent', 'review-only']
const actions: AgentFleetControlAction[] = ['pause', 'resume', 'takeover', 'stop']

async function loadProjectForAgentFleet(projectId: string, userId: string) {
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

function canWriteAgentFleet(project: Awaited<ReturnType<typeof loadProjectForAgentFleet>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseBody(value: unknown) {
  if (!isRecord(value)) return {}
  const centralAgent = typeof value.centralAgent === 'string' ? value.centralAgent : undefined
  const enabledAgents = Array.isArray(value.enabledAgents)
    ? value.enabledAgents.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const paused = typeof value.paused === 'boolean' ? value.paused : undefined
  const mode = typeof value.mode === 'string' && modes.includes(value.mode as AgentFleetMode)
    ? (value.mode as AgentFleetMode)
    : undefined
  const action = typeof value.action === 'string' && actions.includes(value.action as AgentFleetControlAction)
    ? (value.action as AgentFleetControlAction)
    : undefined

  return { centralAgent, enabledAgents, paused, mode, action }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentFleet(params.id, user.userId)
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
    const preferences = readAgentFleetPreferencesFromSettings(project.settings) ?? buildDefaultAgentFleetPreferences()
    const activeLocks = listActiveAgentSurfaceLocks({ projectId: project.id })
    const snapshot = buildAgentFleetSnapshot({
      projectId: project.id,
      state,
      manifest,
      preferences,
      activeLocks,
    })

    return NextResponse.json({
      snapshot,
      preferences,
      settingsKey: AGENT_FLEET_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('agent_fleet.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForAgentFleet(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canWriteAgentFleet(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = parseBody(await request.json().catch(() => ({})))
    const current = readAgentFleetPreferencesFromSettings(project.settings) ?? buildDefaultAgentFleetPreferences()
    const preferences = mergeAgentFleetPreferences(current, body)
    const settings = writeAgentFleetPreferencesToSettings(project.settings, preferences)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    const state =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({
        projectName: project.name,
        projectType: project.template,
      })
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    const activeLocks = listActiveAgentSurfaceLocks({ projectId: project.id })
    const snapshot = buildAgentFleetSnapshot({
      projectId: project.id,
      state,
      manifest,
      preferences,
      activeLocks,
    })

    logger.info('agent_fleet.updated', {
      userId: user.userId,
      projectId: project.id,
      centralAgent: preferences.centralAgent,
      mode: preferences.mode,
      paused: preferences.paused,
    })

    return NextResponse.json({
      snapshot,
      preferences,
      settingsKey: AGENT_FLEET_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('agent_fleet.patch_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
