/**
 * J.4 retrieval — top-k cosine over SQLite-backed chunks (JS fallback).
 * BYOK cloud query only when index was built with byok-cloud (same embedding space).
 * Native sqlite-vec ANN = HELD — see sqlite-vec-probe.ts.
 */

import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import { cosineSimilarity, createLocalHashEmbedProvider, type EmbedProvider } from './embed-provider'
import {
  resolveVectorEmbedProvider,
  settleVectorEmbedReservation,
  type VectorEmbedMode,
} from './embed-gate'
import { reindexProjectVectorStore } from './indexer'
import { probeSqliteVecExtension } from './sqlite-vec-probe'
import { countVectorChunks, getVectorMeta, listAllChunks } from './store'
import type {
  VectorEmbedProviderKind,
  VectorIndexStats,
  VectorSearchHit,
  VectorSearchQuality,
} from './types'

export interface VectorSearchResult {
  hits: VectorSearchHit[]
  searchQuality: VectorSearchQuality
  embedProvider: VectorEmbedProviderKind
  modeUsed: VectorEmbedMode
  deniedReason?: string
}

function parseEmbedProvider(raw: string | null): VectorEmbedProviderKind {
  return raw === 'byok-cloud' ? 'byok-cloud' : 'local-hash'
}

function scoreChunks(
  chunks: Array<{
    embedding: number[]
    id: string
    filePath: string
    content: string
    startLine: number
    endLine: number
    language: string
  }>,
  queryVec: number[],
  topK: number,
): VectorSearchHit[] {
  return chunks
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryVec, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk, score }) => ({
      id: chunk.id,
      filePath: chunk.filePath,
      score,
      excerpt: chunk.content.slice(0, 600),
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      language: chunk.language,
    }))
}

async function localHashSearch(
  projectId: string,
  query: string,
  topK: number,
  deniedReason?: string,
): Promise<VectorSearchResult> {
  const chunks = listAllChunks(projectId)
  const indexProvider = parseEmbedProvider(getVectorMeta(projectId, 'embedProvider'))
  if (chunks.length === 0 || !query.trim()) {
    return {
      hits: [],
      searchQuality: 'lexical-hash',
      embedProvider: indexProvider,
      modeUsed: 'local-hash',
      deniedReason,
    }
  }
  const [queryVec] = await createLocalHashEmbedProvider().embed([query])
  return {
    hits: scoreChunks(chunks, queryVec, topK),
    searchQuality: 'lexical-hash',
    embedProvider: indexProvider === 'byok-cloud' ? 'local-hash' : indexProvider,
    modeUsed: 'local-hash',
    deniedReason,
  }
}

