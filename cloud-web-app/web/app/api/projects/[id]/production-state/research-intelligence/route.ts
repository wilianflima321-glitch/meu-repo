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
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import {
  buildResearchIntelligencePacket,
  mergeResearchIntelligenceIntoProductionState,
  readResearchIntelligencePacketFromSettings,
  RESEARCH_INTELLIGENCE_SETTINGS_KEY,
  writeResearchIntelligencePacketToSettings,
  type ResearchEvidenceInput,
} from '@/lib/production/research-intelligence-bridge'

const logger = createComponentLogger('api.projects.production-state.research-intelligence')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

type ResearchIntelligenceBody = {
  mission?: string
  evidence: ResearchEvidenceInput[]
}

async function loadProjectForResearchIntelligence(projectId: string, userId: string) {
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

function canWriteResearchIntelligence(
  project: Awaited<ReturnType<typeof loadProjectForResearchIntelligence>>,
  userId: string
): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseSourceKind(value: unknown): ResearchEvidenceInput['sourceKind'] {
  const allowed: NonNullable<ResearchEvidenceInput['sourceKind']>[] = [
    'web',
    'official-docs',
    'paper',
    'github',
    'huggingface-hub',
    'browser-operator',
    'local-repo',
    'user-upload',
    'unknown',
  ]
  return typeof value === 'string' && allowed.includes(value as NonNullable<ResearchEvidenceInput['sourceKind']>)
    ? value as ResearchEvidenceInput['sourceKind']
    : undefined
}

function parseEvidenceItem(value: unknown): ResearchEvidenceInput | null {
  if (!isRecord(value)) return null
  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    title: typeof value.title === 'string' ? value.title : undefined,
    sourceKind: parseSourceKind(value.sourceKind),
    url: typeof value.url === 'string' ? value.url : undefined,
    collectedAt: typeof value.collectedAt === 'string' ? value.collectedAt : undefined,
    claim: typeof value.claim === 'string' ? value.claim : undefined,
    summary: typeof value.summary === 'string' ? value.summary : undefined,
    confidence: typeof value.confidence === 'number' ? value.confidence : undefined,
    relatedPaths: Array.isArray(value.relatedPaths)
      ? value.relatedPaths.filter((item): item is string => typeof item === 'string')
      : undefined,
    evidenceRefs: Array.isArray(value.evidenceRefs)
      ? value.evidenceRefs.filter((item): item is string => typeof item === 'string')
      : undefined,
    requiresBrowserReplay: typeof value.requiresBrowserReplay === 'boolean' ? value.requiresBrowserReplay : undefined,
    requiresHumanApproval: typeof value.requiresHumanApproval === 'boolean' ? value.requiresHumanApproval : undefined,
    conflictWithRepo: typeof value.conflictWithRepo === 'boolean' ? value.conflictWithRepo : undefined,
  }
}

async function readBody(request: NextRequest): Promise<ResearchIntelligenceBody> {
  try {
    const body = await request.json() as unknown
    if (!isRecord(body)) return { evidence: [] }
    const evidence = Array.isArray(body.evidence)
      ? body.evidence.map(parseEvidenceItem).filter((item): item is ResearchEvidenceInput => item !== null)
      : []
    return {
      mission: typeof body.mission === 'string' ? body.mission : undefined,
      evidence,
    }
  } catch {
    return { evidence: [] }
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForResearchIntelligence(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const packet = readResearchIntelligencePacketFromSettings(project.settings)
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)

    return NextResponse.json({
      packet,
      hasPacket: Boolean(packet),
      repositoryManifestId: manifest?.id ?? null,
      settingsKey: RESEARCH_INTELLIGENCE_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('research_intelligence.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForResearchIntelligence(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteResearchIntelligence(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await readBody(request)
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    const currentState =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const packet = buildResearchIntelligencePacket({
      projectId: project.id,
      mission: body.mission,
      evidence: body.evidence,
      repositoryManifest: manifest,
    })
    const state = mergeResearchIntelligenceIntoProductionState(currentState, packet)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, state)
    const settings = writeResearchIntelligencePacketToSettings(settingsWithState, packet)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('research_intelligence.persisted', {
      userId: user.userId,
      projectId: project.id,
      sources: packet.sources.length,
      claims: packet.claims.length,
      risks: packet.risks.length,
      repositoryManifestId: manifest?.id ?? null,
    })

    return NextResponse.json({
      packet,
      state,
      readiness: buildProductionReadinessSummary(state),
      repositoryManifestId: manifest?.id ?? null,
      persisted: true,
    })
  } catch (error) {
    logger.error('research_intelligence.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
