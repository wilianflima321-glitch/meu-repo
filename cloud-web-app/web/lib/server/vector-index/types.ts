/**
 * J.4 VectorIndex — shared types (Law XVI / L.12 foundation).
 * Store: SQLite (node:sqlite). Similarity: cosine over local embeddings.
 * Native sqlite-vec extension = HELD until package+CI land (API ready for swap).
 */

export type VectorEmbedProviderKind = 'local-hash' | 'byok-cloud'

export interface VectorChunkRecord {
  id: string
  projectId: string
  filePath: string
  startLine: number
  endLine: number
  language: string
  content: string
  contentHash: string
  embedding: number[]
  updatedAt: number
}

export interface VectorSearchHit {
  id: string
  filePath: string
  score: number
  excerpt: string
  startLine: number
  endLine: number
  language: string
}

export interface VectorIndexStats {
  projectId: string
  chunkCount: number
  fileCount: number
  lastIndexedAt: number | null
  embedProvider: VectorEmbedProviderKind
  /** Honest: true when using native sqlite-vec; false for cosine-over-SQLite */
  sqliteVecExtension: false
  watcherActive: boolean
}

export interface VectorIndexScope {
  userId: string
  projectId: string
  rootPath: string
}
