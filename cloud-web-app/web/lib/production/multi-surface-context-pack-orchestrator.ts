/**
 * L.14 / A2 — Live MultiSurfaceContextPack orchestrator.
 * Gathers vector retrieval + cartography + scene/terrain/renderer honesty → pack.
 */

import crypto from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  assertPackWithinBudget,
  buildMultiSurfaceContextPack,
  type MultiSurfaceContextPack,
  type WorkspaceSurfaceMode,
} from '@/lib/production/multi-surface-context-pack'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import { loadHeightfieldFromWorkspace } from '@/lib/production/terrain-heightfield-authority'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { prisma } from '@/lib/prisma'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'
import {
  reindexProjectVectorStore,
  searchVectorIndex,
  startVectorIndexWatcher,
  isVectorWatcherActive,
} from '@/lib/server/vector-index'
import { getAmbientMoALiveWire } from '@/lib/ambient'

const log = createComponentLogger('multi-surface-context-pack-orchestrator')

export interface LiveContextPackResult {
  pack: MultiSurfaceContextPack
  contextPackId: string
  promptSection: string
  repositoryManifestId?: string
  vectorHits: number
  watcherActive: boolean
}

function hashPackId(pack: MultiSurfaceContextPack): string {
  const digest = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        projectId: pack.projectId,
        tokenCount: pack.tokenCount,
        paths: pack.codeChunks.map((c) => `${c.path}:${c.startLine}`),
        scene: pack.sceneSelection,
        terrain: pack.terrainChunkRef,
        validation: pack.lastValidationGate?.verdict,
      }),
    )
    .digest('hex')
  return `ctx_${digest.slice(0, 24)}`
}

function inferMode(query: string, explicit?: WorkspaceSurfaceMode): WorkspaceSurfaceMode {
  if (explicit) return explicit
  const q = query.toLowerCase()
  if (/\b(terrain|mesh|scene|viewport|gameplay|navmesh|gas)\b/.test(q)) return 'game-3d'
  if (/\b(react|dom|css|next\.js|tsx|component)\b/.test(q)) return 'web-react'
  if (/\b(cli|terminal|shell|cargo|rust)\b/.test(q)) return 'server-cli'
  return 'mixed'
}

function packToPromptSection(pack: MultiSurfaceContextPack, contextPackId: string): string {
  const lines: string[] = [
    '',
    '=== L.14 MultiSurfaceContextPack ===',
    `contextPackId: ${contextPackId}`,
    `surfaces: ${pack.activeSurfaces.join(', ')}`,
    `tokens: ${pack.tokenCount}/${pack.tokenBudget}`,
  ]
  if (pack.repositoryManifestId) lines.push(`cartography: ${pack.repositoryManifestId}`)
  if (typeof pack.capabilityScore === 'number') lines.push(`capabilityScore: ${pack.capabilityScore}`)
  if (pack.sceneSelection?.length) lines.push(`sceneSelection: ${pack.sceneSelection.join(', ')}`)
  if (pack.terrainChunkRef) lines.push(`terrain: ${pack.terrainChunkRef}`)
  if (pack.visualScriptGraphRef) lines.push(`vsGraph: ${pack.visualScriptGraphRef}`)
  if (pack.lastValidationGate) {
    lines.push(`validation: ${pack.lastValidationGate.verdict} — ${pack.lastValidationGate.summary}`)
  }
  if (pack.ambientCriticalDelta) {
    lines.push(
      `ambientCritical: ${pack.ambientCriticalDelta.label} conf=${pack.ambientCriticalDelta.confidence} source=${pack.ambientCriticalDelta.source} physiologyHeld=true`,
    )
  }
  for (const chunk of pack.codeChunks.slice(0, 12)) {
    lines.push(`--- ${chunk.path}:${chunk.startLine}-${chunk.endLine ?? chunk.startLine}`)
    lines.push(chunk.content.slice(0, 1200))
  }
  if (pack.previewConsoleErrors?.length) {
    lines.push('previewErrors:')
    lines.push(...pack.previewConsoleErrors.slice(0, 5))
  }
  if (pack.terminalTail) lines.push(`terminalTail:\n${pack.terminalTail.slice(0, 800)}`)
  lines.push('=== end L.14 pack ===')
  return lines.join('\n')
}

