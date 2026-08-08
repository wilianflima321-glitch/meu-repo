/**
 * J.4 / L.12 — honest VectorIndex + context-search readiness (no semantic theater).
 */

import { getVectorIndexStats } from './search'
import { probeSqliteVecExtension } from './sqlite-vec-probe'
import type { VectorEmbedProviderKind, VectorSearchQuality } from './types'

export type VectorIndexReadinessStatus = 'ready' | 'partial' | 'blocked'

export interface VectorIndexReadiness {
  status: VectorIndexReadinessStatus
  source: 'local-persistent-cache'
  persistentIndex: true
  crossSessionMemory: true
  incrementalReindex: true
  maxIndexedFiles: number
  maxResults: number
  scope: 'project'
  /** Honest search quality — never claim byok-semantic without BYOK index+query */
  searchQuality: VectorSearchQuality
  embedProvider: VectorEmbedProviderKind
  sqliteVecExtension: boolean
  sqliteVecStatus: 'available' | 'held'
  sqliteVecReason: string
  /** True only when BYOK cloud path is active for this request */
  byokCloudEmbedActive: boolean
  platformPaysEmbeddings: false
  trueSemanticRecall: boolean
  blockers: string[]
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED'
}

export function buildVectorIndexReadiness(input: {
  projectId?: string
  searchQuality?: VectorSearchQuality
  embedProvider?: VectorEmbedProviderKind
  byokCloudEmbedActive?: boolean
  watcherActive?: boolean
}): VectorIndexReadiness {
  const probe = probeSqliteVecExtension()
  const stats = input.projectId
    ? getVectorIndexStats(input.projectId, input.watcherActive ?? false)
    : null

  const searchQuality = input.searchQuality ?? stats?.searchQuality ?? 'lexical-hash'
  const embedProvider = input.embedProvider ?? stats?.embedProvider ?? 'local-hash'
  const byokCloudEmbedActive = Boolean(input.byokCloudEmbedActive)
  const trueSemanticRecall = searchQuality === 'byok-semantic' && byokCloudEmbedActive

  const blockers: string[] = []
  if (probe.status === 'held') {
    blockers.push('native_sqlite_vec_extension_held')
  }
  if (!trueSemanticRecall) {
    blockers.push('true_semantic_recall_requires_byok_cloud_index')
  }
  if (embedProvider === 'local-hash') {
    blockers.push('embed_provider_local_hash_partial')
  }

  const status: VectorIndexReadinessStatus =
    blockers.length === 0 && probe.sqliteVecExtension && trueSemanticRecall
      ? 'ready'
      : 'partial'

  return {
    status,
    source: 'local-persistent-cache',
    persistentIndex: true,
    crossSessionMemory: true,
    incrementalReindex: true,
    maxIndexedFiles: 400,
    maxResults: 8,
    scope: 'project',
    searchQuality,
    embedProvider,
    sqliteVecExtension: probe.sqliteVecExtension,
    sqliteVecStatus: probe.status,
    sqliteVecReason: probe.reason,
    byokCloudEmbedActive,
    platformPaysEmbeddings: false,
    trueSemanticRecall,
    blockers,
    // Full IMPLEMENTED only when native vec + BYOK semantic both live
    capabilityStatus:
      status === 'ready' && trueSemanticRecall && probe.sqliteVecExtension
        ? 'IMPLEMENTED'
        : 'PARTIAL',
  }
}
