import fs from 'node:fs/promises'
import path from 'node:path'
import { searchVectorIndex } from '@/lib/server/vector-index/search'
import { buildRepositoryImportGraph, type RepoGraph } from './repo-graph-builder'
import { extractNeighborhoodSlice, SymbolSlice } from './neighborhood-slicer'
import { resolveWhoImports } from './import-precision-soak'
import type { RepositoryCartographyManifest } from '@/lib/production/repository-cartography-contracts'

export interface RepoGraphRagResult {
  query: string
  neighborhoodFiles: Array<{
    filePath: string
    content: string
  }>
  semanticHits: Array<{
    filePath: string
    score: number
    excerpt: string
  }>
}

export { resolveWhoImports, buildRepositoryImportGraph }
export type { RepoGraph }

/**
 * L.12 RepoGraphRAG: AST Supreme Edition
 * Queries the J.4 VectorIndex, then expands hits to pull exact imported symbol boundaries.
 */
export async function queryRepoGraphRAG(
  query: string,
  projectId: string,
  rootPath: string,
  manifest: RepositoryCartographyManifest,
  options: {
    topK?: number
    maxDegrees?: number
    maxFilesPerHit?: number
    maxTotalFiles?: number
  } = {}
): Promise<RepoGraphRagResult> {
  const { topK = 3, maxDegrees = 1, maxFilesPerHit = 5, maxTotalFiles = 10 } = options

  const vectorResult = await searchVectorIndex({ projectId, query, topK, rootPath })
  const semanticHits = vectorResult.hits
  if (semanticHits.length === 0) {
    return { query, neighborhoodFiles: [], semanticHits: [] }
  }

  const graph = await buildRepositoryImportGraph(manifest, rootPath)
  
  const slices: SymbolSlice[] = []
  
  for (const hit of semanticHits) {
    const absolutePath = path.isAbsolute(hit.filePath)
      ? hit.filePath.replace(/\\/g, '/')
      : path.resolve(rootPath, hit.filePath).replace(/\\/g, '/')

    const sliceResult = extractNeighborhoodSlice(graph, absolutePath, maxDegrees, maxFilesPerHit)
    for (const surface of sliceResult.surfaces) {
      if (!slices.some(s => s.filePath === surface.filePath && s.startLine === surface.startLine && s.endLine === surface.endLine)) {
        slices.push(surface)
      }
      if (slices.length >= maxTotalFiles) break
    }
    if (slices.length >= maxTotalFiles) break
  }

  const neighborhoodFiles: Array<{ filePath: string; content: string }> = []
  
  for (const s of slices) {
    try {
      const fullContent = await fs.readFile(s.filePath, 'utf8')
      if (s.startLine && s.endLine) {
        // Slice the exact lines for the symbol!
        const lines = fullContent.split('\n')
        // startLine is 1-indexed, endLine is 1-indexed
        const sliced = lines.slice(Math.max(0, s.startLine - 1), s.endLine).join('\n')
        neighborhoodFiles.push({
          filePath: s.filePath,
          content: `// [AST Slice: ${s.startLine}-${s.endLine}]\n${sliced}`
        })
      } else {
        neighborhoodFiles.push({ filePath: s.filePath, content: fullContent })
      }
    } catch {
      // file might be deleted or unreadable, skip
    }
  }

  return {
    query,
    neighborhoodFiles,
    semanticHits: semanticHits.map(h => ({
      filePath: h.filePath,
      score: h.score,
      excerpt: h.excerpt,
    }))
  }
}

