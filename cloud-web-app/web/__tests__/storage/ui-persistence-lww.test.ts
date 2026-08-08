/**
 * CW4 — multi-tab LWW unit tests (pure compare + spine concurrent write scenarios).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyLwwWrites,
  compareUiPersistenceEntryMeta,
  mergeVersionedWriteMaps,
  nextUiPersistenceWriteMeta,
  uiPersistenceWriteWins,
  __resetUiPersistenceLwwForTests,
  type UiPersistenceEntryMeta,
} from '@/lib/storage/ui-persistence-lww'
import {
  UI_PERSISTENCE_BAG_KEY,
  UI_PERSISTENCE_PENDING_DELTA_KEY,
  __flushUiPersistenceForTests,
  __resetUiPersistenceMigrateGateForTests,
  __resetUiPersistenceWriteStateForTests,
  getUiPersistence,
  setUiPersistence,
} from '@/lib/storage/ui-persistence-spine'
import { __resetUiPersistenceCrossTabForTests } from '@/lib/storage/ui-persistence-cross-tab'

function meta(
  partial: Partial<UiPersistenceEntryMeta> & Pick<UiPersistenceEntryMeta, 'updatedAt' | 'tabId'>,
): UiPersistenceEntryMeta {
  return {
    writeSeq: 1,
    ...partial,
  }
}

describe('ui-persistence-lww (pure)', () => {
  beforeEach(() => {
    __resetUiPersistenceLwwForTests()
  })

  it('orders by updatedAt then writeSeq then tabId', () => {
    const older = meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 9, tabId: 'z' })
    const newer = meta({ updatedAt: '2026-08-08T12:00:01.000Z', writeSeq: 1, tabId: 'a' })
    expect(compareUiPersistenceEntryMeta(newer, older)).toBeGreaterThan(0)
    expect(uiPersistenceWriteWins(newer, older)).toBe(true)
    expect(uiPersistenceWriteWins(older, newer)).toBe(false)

    const a = meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 2, tabId: 'tab_a' })
    const b = meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 1, tabId: 'tab_z' })
    expect(uiPersistenceWriteWins(a, b)).toBe(true)

    const c = meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 1, tabId: 'tab_b' })
    const d = meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 1, tabId: 'tab_a' })
    expect(uiPersistenceWriteWins(c, d)).toBe(true)
  })

  it('applyLwwWrites preserves independent namespaces and rejects stale same-key', () => {
    const bag = {
      entries: {
        'ide.dock': { size: 10 },
        'theme.current': 'dark',
      } as Record<string, unknown>,
      entryMeta: {
        'ide.dock': meta({
          updatedAt: '2026-08-08T12:00:00.000Z',
          writeSeq: 1,
          tabId: 'tab_a',
        }),
        'theme.current': meta({
          updatedAt: '2026-08-08T12:00:00.000Z',
          writeSeq: 1,
          tabId: 'tab_a',
        }),
      } as Record<string, UiPersistenceEntryMeta>,
    }

    const applied = applyLwwWrites(bag, {
      'ide.dock': {
        data: { size: 99 },
        meta: meta({
          updatedAt: '2026-08-08T11:00:00.000Z',
          writeSeq: 99,
          tabId: 'tab_b',
        }),
      },
      'theme.current': {
        data: 'light',
        meta: meta({
          updatedAt: '2026-08-08T12:00:05.000Z',
          writeSeq: 1,
          tabId: 'tab_b',
        }),
      },
      'studio.session': {
        data: 'sess_new',
        meta: meta({
          updatedAt: '2026-08-08T12:00:05.000Z',
          writeSeq: 1,
          tabId: 'tab_b',
        }),
      },
    })

    expect(applied).toEqual(expect.arrayContaining(['theme.current', 'studio.session']))
    expect(applied).not.toContain('ide.dock')
    expect(bag.entries['ide.dock']).toEqual({ size: 10 })
    expect(bag.entries['theme.current']).toBe('light')
    expect(bag.entries['studio.session']).toBe('sess_new')
  })

  it('mergeVersionedWriteMaps keeps the winning write per key', () => {
    const base = {
      'ide.dock': {
        data: 'a',
        meta: meta({ updatedAt: '2026-08-08T12:00:00.000Z', writeSeq: 1, tabId: 'a' }),
      },
    }
    const incoming = {
      'ide.dock': {
        data: 'b',
        meta: meta({ updatedAt: '2026-08-08T12:00:02.000Z', writeSeq: 1, tabId: 'b' }),
      },
      'theme.current': {
        data: 'x',
        meta: meta({ updatedAt: '2026-08-08T12:00:01.000Z', writeSeq: 1, tabId: 'b' }),
      },
    }
    const merged = mergeVersionedWriteMaps(base, incoming)
    expect(merged['ide.dock']?.data).toBe('b')
    expect(merged['theme.current']?.data).toBe('x')
  })

  it('nextUiPersistenceWriteMeta increments writeSeq on the same tab', () => {
    const m1 = nextUiPersistenceWriteMeta('2026-08-08T12:00:00.000Z')
    const m2 = nextUiPersistenceWriteMeta('2026-08-08T12:00:00.000Z')
    expect(m2.writeSeq).toBeGreaterThan(m1.writeSeq)
    expect(m1.tabId).toBe(m2.tabId)
  })
})

describe('ui-persistence-spine multi-tab LWW scenarios', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    __resetUiPersistenceMigrateGateForTests()
    __resetUiPersistenceWriteStateForTests()
    __resetUiPersistenceCrossTabForTests()
  })

  it('read-through pending overlay before async lock flush completes', async () => {
    const lockRequest = vi.fn(
      (_name: string, callback: () => Promise<void> | void) =>
        new Promise<void>((resolve) => {
          // Delay the lock callback so get can observe the overlay.
          queueMicrotask(async () => {
            await callback()
            resolve()
          })
        }),
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: { request: lockRequest },
    })

    expect(setUiPersistence('dashboard.activeTab', 'activity')).toBe(true)
    expect(getUiPersistence('dashboard.activeTab', 'overview')).toBe('activity')

    await vi.waitFor(() => {
      const bag = JSON.parse(window.localStorage.getItem(UI_PERSISTENCE_BAG_KEY) as string) as {
        entries: Record<string, unknown>
        entryMeta?: Record<string, UiPersistenceEntryMeta>
      }
      expect(bag.entries['dashboard.activeTab']).toBe('activity')
      expect(bag.entryMeta?.['dashboard.activeTab']?.writeSeq).toBeGreaterThan(0)
    })

    vi.unstubAllGlobals()
  })

  it('concurrent different-namespace writes both survive LWW merge (simulated two tabs)', () => {
    // Tab A intent
    expect(setUiPersistence('ide.dock', { size: 22 })).toBe(true)
    __flushUiPersistenceForTests()

    // Simulate Tab B: durable pending with newer theme write + older stale dock
    // that must NOT clobber Tab A's dock.
    const bagBefore = JSON.parse(window.localStorage.getItem(UI_PERSISTENCE_BAG_KEY) as string) as {
      entryMeta: Record<string, UiPersistenceEntryMeta>
    }
    const dockMeta = bagBefore.entryMeta['ide.dock']
    expect(dockMeta).toBeTruthy()

    window.localStorage.setItem(
      UI_PERSISTENCE_PENDING_DELTA_KEY,
      JSON.stringify({
        v: 1,
        writes: {
          'theme.current': {
            data: 'aethel-dark',
            meta: {
              updatedAt: '2099-01-01T00:00:00.000Z',
              writeSeq: 1,
              tabId: 'tab_b',
            },
          },
          'ide.dock': {
            data: { size: 1 },
            meta: {
              updatedAt: '2000-01-01T00:00:00.000Z',
              writeSeq: 1,
              tabId: 'tab_b',
            },
          },
        },
      }),
    )

    __flushUiPersistenceForTests()

    expect(getUiPersistence('ide.dock', null)).toEqual({ size: 22 })
    expect(getUiPersistence('theme.current', null)).toBe('aethel-dark')
    expect(window.localStorage.getItem(UI_PERSISTENCE_PENDING_DELTA_KEY)).toBeNull()
  })

  it('same-namespace concurrent writes: newer timestamp wins (LWW)', () => {
    expect(setUiPersistence('workspace.profile', 'code')).toBe(true)
    __flushUiPersistenceForTests()

    window.localStorage.setItem(
      UI_PERSISTENCE_PENDING_DELTA_KEY,
      JSON.stringify({
        v: 1,
        writes: {
          'workspace.profile': {
            data: 'game',
            meta: {
              updatedAt: '2099-06-01T00:00:00.000Z',
              writeSeq: 1,
              tabId: 'tab_other',
            },
          },
        },
      }),
    )
    __flushUiPersistenceForTests()
    expect(getUiPersistence('workspace.profile', 'code')).toBe('game')

    // Stale resurrection must lose.
    window.localStorage.setItem(
      UI_PERSISTENCE_PENDING_DELTA_KEY,
      JSON.stringify({
        v: 1,
        writes: {
          'workspace.profile': {
            data: 'stale',
            meta: {
              updatedAt: '2001-01-01T00:00:00.000Z',
              writeSeq: 99,
              tabId: 'tab_stale',
            },
          },
        },
      }),
    )
    __flushUiPersistenceForTests()
    expect(getUiPersistence('workspace.profile', 'code')).toBe('game')
  })

  it('durable pending delta alone hydrates the bag (pagehide / crash window)', () => {
    // Mimic: tab wrote durable pending then died before Web Locks callback.
    window.localStorage.setItem(
      UI_PERSISTENCE_PENDING_DELTA_KEY,
      JSON.stringify({
        v: 1,
        writes: {
          'studio.session': {
            data: 'sess_pagehide',
            meta: {
              updatedAt: '2026-08-08T15:00:00.000Z',
              writeSeq: 1,
              tabId: 'dead_tab',
            },
          },
        },
      }),
    )
    __flushUiPersistenceForTests()
    expect(getUiPersistence('studio.session', null)).toBe('sess_pagehide')
    expect(window.localStorage.getItem(UI_PERSISTENCE_PENDING_DELTA_KEY)).toBeNull()
  })
})
