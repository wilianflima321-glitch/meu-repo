/**
 * Block 2A.5 — FusionScopeStore backed by a Yjs map (Trava II ↔ live doc).
 */

import type * as Y from 'yjs'
import type {
  FusionScopeStore,
  FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'

const SCOPE_KEY_PREFIX = 'aethel:fusion:'

export function fusionScopeMapKey(scope: FusionYDocScope): string {
  return `${SCOPE_KEY_PREFIX}${scope}`
}

/**
 * Adapter: get/apply JSON snapshots on a Y.Map inside an existing Y.Doc.
 * Abort restores `beforePayload` via applySnapshot — Ctrl+Z atomic path.
 */
export function createYjsFusionScopeStore(input: {
  doc: Y.Doc
  mapName?: string
}): FusionScopeStore {
  const mapName = input.mapName ?? 'fusionScopes'
  const map = input.doc.getMap(mapName)

  return {
    getSnapshot(projectId, scope) {
      const key = fusionScopeMapKey(scope)
      const raw = map.get(key)
      if (typeof raw === 'string' && raw.length > 0) return raw
      return JSON.stringify({ projectId, scope, entities: [] })
    },
    applySnapshot(_projectId, scope, payload) {
      const key = fusionScopeMapKey(scope)
      input.doc.transact(() => {
        map.set(key, payload)
      })
    },
  }
}
