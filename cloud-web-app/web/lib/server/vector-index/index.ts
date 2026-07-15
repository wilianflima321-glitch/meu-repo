/**
 * J.4 VectorIndex — public API
 * Continuous SQLite-backed retrieval for L.14 pack builder.
 */

export type {
  VectorChunkRecord,
  VectorEmbedProviderKind,
  VectorIndexScope,
  VectorIndexStats,
  VectorSearchHit,
} from './types'
export {
  createLocalHashEmbedProvider,
  createByokCloudEmbedProvider,
  cosineSimilarity,
  VECTOR_EMBED_DIM,
} from './embed-provider'
export { reindexProjectVectorStore, indexFileIntoVectorStore } from './indexer'
export { searchVectorIndex, getVectorIndexStats } from './search'
export {
  startVectorIndexWatcher,
  stopVectorIndexWatcher,
  isVectorWatcherActive,
} from './watcher'
export { getVectorIndexDbPath, openVectorIndexDb } from './store'
