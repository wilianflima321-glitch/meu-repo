/**
 * J.4 embed providers — local hash (shipped) + BYOK cloud hook (HELD until CostGuard embed path).
 */

import crypto from 'node:crypto'
import type { VectorEmbedProviderKind } from './types'

export const VECTOR_EMBED_DIM = 384

export interface EmbedProvider {
  kind: VectorEmbedProviderKind
  dimensions: number
  embed(texts: string[]): Promise<number[][]>
}

/** Deterministic local embedding — same family as semantic-code-search hash. */
export function createLocalHashEmbedProvider(): EmbedProvider {
  return {
    kind: 'local-hash',
    dimensions: VECTOR_EMBED_DIM,
    async embed(texts: string[]) {
      return texts.map((text) => hashEmbed(text, VECTOR_EMBED_DIM))
    },
  }
}

/**
 * BYOK cloud embed — HELD: returns null provider until CostGuard-backed embed ships.
 * Callers must use local-hash; never silent-fail to empty vectors as "cloud".
 */
export function createByokCloudEmbedProvider(_opts: {
  apiKey: string
  modelId?: string
}): EmbedProvider | null {
  return null
}

function hashEmbed(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0)
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized) return vec

  const tokens = normalized.split(/[^a-z0-9_./-]+/).filter(Boolean)
  for (const token of tokens) {
    const digest = crypto.createHash('sha256').update(token).digest()
    for (let i = 0; i < dim; i++) {
      const byte = digest[i % digest.length]
      vec[i] += ((byte / 255) * 2 - 1) / Math.sqrt(tokens.length)
    }
  }

  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm) || 1
  return vec.map((v) => v / norm)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom > 0 ? dot / denom : 0
}
