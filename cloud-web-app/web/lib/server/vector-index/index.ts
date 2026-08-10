/**
 * J.4 VectorIndex — public API
 * Continuous SQLite-backed retrieval for L.14 pack builder.
 * Native sqlite-vec vec0 when probe-certified; BYOK cloud embed = CostGuard-gated (Law XVI Trava I).
 */

export type {
  VectorChunkRecord,
  VectorEmbedProviderKind,
  VectorIndexScope,
  VectorIndexStats,
  VectorSearchHit,
  VectorSearchQuality,
} from './types'
export type { VectorSearchResult } from './search'
export type { VectorEmbedMode } from './embed-gate'
export type { VectorIndexReadiness } from './readiness'
export type { SqliteVecProbeResult } from './sqlite-vec-probe'

export {
  createLocalHashEmbedProvider,
  createByokCloudEmbedProvider,
  cosineSimilarity,
  VECTOR_EMBED_DIM,
} from './embed-provider'
export {
  resolveVectorEmbedProvider,
  settleVectorEmbedReservation,
  cancelVectorEmbedReservation,
  VECTOR_EMBED_DOMAIN,
} from './embed-gate'
export { reindexProjectVectorStore, indexFileIntoVectorStore } from './indexer'
export {
  searchVectorIndex,
  getVectorIndexStats,
  reindexProjectWithByokEmbed,
} from './search'
export {
  startVectorIndexWatcher,
  stopVectorIndexWatcher,
  isVectorWatcherActive,
} from './watcher'
export {
  getVectorIndexDbPath,
  openVectorIndexDb,
  isVectorAnnReady,
  annSearchChunkIds,
} from './store'
export { probeSqliteVecExtension, loadSqliteVecOntoDb } from './sqlite-vec-probe'
export { buildVectorIndexReadiness } from './readiness'
export {
  J4_SEMANTIC_RECALL_MIN_RATE,
  J4_SEMANTIC_RECALL_MIN_SAMPLES,
  evaluateSemanticRecallSoak,
  proveSemanticRecallReady,
  scoreSemanticRecallSample,
  getSemanticRecallSoakRecorder,
  type SemanticRecallSample,
  type SemanticRecallSoakReport,
  type SemanticRecallReadyProbe,
} from './semantic-recall-soak'
export {
  evaluateJ4ByokEmbedGate,
  runJ4ByokSemanticCertification,
  createMockByokEmbedProviderForCert,
  assertFreeTierStaysLocalHash,
  type J4ByokEmbedGateVerdict,
  type J4ByokSemanticCertReport,
} from './j4-byok-semantic-cert'
