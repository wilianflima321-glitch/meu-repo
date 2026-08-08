/**
 * J.4 embed providers — local-hash (default/$0) + BYOK cloud (CostGuard-gated).
 * Never read process.env.OPENAI_API_KEY for product embeds (Law XVI Trava I — no platform pay).
 */

import crypto from 'node:crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import type { VectorEmbedProviderKind } from './types'

const log = createComponentLogger('vector-index.embed-provider')

/** Local-hash dim; BYOK OpenAI text-embedding-3-small requested at same dim for store compat. */
export const VECTOR_EMBED_DIM = 384

export interface EmbedProvider {
  kind: VectorEmbedProviderKind
  dimensions: number
  embed(texts: string[]): Promise<number[][]>
}

/** Deterministic local embedding — lexical/hash family (PARTIAL semantic quality). */
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
 * BYOK cloud embed (OpenAI text-embedding-3-small @ 384d).
 * Requires caller-supplied apiKey. Returns null if key empty — never silent platform key.
 */
export function createByokCloudEmbedProvider(opts: {
  apiKey: string
  modelId?: string
  fetchImpl?: typeof fetch
}): EmbedProvider | null {
  const apiKey = opts.apiKey?.trim()
  if (!apiKey) return null

  const modelId = opts.modelId || 'text-embedding-3-small'
  const fetchImpl = opts.fetchImpl ?? fetch

  return {
    kind: 'byok-cloud',
    dimensions: VECTOR_EMBED_DIM,
    async embed(texts: string[]) {
      if (texts.length === 0) return []

      const response = await fetchImpl('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          input: texts,
          dimensions: VECTOR_EMBED_DIM,
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        log.warn('byok_cloud_embed_http_failed', {
          status: response.status,
          // Never log apiKey or Authorization
          bodyPreview: body.slice(0, 120),
        })
        throw new Error(`BYOK_CLOUD_EMBED_HTTP_${response.status}`)
      }

      const data = (await response.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>
      }
      const rows = Array.isArray(data.data) ? data.data : []
      if (rows.length !== texts.length) {
        throw new Error('BYOK_CLOUD_EMBED_COUNT_MISMATCH')
      }

      const ordered = [...rows].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      return ordered.map((row) => {
        const emb = row.embedding
        if (!Array.isArray(emb) || emb.length === 0) {
          throw new Error('BYOK_CLOUD_EMBED_EMPTY_VECTOR')
        }
        return emb
      })
    },
  }
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
