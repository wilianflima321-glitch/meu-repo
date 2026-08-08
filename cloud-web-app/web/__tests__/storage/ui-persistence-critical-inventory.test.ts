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
  CW4_LWW_STATUS,
  listCw4CriticalPathBlockers,
} from '@/lib/storage/ui-persistence-critical-inventory'

const webRoot = join(__dirname, '../..')

describe('CW4 critical persistence inventory', () => {
  it('lists critical IDE/Studio namespaces including preview runtime', () => {
    expect(CW4_CRITICAL_PATH_STATUS).toBe('DONE')
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

  it('has zero critical-path blockers — dock dual-write blocker is closed', () => {
    expect(CW4_HELD_RAW_LOCALSTORAGE_DEBT.length).toBeGreaterThan(3)
    const blockers = listCw4CriticalPathBlockers()
    expect(blockers.length).toBe(0)
    expect(CW4_HELD_RAW_LOCALSTORAGE_DEBT.every((e) => e.criticalIdeStudioPath === false)).toBe(
      true,
    )
    expect(
      CW4_HELD_RAW_LOCALSTORAGE_DEBT.some((e) => e.disposition === 'exception-secret'),
    ).toBe(true)
  })

  it('marks multi-tab LWW production path DONE (not HELD forever)', () => {
    expect(CW4_LWW_STATUS).toBe('DONE')
    const lww = CW4_HELD_RAW_LOCALSTORAGE_DEBT.find((e) => e.keyPattern.includes('LWW'))
    expect(lww?.reason).toMatch(/CLOSED/)
    expect(lww?.reason).not.toMatch(/full lock\/LWW HELD/)
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

  it('registers the spine adapter structurally at the sole createWorkspaceStore call site', () => {
    const providerSrc = readFileSync(
      join(webRoot, '../packages/ide-ui/docking/WorkspaceProvider.tsx'),
      'utf8',
    )
    // Must be a module-scope side effect (not inside a specific shell like
    // ModernIDEShell), so every <WorkspaceProvider> consumer — IDE or
    // viewport, on any route — is covered before any store is created.
    expect(providerSrc).toContain('registerIdeDockSpinePersistence')
    expect(providerSrc).toMatch(
      /if \(typeof window !== 'undefined'\) \{\s*registerIdeDockSpinePersistence\(\);?\s*\}/,
    )
  })
})
