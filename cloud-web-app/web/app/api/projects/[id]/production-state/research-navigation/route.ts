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
  buildResearchNavigationMesh,
  mergeResearchNavigationMeshIntoProductionState,
  readResearchNavigationMeshFromSettings,
  RESEARCH_NAVIGATION_MESH_SETTINGS_KEY,
  writeResearchNavigationMeshToSettings,
  type AgentNavigationCapabilityInput,
  type AgentNavigationMissionKind,
} from '@/lib/production/research-navigation-mesh'

const logger = createComponentLogger('api.projects.production-state.research-navigation')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

const MISSION_KINDS = new Set<AgentNavigationMissionKind>([
  'advanced-research',
  'app-prototyping',
  'account-operations',
  'commerce',
  'devops',
  'content-capture',
])

async function loadProjectForResearchNavigation(projectId: string, userId: string) {
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

function canWriteResearchNavigation(
  project: Awaited<ReturnType<typeof loadProjectForResearchNavigation>>,
  userId: string
): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function readMissionKind(value: unknown): AgentNavigationMissionKind | undefined {
  return typeof value === 'string' && MISSION_KINDS.has(value as AgentNavigationMissionKind)
    ? (value as AgentNavigationMissionKind)
    : undefined
}

function coerceNavigationBody(value: unknown): AgentNavigationCapabilityInput {
  if (!isRecord(value)) return {}
  return {
    missionKind: readMissionKind(value.missionKind),
    targetUrl: readString(value.targetUrl),
    intendedAction: readString(value.intendedAction),
    pageText: typeof value.pageText === 'string' ? value.pageText : null,
    allowedDomains: readStringArray(value.allowedDomains),
    deniedDomains: readStringArray(value.deniedDomains),
    amountUsd: typeof value.amountUsd === 'number' && Number.isFinite(value.amountUsd) ? value.amountUsd : undefined,
    hasCloudBrowser: readBoolean(value.hasCloudBrowser),
    hasChromeExtension: readBoolean(value.hasChromeExtension),
    hasChromeDevTools: readBoolean(value.hasChromeDevTools),
    hasComputerUseSandbox: readBoolean(value.hasComputerUseSandbox),
    hasMobileCompanion: readBoolean(value.hasMobileCompanion),
    hasHeadlessBrowserWorker: readBoolean(value.hasHeadlessBrowserWorker),
    hasReplayCapture: readBoolean(value.hasReplayCapture),
    hasScreenshotCapture: readBoolean(value.hasScreenshotCapture),
    hasDomSnapshot: readBoolean(value.hasDomSnapshot),
    hasPauseControl: readBoolean(value.hasPauseControl),
    hasHumanTakeover: readBoolean(value.hasHumanTakeover),
    hasHumanApproval: readBoolean(value.hasHumanApproval),
    hasCredentialVault: readBoolean(value.hasCredentialVault),
    hasNetworkIsolation: readBoolean(value.hasNetworkIsolation),
  }
}

async function readBody(request: NextRequest): Promise<AgentNavigationCapabilityInput> {
  try {
    return coerceNavigationBody(await request.json())
  } catch {
    return {}
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForResearchNavigation(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const mesh = readResearchNavigationMeshFromSettings(project.settings)

    return NextResponse.json({
      mesh,
      hasMesh: Boolean(mesh),
      settingsKey: RESEARCH_NAVIGATION_MESH_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('research_navigation.get_failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForResearchNavigation(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteResearchNavigation(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readBody(request)
    const currentState =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const mesh = buildResearchNavigationMesh(body)
    const state = mergeResearchNavigationMeshIntoProductionState(currentState, mesh)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, state)
    const settings = writeResearchNavigationMeshToSettings(settingsWithState, mesh)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('research_navigation.persisted', {
      userId: user.userId,
      projectId: project.id,
      capabilityStatus: mesh.capabilityStatus,
      recommendedLane: mesh.recommendedLane,
    })

    return NextResponse.json({
      mesh,
      state,
      readiness: buildProductionReadinessSummary(state),
      persisted: true,
      settingsKey: RESEARCH_NAVIGATION_MESH_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('research_navigation.post_failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
