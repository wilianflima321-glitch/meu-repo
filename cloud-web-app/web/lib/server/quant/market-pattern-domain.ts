/**
 * N6 — VectorIndex domain tag `market-pattern` for OHLCV slices (J.4 deepen).
 * Code/scene embeddings stay default; finance patterns never silently mix as "code".
 * Fail-closed: unlabeled synthetic bars rejected; no "<1ms 20yr" marketing claim.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { createLocalHashEmbedProvider, VECTOR_EMBED_DIM } from '@/lib/server/vector-index/embed-provider'
import {
  listAllChunks,
  upsertVectorChunks,
} from '@/lib/server/vector-index/store'
import type { VectorChunkRecord, VectorSearchHit } from '@/lib/server/vector-index/types'
import type { FinanceProjectVault } from '@/lib/server/quant/finance-domain-vault'

const log = createComponentLogger('market-pattern-domain')

/** J.4 domain tag — distinct from code/scene languages. */
export const MARKET_PATTERN_DOMAIN = 'market-pattern' as const

export type MarketPatternDomain = typeof MARKET_PATTERN_DOMAIN

export interface OhlcvBar {
  symbol: string
  timeframe: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  eventTimeMs: number
  /** Required for synthetic / unlabeled research bars */
  fixtureLabel?: string
  source?: 'licensed_feed' | 'synthetic_fixture'
}

export type MarketPatternRejectCode =
  | 'invalid_bar'
  | 'unlabeled_synthetic'
  | 'domain_mismatch'
  | 'finance_vault_required'
  | 'empty_query'

export type MarketPatternResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MarketPatternRejectCode; message: string }

function isFinitePositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

