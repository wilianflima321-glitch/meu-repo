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
  mergeAgentReadReceiptsIntoProductionState,
  readAgentReadReceiptStateFromSettings,
  writeAgentReadReceiptStateToSettings,
} from '@/lib/production/agent-read-receipts'
import {
  buildDeepSpineScanManifest,
  buildDeepSpineScanReadReceipts,
  DEEP_SPINE_SCAN_SETTINGS_KEY,
  mergeDeepSpineScanIntoProductionState,
  readDeepSpineScanManifestFromSettings,
  writeDeepSpineScanManifestToSettings,
  type DeepSpineScanBudget,
  type DeepSpineScanMode,
  type DeepSpineScanSurfaceSignal,
} from '@/lib/production/deep-spine-scan'
import { readResearchIntelligencePacketFromSettings } from '@/lib/production/research-intelligence-bridge'
import { scanWorkspaceForRepositoryArtifacts } from '@/lib/production/repository-cartography-scanner'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'

const logger = createComponentLogger('api.projects.production-state.deep-spine-scan')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

type DeepSpineScanBody = {
  mode: DeepSpineScanMode
  workspacePath?: string
  scopeDescription?: string
  maxFiles?: number
  maxDepth?: number
  maxBytes?: number
  maxHashBytes?: number
  maxTimeMs?: number
  maxFindings?: number
  allowCloudIndexing?: boolean
  surfaceSignals?: DeepSpineScanSurfaceSignal[]
}

async function loadProjectForDeepSpineScan(projectId: string, userId: string) {
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

function canWriteProject(project: Awaited<ReturnType<typeof loadProjectForDeepSpineScan>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseMode(value: unknown): DeepSpineScanMode {
  const allowed: DeepSpineScanMode[] = ['quick', 'deep', 'aaa', 'external']
  return typeof value === 'string' && allowed.includes(value as DeepSpineScanMode)
    ? value as DeepSpineScanMode
    : 'quick'
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseSurfaceSignal(value: unknown): DeepSpineScanSurfaceSignal | null {
  if (!isRecord(value) || typeof value.path !== 'string') return null
  return {
    path: value.path,
    lineCount: parseNumber(value.lineCount),
    importerCount: parseNumber(value.importerCount),
    hardcodedCopyMatches: parseNumber(value.hardcodedCopyMatches),
    hasWebGpuReference: typeof value.hasWebGpuReference === 'boolean' ? value.hasWebGpuReference : undefined,
    hasAaaRendererEvidence: typeof value.hasAaaRendererEvidence === 'boolean' ? value.hasAaaRendererEvidence : undefined,
    hasLicenseEvidence: typeof value.hasLicenseEvidence === 'boolean' ? value.hasLicenseEvidence : undefined,
    hasChecksumEvidence: typeof value.hasChecksumEvidence === 'boolean' ? value.hasChecksumEvidence : undefined,
  }
}

async function readBody(request: NextRequest): Promise<DeepSpineScanBody> {
  try {
    const body = await request.json() as unknown
    if (!isRecord(body)) return { mode: 'quick' }
    return {
      mode: parseMode(body.mode),
      workspacePath: typeof body.workspacePath === 'string' ? body.workspacePath : undefined,
      scopeDescription: typeof body.scopeDescription === 'string' ? body.scopeDescription : undefined,
      maxFiles: parseNumber(body.maxFiles),
      maxDepth: parseNumber(body.maxDepth),
      maxBytes: parseNumber(body.maxBytes),
      maxHashBytes: parseNumber(body.maxHashBytes),
      maxTimeMs: parseNumber(body.maxTimeMs),
      maxFindings: parseNumber(body.maxFindings),
      allowCloudIndexing: typeof body.allowCloudIndexing === 'boolean' ? body.allowCloudIndexing : undefined,
      surfaceSignals: Array.isArray(body.surfaceSignals)
        ? body.surfaceSignals.map(parseSurfaceSignal).filter((item): item is DeepSpineScanSurfaceSignal => item !== null)
        : undefined,
    }
  } catch {
    return { mode: 'quick' }
  }
}

function budgetFromBody(body: DeepSpineScanBody): Partial<DeepSpineScanBudget> {
  return {
    maxFiles: body.maxFiles,
    maxBytes: body.maxBytes,
    maxHashBytes: body.maxHashBytes,
    maxTimeMs: body.maxTimeMs,
    maxFindings: body.maxFindings,
    allowCloudIndexing: body.allowCloudIndexing,
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForDeepSpineScan(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const manifest = readDeepSpineScanManifestFromSettings(project.settings)
    return NextResponse.json({
      manifest,
      hasManifest: Boolean(manifest),
      settingsKey: DEEP_SPINE_SCAN_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('deep_spine_scan.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForDeepSpineScan(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!canWriteProject(project, user.userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    const manifest = buildDeepSpineScanManifest({
      projectId: project.id,
      mode: body.mode,
      artifacts: scan.artifacts,
      scope: {
        paths: [body.workspacePath ?? '.'],
        description: body.scopeDescription,
      },
      budget: budgetFromBody(body),
      surfaceSignals: body.surfaceSignals,
      researchPacket: readResearchIntelligencePacketFromSettings(project.settings),
    })
    const scanState = mergeDeepSpineScanIntoProductionState(currentState, manifest)
    const receiptState = buildAgentReadReceiptState({
      projectId: project.id,
      previous: readAgentReadReceiptStateFromSettings(project.settings),
      receipts: buildDeepSpineScanReadReceipts({ manifest, agent: 'Producer Agent' }),
    })
    const state = mergeAgentReadReceiptsIntoProductionState(scanState, receiptState)
    const settingsWithState = writeAgenticProductionStateToSettings(project.settings, state)
    const settingsWithManifest = writeDeepSpineScanManifestToSettings(settingsWithState, manifest)
    const settings = writeAgentReadReceiptStateToSettings(settingsWithManifest, receiptState)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('deep_spine_scan.persisted', {
      userId: user.userId,
      projectId: project.id,
      mode: manifest.mode,
      files: manifest.filesScanned,
      findings: manifest.findings.length,
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
      receiptState,
      state,
      readiness: buildProductionReadinessSummary(state),
      settingsKey: DEEP_SPINE_SCAN_SETTINGS_KEY,
      persisted: true,
    })
  } catch (error) {
    logger.error('deep_spine_scan.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
