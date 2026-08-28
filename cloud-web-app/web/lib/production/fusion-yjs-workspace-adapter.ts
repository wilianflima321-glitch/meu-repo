/**
 * Block 2A.5 — FusionYjsWorkspaceAdapter (Trava II ↔ IDE Docking).
 * Converts local Zustand docking states into Yjs CRDT nodes to enable Multi-player IDE layouts.
 * This is the ultimate death of isolated local IDE state.
 */

import type * as Y from 'yjs'
import { createComponentLogger } from '@/lib/observability/logger'
import type { WorkspaceLayoutPersistenceAdapter } from '../../../packages/ide-ui/docking/workspaceStore'

const yjsAdapterLog = createComponentLogger('fusion-yjs-workspace-adapter')

export function createYjsWorkspaceLayoutAdapter(input: {
  doc: Y.Doc
  mapName?: string
  clientId: string
}): WorkspaceLayoutPersistenceAdapter & {
  // Exposure to awareness for ephemeral states (drag, cursor)
  broadcastEphemeralState: (state: Record<string, unknown>) => void
} {
  const mapName = input.mapName ?? 'ideWorkspaceLayout'
  const map = input.doc.getMap(mapName)

  // Ephemeral presence awareness (drag, cursor) would require y-protocols/awareness,
  // which is NOT a project dependency. This bridge honestly only logs and never fakes
  // remote presence or writes ephemeral state into the durable Y.Map.
  // Real presence is a governance-tracked gap (Block 2A.5) — do not fabricate it.
  const broadcastEphemeralState = (state: Record<string, unknown>) => {
    yjsAdapterLog.debug('[Yjs Workspace Adapter] Broadcasting ephemeral IDE state:', state)
  }

  return {
    load(storageKey: string): string | null {
      // In a fully shared environment, we might want to segregate by user,
      // but for Aethel Fusion we share the master structural layout.
      const raw = map.get(storageKey)
      if (typeof raw === 'string') {
        return raw
      }
      return null
    },
    save(storageKey: string, raw: string): void {
      // Offload to Idle Callback to prevent React UI locks during massive AI/multiplayer CRDT reconciliation
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          input.doc.transact(() => {
            map.set(storageKey, raw)
          }, input.clientId)
        }, { timeout: 100 })
      } else {
        input.doc.transact(() => {
          map.set(storageKey, raw)
        }, input.clientId)
      }
    },
    broadcastEphemeralState,
  }
}