function isFiniteNonNeg(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

export function marketPatternUri(symbol: string, timeframe: string): string {
  return `${MARKET_PATTERN_DOMAIN}://${symbol.trim().toUpperCase()}/${timeframe.trim()}`
}

export function isMarketPatternChunk(chunk: Pick<VectorChunkRecord, 'language' | 'filePath'>): boolean {
  return (
    chunk.language === MARKET_PATTERN_DOMAIN ||
    chunk.filePath.startsWith(`${MARKET_PATTERN_DOMAIN}://`)
  )
}

export function serializeOhlcvBar(bar: OhlcvBar): string {
  return [
    `domain=${MARKET_PATTERN_DOMAIN}`,
    `symbol=${bar.symbol.trim().toUpperCase()}`,
    `tf=${bar.timeframe.trim()}`,
    `o=${bar.open}`,
    `h=${bar.high}`,
    `l=${bar.low}`,
    `c=${bar.close}`,
    `v=${bar.volume}`,
    `t=${bar.eventTimeMs}`,
    bar.fixtureLabel ? `fixture=${bar.fixtureLabel}` : null,
    `source=${bar.source ?? 'synthetic_fixture'}`,
  ]
    .filter(Boolean)
    .join('|')
}

function validateBar(bar: OhlcvBar): MarketPatternResult<OhlcvBar> {
  if (!bar.symbol?.trim() || !bar.timeframe?.trim()) {
    return { ok: false, code: 'invalid_bar', message: 'symbol and timeframe required' }
  }
  if (
    !isFinitePositive(bar.open) ||
    !isFinitePositive(bar.high) ||
    !isFinitePositive(bar.low) ||
    !isFinitePositive(bar.close) ||
    !isFiniteNonNeg(bar.volume)
  ) {
    return { ok: false, code: 'invalid_bar', message: 'OHLCV values invalid' }
  }
  if (bar.high < bar.low || bar.high < bar.open || bar.high < bar.close) {
    return { ok: false, code: 'invalid_bar', message: 'high/low/open/close inconsistent' }
  }
  if (typeof bar.eventTimeMs !== 'number' || !Number.isFinite(bar.eventTimeMs)) {
    return { ok: false, code: 'invalid_bar', message: 'eventTimeMs required' }
  }
  const source = bar.source ?? 'synthetic_fixture'
  if (source === 'synthetic_fixture' && !bar.fixtureLabel?.trim()) {
    return {
      ok: false,
      code: 'unlabeled_synthetic',
      message: 'synthetic OHLCV requires explicit fixtureLabel — prices are never invented silently',
    }
  }
  return { ok: true, value: { ...bar, source } }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export function assertFinanceVaultForMarketPattern(
  vault: FinanceProjectVault | null | undefined,
): MarketPatternResult<{ vaultId: string }> {
  if (!vault || vault.domain !== 'finance' || !vault.vaultId) {
    return {
      ok: false,
      code: 'finance_vault_required',
      message: 'market-pattern index requires N1 finance vault — refuse game project silent mix',
    }
  }
  return { ok: true, value: { vaultId: vault.vaultId } }
}

/**
 * Index labeled OHLCV bars under domain `market-pattern` (local-hash embed — not true semantic 20yr).
 */
export async function upsertMarketPatternBars(input: {
  projectId: string
  vault: FinanceProjectVault
  bars: OhlcvBar[]
  nowMs?: number
}): Promise<MarketPatternResult<{ upserted: number; domain: MarketPatternDomain }>> {
  const vaultGate = assertFinanceVaultForMarketPattern(input.vault)
  if (!vaultGate.ok) return vaultGate
  if (input.projectId !== input.vault.projectId) {
    return {
      ok: false,
      code: 'domain_mismatch',
      message: 'projectId must match finance vault projectId',
    }
  }

  const embedder = createLocalHashEmbedProvider()
  const nowMs = input.nowMs ?? Date.now()
  const chunks: VectorChunkRecord[] = []

  for (const raw of input.bars) {
    const validated = validateBar(raw)
    if (!validated.ok) return validated
    const bar = validated.value
    const content = serializeOhlcvBar(bar)
    const contentHash = createHash('sha256').update(content).digest('hex')
    const embedding = (await embedder.embed([content]))[0]
    if (!embedding || embedding.length !== VECTOR_EMBED_DIM) {
      return { ok: false, code: 'invalid_bar', message: 'embed dimension mismatch' }
    }
    const uri = marketPatternUri(bar.symbol, bar.timeframe)
    chunks.push({
      id: `mp:${contentHash.slice(0, 24)}`,
      projectId: input.projectId,
      filePath: uri,
      startLine: 1,
      endLine: 1,
      language: MARKET_PATTERN_DOMAIN,
      content,
      contentHash,
      embedding,
      updatedAt: nowMs,
    })
  }

  if (chunks.length === 0) {
    return { ok: false, code: 'invalid_bar', message: 'no bars to upsert' }
  }

  upsertVectorChunks(input.projectId, chunks)
  log.info('market_pattern_upserted', {
    projectId: input.projectId,
    vaultId: vaultGate.value.vaultId,
    upserted: chunks.length,
  })
  return { ok: true, value: { upserted: chunks.length, domain: MARKET_PATTERN_DOMAIN } }
}

/** Cosine search restricted to `market-pattern` language — never blends code chunks. */
export async function searchMarketPatternDomain(input: {
  projectId: string
  vault: FinanceProjectVault
  queryBar: OhlcvBar
  topK?: number
}): Promise<MarketPatternResult<{ hits: VectorSearchHit[]; domain: MarketPatternDomain; subMillisecond20yrClaim: false }>> {
  const vaultGate = assertFinanceVaultForMarketPattern(input.vault)
  if (!vaultGate.ok) return vaultGate

  const validated = validateBar(input.queryBar)
  if (!validated.ok) return validated

  const embedder = createLocalHashEmbedProvider()
  const content = serializeOhlcvBar(validated.value)
  const [queryEmb] = await embedder.embed([content])
  const all = listAllChunks(input.projectId).filter(isMarketPatternChunk)
  if (all.length === 0) {
    return {
      ok: true,
      value: {
        hits: [],
        domain: MARKET_PATTERN_DOMAIN,
        subMillisecond20yrClaim: false,
      },
    }
  }

  const ranked = all
    .map((chunk) => ({
      chunk,
      score: cosine(queryEmb, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, input.topK ?? 5))

  const hits: VectorSearchHit[] = ranked.map(({ chunk, score }) => ({
    id: chunk.id,
    filePath: chunk.filePath,
    score,
    excerpt: chunk.content.slice(0, 240),
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    language: chunk.language,
  }))

  return {
    ok: true,
    value: {
      hits,
      domain: MARKET_PATTERN_DOMAIN,
      subMillisecond20yrClaim: false,
    },
  }
}

export function probeMarketPatternDomainReadiness(): {
  id: 'N6'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  investmentGrade: false
  subMillisecond20yrClaim: false
} {
  const sample = serializeOhlcvBar({
    symbol: 'PROBE',
    timeframe: '1d',
    open: 10,
    high: 11,
    low: 9,
    close: 10.5,
    volume: 100,
    eventTimeMs: 1,
    fixtureLabel: 'N6-pattern-probe',
    source: 'synthetic_fixture',
  })
  const tagged = sample.includes(`domain=${MARKET_PATTERN_DOMAIN}`)
  const reject = validateBar({
    symbol: 'X',
    timeframe: '1d',
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
    eventTimeMs: 1,
    source: 'synthetic_fixture',
  })
  const ready = tagged && !reject.ok && reject.code === 'unlabeled_synthetic'
  return {
    id: 'N6',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/market-pattern-domain.ts',
    note: ready
      ? 'J.4 domain tag market-pattern for OHLCV slices; local-hash only — not 20yr/<1ms investment recall.'
      : 'market-pattern domain probe failed.',
    investmentGrade: false,
    subMillisecond20yrClaim: false,
  }
}
