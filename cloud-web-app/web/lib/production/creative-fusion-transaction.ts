/**
 * Law XVI Trava II — CreativeFusionTransaction
 * All manifest/viewport/graph writes must go through begin → mutate → commit|abort.
 * Ctrl+Z atomic revert = abort before commit, or restore snapshotAfter via UndoManager at UI layer.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('creative-fusion-transaction')

export type FusionYDocScope =
  | 'scene'
  | 'visual-script'
  | 'sound-cue'
  | 'quest'
  | 'behavior-tree'
  | 'manifest'

export type FusionTransactionStatus = 'open' | 'committed' | 'aborted'

export interface CreativeFusionTransactionRecord {
  id: string
  projectId: string
  yDocScope: FusionYDocScope
  status: FusionTransactionStatus
  createdAt: string
  updatedAt: string
  snapshotHashBefore: string
  snapshotHashAfter?: string
  mutationCount: number
  /** Opaque payload snapshot for abort restore (JSON-serialized state) */
  beforePayload: string
  afterPayload?: string
}

export interface FusionScopeStore {
  getSnapshot(projectId: string, scope: FusionYDocScope): string
  applySnapshot(projectId: string, scope: FusionYDocScope, payload: string): void
}

/** In-memory scope store for tests and bridge unit paths */
export function createMemoryFusionScopeStore(): FusionScopeStore & {
  data: Map<string, string>
} {
  const data = new Map<string, string>()
  const key = (projectId: string, scope: FusionYDocScope) => `${projectId}::${scope}`
  return {
    data,
    getSnapshot(projectId, scope) {
      return data.get(key(projectId, scope)) ?? JSON.stringify({ projectId, scope, entities: [] })
    },
    applySnapshot(projectId, scope, payload) {
      data.set(key(projectId, scope), payload)
    },
  }
}

function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

const openTx = new Map<string, CreativeFusionTransactionRecord>()

export async function beginCreativeFusionTransaction(input: {
  projectId: string
  yDocScope: FusionYDocScope
  store: FusionScopeStore
  id?: string
}): Promise<CreativeFusionTransactionRecord> {
  const beforePayload = input.store.getSnapshot(input.projectId, input.yDocScope)
  const now = new Date().toISOString()
  const record: CreativeFusionTransactionRecord = {
    id: input.id ?? randomUUID(),
    projectId: input.projectId,
    yDocScope: input.yDocScope,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    snapshotHashBefore: hashPayload(beforePayload),
    mutationCount: 0,
    beforePayload,
  }
  openTx.set(record.id, record)
  log.info('fusion_tx_begin', {
    id: record.id,
    projectId: input.projectId,
    scope: input.yDocScope,
  })
  return { ...record }
}

export function recordFusionMutation(
  transactionId: string,
  store: FusionScopeStore,
  nextPayload: string,
): CreativeFusionTransactionRecord {
  const tx = openTx.get(transactionId)
  if (!tx || tx.status !== 'open') {
    throw new Error(`CreativeFusionTransaction ${transactionId} is not open`)
  }
  store.applySnapshot(tx.projectId, tx.yDocScope, nextPayload)
  tx.mutationCount += 1
  tx.afterPayload = nextPayload
  tx.updatedAt = new Date().toISOString()
  return { ...tx }
}

export async function commitCreativeFusionTransaction(
  transactionId: string,
  store: FusionScopeStore,
): Promise<{ snapshotHashAfter: string; record: CreativeFusionTransactionRecord }> {
  const tx = openTx.get(transactionId)
  if (!tx || tx.status !== 'open') {
    throw new Error(`CreativeFusionTransaction ${transactionId} is not open`)
  }
  const afterPayload = store.getSnapshot(tx.projectId, tx.yDocScope)
  const snapshotHashAfter = hashPayload(afterPayload)
  tx.status = 'committed'
  tx.snapshotHashAfter = snapshotHashAfter
  tx.afterPayload = afterPayload
  tx.updatedAt = new Date().toISOString()
  openTx.delete(transactionId)
  log.info('fusion_tx_commit', {
    id: transactionId,
    mutationCount: tx.mutationCount,
    snapshotHashAfter,
  })
  return { snapshotHashAfter, record: { ...tx } }
}

export async function abortCreativeFusionTransaction(
  transactionId: string,
  store: FusionScopeStore,
): Promise<CreativeFusionTransactionRecord> {
  const tx = openTx.get(transactionId)
  if (!tx || tx.status !== 'open') {
    throw new Error(`CreativeFusionTransaction ${transactionId} is not open`)
  }
  store.applySnapshot(tx.projectId, tx.yDocScope, tx.beforePayload)
  tx.status = 'aborted'
  tx.updatedAt = new Date().toISOString()
  tx.snapshotHashAfter = tx.snapshotHashBefore
  openTx.delete(transactionId)
  log.info('fusion_tx_abort', { id: transactionId })
  return { ...tx }
}

export function getOpenCreativeFusionTransaction(
  transactionId: string,
): CreativeFusionTransactionRecord | undefined {
  const tx = openTx.get(transactionId)
  return tx ? { ...tx } : undefined
}

/** Find any open fusion tx for a project (optional scope filter) — Block 2A.5 undo bridge */
export function findOpenCreativeFusionTransactionForProject(
  projectId: string,
  yDocScope?: FusionYDocScope,
): CreativeFusionTransactionRecord | undefined {
  for (const tx of openTx.values()) {
    if (tx.status !== 'open' || tx.projectId !== projectId) continue
    if (yDocScope && tx.yDocScope !== yDocScope) continue
    return { ...tx }
  }
  return undefined
}

export function assertFusionTransactionOpen(transactionId: string | undefined, requiresWrite: boolean): void {
  if (!requiresWrite) return
  if (!transactionId) {
    throw new Error('Manifest/viewport/graph write requires fusionTransactionId (Trava II)')
  }
  const tx = openTx.get(transactionId)
  if (!tx || tx.status !== 'open') {
    throw new Error(`Invalid or closed fusionTransactionId: ${transactionId}`)
  }
}

export function __resetCreativeFusionTransactionsForTests(): void {
  openTx.clear()
}