export async function searchVectorIndex(input: {
  projectId: string
  query: string
  topK?: number
  /** If index empty and rootPath given, reindex once (local-hash unless embed provided) */
  rootPath?: string
  /** Override embed provider (tests / callers that already gated) */
  embed?: EmbedProvider
  /**
   * Requested mode. byok-cloud requires byokApiKey + CostGuard and a byok-cloud index.
   * Default local-hash — never platform-pays.
   */
  embedMode?: VectorEmbedMode
  userId?: string
  byokApiKey?: string
  planId?: string
  costGuardAdapter?: CostGuardLedgerAdapter
}): Promise<VectorSearchResult> {
  const topK = Math.max(1, Math.min(input.topK ?? 8, 24))
  let chunks = listAllChunks(input.projectId)
  if (chunks.length === 0 && input.rootPath) {
    await reindexProjectVectorStore({
      projectId: input.projectId,
      rootPath: input.rootPath,
      embed: input.embed ?? createLocalHashEmbedProvider(),
    })
    chunks = listAllChunks(input.projectId)
  }
  if (chunks.length === 0 || !input.query.trim()) {
    return {
      hits: [],
      searchQuality: 'lexical-hash',
      embedProvider: parseEmbedProvider(getVectorMeta(input.projectId, 'embedProvider')),
      modeUsed: 'local-hash',
    }
  }

  const indexProvider = parseEmbedProvider(getVectorMeta(input.projectId, 'embedProvider'))

  // Explicit embed override (unit tests / pre-gated callers)
  if (input.embed) {
    const [queryVec] = await input.embed.embed([input.query])
    return {
      hits: scoreChunks(chunks, queryVec, topK),
      searchQuality: input.embed.kind === 'byok-cloud' ? 'byok-semantic' : 'lexical-hash',
      embedProvider: input.embed.kind,
      modeUsed: input.embed.kind === 'byok-cloud' ? 'byok-cloud' : 'local-hash',
    }
  }

  const requested: VectorEmbedMode = input.embedMode ?? 'local-hash'
  if (requested !== 'byok-cloud') {
    return localHashSearch(input.projectId, input.query, topK)
  }

  // BYOK cloud path — CostGuard + key required; index must already be byok-cloud
  const resolved = await resolveVectorEmbedProvider({
    userId: input.userId || 'anonymous',
    projectId: input.projectId,
    mode: 'byok-cloud',
    byokApiKey: input.byokApiKey,
    planId: input.planId,
    estimatedEmbedChars: input.query.length,
    adapter: input.costGuardAdapter,
  })

  if (!resolved.ok) {
    return localHashSearch(input.projectId, input.query, topK, resolved.reason)
  }

  if (indexProvider !== 'byok-cloud') {
    await settleVectorEmbedReservation({
      reservation: resolved.reservation,
      adapter: resolved.adapter,
      actualEmbedChars: 0,
      failed: true,
    })
    return localHashSearch(
      input.projectId,
      input.query,
      topK,
      'BYOK_INDEX_REQUIRED — reindex with byok-cloud before semantic query',
    )
  }

  let failed = false
  try {
    const [queryVec] = await resolved.provider.embed([input.query])
    return {
      hits: scoreChunks(chunks, queryVec, topK),
      searchQuality: 'byok-semantic',
      embedProvider: 'byok-cloud',
      modeUsed: 'byok-cloud',
    }
  } catch {
    failed = true
    return localHashSearch(input.projectId, input.query, topK, 'BYOK_QUERY_EMBED_FAILED')
  } finally {
    await settleVectorEmbedReservation({
      reservation: resolved.reservation,
      adapter: resolved.adapter,
      actualEmbedChars: failed ? 0 : input.query.length,
      failed,
    })
  }
}

/**
 * Explicit BYOK reindex — CostGuard reserve before any provider call.
 * Free tier without BYOK key → denied (never platform-pay).
 */
export async function reindexProjectWithByokEmbed(input: {
  userId: string
  projectId: string
  rootPath: string
  byokApiKey?: string
  planId?: string
  costGuardAdapter?: CostGuardLedgerAdapter
  estimatedEmbedChars?: number
}): Promise<
  | { ok: true; files: number; chunks: number }
  | { ok: false; reason: string }
> {
  const resolved = await resolveVectorEmbedProvider({
    userId: input.userId,
    projectId: input.projectId,
    mode: 'byok-cloud',
    byokApiKey: input.byokApiKey,
    planId: input.planId,
    estimatedEmbedChars: input.estimatedEmbedChars ?? 50_000,
    adapter: input.costGuardAdapter,
  })
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason }
  }

  let failed = false
  try {
    const result = await reindexProjectVectorStore({
      projectId: input.projectId,
      rootPath: input.rootPath,
      embed: resolved.provider,
    })
    return { ok: true, files: result.files, chunks: result.chunks }
  } catch {
    failed = true
    return { ok: false, reason: 'BYOK_REINDEX_FAILED' }
  } finally {
    await settleVectorEmbedReservation({
      reservation: resolved.reservation,
      adapter: resolved.adapter,
      actualEmbedChars: failed ? 0 : input.estimatedEmbedChars ?? 50_000,
      failed,
    })
  }
}

export function getVectorIndexStats(projectId: string, watcherActive = false): VectorIndexStats {
  const counts = countVectorChunks(projectId)
  const last = getVectorMeta(projectId, 'lastIndexedAt')
  const embedProvider = parseEmbedProvider(getVectorMeta(projectId, 'embedProvider'))
  const probe = probeSqliteVecExtension()
  return {
    projectId,
    chunkCount: counts.chunkCount,
    fileCount: counts.fileCount,
    lastIndexedAt: last ? Number(last) : null,
    embedProvider,
    searchQuality: embedProvider === 'byok-cloud' ? 'byok-semantic' : 'lexical-hash',
    sqliteVecExtension: probe.sqliteVecExtension,
    sqliteVecStatus: probe.status,
    watcherActive,
  }
}
