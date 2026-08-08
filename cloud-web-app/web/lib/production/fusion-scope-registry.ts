/**
 * Law XVI Trava II — project-scoped FusionScopeStore registry.
 *
 * Ship-path undo MUST use the same store the FusionTx mutated.
 * Creating a fresh in-memory Map on Ctrl+Z is theater (P2f #3).
 */

import * as Y from 'yjs'
import {
  createMemoryFusionScopeStore,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { createYjsFusionScopeStore } from '@/lib/production/fusion-yjs-scope-store'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fusion-scope-registry')

const boundStores = new Map<string, FusionScopeStore>()
const localDocs = new Map<string, Y.Doc>()

export function bindFusionScopeStore(projectId: string, store: FusionScopeStore): void {
  if (!projectId) {
    throw new Error('bindFusionScopeStore requires projectId')
  }
  boundStores.set(projectId, store)
  log.info('fusion_scope_bound', { projectId })
}

export function getBoundFusionScopeStore(projectId: string): FusionScopeStore | undefined {
  return boundStores.get(projectId)
}

/**
 * Prefer an explicitly provided store, then a bound project store.
 * Never invent a throwaway empty Map for undo — that is the P2f #3 theater bug.
 */
export function resolveFusionScopeStore(
  projectId: string,
  preferred?: FusionScopeStore,
): FusionScopeStore | undefined {
  if (preferred) return preferred
  return getBoundFusionScopeStore(projectId)
}

/**
 * Client/session helper: bind a real Yjs-backed FusionScopeStore for the project.
 * Uses the caller's Y.Doc when provided; otherwise a process-local Doc (session CRDT,
 * not multiplayer-synced until a collab room attaches the same doc).
 */
export function ensureProjectFusionYjsStore(
  projectId: string,
  options?: { yDoc?: Y.Doc; mapName?: string; rebind?: boolean },
): FusionScopeStore {
  if (!options?.rebind) {
    const existing = getBoundFusionScopeStore(projectId)
    if (existing) return existing
  }

  const doc = options?.yDoc ?? getOrCreateLocalFusionDoc(projectId)
  const store = createYjsFusionScopeStore({ doc, mapName: options?.mapName })
  bindFusionScopeStore(projectId, store)
  return store
}

/**
 * Test-only / explicit memory bind. Prefer ensureProjectFusionYjsStore on ship paths.
 */
export function ensureProjectFusionMemoryStore(projectId: string): FusionScopeStore {
  const existing = getBoundFusionScopeStore(projectId)
  if (existing) return existing
  const store = createMemoryFusionScopeStore()
  bindFusionScopeStore(projectId, store)
  return store
}

function getOrCreateLocalFusionDoc(projectId: string): Y.Doc {
  let doc = localDocs.get(projectId)
  if (!doc) {
    doc = new Y.Doc()
    localDocs.set(projectId, doc)
  }
  return doc
}

export function unbindFusionScopeStore(projectId: string): void {
  boundStores.delete(projectId)
}

export function __resetFusionScopeRegistryForTests(): void {
  boundStores.clear()
  for (const doc of localDocs.values()) {
    doc.destroy()
  }
  localDocs.clear()
}
