/**
 * Letter cx — UIMutationTransaction (L.11) — Trava II extension for Agentic UI APPLY.
 * TSX + CSS + preview DOM atomic undo. Deepens CreativeFusionTransaction scopes.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  abortCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
  type CreativeFusionTransactionRecord,
} from '@/lib/production/creative-fusion-transaction'

const log = createComponentLogger('ui-mutation-transaction')

export const UI_MUTATION_TX_LETTER = 'cx' as const
export const UI_MUTATION_TX_WIRED = true as const

/** L.11 scopes — mapped onto Fusion Yjs scopes via manifest until dedicated Yjs UI doc ships */
export type UiMutationSurface = 'tsx' | 'css' | 'preview-dom'

export interface UiMutationSnapshot {
  tsx: string
  css: string
  previewDom: string
}

export interface UiMutationTransactionRecord {
  id: string
  projectId: string
  status: 'open' | 'committed' | 'aborted'
  surfaces: UiMutationSurface[]
  createdAt: string
  fusionTxId: string
  snapshotHashBefore: string
  snapshotHashAfter?: string
  before: UiMutationSnapshot
  after?: UiMutationSnapshot
  releaseLock?: () => void
}

export interface UiMutationStore {
  getSnapshot(projectId: string): UiMutationSnapshot
  applySnapshot(projectId: string, snap: UiMutationSnapshot): void
}

const openUi = new Map<string, UiMutationTransactionRecord>()
const projectLocks = new Map<string, Promise<void>>()

async function acquireLock(projectId: string): Promise<() => void> {
  let release!: () => void
  const nextPromise = new Promise<void>(res => { release = res })
  const previousPromise = projectLocks.get(projectId) || Promise.resolve()
  
  // Chain the new promise, catch errors to prevent permanent deadlock
  projectLocks.set(projectId, previousPromise.then(() => nextPromise).catch(() => nextPromise))
  
  await previousPromise
  
  return () => {
    release()
    if (projectLocks.get(projectId) === nextPromise) {
      projectLocks.delete(projectId)
    }
  }
}

function hashSnap(snap: UiMutationSnapshot): string {
  return createHash('sha256')
    .update(JSON.stringify(snap))
    .digest('hex')
    .slice(0, 32)
}

export function createMemoryUiMutationStore(): UiMutationStore & {
  data: Map<string, UiMutationSnapshot>
} {
  const data = new Map<string, UiMutationSnapshot>()
  return {
    data,
    getSnapshot(projectId) {
      return (
        data.get(projectId) ?? {
          tsx: '',
          css: '',
          previewDom: '',
        }
      )
    },
    applySnapshot(projectId, snap) {
      data.set(projectId, { ...snap })
    },
  }
}

export function __resetUiMutationTransactionsForTests(): void {
  openUi.clear()
  projectLocks.clear()
}

/**
 * Begin L.11 UI mutation under Trava II FusionTx (manifest scope carrier).
 * Implements strict ACID Mutex locking to prevent agent race conditions.
 */
export async function beginUiMutationTransaction(input: {
  projectId: string
  store: UiMutationStore
  fusionStore: FusionScopeStore
  surfaces?: UiMutationSurface[]
}): Promise<UiMutationTransactionRecord> {
  const releaseLock = await acquireLock(input.projectId)

  const before = input.store.getSnapshot(input.projectId)
  const fusion = await beginCreativeFusionTransaction({
    projectId: input.projectId,
    yDocScope: 'manifest',
    store: input.fusionStore,
  })
  const record: UiMutationTransactionRecord = {
    id: randomUUID(),
    projectId: input.projectId,
    status: 'open',
    surfaces: input.surfaces ?? ['tsx', 'css', 'preview-dom'],
    createdAt: new Date().toISOString(),
    fusionTxId: fusion.id,
    snapshotHashBefore: hashSnap(before),
    before,
    releaseLock,
  }
  openUi.set(record.id, record)
  log.info('ui_mutation_begin', { id: record.id, fusionTxId: fusion.id, letter: UI_MUTATION_TX_LETTER })
  return record
}

export async function mutateUiTransaction(input: {
  txId: string
  store: UiMutationStore
  next: Partial<UiMutationSnapshot>
}): Promise<UiMutationTransactionRecord | null> {
  const tx = openUi.get(input.txId)
  if (!tx || tx.status !== 'open') return null
  const current = input.store.getSnapshot(tx.projectId)
  const next: UiMutationSnapshot = {
    tsx: input.next.tsx ?? current.tsx,
    css: input.next.css ?? current.css,
    previewDom: input.next.previewDom ?? current.previewDom,
  }
  input.store.applySnapshot(tx.projectId, next)
  tx.after = next
  return tx
}

export async function commitUiMutationTransaction(input: {
  txId: string
  store: UiMutationStore
  fusionStore: FusionScopeStore
}): Promise<UiMutationTransactionRecord | null> {
  const tx = openUi.get(input.txId)
  if (!tx || tx.status !== 'open') return null
  const after = input.store.getSnapshot(tx.projectId)
  tx.after = after
  tx.snapshotHashAfter = hashSnap(after)
  recordFusionMutation(tx.fusionTxId, input.fusionStore, JSON.stringify(after))
  await commitCreativeFusionTransaction(tx.fusionTxId, input.fusionStore)
  tx.status = 'committed'
  openUi.delete(tx.id)
  if (tx.releaseLock) tx.releaseLock()
  log.info('ui_mutation_commit', { id: tx.id })
  return tx
}

export async function abortUiMutationTransaction(input: {
  txId: string
  store: UiMutationStore
  fusionStore: FusionScopeStore
}): Promise<UiMutationTransactionRecord | null> {
  const tx = openUi.get(input.txId)
  if (!tx || tx.status !== 'open') return null
  input.store.applySnapshot(tx.projectId, tx.before)
  await abortCreativeFusionTransaction(tx.fusionTxId, input.fusionStore)
  tx.status = 'aborted'
  openUi.delete(tx.id)
  if (tx.releaseLock) tx.releaseLock()
  log.info('ui_mutation_abort', { id: tx.id })
  return tx
}

export function getOpenUiMutation(txId: string): UiMutationTransactionRecord | undefined {
  return openUi.get(txId)
}

export type { CreativeFusionTransactionRecord }
