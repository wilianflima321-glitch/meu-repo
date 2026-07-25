/**
 * CW4 — bind WorkspaceProvider dock persistence to the UI persistence spine.
 * Call once from IDE shell boot (client). Covers IDE dock + viewport dock modes.
 * Legacy keys mirrored for one release (compat window).
 */

import { registerWorkspaceLayoutPersistence } from '@aethel/ide-ui/docking'
import {
  getIdeDockLayout,
  getViewportDockLayoutForMode,
  parseViewportDockStorageMode,
  setIdeDockLayout,
  setViewportDockLayoutForMode,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '@/lib/storage/ui-persistence-spine'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('register-ide-dock-spine')

let registered = false

function readLegacyRaw(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function writeLegacyRaw(storageKey: string, raw: string): void {
  try {
    window.localStorage.setItem(storageKey, raw)
  } catch {
    // ignore quota / private mode
  }
}

export function registerIdeDockSpinePersistence(): void {
  if (registered || typeof window === 'undefined') return
  registered = true

  registerWorkspaceLayoutPersistence({
    load(storageKey) {
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

      // Unknown storage keys stay raw (non-critical / storybook isolation).
      return readLegacyRaw(storageKey)
    },
    save(storageKey, raw) {
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
    viewportDockPrefix: UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix,
  })
}
