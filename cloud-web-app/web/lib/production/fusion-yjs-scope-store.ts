/**
 * Block 2A.5 — FusionScopeStore backed by a Yjs map (Trava II ↔ live doc).
 * Abort restores `beforePayload` via applySnapshot; commit captures a revert point
 * for post-commit Ctrl+Z on the same Y.Doc (P2f #3).
 */

import * as Y from 'yjs'
import type {
  FusionRevertPoint,
  FusionScopeStore,
  FusionSnapshotApplyMode,
  FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'

const SCOPE_KEY_PREFIX = 'aethel:fusion:'
const FUSION_MUTATION_ORIGIN = 'aethel-fusion-mutation'
const FUSION_RESTORE_ORIGIN = 'aethel-fusion-restore'

export function fusionScopeMapKey(scope: FusionYDocScope): string {
  return `${SCOPE_KEY_PREFIX}${scope}`
}

export type YjsFusionScopeStore = FusionScopeStore & {
  doc: Y.Doc
  undoManager: Y.UndoManager
  canYjsUndo: () => boolean
  yjsUndo: () => boolean
}

/**
 * Adapter: get/apply JSON snapshots on a Y.Map inside an existing Y.Doc.
 * Abort restores `beforePayload` via applySnapshot — Ctrl+Z atomic path.
 * Capture/revert stack covers committed FusionTx after openTx is cleared.
 */
export function createYjsFusionScopeStore(input: {
  doc: Y.Doc
  mapName?: string
}): YjsFusionScopeStore {
  const mapName = input.mapName ?? 'fusionScopes'
  const map = input.doc.getMap(mapName)
  const revertStack = new Map<string, FusionRevertPoint[]>()
  const undoManager = new Y.UndoManager(map, {
    trackedOrigins: new Set([FUSION_MUTATION_ORIGIN]),
    captureTimeout: 0,
  })

  const stackKey = (projectId: string, scope: FusionYDocScope) => `${projectId}::${scope}`

  return {
    doc: input.doc,
    undoManager,
    getSnapshot(projectId, scope) {
      const key = fusionScopeMapKey(scope)
      const raw = map.get(key)
      if (typeof raw === 'string' && raw.length > 0) return raw
      return JSON.stringify({ projectId, scope, entities: [] })
    },
    applySnapshot(_projectId, scope, payload, mode: FusionSnapshotApplyMode = 'mutation') {
      const key = fusionScopeMapKey(scope)
      const origin = mode === 'restore' ? FUSION_RESTORE_ORIGIN : FUSION_MUTATION_ORIGIN
      input.doc.transact(() => {
        map.set(key, payload)
      }, origin)
    },
    captureRevertPoint(point) {
      const k = stackKey(point.projectId, point.scope)
      const stack = revertStack.get(k) ?? []
      stack.push(point)
      revertStack.set(k, stack)
    },
    revertLastCommit(projectId, scope) {
      const k = stackKey(projectId, scope)
      const stack = revertStack.get(k)
      const point = stack?.pop()
      if (!point) return false
      const key = fusionScopeMapKey(scope)
      input.doc.transact(() => {
        map.set(key, point.beforePayload)
      }, FUSION_RESTORE_ORIGIN)
      return true
    },
    canYjsUndo() {
      return undoManager.canUndo()
    },
    yjsUndo() {
      if (!undoManager.canUndo()) return false
      undoManager.undo()
      return true
    },
  }
}
