/**
 * J.4 VectorIndex — shared types (Law XVI / L.12 foundation).
 * Store: SQLite (node:sqlite). Native sqlite-vec vec0 when probe-certified;
 * JS cosine fallback when package/ABI/OS soak fails.
 */

export type VectorEmbedProviderKind = 'local-hash' | 'byok-cloud'

/** Honest quality — lexical-hash is NOT true semantic recall. */
export type VectorSearchQuality = 'lexical-hash' | 'byok-semantic'

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
  searchQuality: VectorSearchQuality
  /** Honest: true only when native sqlite-vec load proven */
  sqliteVecExtension: boolean
  sqliteVecStatus: 'available' | 'held'
  /** Active retrieval backend for this project DB */
  annBackend: 'sqlite-vec-vec0' | 'js-cosine'
  watcherActive: boolean
}

export interface VectorIndexScope {
  userId: string
  projectId: string
  rootPath: string
}
