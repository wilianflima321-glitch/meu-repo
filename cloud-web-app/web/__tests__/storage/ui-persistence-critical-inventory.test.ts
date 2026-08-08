/**
 * CW4 — critical-path inventory honesty (no DONE theater).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CW4_CRITICAL_PATH_STATUS,
  CW4_CRITICAL_SPINE_NAMESPACES,
  CW4_EXCEPTION_COUNT_AFTER,
  CW4_EXCEPTION_COUNT_BEFORE,
  CW4_EXCEPTION_DOMAIN_ALLOWLIST,
  CW4_EXCEPTION_ONLY_STATUS,
  CW4_EXCEPTION_SECRET_ALLOWLIST,
  CW4_HELD_RAW_LOCALSTORAGE_DEBT,
  CW4_LEGACY_MIRROR_STATUS,
  CW4_LWW_STATUS,
  CW4_OVERALL_STATUS,
  CW4_RESOLVED_HISTORY,
  listCw4CriticalPathBlockers,
  listCw4OpenExceptionAllowlist,
} from '@/lib/storage/ui-persistence-critical-inventory'
import {
  isUiPersistenceLegacyMirrorActive,
  UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT,
} from '@/lib/storage/ui-persistence-spine'

const webRoot = join(__dirname, '../..')

describe('CW4 critical persistence inventory', () => {
  it('lists critical IDE/Studio namespaces including chrome + preview runtime', () => {
    expect(CW4_CRITICAL_PATH_STATUS).toBe('DONE')
    expect(CW4_OVERALL_STATUS).toBe('DONE')
    expect(CW4_EXCEPTION_ONLY_STATUS).toBe('DONE')
    expect(CW4_LEGACY_MIRROR_STATUS).toBe('DONE')
    expect(CW4_CRITICAL_SPINE_NAMESPACES).toEqual(
      expect.arrayContaining([
        'ide.dock',
        'ide.session',
        'studio.session',
        'studio.workbench',
        'viewport.dock',
        'workbench.preview.runtimeUrl',
        'workbench.preview.sandboxId',
        'chrome.commandHistory',
        'chrome.searchHistory',
        'chrome.notifications',
        'settings.user',
        'settings.workspace',
      ]),
    )
  })

  it('has zero critical-path blockers and documents exception allowlist counts', () => {
    const blockers = listCw4CriticalPathBlockers()
    expect(blockers.length).toBe(0)
    expect(CW4_HELD_RAW_LOCALSTORAGE_DEBT.every((e) => e.criticalIdeStudioPath === false)).toBe(
      true,
    )
    expect(CW4_EXCEPTION_SECRET_ALLOWLIST.length).toBe(CW4_EXCEPTION_COUNT_AFTER.secret)
    expect(CW4_EXCEPTION_DOMAIN_ALLOWLIST.length).toBe(CW4_EXCEPTION_COUNT_AFTER.domain)
    expect(CW4_EXCEPTION_COUNT_AFTER.openChromeDebt).toBe(0)
    expect(CW4_EXCEPTION_COUNT_AFTER.secret).toBe(2)
    expect(CW4_EXCEPTION_COUNT_AFTER.domain).toBe(7)
    expect(CW4_EXCEPTION_COUNT_BEFORE.openNonCriticalDebt).toBeGreaterThan(
      CW4_EXCEPTION_COUNT_AFTER.openChromeDebt,
    )
    const open = listCw4OpenExceptionAllowlist()
    expect(open.length).toBe(
      CW4_EXCEPTION_COUNT_AFTER.secret + CW4_EXCEPTION_COUNT_AFTER.domain,
    )
    expect(open.every((e) => e.disposition === 'exception-secret' || e.disposition === 'exception-domain')).toBe(
      true,
    )
    expect(CW4_RESOLVED_HISTORY.some((e) => e.keyPattern.includes('legacy mirror'))).toBe(true)
  })

  it('marks multi-tab LWW + legacy mirror DONE', () => {
    expect(CW4_LWW_STATUS).toBe('DONE')
    expect(CW4_LEGACY_MIRROR_STATUS).toBe('DONE')
    expect(isUiPersistenceLegacyMirrorActive()).toBe(false)
    expect(Date.parse(UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT)).toBeLessThanOrEqual(Date.now())
    const lww = CW4_RESOLVED_HISTORY.find((e) => e.keyPattern.includes('LWW'))
    expect(lww?.reason).toMatch(/CLOSED/)
  })

  it('routes viewport dock keys through spine adapter (not raw-only bypass)', () => {
    const adapterSrc = readFileSync(
      join(webRoot, 'lib/storage/register-ide-dock-spine.ts'),
      'utf8',
    )
    expect(adapterSrc).toContain('parseViewportDockStorageMode')
    expect(adapterSrc).toContain('setViewportDockLayoutForMode')
    expect(adapterSrc).toContain('getViewportDockLayoutForMode')
    expect(adapterSrc).toContain('isUiPersistenceLegacyMirrorActive')
    expect(adapterSrc).not.toMatch(
      /if \(storageKey !== UI_PERSISTENCE_LEGACY_KEYS\.ideDock\) \{\s*try \{\s*window\.localStorage\.setItem/,
    )
  })

  it('registers the spine adapter structurally at the sole createWorkspaceStore call site', () => {
    const providerSrc = readFileSync(
      join(webRoot, '../packages/ide-ui/docking/WorkspaceProvider.tsx'),
      'utf8',
    )
    expect(providerSrc).toContain('registerIdeDockSpinePersistence')
    expect(providerSrc).toMatch(
      /if \(typeof window !== 'undefined'\) \{\s*registerIdeDockSpinePersistence\(\);?\s*\}/,
    )
  })

  it('ThemeContext / command / search / notifications / settings no longer raw-write chrome keys', () => {
    const themeSrc = readFileSync(join(webRoot, 'contexts/ThemeContext.tsx'), 'utf8')
    expect(themeSrc).toContain('setThemePreferenceId')
    expect(themeSrc).not.toMatch(/localStorage\.setItem\(\s*['"]aethel-theme['"]/)

    const cmdSrc = readFileSync(join(webRoot, 'lib/commands/command-registry.tsx'), 'utf8')
    expect(cmdSrc).toContain('setChromeCommandHistory')
    expect(cmdSrc).not.toMatch(/localStorage\.setItem\(\s*['"]aethel_command_history['"]/)

    const searchSrc = readFileSync(join(webRoot, 'lib/commands/command-services.ts'), 'utf8')
    expect(searchSrc).toContain('setChromeSearchHistory')
    expect(searchSrc).not.toMatch(/localStorage\.setItem\(\s*['"]aethel_search_history['"]/)

    const notifSrc = readFileSync(join(webRoot, 'lib/notifications-system.manager.ts'), 'utf8')
    expect(notifSrc).toContain('setChromeNotifications')
    expect(notifSrc).not.toMatch(/localStorage\.setItem\(\s*['"]aethel:notifications['"]/)

    const settingsSrc = readFileSync(join(webRoot, 'lib/settings/settings-manager.ts'), 'utf8')
    expect(settingsSrc).toContain('setUserSettingsBag')
    expect(settingsSrc).not.toMatch(/localStorage\.setItem\(\s*['"]user-settings['"]/)
  })
})
