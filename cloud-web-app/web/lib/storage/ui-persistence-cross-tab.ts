/**
 * CW4 lite multi-tab invalidate — BroadcastChannel + storage event.
 * Full multi-tab lock / last-writer-wins authority remains HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('UiPersistenceCrossTab')

/** Keep in sync with `UI_PERSISTENCE_BAG_KEY` in ui-persistence-spine (no circular import). */
const UI_PERSISTENCE_BAG_KEY = 'aethel.ui.persistence.v1'

export const UI_PERSISTENCE_CROSS_TAB_CHANNEL = 'aethel.ui.persistence.cross-tab.v1'

export type UiPersistenceExternalWriteEvent = {
  source: 'broadcast' | 'storage'
  key: string
  at: string
}

type Listener = (event: UiPersistenceExternalWriteEvent) => void

const listeners = new Set<Listener>()
let installed = false
let channel: BroadcastChannel | null = null
let generation = 0

export function getUiPersistenceCrossTabGeneration(): number {
  return generation
}

export function subscribeUiPersistenceExternalInvalidate(listener: Listener): () => void {
  listeners.add(listener)
  ensureCrossTabListeners()
  return () => {
    listeners.delete(listener)
  }
}

function emit(event: UiPersistenceExternalWriteEvent): void {
  generation += 1
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (error) {
      log.warn('ui_persistence_cross_tab_listener_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
  }
}

/** Call after this tab writes the spine bag so peers can invalidate. */
export function notifyUiPersistenceLocalWrite(): void {
  ensureCrossTabListeners()
  const at = new Date().toISOString()
  try {
    channel?.postMessage({
      type: 'ui-persistence-write',
      key: UI_PERSISTENCE_BAG_KEY,
      at,
    })
  } catch {
    // BroadcastChannel unsupported / closed — storage event still covers other tabs.
  }
}

function ensureCrossTabListeners(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  try {
    channel = new BroadcastChannel(UI_PERSISTENCE_CROSS_TAB_CHANNEL)
    channel.onmessage = (message) => {
      const data = message.data as { type?: string; key?: string; at?: string } | null
      if (!data || data.type !== 'ui-persistence-write') return
      emit({
        source: 'broadcast',
        key: typeof data.key === 'string' ? data.key : UI_PERSISTENCE_BAG_KEY,
        at: typeof data.at === 'string' ? data.at : new Date().toISOString(),
      })
    }
  } catch {
    channel = null
  }

  window.addEventListener('storage', (event) => {
    const key = event.key
    // Bag write, clear(), or legacy dual-write authority keys (dock layouts).
    const isBag = key === UI_PERSISTENCE_BAG_KEY || key === null
    const isLegacyDock =
      typeof key === 'string' &&
      (key === 'aethel.ide.dock.v1' || key.startsWith('aethel.viewport.dock.'))
    if (!isBag && !isLegacyDock) return
    emit({
      source: 'storage',
      key: key ?? UI_PERSISTENCE_BAG_KEY,
      at: new Date().toISOString(),
    })
  })
}

/** Test-only reset. */
export function __resetUiPersistenceCrossTabForTests(): void {
  listeners.clear()
  generation = 0
  try {
    channel?.close()
  } catch {
    // ignore
  }
  channel = null
  installed = false
}