/**
 * Build a live L.14 pack for a project query. Starts watcher if not active.
 */
export async function buildLiveMultiSurfaceContextPack(input: {
  userId: string
  projectId: string
  query: string
  tokenBudget?: number
  mode?: WorkspaceSurfaceMode
  sceneSelection?: string[]
  visualScriptGraphRef?: string
  previewDomSnapshot?: string
  previewConsoleErrors?: string[]
  terminalTail?: string
  lastValidationGate?: MultiSurfaceContextPack['lastValidationGate']
  capabilityScore?: number
  ensureWatcher?: boolean
  ambientCriticalDelta?: MultiSurfaceContextPack['ambientCriticalDelta']
}): Promise<LiveContextPackResult> {
  const mode = inferMode(input.query, input.mode)
  const rootPath = getScopedWorkspaceRoot(input.userId, input.projectId)

  if (input.ensureWatcher !== false && !isVectorWatcherActive(input.projectId)) {
    try {
      startVectorIndexWatcher({ projectId: input.projectId, rootPath })
    } catch (error) {
      log.warn('vector_watcher_start_failed', { error })
    }
  }

  const searchResult = await searchVectorIndex({
    projectId: input.projectId,
    query: input.query,
    topK: 10,
    rootPath,
  })
  const hits = searchResult.hits

  // Cold start: if still empty after search, force reindex once
  if (hits.length === 0) {
    await reindexProjectVectorStore({ projectId: input.projectId, rootPath })
  }
  const finalHits =
    hits.length > 0
      ? hits
      : (await searchVectorIndex({ projectId: input.projectId, query: input.query, topK: 10 })).hits

  let repositoryManifestId: string | undefined
  try {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId: input.userId },
      select: { settings: true },
    })
    const manifest = readRepositoryCartographyManifestFromSettings(project?.settings)
    repositoryManifestId = manifest?.id
  } catch {
    // optional
  }

  let terrainChunkRef: string | undefined
  try {
    const hf = await loadHeightfieldFromWorkspace({
      userId: input.userId,
      projectId: input.projectId,
      terrainId: 'default',
    })
    if (hf) {
      terrainChunkRef = `heightfield:default:${hf.meta.resolution}x${hf.meta.resolution}`
    }
  } catch {
    // optional scene slice
  }

  const honesty = evaluateRendererHonesty({
    capabilityScore: input.capabilityScore,
  })
  const capabilityScore =
    input.capabilityScore ??
    (honesty.marketingAllowed ? 70 : honesty.web.status === 'live' ? 55 : 35)

  const pack = buildMultiSurfaceContextPack({
    projectId: input.projectId,
    mode,
    tokenBudget: input.tokenBudget ?? (mode === 'game-3d' ? 3000 : 2500),
    repositoryManifestId,
    codeChunks: finalHits.map((h) => ({
      path: h.filePath,
      startLine: h.startLine,
      endLine: h.endLine,
      content: h.excerpt,
      tokenEstimate: Math.max(1, Math.ceil(h.excerpt.length / 4)),
    })),
    sceneSelection: input.sceneSelection,
    visualScriptGraphRef: input.visualScriptGraphRef,
    terrainChunkRef,
    capabilityScore,
    previewDomSnapshot: input.previewDomSnapshot,
    previewConsoleErrors: input.previewConsoleErrors,
    terminalTail: input.terminalTail,
    lastValidationGate: input.lastValidationGate,
    ambientCriticalDelta:
      input.ambientCriticalDelta ?? getAmbientMoALiveWire()?.getLatestMoASlice(),
  })

  assertPackWithinBudget(pack)
  const contextPackId = hashPackId(pack)
  const promptSection = packToPromptSection(pack, contextPackId)

  log.info('live_pack_built', {
    projectId: input.projectId,
    contextPackId,
    mode,
    vectorHits: finalHits.length,
    tokenCount: pack.tokenCount,
  })

  return {
    pack,
    contextPackId,
    promptSection,
    repositoryManifestId,
    vectorHits: finalHits.length,
    watcherActive: isVectorWatcherActive(input.projectId),
  }
}
