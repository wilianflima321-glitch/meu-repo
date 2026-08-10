/**
 * J.4 — BYOK reindex → semantic recall certification path (fail-closed).
 *
 * Never platform-pays embeddings. Free tier without BYOK stays local-hash.
 * Mock embed providers allowed in tests; live OpenAI optional via BYOK key only.
 */

import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import type { EmbedProvider } from './embed-provider'
import { VECTOR_EMBED_DIM, createLocalHashEmbedProvider } from './embed-provider'
import { resolveVectorEmbedProvider } from './embed-gate'
import { reindexProjectVectorStore } from './indexer'
import {
  getSemanticRecallSoakRecorder,
  proveSemanticRecallReady,
  type SemanticRecallReadyProbe,
} from './semantic-recall-soak'
import { searchVectorIndex } from './search'
import type { VectorEmbedProviderKind } from './types'

export type J4ByokEmbedGateVerdict = {
  byokCloudAllowed: boolean
  localHashAllowed: boolean
  reason: string
  platformPayBlocked: true
}

/**
 * Fail-closed BYOK embed gate — documents deny/fallback without calling providers.
 */
export async function evaluateJ4ByokEmbedGate(input: {
  userId: string
  projectId: string
  planId?: string
  byokApiKey?: string
  costGuardAdapter?: CostGuardLedgerAdapter
}): Promise<J4ByokEmbedGateVerdict> {
  const byok = await resolveVectorEmbedProvider({
    userId: input.userId,
    projectId: input.projectId,
    mode: 'byok-cloud',
    byokApiKey: input.byokApiKey,
    planId: input.planId,
    estimatedEmbedChars: 100,
    adapter: input.costGuardAdapter,
  })
  const local = await resolveVectorEmbedProvider({
    userId: input.userId,
    projectId: input.projectId,
    mode: 'local-hash',
    planId: input.planId,
    estimatedEmbedChars: 100,
    adapter: input.costGuardAdapter,
  })
  return {
    byokCloudAllowed: byok.ok,
    localHashAllowed: local.ok,
    reason: byok.ok ? 'byok_cloud_gate_open' : byok.reason,
    platformPayBlocked: true,
  }
}

/**
 * Deterministic mock BYOK embed for certification tests — clusters by keyword buckets
 * (physics vs ui) without live OpenAI. Never reads platform env keys.
 */
export function createMockByokEmbedProviderForCert(): EmbedProvider {
  return {
    kind: 'byok-cloud',
    dimensions: VECTOR_EMBED_DIM,
    async embed(texts: string[]) {
      return texts.map((text) => mockTopicEmbed(text, VECTOR_EMBED_DIM))
    },
  }
}

function mockTopicEmbed(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0)
  const lower = text.toLowerCase()
  const physics = /gravity|physics|force|velocity|mass|applygravity/.test(lower)
  const ui = /button|label|ui|render|click|panel/.test(lower)
  if (physics) {
    for (let i = 0; i < dim / 2; i++) vec[i] = 1
  }
  if (ui) {
    for (let i = Math.floor(dim / 2); i < dim; i++) vec[i] = 1
  }
  if (!physics && !ui) {
    for (let i = 0; i < dim; i++) vec[i] = (i % 7) * 0.01
  }
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm) || 1
  return vec.map((v) => v / norm)
}

export type J4ByokSemanticCertInput = {
  projectId: string
  rootPath: string
  fixtures: ReadonlyArray<{ query: string; expectedFilePathIncludes: string }>
  /** Pre-gated embed provider (mock BYOK OK in tests; live BYOK after CostGuard). */
  embed: EmbedProvider
  userId?: string
}

export type J4ByokSemanticCertReport = {
  certified: boolean
  gateReason: string
  recallProbe: SemanticRecallReadyProbe
  reindexOk: boolean
  filesIndexed: number
  chunksIndexed: number
  embedProvider: VectorEmbedProviderKind
  searchQuality: 'byok-semantic' | 'lexical-hash'
  platformPayBlocked: true
  notes: string[]
}

