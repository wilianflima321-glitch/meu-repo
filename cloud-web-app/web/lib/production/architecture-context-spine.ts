/**
 * A2 / #58 — Architecture context spine: real IDs + L.14 prompt for Laws gate + MoA/chat.
 */

import crypto from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildLiveMultiSurfaceContextPack,
  type LiveContextPackResult,
} from '@/lib/production/multi-surface-context-pack-orchestrator'
import type { WorkspaceSurfaceMode } from '@/lib/production/multi-surface-context-pack'
import { loadProjectRulesContext } from '@/lib/server/project-rules'

const log = createComponentLogger('architecture-context-spine')

export interface ArchitectureContextSpine {
  lawsPackId: string
  cartographyManifestId: string
  contextPackId: string
  projectMemoryDigestId: string
  pack: LiveContextPackResult['pack']
  promptSection: string
  vectorHits: number
  watcherActive: boolean
}

function hashId(prefix: string, material: string): string {
  return `${prefix}_${crypto.createHash('sha256').update(material).digest('hex').slice(0, 20)}`
}

export async function buildArchitectureContextSpine(input: {
  userId: string
  projectId: string
  query: string
  mode?: WorkspaceSurfaceMode
  tokenBudget?: number
  sceneSelection?: string[]
}): Promise<ArchitectureContextSpine> {
  const [live, projectRules] = await Promise.all([
    buildLiveMultiSurfaceContextPack({
      userId: input.userId,
      projectId: input.projectId,
      query: input.query,
      mode: input.mode,
      tokenBudget: input.tokenBudget,
      sceneSelection: input.sceneSelection,
    }),
    loadProjectRulesContext({ userId: input.userId, projectId: input.projectId }).catch(() => ''),
  ])

  const lawsMaterial = [
    'AETHEL_SUPREMACY_LAWS_XVI',
    'ZERO_MVP',
    'TRAVA_I_II_III',
    'LAZY_INSPECTOR',
    'L5_TYPECHECK',
    projectRules || '',
  ].join('|')

  const lawsPackId = hashId('laws', lawsMaterial)
  const cartographyManifestId = live.repositoryManifestId || hashId('cart', input.projectId)
  const projectMemoryDigestId = hashId(
    'mem',
    `${input.projectId}:${live.contextPackId}:${live.pack.tokenCount}`,
  )

  const spinePrompt = [
    live.promptSection,
    '',
    '=== Architecture Laws spine (#58) ===',
    `lawsPackId: ${lawsPackId}`,
    `cartographyManifestId: ${cartographyManifestId}`,
    `contextPackId: ${live.contextPackId}`,
    `projectMemoryDigestId: ${projectMemoryDigestId}`,
    projectRules ? `projectRules:\n${projectRules.slice(0, 1500)}` : 'projectRules: (none)',
    '=== end spine ===',
  ].join('\n')

  log.info('architecture_spine_built', {
    projectId: input.projectId,
    contextPackId: live.contextPackId,
    vectorHits: live.vectorHits,
  })

  return {
    lawsPackId,
    cartographyManifestId,
    contextPackId: live.contextPackId,
    projectMemoryDigestId,
    pack: live.pack,
    promptSection: spinePrompt,
    vectorHits: live.vectorHits,
    watcherActive: live.watcherActive,
  }
}
