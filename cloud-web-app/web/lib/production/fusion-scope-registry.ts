/**
 * Law XVI Trava II — project-scoped FusionScopeStore registry.
 *
 * Ship-path undo MUST use the same store the FusionTx mutated.
 * Creating a fresh in-memory Map on Ctrl+Z is theater (P2f #3).
 *
 * R19: when a workspace already has a shared collab Y.Doc, Fusion undo prefers
 * that doc over a process-local fallback (server→client handoff still applies
 * afterPayload onto the bound store).
 */

import * as Y from 'yjs'
import {
  createMemoryFusionScopeStore,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  createYjsFusionScopeStore,
  type YjsFusionScopeStore,
} from '@/lib/production/fusion-yjs-scope-store'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fusion-scope-registry')

const boundStores = new Map<string, FusionScopeStore>()
const localDocs = new Map<string, Y.Doc>()
/** Shared collab / workspace Y.Docs registered by the IDE (preferred over localDocs). */
const sharedWorkspaceDocs = new Map<string, Y.Doc>()

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
 * Register the workspace's shared Y.Doc (collab room / IDE CRDT).
 * Rebinds FusionScopeStore onto that doc when the project was on a local fallback.
 */
export function registerSharedWorkspaceYDoc(projectId: string, doc: Y.Doc): FusionScopeStore {
  if (!projectId) {
    throw new Error('registerSharedWorkspaceYDoc requires projectId')
  }
  if (!doc) {
    throw new Error('registerSharedWorkspaceYDoc requires a Y.Doc')
  }
  sharedWorkspaceDocs.set(projectId, doc)
  const existing = getBoundFusionScopeStore(projectId) as YjsFusionScopeStore | undefined
  if (existing && 'doc' in existing && existing.doc === doc) {
    return existing
  }
  const store = createYjsFusionScopeStore({ doc })
  bindFusionScopeStore(projectId, store)
  log.info('fusion_shared_ydoc_registered', { projectId })
  return store
}

export function getSharedWorkspaceYDoc(projectId: string): Y.Doc | undefined {
  return sharedWorkspaceDocs.get(projectId)
}

export function unregisterSharedWorkspaceYDoc(projectId: string): void {
  const shared = sharedWorkspaceDocs.get(projectId)
  sharedWorkspaceDocs.delete(projectId)
  const bound = getBoundFusionScopeStore(projectId) as YjsFusionScopeStore | undefined
  if (bound && 'doc' in bound && shared && bound.doc === shared) {
    // Drop binding only when it pointed at the shared doc (keep memory / local binds).
    unbindFusionScopeStore(projectId)
  }
  log.info('fusion_shared_ydoc_unregistered', { projectId })
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
 * Preference order: explicit yDoc → registered shared workspace doc → process-local Doc.
 */
export function ensureProjectFusionYjsStore(
  projectId: string,
  options?: { yDoc?: Y.Doc; mapName?: string; rebind?: boolean },
): FusionScopeStore {
  const shared = sharedWorkspaceDocs.get(projectId)
  const preferredDoc = options?.yDoc ?? shared

  if (!options?.rebind) {
    const existing = getBoundFusionScopeStore(projectId) as YjsFusionScopeStore | undefined
    if (existing) {
      // Upgrade local-fallback bind onto the shared workspace doc when available.
      if (
        preferredDoc &&
        'doc' in existing &&
        existing.doc !== preferredDoc &&
        shared &&
        preferredDoc === shared
      ) {
        const upgraded = createYjsFusionScopeStore({ doc: preferredDoc, mapName: options?.mapName })
        bindFusionScopeStore(projectId, upgraded)
        log.info('fusion_scope_upgraded_to_shared_ydoc', { projectId })
        return upgraded
      }
      return existing
    }
  }

  const doc = preferredDoc ?? getOrCreateLocalFusionDoc(projectId)
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
  sharedWorkspaceDocs.clear()
}
