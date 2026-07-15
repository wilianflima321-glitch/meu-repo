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
  buildAgentReadReceiptState,
  evaluateAgentReadinessForApply,
  mergeAgentReadReceiptsIntoProductionState,
  readAgentReadReceiptStateFromSettings,
  AGENT_READ_RECEIPTS_SETTINGS_KEY,
  writeAgentReadReceiptStateToSettings,
  type AgentReadReceiptInput,
} from '@/lib/production/agent-read-receipts'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { readResearchIntelligencePacketFromSettings } from '@/lib/production/research-intelligence-bridge'

const logger = createComponentLogger('api.projects.production-state.read-receipts')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

type ReadReceiptsBody = {
  receipts: AgentReadReceiptInput[]
  agent?: string
  targetPaths?: string[]
  enforceReadReceipts?: boolean
}

async function loadProjectForReadReceipts(projectId: string, userId: string) {
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

function canWriteReadReceipts(project: Awaited<ReturnType<typeof loadProjectForReadReceipts>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseReceiptKind(value: unknown): AgentReadReceiptInput['kind'] | null {
  const allowed: AgentReadReceiptInput['kind'][] = [
    'repository-cartography',
    'research-intelligence',
    'repo-surface',
    'mission-ledger',
    'browser-replay',
    'external-tool-plan',
  ]
  return typeof value === 'string' && allowed.includes(value as AgentReadReceiptInput['kind'])
    ? value as AgentReadReceiptInput['kind']
    : null
}

function parseReceipt(value: unknown): AgentReadReceiptInput | null {
  if (!isRecord(value)) return null
  const kind = parseReceiptKind(value.kind)
  if (!kind || typeof value.agent !== 'string' || typeof value.ref !== 'string') return null
  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    agent: value.agent,
    kind,
    ref: value.ref,
    path: typeof value.path === 'string' ? value.path : undefined,
    readAt: typeof value.readAt === 'string' ? value.readAt : undefined,
    evidenceRefs: Array.isArray(value.evidenceRefs)
      ? value.evidenceRefs.filter((item): item is string => typeof item === 'string')
      : undefined,
    note: typeof value.note === 'string' ? value.note : undefined,
  }
}

async function readBody(request: NextRequest): Promise<ReadReceiptsBody> {
  try {
    const body = await request.json() as unknown
    if (!isRecord(body)) return { receipts: [] }
    return {
      receipts: Array.isArray(body.receipts)
        ? body.receipts.map(parseReceipt).filter((item): item is AgentReadReceiptInput => item !== null)
        : [],
      agent: typeof body.agent === 'string' ? body.agent : undefined,
      targetPaths: Array.isArray(body.targetPaths)
        ? body.targetPaths.filter((item): item is string => typeof item === 'string')
        : undefined,
      enforceReadReceipts: typeof body.enforceReadReceipts === 'boolean' ? body.enforceReadReceipts : undefined,
    }
  } catch {
    return { receipts: [] }
  }
}

function buildReadiness(settings: unknown, body: Partial<ReadReceiptsBody>) {
  const manifest = readRepositoryCartographyManifestFromSettings(settings)
  const researchPacket = readResearchIntelligencePacketFromSettings(settings)
  const receiptState = readAgentReadReceiptStateFromSettings(settings)
  return evaluateAgentReadinessForApply({
    agent: body.agent ?? 'Producer Agent',
    targetPaths: body.targetPaths ?? [],
    enforceReadReceipts: body.enforceReadReceipts === true,
    manifest,
    researchPacket,
    receiptState,
  })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReadReceipts(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const agent = request.nextUrl.searchParams.get('agent') || undefined
    const targetPaths = request.nextUrl.searchParams.getAll('targetPath')
    const enforceReadReceipts = request.nextUrl.searchParams.get('enforceReadReceipts') === 'true'

    return NextResponse.json({
      state: readAgentReadReceiptStateFromSettings(project.settings),
      readiness: buildReadiness(project.settings, { agent, targetPaths, enforceReadReceipts }),
      settingsKey: AGENT_READ_RECEIPTS_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('read_receipts.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForReadReceipts(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteReadReceipts(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await readBody(request)
    const previous = readAgentReadReceiptStateFromSettings(project.settings)
    const receiptState = buildAgentReadReceiptState({
      projectId: project.id,
      previous,
      receipts: body.receipts,
    })
    const currentState =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const state = mergeAgentReadReceiptsIntoProductionState(currentState, receiptState)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, state)
    const settings = writeAgentReadReceiptStateToSettings(settingsWithState, receiptState)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('read_receipts.persisted', {
      userId: user.userId,
      projectId: project.id,
      receiptCount: receiptState.receipts.length,
    })

    return NextResponse.json({
      state: receiptState,
      readiness: buildReadiness(settings, body),
      productionState: state,
      readinessSummary: buildProductionReadinessSummary(state),
      settingsKey: AGENT_READ_RECEIPTS_SETTINGS_KEY,
      persisted: true,
    })
  } catch (error) {
    logger.error('read_receipts.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
