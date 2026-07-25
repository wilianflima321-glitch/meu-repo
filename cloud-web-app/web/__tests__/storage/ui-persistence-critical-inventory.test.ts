/**
 * CW4 — critical-path inventory honesty (no DONE theater).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CW4_CRITICAL_PATH_STATUS,
  CW4_CRITICAL_SPINE_NAMESPACES,
  CW4_HELD_RAW_LOCALSTORAGE_DEBT,
  listCw4CriticalPathBlockers,
} from '@/lib/storage/ui-persistence-critical-inventory'

const webRoot = join(__dirname, '../..')

describe('CW4 critical persistence inventory', () => {
  it('lists critical IDE/Studio namespaces including preview runtime', () => {
    expect(CW4_CRITICAL_PATH_STATUS).toBe('PARTIAL')
    expect(CW4_CRITICAL_SPINE_NAMESPACES).toEqual(
      expect.arrayContaining([
        'ide.dock',
        'ide.session',
        'studio.session',
        'studio.workbench',
        'viewport.dock',
        'workbench.preview.runtimeUrl',
        'workbench.preview.sandboxId',
      ]),
    )
  })

  it('treats dual-write dock debt as critical-path blockers (blocks DONE)', () => {
    expect(CW4_HELD_RAW_LOCALSTORAGE_DEBT.length).toBeGreaterThan(3)
    const blockers = listCw4CriticalPathBlockers()
    expect(blockers.length).toBeGreaterThan(0)
    expect(blockers.some((e) => e.disposition === 'legacy-dual-write')).toBe(true)
    expect(
      CW4_HELD_RAW_LOCALSTORAGE_DEBT.some((e) => e.disposition === 'exception-secret'),
    ).toBe(true)
  })

  it('routes viewport dock keys through spine adapter (not raw-only bypass)', () => {
    const adapterSrc = readFileSync(
      join(webRoot, 'lib/storage/register-ide-dock-spine.ts'),
      'utf8',
    )
    expect(adapterSrc).toContain('parseViewportDockStorageMode')
    expect(adapterSrc).toContain('setViewportDockLayoutForMode')
    expect(adapterSrc).toContain('getViewportDockLayoutForMode')
    // Prior lie: non-ide keys always fell through to localStorage.setItem
    expect(adapterSrc).not.toMatch(
      /if \(storageKey !== UI_PERSISTENCE_LEGACY_KEYS\.ideDock\) \{\s*try \{\s*window\.localStorage\.setItem/,
    )
  })
})
