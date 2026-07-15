/**
 * J.4 retrieval — top-k cosine over SQLite-backed chunks.
 */

import { createLocalHashEmbedProvider, cosineSimilarity } from './embed-provider'
import { countVectorChunks, getVectorMeta, listAllChunks } from './store'
import type { VectorIndexStats, VectorSearchHit } from './types'
import { reindexProjectVectorStore } from './indexer'

export async function searchVectorIndex(input: {
  projectId: string
  query: string
  topK?: number
  /** If index empty and rootPath given, reindex once */
  rootPath?: string
}): Promise<VectorSearchHit[]> {
  const topK = Math.max(1, Math.min(input.topK ?? 8, 24))
  let chunks = listAllChunks(input.projectId)
  if (chunks.length === 0 && input.rootPath) {
    await reindexProjectVectorStore({ projectId: input.projectId, rootPath: input.rootPath })
    chunks = listAllChunks(input.projectId)
  }
  if (chunks.length === 0 || !input.query.trim()) return []

  const [queryVec] = await createLocalHashEmbedProvider().embed([input.query])
  const scored = chunks
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryVec, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored.map(({ chunk, score }) => ({
    id: chunk.id,
    filePath: chunk.filePath,
    score,
    excerpt: chunk.content.slice(0, 600),
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    language: chunk.language,
  }))
}

export function getVectorIndexStats(projectId: string, watcherActive = false): VectorIndexStats {
  const counts = countVectorChunks(projectId)
  const last = getVectorMeta(projectId, 'lastIndexedAt')
  return {
    projectId,
    chunkCount: counts.chunkCount,
    fileCount: counts.fileCount,
    lastIndexedAt: last ? Number(last) : null,
    embedProvider: 'local-hash',
    sqliteVecExtension: false,
    watcherActive,
  }
}