/**
 * BYOK certification path: reindex with supplied embed → semantic recall soak → proveReady.
 * Fail-closed when reindex fails, samples empty, or recall below threshold.
 */
export async function runJ4ByokSemanticCertification(
  input: J4ByokSemanticCertInput,
): Promise<J4ByokSemanticCertReport> {
  const notes: string[] = []
  const recorder = getSemanticRecallSoakRecorder()
  recorder.clear()

  if (input.embed.kind !== 'byok-cloud') {
    notes.push('cert_requires_byok_cloud_embed_provider')
    const recallProbe = proveSemanticRecallReady([])
    return {
      certified: false,
      gateReason: 'embed_provider_not_byok_cloud',
      recallProbe,
      reindexOk: false,
      filesIndexed: 0,
      chunksIndexed: 0,
      embedProvider: input.embed.kind,
      searchQuality: 'lexical-hash',
      platformPayBlocked: true,
      notes,
    }
  }

  let reindexOk = false
  let filesIndexed = 0
  let chunksIndexed = 0
  try {
    const result = await reindexProjectVectorStore({
      projectId: input.projectId,
      rootPath: input.rootPath,
      embed: input.embed,
    })
    reindexOk = true
    filesIndexed = result.files
    chunksIndexed = result.chunks
    notes.push(`reindex_ok files=${result.files} chunks=${result.chunks}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    notes.push(`reindex_failed:${message}`)
    const recallProbe = proveSemanticRecallReady([])
    return {
      certified: false,
      gateReason: 'byok_reindex_failed',
      recallProbe,
      reindexOk: false,
      filesIndexed: 0,
      chunksIndexed: 0,
      embedProvider: 'byok-cloud',
      searchQuality: 'lexical-hash',
      platformPayBlocked: true,
      notes,
    }
  }

  let searchQuality: 'byok-semantic' | 'lexical-hash' = 'lexical-hash'
  for (const fx of input.fixtures) {
    const result = await searchVectorIndex({
      projectId: input.projectId,
      query: fx.query,
      topK: 1,
      embed: input.embed,
    })
    searchQuality = result.searchQuality
    recorder.recordFromSearch({
      query: fx.query,
      expectedFilePathIncludes: fx.expectedFilePathIncludes,
      topHitFilePath: result.hits[0]?.filePath ?? null,
      embedProvider: result.embedProvider,
    })
  }

  const recallProbe = recorder.proveReady()
  const certified =
    reindexOk &&
    recallProbe.ready &&
    searchQuality === 'byok-semantic' &&
    recallProbe.reason === 'j4_semantic_recall_certified'

  if (!certified) {
    notes.push(`recall_gate:${recallProbe.reason}`)
  } else {
    notes.push('j4_byok_semantic_recall_certified')
  }

  return {
    certified,
    gateReason: certified ? 'j4_byok_semantic_recall_certified' : recallProbe.reason,
    recallProbe,
    reindexOk,
    filesIndexed,
    chunksIndexed,
    embedProvider: 'byok-cloud',
    searchQuality,
    platformPayBlocked: true,
    notes,
  }
}

/** Gate-only helper — free tier without BYOK must stay on local-hash ($0). */
export async function assertFreeTierStaysLocalHash(input: {
  userId: string
  projectId: string
  planId?: string
}): Promise<{ ok: true; provider: EmbedProvider } | { ok: false; reason: string }> {
  const gate = await evaluateJ4ByokEmbedGate({
    userId: input.userId,
    projectId: input.projectId,
    planId: input.planId ?? 'free',
  })
  if (gate.byokCloudAllowed) {
    return { ok: false, reason: 'free_tier_must_not_allow_byok_without_key' }
  }
  const local = createLocalHashEmbedProvider()
  return { ok: true, provider: local }
}
