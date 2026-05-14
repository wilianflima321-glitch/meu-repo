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
  type AgenticProductionState,
  type ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import {
  buildGameProductionSpineContract,
  evaluateGameProductionReadiness,
  mergeGameProductionSpineIntoProductionState,
  type GameProductionScale,
} from '@/lib/production/game-production-spine'

const logger = createComponentLogger('api.projects.production-state.game-spine')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

const scaleValues: GameProductionScale[] = ['prototype', 'vertical-slice', 'premium-indie', 'aaa-assisted']
const runtimeTargetValues: ProductionRuntimeTarget[] = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
]

async function loadProjectForGameSpine(projectId: string, userId: string) {
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

function canWriteGameSpine(project: Awaited<ReturnType<typeof loadProjectForGameSpine>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseScale(value: unknown): GameProductionScale | undefined {
  return typeof value === 'string' && scaleValues.includes(value as GameProductionScale)
    ? value as GameProductionScale
    : undefined
}

function parseRuntimeTargets(value: unknown): ProductionRuntimeTarget[] | undefined {
  if (!Array.isArray(value)) return undefined
  const targets = value.filter((item): item is ProductionRuntimeTarget =>
    typeof item === 'string' && runtimeTargetValues.includes(item as ProductionRuntimeTarget)
  )
  return targets.length > 0 ? Array.from(new Set(targets)) : undefined
}

function collectApprovedEvidenceRefs(state: AgenticProductionState): string[] {
  const graphRefs = Object.values(state.graphs)
    .flat()
    .flatMap((node) => node.evidenceRefs)
  const ledgerRefs = state.ledger.flatMap((entry) => entry.evidenceRefs)
  return Array.from(new Set([...graphRefs, ...ledgerRefs].filter((ref) => !ref.startsWith('required:'))))
}

function buildState(project: Awaited<ReturnType<typeof loadProjectForGameSpine>>): AgenticProductionState {
  if (!project) return buildDefaultAgenticProductionState()
  return readAgenticProductionStateFromSettings(project.settings) ?? buildDefaultAgenticProductionState({
    projectName: project.name,
    projectType: project.template,
  })
}

async function readBody(request: NextRequest) {
  try {
    const body = await request.json() as unknown
    if (!isRecord(body)) return {}
    return {
      title: typeof body.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : undefined,
      scale: parseScale(body.scale),
      runtimeTargets: parseRuntimeTargets(body.runtimeTargets),
      createdAt: typeof body.createdAt === 'string' && !Number.isNaN(Date.parse(body.createdAt))
        ? body.createdAt
        : undefined,
    }
  } catch {
    return {}
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForGameSpine(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const scale = parseScale(request.nextUrl.searchParams.get('scale')) ?? 'vertical-slice'
    const state = buildState(project)
    const contract = buildGameProductionSpineContract({
      projectId: project.id,
      title: project.name,
      scale,
      runtimeTargets: state.brain.technicalBible.runtimeTargets,
    })

    return NextResponse.json({
      contract,
      report: evaluateGameProductionReadiness(contract, collectApprovedEvidenceRefs(state)),
      productionReadiness: buildProductionReadinessSummary(state),
      persisted: Boolean(readAgenticProductionStateFromSettings(project.settings)),
    })
  } catch (error) {
    logger.error('game_spine.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForGameSpine(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteGameSpine(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await readBody(request)
    const current = buildState(project)
    const contract = buildGameProductionSpineContract({
      projectId: project.id,
      title: body.title ?? project.name,
      scale: body.scale,
      runtimeTargets: body.runtimeTargets ?? current.brain.technicalBible.runtimeTargets,
      createdAt: body.createdAt,
    })
    const state = mergeGameProductionSpineIntoProductionState(current, contract)
    const settings = writeAgenticProductionStateToSettings(project.settings, state)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('game_spine.persisted', {
      userId: user.userId,
      projectId: project.id,
      scale: contract.scale,
      graphCount: contract.graphs.length,
    })

    return NextResponse.json({
      contract,
      report: evaluateGameProductionReadiness(contract, collectApprovedEvidenceRefs(state)),
      productionState: state,
      productionReadiness: buildProductionReadinessSummary(state),
      persisted: true,
    })
  } catch (error) {
    logger.error('game_spine.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
