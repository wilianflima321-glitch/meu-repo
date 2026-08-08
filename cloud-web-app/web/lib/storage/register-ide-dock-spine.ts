/**
 * CW4 — bind WorkspaceProvider dock persistence to the UI persistence spine.
 * Call once from IDE shell boot (client). Covers IDE dock + viewport dock modes.
 * Legacy flat-key writes only while the one-way mirror window is active (expired).
 */

import { registerWorkspaceLayoutPersistence } from '@aethel/ide-ui/docking'
import {
  getIdeDockLayout,
  getViewportDockLayoutForMode,
  isUiPersistenceLegacyMirrorActive,
  parseViewportDockStorageMode,
  setIdeDockLayout,
  setViewportDockLayoutForMode,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '@/lib/storage/ui-persistence-spine'
import { createComponentLogger } from '@/lib/observability/logger'
import { createYjsWorkspaceLayoutAdapter } from '@/lib/production/fusion-yjs-workspace-adapter'
import type * as Y from 'yjs'

const log = createComponentLogger('register-ide-dock-spine')

let registered = false
let currentYjsAdapter: ReturnType<typeof createYjsWorkspaceLayoutAdapter> | null = null

function readLegacyRaw(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function writeLegacyRaw(storageKey: string, raw: string): void {
  if (!isUiPersistenceLegacyMirrorActive()) return
  try {
    window.localStorage.setItem(storageKey, raw)
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Registers IDE dock persistence. If a Y.Doc is provided, the IDE structural layout
 * becomes synchronized across the multiplayer/Agent session (Law XVI Trava II).
 */
export function registerIdeDockSpinePersistence(options?: { yDoc?: Y.Doc; clientId?: string }): void {
  if (registered && !options?.yDoc) return
  registered = true

  if (options?.yDoc && options?.clientId) {
    currentYjsAdapter = createYjsWorkspaceLayoutAdapter({
      doc: options.yDoc,
      clientId: options.clientId,
    })
    log.info('ide_dock_yjs_spine_registered', { clientId: options.clientId })
  }

  registerWorkspaceLayoutPersistence({
    load(storageKey) {
      // 1. Try Yjs CRDT Multi-player Layout first
      if (currentYjsAdapter) {
        const fromYjs = currentYjsAdapter.load(storageKey)
        if (fromYjs) return fromYjs
      }

      // 2. Fallback to Local UI Spine
      if (storageKey === UI_PERSISTENCE_LEGACY_KEYS.ideDock) {
        const fromSpine = getIdeDockLayout<unknown>(null)
        if (fromSpine !== null && fromSpine !== undefined) {
          try {
            return JSON.stringify(fromSpine)
          } catch {
            return null
          }
        }
        return readLegacyRaw(storageKey)
      }

      const viewportMode = parseViewportDockStorageMode(storageKey)
      if (viewportMode) {
        const fromSpine = getViewportDockLayoutForMode<unknown>(viewportMode, null)
        if (fromSpine !== null && fromSpine !== undefined) {
          try {
            return JSON.stringify(fromSpine)
          } catch {
            return null
          }
        }
        return readLegacyRaw(storageKey)
      }

      return readLegacyRaw(storageKey)
    },
    save(storageKey, raw) {
      // 1. Dual-write to Yjs CRDT Multi-player Layout
      if (currentYjsAdapter) {
        currentYjsAdapter.save(storageKey, raw)
      }

      // 2. Always persist locally as well
      if (storageKey === UI_PERSISTENCE_LEGACY_KEYS.ideDock) {
        try {
          setIdeDockLayout(JSON.parse(raw) as unknown)
        } catch {
          writeLegacyRaw(storageKey, raw)
        }
        return
      }

      const viewportMode = parseViewportDockStorageMode(storageKey)
      if (viewportMode) {
        try {
          setViewportDockLayoutForMode(viewportMode, JSON.parse(raw) as unknown)
        } catch {
          writeLegacyRaw(storageKey, raw)
        }
        return
      }

      writeLegacyRaw(storageKey, raw)
    },
  })

  log.info('ide_dock_spine_registered', {
    ideDock: UI_PERSISTENCE_LEGACY_KEYS.ideDock,
    yjsEnabled: !!options?.yDoc,
  })
}
